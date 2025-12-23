"use client";

import { useEffect, useRef, useState } from "react";
import { FaceLandmarker, FilesetResolver } from "@mediapipe/tasks-vision";
import { calculateEAR } from "@/lib/ear";

type Status = "NORMAL" | "WASPADA" | "MENGANTUK" | "NO_FACE";

export default function DrowsinessDetector() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const rafRef = useRef<number | null>(null);
  const landmarkerRef = useRef<FaceLandmarker | null>(null);

  const [status, setStatus] = useState<Status>("NO_FACE");
  const [ear, setEar] = useState(0);

  const eyeClosedStartRef = useRef<number | null>(null);

  // Threshold (bisa kamu tuning nanti)
  const EAR_THRESHOLD = 0.21;
  const WARNING_TIME = 1000; // 1 detik
  const DROWSY_TIME = 2000;  // 2 detik

  // Indeks landmark mata MediaPipe
  const LEFT_EYE = {
    p1: 33,
    p2: 160,
    p3: 158,
    p4: 133,
    p5: 153,
    p6: 144,
  };

  const RIGHT_EYE = {
    p1: 362,
    p2: 385,
    p3: 387,
    p4: 263,
    p5: 373,
    p6: 380,
  };

  function getPoint(landmarks: any[], idx: number) {
    return { x: landmarks[idx].x, y: landmarks[idx].y };
  }

  function processEAR(landmarks: any[]) {
    const leftEAR = calculateEAR(
      getPoint(landmarks, LEFT_EYE.p1),
      getPoint(landmarks, LEFT_EYE.p2),
      getPoint(landmarks, LEFT_EYE.p3),
      getPoint(landmarks, LEFT_EYE.p4),
      getPoint(landmarks, LEFT_EYE.p5),
      getPoint(landmarks, LEFT_EYE.p6)
    );

    const rightEAR = calculateEAR(
      getPoint(landmarks, RIGHT_EYE.p1),
      getPoint(landmarks, RIGHT_EYE.p2),
      getPoint(landmarks, RIGHT_EYE.p3),
      getPoint(landmarks, RIGHT_EYE.p4),
      getPoint(landmarks, RIGHT_EYE.p5),
      getPoint(landmarks, RIGHT_EYE.p6)
    );

    return (leftEAR + rightEAR) / 2;
  }

  async function setupCamera() {
    if (!videoRef.current) return;

    const stream = await navigator.mediaDevices.getUserMedia({
      video: true,
      audio: false,
    });

    videoRef.current.srcObject = stream;
    await videoRef.current.play();
  }

  async function setupLandmarker() {
    const vision = await FilesetResolver.forVisionTasks(
      "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm"
    );

    landmarkerRef.current = await FaceLandmarker.createFromOptions(vision, {
      baseOptions: {
        modelAssetPath:
          "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/latest/face_landmarker.task",
        delegate: "GPU",
      },
      runningMode: "VIDEO",
      numFaces: 1,
    });
  }

  function loop() {
    const video = videoRef.current;
    const landmarker = landmarkerRef.current;

    if (!video || !landmarker) {
      rafRef.current = requestAnimationFrame(loop);
      return;
    }

    const result = landmarker.detectForVideo(video, performance.now());

    if (result.faceLandmarks.length === 0) {
      setStatus("NO_FACE");
      eyeClosedStartRef.current = null;
      rafRef.current = requestAnimationFrame(loop);
      return;
    }

    const landmarks = result.faceLandmarks[0];
    const earValue = processEAR(landmarks);
    setEar(earValue);

    const now = Date.now();

    if (earValue < EAR_THRESHOLD) {
      if (!eyeClosedStartRef.current) {
        eyeClosedStartRef.current = now;
      }

      const closedDuration = now - eyeClosedStartRef.current;

      if (closedDuration > DROWSY_TIME) {
        setStatus("MENGANTUK");
      } else if (closedDuration > WARNING_TIME) {
        setStatus("WASPADA");
      }
    } else {
      eyeClosedStartRef.current = null;
      setStatus("NORMAL");
    }

    rafRef.current = requestAnimationFrame(loop);
  }

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

  return (
    <div className="space-y-4">
      <video
        ref={videoRef}
        className="rounded-lg border max-w-xl"
        playsInline
        muted
      />

      <div className="text-lg font-semibold">
        Status:{" "}
        <span
          className={
            status === "MENGANTUK"
              ? "text-red-600"
              : status === "WASPADA"
              ? "text-yellow-600"
              : "text-green-600"
          }
        >
          {status}
        </span>
      </div>

      <div className="text-sm text-gray-600">
        EAR: {ear.toFixed(3)}
      </div>
    </div>
  );
}
