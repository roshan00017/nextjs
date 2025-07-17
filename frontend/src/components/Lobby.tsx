"use client"; // Mark as client component

import React from "react";
import { useSocket } from "../contexts/SocketContext";

interface LobbyProps {
  username: string;
  onGameStart: () => void; // To navigate to game page (will be triggered by socket event)
  waitingForOpponent: boolean;
}

const Lobby: React.FC<LobbyProps> = ({
  username,
  onGameStart,
  waitingForOpponent,
}) => {
  const { socket, isConnected } = useSocket();

  const handleFindOpponent = () => {
    if (socket && isConnected) {
      console.log(`${username} is looking for an opponent.`);
      socket.emit("player:findOpponent", username);
    } else {
      console.warn("Socket not connected or username not set.");
    }
  };

  return (
    <div className="flex flex-col items-center justify-center h-full text-center">
      <div className="bg-gray-800 p-8 rounded-lg shadow-xl w-96">
        <h2 className="text-3xl font-semibold mb-4 text-green-300">
          Welcome, {username}!
        </h2>
        <p className="text-gray-300 mb-6">
          Ready to test your country knowledge?
        </p>

        {!isConnected && (
          <p className="text-yellow-400 mb-4">Connecting to server...</p>
        )}

        {waitingForOpponent ? (
          <div className="flex flex-col items-center">
            <div className="loader ease-linear rounded-full border-4 border-t-4 border-gray-200 h-12 w-12 mb-4 animate-spin"></div>
            <p className="text-blue-300 text-lg">
              Searching for an opponent...
            </p>
            <p className="text-sm text-gray-400 mt-2">Please wait.</p>
          </div>
        ) : (
          <button
            onClick={handleFindOpponent}
            disabled={!isConnected}
            className={`w-full py-3 px-4 rounded-md font-bold text-white transition duration-300 ease-in-out ${
              isConnected
                ? "bg-purple-600 hover:bg-purple-700"
                : "bg-gray-600 cursor-not-allowed"
            }`}
          >
            Find Opponent
          </button>
        )}
      </div>
      {/* Basic loader CSS for Tailwind */}
      <style jsx>{`
        /* Using style jsx for local styles in Next.js */
        .loader {
          border-top-color: #3b82f6; /* blue-500 */
          -webkit-animation: spin 1s linear infinite;
          animation: spin 1s linear infinite;
        }
        @-webkit-keyframes spin {
          0% {
            -webkit-transform: rotate(0deg);
          }
          100% {
            -webkit-transform: rotate(360deg);
          }
        }
        @keyframes spin {
          0% {
            transform: rotate(0deg);
          }
          100% {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </div>
  );
};

export default Lobby;
