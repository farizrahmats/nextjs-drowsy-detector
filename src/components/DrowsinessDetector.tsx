"use client";

import { useEffect, useRef, useState } from "react";
import { FaceLandmarker, FilesetResolver } from "@mediapipe/tasks-vision";

type Status = "LOADING" | "NO_FACE" | "DETECTED";

export default function DrowsinessDetector() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const landmarkerRef = useRef<FaceLandmarker | null>(null);
  const rafRef = useRef<number | null>(null);

  const [status, setStatus] = useState<Status>("LOADING");

  // ================= SETUP CAMERA =================
  async function setupCamera() {
    if (!videoRef.current) return;

    const stream = await navigator.mediaDevices.getUserMedia({
      video: true,
      audio: false,
    });

    videoRef.current.srcObject = stream;
    await videoRef.current.play();
  }

  // ================= SETUP MEDIAPIPE =================
  async function setupLandmarker() {
    const vision = await FilesetResolver.forVisionTasks(
      "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm"
    );

    landmarkerRef.current = await FaceLandmarker.createFromOptions(
      vision,
      {
        baseOptions: {
          modelAssetPath:
            "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/latest/face_landmarker.task",
          delegate: "GPU",
        },
        runningMode: "VIDEO",
        numFaces: 1,
      }
    );
  }

  // ================= MAIN LOOP =================
  function loop() {
    const video = videoRef.current;
    const landmarker = landmarkerRef.current;

    if (!video || !landmarker) {
      rafRef.current = requestAnimationFrame(loop);
      return;
    }

    const result = landmarker.detectForVideo(
      video,
      performance.now()
    );

    if (result.faceLandmarks.length > 0) {
      setStatus("DETECTED");
    } else {
      setStatus("NO_FACE");
    }

    rafRef.current = requestAnimationFrame(loop);
  }

  // ================= LIFECYCLE =================
  useEffect(() => {
    (async () => {
      await setupCamera();
      await setupLandmarker();
      rafRef.current = requestAnimationFrame(loop);
    })();

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      const stream = videoRef.current?.srcObject as MediaStream | null;
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  // ================= UI =================
  return (
    <div className="space-y-4">
      <div className="relative max-w-xl">
        <video
          ref={videoRef}
          className="rounded-lg border"
          playsInline
          muted
        />
        <canvas
          ref={canvasRef}
          className="absolute inset-0 pointer-events-none"
        />
      </div>

      <div className="text-lg font-semibold">
        Status:{" "}
        <span
          className={
            status === "DETECTED"
              ? "text-green-600"
              : "text-red-600"
          }
        >
          {status}
        </span>
      </div>
    </div>
  );
}
