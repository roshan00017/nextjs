import { Server as SocketIOServer, Socket } from "socket.io";
import {
  Game,
  Player as BasePlayer,
  CountryData,
  InitialGameData as BaseInitialGameData,
  RoundOverData as BaseRoundOverData,
  GameOverData,
} from "../utils/types";
import { getRandomCountryWithFacts } from "../utils/countryFacts";
import { v4 as uuidv4 } from "uuid";

interface CustomSocket extends Socket {
  username?: string;
}

// Extend the Player interface to track guess attempts and facts used
interface Player extends BasePlayer {
  guessAttemptsThisRound: number;
  factsUsedThisRound: number; // Ensure this is also explicitly in the extended Player
}

// Extend the Game interface to use the new Player type and track round info
interface GameWithGuessTracking extends Game {
  players: Player[]; // Use the extended Player interface
  guessedCorrectlyInRound: { playerId: string; scoreAwarded: number }[];
  playersReadyForNextRound: Set<string>;
}

// Extend the InitialGameData to include detailed player info
interface InitialGameData extends BaseInitialGameData {
  players: Array<{
    id: string;
    username: string;
    score: number;
    factsUsedThisRound: number;
    guessAttemptsThisRound: number;
  }>;
}

// Extend the RoundOverData to include detailed player scores
interface RoundOverData extends BaseRoundOverData {
  playerScores: Array<{
    id: string;
    score: number;
    factsUsedThisRound: number;
    guessAttemptsThisRound: number;
  }>;
}

const activeGames = new Map<string, GameWithGuessTracking>();
const waitingPlayers: CustomSocket[] = [];

const MAX_ROUNDS = 3;
const ROUND_TIME_SECONDS = 30;
const INITIAL_POINTS_PER_ROUND = 10;
const POINTS_DEDUCTION_PER_FACT = 2;
const MAX_GUESS_ATTEMPTS_PER_ROUND = 3;

export const handleGameEvents = (io: SocketIOServer) => {
  io.on("connection", (socket: CustomSocket) => {
    socket.username =
      (socket.handshake.query.username as string) ||
      `Guest-${socket.id.substring(0, 4)}`;
    console.log(`User connected: ${socket.username} (ID: ${socket.id})`);

    // --- Matchmaking Events ---
    socket.on("player:findOpponent", () => {
      console.log(`${socket.username} is looking for an opponent.`);

      const existingWaitingIndex = waitingPlayers.findIndex(
        (p) => p.id === socket.id
      );
      if (existingWaitingIndex !== -1) {
        waitingPlayers.splice(existingWaitingIndex, 1);
      }

      waitingPlayers.push(socket);
      socket.emit("player:waiting");

      if (waitingPlayers.length >= 2) {
        const player1Socket = waitingPlayers.shift()!;
        const player2Socket = waitingPlayers.shift()!;

        if (!player1Socket.connected || !player2Socket.connected) {
          console.log("One or both players disconnected during matchmaking.");
          if (player1Socket.connected) waitingPlayers.push(player1Socket);
          if (player2Socket.connected) waitingPlayers.push(player2Socket);
          return;
        }

        const gameId = uuidv4();
        const player1: Player = {
          socketId: player1Socket.id,
          username: player1Socket.username!,
          currentScore: 0,
          factsUsedThisRound: 0,
          guessAttemptsThisRound: 0,
          readyForNextRound: false,
        };
        const player2: Player = {
          socketId: player2Socket.id,
          username: player2Socket.username!,
          currentScore: 0,
          factsUsedThisRound: 0,
          guessAttemptsThisRound: 0,
          readyForNextRound: false,
        };

        player1Socket.join(gameId);
        player2Socket.join(gameId);

        const newGame: GameWithGuessTracking = {
          id: gameId,
          players: [player1, player2],
          currentRound: 0,
          targetCountry: { name: "", facts: [] },
          revealedFactIndices: [],
          timer: ROUND_TIME_SECONDS,
          intervalId: null,
          status: "waiting_for_players",
          guessedCorrectlyInRound: [],
          playersReadyForNextRound: new Set<string>(),
        };
        activeGames.set(gameId, newGame);
        console.log(
          `Game ${gameId} created between ${player1.username} and ${player2.username}`
        );

        io.to(gameId).emit("player:matched", gameId);

        setTimeout(() => startNewRound(gameId, io), 1000);
      }
    });

    // --- Game Play Events ---

    socket.on(
      "game:guess",
      ({
        gameId,
        guess,
        playerId,
      }: {
        gameId: string;
        guess: string;
        playerId: string;
      }) => {
        const game = activeGames.get(gameId);
        if (!game || game.status !== "in_game") {
          console.warn(
            `Guess received for inactive game ${gameId} or game not in progress.`
          );
          return;
        }

        const player = game.players.find((p) => p.socketId === playerId);
        if (!player) {
          console.warn(`Player ${playerId} not found in game ${gameId}.`);
          return;
        }

        if (game.guessedCorrectlyInRound.some((g) => g.playerId === playerId)) {
          console.log(
            `${player.username} already guessed correctly this round. Ignoring redundant guess.`
          );
          socket.emit("game:guessResult", {
            isCorrect: false,
            message: "You already guessed correctly this round.",
          });
          return;
        }

        player.guessAttemptsThisRound++; // Increment guess attempts

        if (player.guessAttemptsThisRound > MAX_GUESS_ATTEMPTS_PER_ROUND) {
          console.log(
            `${player.username} is out of guess attempts for this round.`
          );
          socket.emit("game:guessResult", {
            isCorrect: false,
            message: "You are out of guess attempts for this round.",
          });
          // If player is out of guesses, and the other player has already guessed correctly, end the round.
          if (game.guessedCorrectlyInRound.length === game.players.length - 1) {
            endRound(gameId, io);
          }
          return;
        }

        const isCorrect =
          guess.toLowerCase() === game.targetCountry.name.toLowerCase();

        if (isCorrect) {
          const pointsEarned = Math.max(
            0,
            INITIAL_POINTS_PER_ROUND -
              player.factsUsedThisRound * POINTS_DEDUCTION_PER_FACT
          );
          player.currentScore += pointsEarned;

          game.guessedCorrectlyInRound.push({
            playerId,
            scoreAwarded: pointsEarned,
          });
          console.log(
            `${player.username} guessed correctly! Country: ${game.targetCountry.name}, Points: ${pointsEarned}`
          );

          socket.emit("game:guessResult", {
            isCorrect: true,
            correctCountry: game.targetCountry.name,
            points: pointsEarned,
            message: "Correct guess!",
            remainingAttempts:
              MAX_GUESS_ATTEMPTS_PER_ROUND - player.guessAttemptsThisRound, // Should be 0 here as it's correct
            factsUsed: player.factsUsedThisRound,
          });

          if (
            game.guessedCorrectlyInRound.length === game.players.length ||
            game.players.length - game.guessedCorrectlyInRound.length <= 0
          ) {
            endRound(gameId, io);
          }
        } else {
          const remainingAttempts =
            MAX_GUESS_ATTEMPTS_PER_ROUND - player.guessAttemptsThisRound;
          let message = `Incorrect guess! You have ${remainingAttempts} attempts remaining.`;
          if (remainingAttempts <= 0) {
            message =
              "Incorrect guess! You have no attempts remaining for this round.";
          }
          socket.emit("game:guessResult", {
            isCorrect: false,
            correctCountry: null,
            message: message,
            remainingAttempts: remainingAttempts,
            factsUsed: player.factsUsedThisRound,
          });
          console.log(
            `${player.username} guessed "${guess}" - Incorrect. Attempts left: ${remainingAttempts}`
          );

          if (
            remainingAttempts <= 0 &&
            game.guessedCorrectlyInRound.length === game.players.length - 1
          ) {
            endRound(gameId, io);
          }
        }
      }
    );

    socket.on(
      "game:requestFact",
      ({ gameId, playerId }: { gameId: string; playerId: string }) => {
        const game = activeGames.get(gameId);
        if (!game || game.status !== "in_game") return;

        const player = game.players.find((p) => p.socketId === playerId);
        if (!player) {
          console.warn(`Player ${playerId} not found in game ${gameId}.`);
          return;
        }

        if (
          player.guessAttemptsThisRound >= MAX_GUESS_ATTEMPTS_PER_ROUND ||
          game.guessedCorrectlyInRound.some((g) => g.playerId === playerId)
        ) {
          socket.emit("game:noMoreFacts", {
            message:
              "You cannot request more facts. Either you are out of guesses or already guessed correctly.",
          });
          return;
        }

        const availableFactIndices = game.targetCountry.facts
          .map((_, index) => index)
          .filter((index) => !game.revealedFactIndices.includes(index));

        if (availableFactIndices.length > 0) {
          const nextFactIndex = availableFactIndices[0];
          const newFact = game.targetCountry.facts[nextFactIndex];
          game.revealedFactIndices.push(nextFactIndex);
          player.factsUsedThisRound++;

          console.log(
            `${player.username} requested fact. New fact: ${newFact}`
          );
          socket.emit("game:newFact", {
            fact: newFact,
            factsUsedByPlayer: player.factsUsedThisRound,
          }); // Pass the current count
        } else {
          socket.emit("game:noMoreFacts", {
            message: "No more facts available for this country.",
          });
          console.log(`No more facts available for game ${gameId}.`);
        }
      }
    );

    // --- Round & Game Flow Events ---

    socket.on("game:requestNextRound", ({ gameId }: { gameId: string }) => {
      const game = activeGames.get(gameId);
      if (!game) return;

      game.playersReadyForNextRound.add(socket.id);
      console.log(
        `${socket.username} is ready for the next round in game ${gameId}. Ready count: ${game.playersReadyForNextRound.size}/${game.players.length}`
      );

      socket.emit("game:player:readyForNextRoundAck"); // Acknowledge this player's readiness

      if (game.playersReadyForNextRound.size === game.players.length) {
        if (game.currentRound < MAX_ROUNDS) {
          console.log(
            `Starting round ${game.currentRound + 1} for game ${gameId}`
          );
          startNewRound(gameId, io);
        } else {
          emitGameOver(gameId, io); // Should already be called, but a safeguard
        }
      } else {
        // Notify the other player that *this* player is ready for next round.
        // This allows them to enable their button.
        io.to(gameId)
          .except(socket.id)
          .emit("game:opponentReadyForNextRound", { playerId: socket.id });
      }
    });

    socket.on("game:requestRematch", ({ gameId }: { gameId: string }) => {
      const game = activeGames.get(gameId);
      if (!game) return;

      game.playersReadyForNextRound.add(socket.id);
      console.log(
        `${socket.username} requested a rematch in game ${gameId}. Rematch ready count: ${game.playersReadyForNextRound.size}/${game.players.length}`
      );

      socket.emit("game:player:readyForRematchAck"); // Acknowledge this player's readiness

      if (game.playersReadyForNextRound.size === game.players.length) {
        console.log(
          `Both players ready for rematch. Starting new game for ${gameId}`
        );
        game.players.forEach((p) => {
          p.currentScore = 0;
          p.factsUsedThisRound = 0;
          p.guessAttemptsThisRound = 0;
          p.readyForNextRound = false;
        });
        game.currentRound = 0;
        game.status = "waiting_for_players";
        game.revealedFactIndices = [];
        game.timer = ROUND_TIME_SECONDS;
        game.guessedCorrectlyInRound = [];
        game.playersReadyForNextRound.clear();

        if (game.intervalId) clearInterval(game.intervalId);
        game.intervalId = null;

        startNewRound(game.id, io);
      } else {
        // Notify the other player that *this* player is ready for rematch.
        io.to(gameId)
          .except(socket.id)
          .emit("game:opponentReadyForRematch", { playerId: socket.id });
      }
    });

    // New event for explicitly leaving the game (e.g., to find a new opponent)
    socket.on("game:leaveGame", ({ gameId }: { gameId: string }) => {
      const game = activeGames.get(gameId);
      if (!game) {
        console.warn(`Attempted to leave non-existent game ${gameId}.`);
        socket.emit("game:leftSuccess"); // Acknowledge even if game not found
        return;
      }

      const playerIndex = game.players.findIndex(
        (p) => p.socketId === socket.id
      );
      if (playerIndex !== -1) {
        const leavingPlayer = game.players[playerIndex];
        console.log(
          `${leavingPlayer.username} (${leavingPlayer.socketId}) explicitly left game ${gameId}.`
        );
        game.players.splice(playerIndex, 1); // Remove player from game
        socket.leave(gameId); // Remove socket from room

        if (game.players.length === 0) {
          // Last player left, clean up game
          if (game.intervalId) {
            clearInterval(game.intervalId);
            game.intervalId = null;
          }
          activeGames.delete(game.id);
          console.log(`Game ${game.id} fully abandoned.`);
        } else {
          // Opponent left, notify remaining player and end game for them
          io.to(game.id).emit("game:opponentLeft", {
            // Use 'game:opponentLeft' for both disconnect and explicit leave
            message: `${leavingPlayer.username} has left the game.`,
            leftPlayerId: leavingPlayer.socketId,
          });
          if (game.intervalId) {
            clearInterval(game.intervalId);
            game.intervalId = null;
          }
          if (game.status !== "game_over") {
            // Only emit game over if not already
            emitGameOver(game.id, io);
          }
          console.log(
            `Game ${game.id} ended for remaining player due to opponent leaving.`
          );
        }
        socket.emit("game:leftSuccess"); // Confirm to the player that they successfully left
      } else {
        console.warn(
          `Player ${socket.id} tried to leave game ${gameId} but was not found in it.`
        );
        socket.emit("game:leftSuccess"); // Acknowledge anyway
      }
    });

    // --- Disconnection Handling ---
    socket.on("disconnect", () => {
      console.log(`User disconnected: ${socket.username} (ID: ${socket.id})`);

      const waitingIndex = waitingPlayers.findIndex((p) => p.id === socket.id);
      if (waitingIndex !== -1) {
        waitingPlayers.splice(waitingIndex, 1);
        console.log(`${socket.username} removed from waiting list.`);
      }

      activeGames.forEach((game, gameId) => {
        const playerIndex = game.players.findIndex(
          (p) => p.socketId === socket.id
        );
        if (playerIndex !== -1) {
          const disconnectedPlayer = game.players[playerIndex];
          console.log(
            `Player ${disconnectedPlayer.username} disconnected from game ${game.id}.`
          );
          game.players.splice(playerIndex, 1);

          if (game.players.length === 0) {
            if (game.intervalId) {
              clearInterval(game.intervalId);
              game.intervalId = null;
            }
            activeGames.delete(game.id);
            console.log(`Game ${game.id} ended: all players disconnected.`);
          } else {
            io.to(game.id).emit("game:opponentLeft", {
              // Using 'game:opponentLeft' for consistency
              message: `${disconnectedPlayer.username} has disconnected. Game ended.`,
              leftPlayerId: disconnectedPlayer.socketId,
            });
            if (game.intervalId) {
              clearInterval(game.intervalId);
              game.intervalId = null;
            }
            if (game.status !== "game_over") {
              emitGameOver(game.id, io);
            }
            console.log(`Game ${game.id} ended due to opponent disconnection.`);
          }
        }
      });
    });
  });
};

// --- Helper Functions for Game Flow ---

function startNewRound(gameId: string, io: SocketIOServer) {
  const game = activeGames.get(gameId);
  if (!game) return;

  const countryData = getRandomCountryWithFacts();
  if (!countryData || countryData.facts.length < 1) {
    console.error("Failed to get country with facts. Cannot start round.");
    io.to(gameId).emit("game:error", {
      message: "Failed to start round: No country data.",
    });
    return;
  }

  game.currentRound++;
  game.targetCountry = countryData;
  game.revealedFactIndices = [0];
  game.timer = ROUND_TIME_SECONDS;
  game.status = "in_game";
  game.guessedCorrectlyInRound = [];
  game.playersReadyForNextRound.clear();

  game.players.forEach((p) => {
    p.factsUsedThisRound = 0;
    p.guessAttemptsThisRound = 0;
    p.readyForNextRound = false;
  });

  if (game.intervalId) clearInterval(game.intervalId);
  game.intervalId = setInterval(() => {
    game.timer--;
    io.to(gameId).emit("game:timerUpdate", game.timer);

    if (game.timer <= 0) {
      clearInterval(game.intervalId!);
      game.intervalId = null;
      endRound(gameId, io);
    }
  }, 1000);

  const initialGameData: InitialGameData = {
    gameId: game.id,
    // Include full player data here
    players: game.players.map((p) => ({
      id: p.socketId,
      username: p.username,
      score: p.currentScore,
      factsUsedThisRound: p.factsUsedThisRound,
      guessAttemptsThisRound: p.guessAttemptsThisRound,
    })),
    currentRound: game.currentRound,
    initialFact: game.targetCountry.facts[0],
    timer: game.timer,
  };
  io.to(gameId).emit("game:start", initialGameData);
  console.log(
    `Round ${game.currentRound} started for game ${gameId}. Country: ${game.targetCountry.name}`
  );
}

function endRound(gameId: string, io: SocketIOServer) {
  const game = activeGames.get(gameId);
  if (!game) return;

  if (game.intervalId) {
    clearInterval(game.intervalId);
    game.intervalId = null;
  }

  game.status = "round_over";

  // Map full player data for round over
  const roundOverData: RoundOverData = {
    winnerId:
      game.guessedCorrectlyInRound.length > 0
        ? game.guessedCorrectlyInRound[0].playerId
        : null,
    correctCountry: game.targetCountry.name,
    playerScores: game.players.map((p) => ({
      id: p.socketId,
      score: p.currentScore,
      factsUsedThisRound: p.factsUsedThisRound,
      guessAttemptsThisRound: p.guessAttemptsThisRound,
    })),
    currentRound: game.currentRound,
  };
  io.to(gameId).emit("game:roundOver", roundOverData);
  console.log(
    `Round ${game.currentRound} for game ${gameId} ended. Correct Country: ${game.targetCountry.name}.`
  );

  if (game.currentRound >= MAX_ROUNDS) {
    console.log(`All rounds complete for game ${gameId}. Emitting game over.`);
    emitGameOver(gameId, io);
  }
}

function emitGameOver(gameId: string, io: SocketIOServer) {
  const game = activeGames.get(gameId);
  if (!game) return;

  game.status = "game_over";

  let overallWinnerId: string | null = null;
  let maxScore = -1;
  let isDraw = false;

  const finalScores = game.players.map((p) => ({
    id: p.socketId,
    score: p.currentScore,
  }));

  if (game.players.length === 2) {
    const [p1, p2] = game.players;
    if (p1.currentScore > p2.currentScore) {
      overallWinnerId = p1.socketId;
      maxScore = p1.currentScore;
    } else if (p2.currentScore > p1.currentScore) {
      overallWinnerId = p2.socketId;
      maxScore = p2.currentScore;
    } else {
      isDraw = true;
      overallWinnerId = null;
    }
  } else if (game.players.length === 1) {
    // Case for opponent disconnect
    overallWinnerId = game.players[0].socketId;
  }

  const gameOverData: GameOverData = {
    overallWinnerId: isDraw ? null : overallWinnerId,
    playerScores: finalScores, // This only needs ID and score for game over summary
  };

  io.to(gameId).emit("game:gameOver", gameOverData);
  activeGames.delete(gameId);
  console.log(
    `Game ${gameId} is over. Winner: ${
      overallWinnerId || "Draw"
    }. Scores: ${JSON.stringify(finalScores)}`
  );
}
