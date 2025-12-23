import DrowsinessDetector from "@/components/DrowsinessDetector";

export default function DrowsyPage() {
  return (
    <main className="min-h-screen p-6">
      <h1 className="text-2xl font-bold mb-4">
        Realtime Drowsiness Detection
      </h1>

      <DrowsinessDetector />
    </main>
  );
}
