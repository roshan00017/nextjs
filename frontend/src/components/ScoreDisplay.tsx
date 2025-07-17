"use client"; // Mark as client component

import React from "react";
import { Player } from "../types";

interface ScoreDisplayProps {
  players: Player[];
  myPlayerId: string;
}

const ScoreDisplay: React.FC<ScoreDisplayProps> = ({ players, myPlayerId }) => {
  const myPlayer = players.find((p) => p.id === myPlayerId);
  const opponentPlayer = players.find((p) => p.id !== myPlayerId);

  return (
    <div className="flex justify-around w-full max-w-md mx-auto mb-6 text-xl">
      <div className="text-center p-3 bg-gray-700 rounded-lg shadow-md flex-1 mx-2">
        <p className="text-blue-300 font-semibold">
          {myPlayer?.username || "You"}
        </p>
        <p className="text-white text-3xl font-bold">{myPlayer?.score ?? 0}</p>
      </div>
      <div className="text-center p-3 bg-gray-700 rounded-lg shadow-md flex-1 mx-2">
        <p className="text-red-300 font-semibold">
          {opponentPlayer?.username || "Opponent"}
        </p>
        <p className="text-white text-3xl font-bold">
          {opponentPlayer?.score ?? 0}
        </p>
      </div>
    </div>
  );
};

export default ScoreDisplay;
