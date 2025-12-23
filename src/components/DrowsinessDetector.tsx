"use client";

import { useEffect, useRef, useState } from "react";
import { FaceLandmarker, FilesetResolver } from "@mediapipe/tasks-vision";
import { calculateEAR, calculateMAR } from "@/lib/ear";

type Status = "NORMAL" | "WASPADA" | "MENGANTUK" | "NO_FACE";

export default function DrowsinessDetector() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const rafRef = useRef<number | null>(null);
  const landmarkerRef = useRef<FaceLandmarker | null>(null);

  const [status, setStatus] = useState<Status>("NO_FACE");
  const [ear, setEar] = useState(0);
  const [isYawning, setIsYawning] = useState(false);
  const [mar, setMar] = useState(0);
  const [drowsyScore, setDrowsyScore] = useState(0);
  const [todayCount, setTodayCount] = useState(0);

  const yawnStartRef = useRef<number | null>(null);

  const eyeClosedStartRef = useRef<number | null>(null);

  // Threshold (bisa kamu tuning nanti)
  const EAR_THRESHOLD = 0.21;
  const WARNING_TIME = 1000; // 1 detik
  const DROWSY_TIME = 2000; // 2 detik
  const MAR_THRESHOLD = 0.6;
  const YAWN_TIME = 1500; // 1.5 detik

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

  const MOUTH = {
    top: 13,
    bottom: 14,
    left: 61,
    right: 291,
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

        // simpan frekuensi harian (anti double count)
        if (!eyeClosedStartRef.current) return;

        const key = todayKey();
        const current = parseInt(localStorage.getItem(key) || "0", 10) + 1;
        localStorage.setItem(key, current.toString());
        setTodayCount(current);

        eyeClosedStartRef.current = null; // reset supaya tidak spam
      } else if (closedDuration > WARNING_TIME) {
        setStatus("WASPADA");
      }
    } else {
      eyeClosedStartRef.current = null;
      setStatus("NORMAL");
    }

    // ================= YAWN DETECTION =================
    const marValue = calculateMAR(
      getPoint(landmarks, MOUTH.top),
      getPoint(landmarks, MOUTH.bottom),
      getPoint(landmarks, MOUTH.left),
      getPoint(landmarks, MOUTH.right)
    );
    setMar(marValue);

    if (marValue > MAR_THRESHOLD) {
      if (!yawnStartRef.current) {
        yawnStartRef.current = now;
      }

      if (now - yawnStartRef.current > YAWN_TIME) {
        setIsYawning(true);
        setStatus("MENGANTUK");
      }
    } else {
      yawnStartRef.current = null;
      setIsYawning(false);
    }

    rafRef.current = requestAnimationFrame(loop);

    // ===== HITUNG SKOR =====
    const eyeScore = clamp(
      ((EAR_THRESHOLD - earValue) / EAR_THRESHOLD) * 50,
      0,
      50
    );

    const yawnScore = isYawning ? 30 : 0;

    const frequencyScore = clamp(todayCount * 5, 0, 20);

    const totalScore = Math.round(eyeScore + yawnScore + frequencyScore);

    setDrowsyScore(totalScore);
  }

  function clamp(n: number, min = 0, max = 100) {
    return Math.max(min, Math.min(max, n));
  }

  function todayKey() {
    const d = new Date();
    return `drowsy-${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
  }

  useEffect(() => {
    (async () => {
      await setupCamera();
      await setupLandmarker();
      rafRef.current = requestAnimationFrame(loop);
    })();

    const key = todayKey();
    const stored = localStorage.getItem(key);
    if (stored) {
      setTodayCount(parseInt(stored, 10));
    }

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

      <div className="text-sm">
        Menguap:{" "}
        <span className={isYawning ? "text-red-600 font-bold" : ""}>
          {isYawning ? "YA 🥱" : "TIDAK"}
        </span>
      </div>

      <div className="space-y-1">
        <div className="text-lg font-bold">
          Skor Kantuk:{" "}
          <span
            className={
              drowsyScore >= 60
                ? "text-red-600"
                : drowsyScore >= 30
                ? "text-yellow-600"
                : "text-green-600"
            }
          >
            {drowsyScore}
          </span>
          /100
        </div>

        <div className="text-sm text-gray-600">
          Jumlah terdeteksi hari ini: <b>{todayCount}</b> kali
        </div>
      </div>

      <div className="text-sm text-gray-600">
        EAR: {ear.toFixed(3)} <br />
        MAR: {mar.toFixed(3)}
      </div>
    </div>
  );
}
