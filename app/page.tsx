"use client"

import React from 'react';
import { useRouter } from 'next/navigation';

export default function Home() {
  const router = useRouter();

  const handleDetection = () => {
    router.push('/first');
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen py-2">
      <h1 className="text-4xl font-bold mb-4">Human Pose Detection</h1>
      <button
        onClick={handleDetection}
        className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-700"
      >
        Detección
      </button>
    </div>
  );
}
