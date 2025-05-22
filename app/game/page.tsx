"use client";

import { TravelGuide } from "@/components/travel-guide";

export default function GamePage() {
  return (
    <main className="flex min-h-screen flex-col bg-gradient-to-b from-blue-50 to-white">
      <TravelGuide />
    </main>
  );
}
