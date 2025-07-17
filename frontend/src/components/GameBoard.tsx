"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useSocket } from "../contexts/SocketContext";
import { InitialGameData, RoundOverData, GameOverData } from "../types";

interface PlayerDisplay {
  id: string;
  username: string;
  score: number;
  factsUsedThisRound: number;
  guessAttemptsThisRound: number;
}

interface GameFactData {
  fact: string;
  factsUsedByPlayer: number;
}

interface GuessResultData {
  isCorrect: boolean;
  correctCountry?: string | null;
  points?: number;
  message?: string;
  remainingAttempts?: number;
  factsUsed?: number;
}

interface NoMoreFactsData {
  message?: string;
}

interface GameBoardProps {
  myUsername: string;
}

const MAX_ROUNDS = 3;
const MAX_GUESS_ATTEMPTS_PER_ROUND = 3;
const MAX_FACTS_PER_ROUND = 3;

const GameBoard: React.FC<GameBoardProps> = ({ myUsername }) => {
  const { socket, isConnected } = useSocket();

  const [gameId, setGameId] = useState<string | null>(null);
  const [players, setPlayers] = useState<PlayerDisplay[]>([]);
  const [currentRound, setCurrentRound] = useState(0);
  const [currentFact, setCurrentFact] = useState<string | null>(null);
  const [timer, setTimer] = useState(0);
  const [guessInput, setGuessInput] = useState("");
  const [messages, setMessages] = useState<string[]>([]);
  const [isRoundOver, setIsRoundOver] = useState(false);
  const [roundWinnerId, setRoundWinnerId] = useState<string | null>(null);
  const [correctCountry, setCorrectCountry] = useState<string | null>(null);
  const [isGameOver, setIsGameOver] = useState(false);
  const [overallWinnerId, setOverallWinnerId] = useState<string | null>(null);
  const [myPlayerId, setMyPlayerId] = useState<string | null>(null);

  const [myGuessAttempts, setMyGuessAttempts] = useState(
    MAX_GUESS_ATTEMPTS_PER_ROUND
  );
  const [myFactsUsed, setMyFactsUsed] = useState(0);
  const [hasGuessedCorrectlyThisRound, setHasGuessedCorrectlyThisRound] =
    useState(false);

  const [showRequestNextRoundButton, setShowRequestNextRoundButton] =
    useState(false);
  const [
    isWaitingForOpponentReadyNextRound,
    setIsWaitingForOpponentReadyNextRound,
  ] = useState(false);
  const [
    isWaitingForOpponentReadyRematch,
    setIsWaitingForOpponentReadyRematch,
  ] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const addMessage = useCallback((msg: string) => {
    setMessages((prev) => [...prev, msg].slice(-10));
  }, []);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    if (!socket || !isConnected) {
      addMessage("Connecting to game server...");
      return;
    }

    if (socket.id && !myPlayerId) {
      setMyPlayerId(socket.id);
    }

    addMessage("Connected to game server. Waiting for game data...");

    socket.on("game:start", (data: InitialGameData) => {
      setGameId(data.gameId);
      setPlayers(
        data.players.map((p) => ({
          id: p.id,
          username: p.username,
          score: p.score,
          factsUsedThisRound: p.factsUsedThisRound ?? 0,
          guessAttemptsThisRound: p.guessAttemptsThisRound ?? 0,
        }))
      );
      setCurrentRound(data.currentRound);
      setCurrentFact(data.initialFact);
      setTimer(data.timer);
      addMessage(
        `Round ${data.currentRound} started! Initial fact: ${data.initialFact}`
      );

      setIsRoundOver(false);
      setRoundWinnerId(null);
      setCorrectCountry(null);
      setGuessInput("");

      const myCurrentPlayer = data.players.find((p) => p.id === myPlayerId);
      if (myCurrentPlayer) {
        const attemptsUsed = myCurrentPlayer.guessAttemptsThisRound ?? 0;
        setMyGuessAttempts(MAX_GUESS_ATTEMPTS_PER_ROUND - attemptsUsed);
        setMyFactsUsed(myCurrentPlayer.factsUsedThisRound ?? 0);
        setHasGuessedCorrectlyThisRound(false);
      } else {
        setMyGuessAttempts(MAX_GUESS_ATTEMPTS_PER_ROUND);
        setMyFactsUsed(0);
        setHasGuessedCorrectlyThisRound(false);
      }

      setShowRequestNextRoundButton(false);
      setIsWaitingForOpponentReadyNextRound(false);
      setIsWaitingForOpponentReadyRematch(false);
      setIsGameOver(false);
      setOverallWinnerId(null);
    });

    socket.on("game:timerUpdate", (newTimer: number) => {
      setTimer(newTimer);
      if (newTimer <= 5 && newTimer > 0) {
        addMessage(`Time remaining: ${newTimer} seconds!`);
      }
    });

    socket.on("game:newFact", (data: GameFactData) => {
      addMessage(`New fact: ${data.fact}`);
      setCurrentFact(data.fact);
      setMyFactsUsed(data.factsUsedByPlayer ?? 0);
      setPlayers((prevPlayers) =>
        prevPlayers.map((p) =>
          p.id === myPlayerId
            ? { ...p, factsUsedThisRound: data.factsUsedByPlayer ?? 0 }
            : p
        )
      );
    });

    socket.on("game:noMoreFacts", (data: NoMoreFactsData) => {
      addMessage(data.message || "No more facts available.");
    });

    socket.on("game:guessResult", (data: GuessResultData) => {
      if (data.isCorrect) {
        addMessage(
          `YOU GUESSED CORRECTLY! The country was ${data.correctCountry}. You earned ${data.points} points.`
        );
        setHasGuessedCorrectlyThisRound(true);
        setCorrectCountry(data.correctCountry!);
        if (data.factsUsed !== undefined) setMyFactsUsed(data.factsUsed ?? 0);
        if (data.remainingAttempts !== undefined)
          setMyGuessAttempts(data.remainingAttempts);
        setPlayers((prevPlayers) =>
          prevPlayers.map((p) =>
            p.id === myPlayerId
              ? { ...p, score: p.score + (data.points || 0) }
              : p
          )
        );
      } else {
        if (data.remainingAttempts !== undefined) {
          setMyGuessAttempts(data.remainingAttempts);
        } else {
          setMyGuessAttempts((prev) => Math.max(0, prev - 1));
        }
        addMessage(data.message || "Incorrect guess.");
      }
    });

    socket.on("game:roundOver", (data: RoundOverData) => {
      setIsRoundOver(true);
      setRoundWinnerId(data.winnerId);
      setCorrectCountry(data.correctCountry);
      setPlayers(
        data.playerScores.map((p) => {
          const playerInfo = players.find((player) => player.id === p.id) || {
            username: "Unknown",
          };
          return {
            id: p.id,
            username: playerInfo.username,
            score: p.score,
            factsUsedThisRound: p.factsUsedThisRound ?? 0,
            guessAttemptsThisRound: p.guessAttemptsThisRound ?? 0,
          };
        })
      );
      addMessage(
        `Round ${data.currentRound} is over! The country was ${data.correctCountry}.`
      );
      if (data.winnerId) {
        const winner = players.find((p) => p.id === data.winnerId);
        addMessage(
          `${
            winner ? winner.username : "Someone"
          } guessed correctly this round!`
        );
      } else {
        addMessage("Time ran out! No one guessed correctly this round.");
      }
      setGuessInput("");

      if (data.currentRound < MAX_ROUNDS) {
        setShowRequestNextRoundButton(true);
      }
    });

    socket.on("game:gameOver", (data: GameOverData) => {
      setIsGameOver(true);
      setOverallWinnerId(data.overallWinnerId);
      setPlayers(
        data.playerScores.map((p) => {
          const playerInfo = players.find((player) => player.id === p.id) || {
            username: "Unknown",
          };
          return {
            id: p.id,
            username: playerInfo.username,
            score: p.score,
            factsUsedThisRound: 0,
            guessAttemptsThisRound: 0,
          };
        })
      );
      addMessage("Game Over!");
      if (data.overallWinnerId) {
        const winner = players.find((p) => p.id === data.overallWinnerId);
        addMessage(`Overall Winner: ${winner ? winner.username : "Someone"}!`);
      } else {
        addMessage("It's a draw!");
      }
      setShowRequestNextRoundButton(false);
    });

    socket.on("game:player:readyForNextRoundAck", () => {
      setIsWaitingForOpponentReadyNextRound(true);
      addMessage("You are ready for the next round. Waiting for opponent...");
    });

    socket.on("game:opponentReadyForNextRound", () => {
      addMessage("Opponent is ready for the next round!");
    });

    socket.on("game:player:readyForRematchAck", () => {
      setIsWaitingForOpponentReadyRematch(true);
      addMessage("You requested a rematch. Waiting for opponent...");
    });

    socket.on("game:opponentReadyForRematch", () => {
      addMessage("Opponent has requested a rematch!");
    });

    socket.on(
      "game:opponentLeft",
      (data: { message: string; leftPlayerId: string }) => {
        addMessage(data.message);
        setPlayers((prevPlayers) =>
          prevPlayers.filter((p) => p.id !== data.leftPlayerId)
        );
        setIsWaitingForOpponentReadyNextRound(false);
        setIsWaitingForOpponentReadyRematch(false);
        if (!isGameOver) {
          setIsGameOver(true);
          setOverallWinnerId(myPlayerId);
        }
      }
    );

    socket.on("game:leftSuccess", () => {
      addMessage(
        "Successfully left the current game. Searching for new opponent..."
      );
      setGameId(null);
      setPlayers([]);
      setCurrentRound(0);
      setCurrentFact(null);
      setTimer(0);
      setGuessInput("");
      setMessages([]);
      setIsRoundOver(false);
      setRoundWinnerId(null);
      setCorrectCountry(null);
      setIsGameOver(false);
      setOverallWinnerId(null);
      setMyGuessAttempts(MAX_GUESS_ATTEMPTS_PER_ROUND);
      setMyFactsUsed(0);
      setHasGuessedCorrectlyThisRound(false);
      setShowRequestNextRoundButton(false);
      setIsWaitingForOpponentReadyNextRound(false);
      setIsWaitingForOpponentReadyRematch(false);
      socket.emit("player:findOpponent");
    });

    return () => {
      socket.off("game:start");
      socket.off("game:timerUpdate");
      socket.off("game:newFact");
      socket.off("game:noMoreFacts");
      socket.off("game:guessResult");
      socket.off("game:roundOver");
      socket.off("game:gameOver");
      socket.off("game:opponentLeft");
      socket.off("game:player:readyForNextRoundAck");
      socket.off("game:opponentReadyForNextRound");
      socket.off("game:player:readyForRematchAck");
      socket.off("game:opponentReadyForRematch");
      socket.off("game:leftSuccess");
    };
  }, [
    socket,
    isConnected,
    addMessage,
    myGuessAttempts,
    myPlayerId,
    players,
    isGameOver,
  ]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  const handleGuessSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (
      !gameId ||
      !socket ||
      !myPlayerId ||
      isRoundOver ||
      isGameOver ||
      hasGuessedCorrectlyThisRound ||
      myGuessAttempts <= 0
    ) {
      addMessage(
        "Cannot guess now. Either game not started, round over, already guessed correctly, or out of attempts."
      );
      return;
    }
    if (guessInput.trim() === "") {
      addMessage("Please enter a guess.");
      return;
    }

    socket.emit("game:guess", {
      gameId,
      guess: guessInput.trim(),
      playerId: myPlayerId,
    });
    setGuessInput("");
  };

  const handleRequestFact = () => {
    if (
      !gameId ||
      !socket ||
      !myPlayerId ||
      isRoundOver ||
      isGameOver ||
      hasGuessedCorrectlyThisRound ||
      myGuessAttempts <= 0 ||
      (myFactsUsed ?? 0) >= MAX_FACTS_PER_ROUND
    ) {
      addMessage(
        "Cannot request fact now. Either game not started, round over, already guessed correctly, out of attempts, or out of facts."
      );
      return;
    }
    socket.emit("game:requestFact", { gameId, playerId: myPlayerId });
  };

  const handleRequestNextRound = () => {
    if (!gameId || !socket || !myPlayerId || !isRoundOver || isGameOver) return;
    socket.emit("game:requestNextRound", { gameId });
    setShowRequestNextRoundButton(false);
    addMessage("Requested next round. Waiting for opponent...");
  };

  const handleRequestRematch = () => {
    if (!gameId || !socket || !myPlayerId || !isGameOver) return;
    socket.emit("game:requestRematch", { gameId });
    addMessage("Requested rematch. Waiting for opponent...");
  };

  const handleFindNewOpponent = () => {
    if (!gameId || !socket || !myPlayerId || !isGameOver) {
      addMessage("Cannot find new opponent now. Game is not over.");
      return;
    }
    socket.emit("game:leaveGame", { gameId });
  };

  const myPlayer = players.find((p) => p.id === myPlayerId);
  const opponentPlayer = players.find((p) => p.id !== myPlayerId);

  const canActInRound =
    !isRoundOver &&
    !isGameOver &&
    !hasGuessedCorrectlyThisRound &&
    myGuessAttempts > 0;

  const canRequestFact =
    canActInRound && (myFactsUsed ?? 0) < MAX_FACTS_PER_ROUND;

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-900 text-white p-4">
      <h1 className="text-4xl font-bold mb-6 text-yellow-400">
        GuessMatesCountry
      </h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-4xl mb-8">
        {/* Player 1 Card (My Player) */}
        <div
          className={`bg-gray-800 rounded-lg shadow-lg p-6 ${
            myPlayer?.id === roundWinnerId ? "border-4 border-green-500" : ""
          } ${
            overallWinnerId === myPlayer?.id && isGameOver
              ? "border-4 border-yellow-500"
              : ""
          }`}
        >
          <h2 className="text-2xl font-semibold mb-2">
            {myPlayer?.username || "You"}
          </h2>
          <p className="text-xl">Score: {myPlayer?.score || 0}</p>
          {!isRoundOver && !isGameOver && (
            <>
              <p className="text-lg">Guesses left: {myGuessAttempts}</p>
            </>
          )}
        </div>

        {/* Player 2 Card (Opponent) */}
        <div
          className={`bg-gray-800 rounded-lg shadow-lg p-6 ${
            opponentPlayer?.id === roundWinnerId
              ? "border-4 border-green-500"
              : ""
          } ${
            overallWinnerId === opponentPlayer?.id && isGameOver
              ? "border-4 border-yellow-500"
              : ""
          }`}
        >
          <h2 className="text-2xl font-semibold mb-2">
            {opponentPlayer?.username || "Opponent"}
          </h2>
          <p className="text-xl">Score: {opponentPlayer?.score || 0}</p>
        </div>
      </div>

      <div className="bg-gray-800 rounded-lg shadow-lg p-6 w-full max-w-4xl mb-8">
        <h2 className="text-2xl font-semibold mb-4">Game Info</h2>
        <p className="text-lg">
          Round: {currentRound} / {MAX_ROUNDS}
        </p>
        <p className="text-3xl font-bold text-blue-400 my-2">Time: {timer}s</p>

        <p className="text-lg font-medium mt-4">
          Current Fact: <span className="text-yellow-300">{currentFact}</span>
        </p>

        {correctCountry && isRoundOver && (
          <p className="text-3xl font-bold mt-4 text-green-500">
            The country was: {correctCountry}
          </p>
        )}
        {correctCountry && hasGuessedCorrectlyThisRound && !isRoundOver && (
          <p className="text-3xl font-bold mt-4 text-green-500">
            You guessed correctly! The country is: {correctCountry}
          </p>
        )}

        <form
          onSubmit={handleGuessSubmit}
          className="mt-6 flex flex-col sm:flex-row gap-4"
        >
          <input
            type="text"
            value={guessInput}
            onChange={(e) => setGuessInput(e.target.value)}
            placeholder="Your guess (e.g., France)"
            className="flex-grow p-3 rounded-md bg-gray-700 text-white border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={!canActInRound}
          />
          <button
            type="submit"
            className={`px-6 py-3 rounded-md font-semibold ${
              canActInRound
                ? "bg-blue-600 hover:bg-blue-700"
                : "bg-gray-600 cursor-not-allowed"
            }`}
            disabled={!canActInRound}
          >
            Guess
          </button>
        </form>

        <button
          onClick={handleRequestFact}
          className={`mt-4 w-full px-6 py-3 rounded-md font-semibold ${
            canRequestFact
              ? "bg-purple-600 hover:bg-purple-700"
              : "bg-gray-600 cursor-not-allowed"
          }`}
          disabled={!canRequestFact}
        >
          Request Next Fact
        </button>

        {showRequestNextRoundButton && !isGameOver && (
          <button
            onClick={handleRequestNextRound}
            className={`mt-4 w-full px-6 py-3 rounded-md font-semibold ${
              isWaitingForOpponentReadyNextRound
                ? "bg-gray-600 cursor-not-allowed"
                : "bg-green-600 hover:bg-green-700"
            }`}
            disabled={isWaitingForOpponentReadyNextRound}
          >
            {isWaitingForOpponentReadyNextRound
              ? "Waiting for Opponent..."
              : "Request Next Round"}
          </button>
        )}

        {isGameOver && (
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <button
              onClick={handleRequestRematch}
              className={`px-6 py-3 rounded-md font-semibold ${
                isWaitingForOpponentReadyRematch
                  ? "bg-gray-600 cursor-not-allowed"
                  : "bg-green-600 hover:bg-green-700"
              }`}
              disabled={isWaitingForOpponentReadyRematch}
            >
              {isWaitingForOpponentReadyRematch
                ? "Waiting for Opponent..."
                : "Play Again (Rematch)"}
            </button>
            <button
              onClick={handleFindNewOpponent}
              className={`px-6 py-3 rounded-md font-semibold bg-red-600 hover:bg-red-700`}
            >
              Find New Opponent
            </button>
          </div>
        )}
      </div>

      <div className="bg-gray-800 rounded-lg shadow-lg p-6 w-full max-w-4xl h-48 overflow-y-auto mb-8">
        <h2 className="text-2xl font-semibold mb-4">Messages</h2>
        <div className="flex flex-col space-y-1">
          {messages.map((msg, index) => (
            <p key={index} className="text-sm text-gray-300">
              {msg}
            </p>
          ))}
          <div ref={messagesEndRef} />
        </div>
      </div>
    </div>
  );
};

export default GameBoard;
