# 😴 Drowsiness Detector App

A real-time web application to detect user drowsiness using webcam-based facial analysis.
Built with **Next.js** and **MediaPipe**, this app monitors eye closure, yawning, and behavioral patterns
to calculate a **drowsiness score (0–100)**, display daily statistics, and warn users when they are getting sleepy.

---

## ✨ Features

- 🎥 Real-time webcam face detection
- 👁️ Eye Aspect Ratio (EAR) detection
- 🥱 Yawn detection using Mouth Aspect Ratio (MAR)
- 📊 Drowsiness score (0–100)
- 🕒 Daily & hourly drowsiness history
- 📈 Visual bar chart (per hour)
- ⚠️ Smart warning modal (anti-spam)
- 💾 Local persistence (localStorage)
- 🌐 100% client-side (no backend required)

---

## 🧠 How It Works

The app does **not detect drowsiness directly**, but instead analyzes physical indicators:

| Indicator | Description |
|--------|------------|
| EAR (Eye Aspect Ratio) | Detects prolonged eye closure |
| MAR (Mouth Aspect Ratio) | Detects yawning |
| Frequency | Counts repeated drowsy events |

These signals are combined into a **weighted score**:
- Eyes: 50%
- Yawning: 30%
- Frequency: 20%

---

## 🛠️ Tech Stack

### Frontend
- **Next.js (App Router)**
- **React 18**
- **TypeScript**
- **Tailwind CSS**

### Computer Vision & AI
- **MediaPipe Tasks Vision**
  - Face Landmarker (468 facial points)
  - WebAssembly + GPU acceleration

### Browser APIs
- `getUserMedia()` – webcam access
- `requestAnimationFrame()` – real-time loop
- `localStorage` – daily/hourly data persistence

---

## 🚀 Getting Started

### Prerequisites
- Node.js **18+** (recommended 20+)
- Modern browser (Chrome / Edge)
- Webcam access

---

### Installation

```bash
git clone <your-repo-url>
cd drowsy-detector
npm install
