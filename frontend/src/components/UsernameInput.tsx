"use client"; // Mark as client component

import React, { useState } from "react";

interface UsernameInputProps {
  onUsernameSet: (username: string) => void;
  initialUsername: string | null;
}

const UsernameInput: React.FC<UsernameInputProps> = ({
  onUsernameSet,
  initialUsername,
}) => {
  const [username, setUsername] = useState(initialUsername || "");
  const [error, setError] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (username.trim().length < 3) {
      setError("Username must be at least 3 characters long.");
      return;
    }
    setError("");
    onUsernameSet(username.trim());
  };

  return (
    <div className="flex flex-col items-center justify-center h-full">
      <form
        onSubmit={handleSubmit}
        className="bg-gray-800 p-8 rounded-lg shadow-xl w-96"
      >
        <h2 className="text-3xl font-semibold text-center mb-6 text-blue-300">
          Enter Your Username
        </h2>
        <input
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="e.g., GuessMaster99"
          className="w-full p-3 mb-4 rounded-md bg-gray-700 border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 text-white"
          maxLength={20}
        />
        {error && <p className="text-red-400 text-sm mb-4">{error}</p>}
        <button
          type="submit"
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-md transition duration-300 ease-in-out"
        >
          {initialUsername ? "Update Username" : "Start Playing"}
        </button>
      </form>
    </div>
  );
};

export default UsernameInput;
