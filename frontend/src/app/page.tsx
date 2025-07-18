"use client"; // Mark as client component

import React, { useState, useEffect } from "react";
import UsernameInput from "../components/UsernameInput";
import Lobby from "../components/Lobby";
import { getUsername, saveUsername } from "../utils/localStorage";
import { useSocket } from "../contexts/SocketContext";
import GameBoard from "../components/GameBoard"; // Directly import GameBoard
import { useRouter } from "next/navigation"; // For programmatic navigation

const HomePage: React.FC = () => {
  const [username, setUsername] = useState<string | null>(null);
  const [inGame, setInGame] = useState(false);
  const [waitingForOpponent, setWaitingForOpponent] = useState(false);

  const { socket } = useSocket();
  const router = useRouter(); // Initialize useRouter

  useEffect(() => {
    // Load username from local storage on component mount
    const storedUsername = getUsername();
    if (storedUsername) {
      setUsername(storedUsername);
    }
  }, []);

  useEffect(() => {
    if (!socket) return;

    socket.on("player:matched", (gameId: string) => {
      console.log(`Matched! Game ID: ${gameId}`);
      setWaitingForOpponent(false);
      setInGame(true);
      // In a real app, you might navigate: router.push(`/game/${gameId}`);
    });

    socket.on("player:waiting", () => {
      console.log("You are now in the waiting queue.");
      setWaitingForOpponent(true);
    });

    // Cleanup
    return () => {
      socket.off("player:matched");
      socket.off("player:waiting");
    };
  }, [socket, router]);

  const handleUsernameSet = (name: string) => {
    saveUsername(name);
    setUsername(name);
    // The SocketProvider will pick up the new username and connect.
  };

  // If no username, show username input
  if (!username) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900 text-white">
        {" "}
        {/* Add background to match */}
        <UsernameInput
          onUsernameSet={handleUsernameSet}
          initialUsername={username}
        />
      </div>
    );
  }

  // === IMPORTANT CHANGE HERE ===
  // If in game, render GameBoard directly without the centering wrapper
  if (inGame) {
    return (
      // The GameBoard itself has the min-h-screen and background,
      // and its internal elements have the responsive padding.
      <GameBoard myUsername={username} />
    );
  }

  // Otherwise, show the lobby
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900 text-white">
      {" "}
      {/* Add background to match */}
      <Lobby
        username={username}
        onGameStart={() => setInGame(true)} // This line will be effectively triggered by 'player:matched'
        waitingForOpponent={waitingForOpponent}
      />
    </div>
  );
};

export default HomePage;
