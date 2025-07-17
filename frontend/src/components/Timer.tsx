"use client"; // Mark as client component

import React from "react";

interface TimerProps {
  seconds: number;
}

const Timer: React.FC<TimerProps> = ({ seconds }) => {
  const radius = 40; // SVG circle radius
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (seconds / 30) * circumference; // Assuming 30 seconds max

  const timerColorClass =
    seconds <= 5
      ? "text-red-500"
      : seconds <= 15
      ? "text-yellow-400"
      : "text-green-400";

  return (
    <div className="relative w-24 h-24 flex items-center justify-center">
      <svg className="absolute w-full h-full" viewBox="0 0 100 100">
        <circle
          className="text-gray-700"
          strokeWidth="8"
          stroke="currentColor"
          fill="transparent"
          r={radius}
          cx="50"
          cy="50"
        />
        <circle
          className="text-blue-500 transition-all duration-1000 ease-linear"
          strokeWidth="8"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          stroke="currentColor"
          fill="transparent"
          r={radius}
          cx="50"
          cy="50"
          transform="rotate(-90 50 50)" // Start from top
        />
      </svg>
      <div className={`absolute text-3xl font-bold ${timerColorClass}`}>
        {seconds < 10 ? `0${seconds}` : seconds}
      </div>
    </div>
  );
};

export default Timer;
