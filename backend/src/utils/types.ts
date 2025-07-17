// Define player information for the backend's internal game state
export interface Player {
  socketId: string;
  username: string;
  currentScore: number; // Score earned so far in the game
  factsUsedThisRound: number; // Number of additional facts this player used in current round
  readyForNextRound: boolean; // For coordinating round transitions
}

// Represents a single game instance on the server
export interface Game {
  id: string; // Unique game ID
  players: Player[];
  currentRound: number; // 1, 2, or 3
  targetCountry: CountryData; // The actual country object to be guessed
  revealedFactIndices: number[]; // Indices of facts already shown from targetCountry.facts
  timer: number; // Current timer value for the round
  intervalId: NodeJS.Timeout | null; // To manage the timer interval
  status: "waiting_for_players" | "in_game" | "round_over" | "game_over";
}

// Structure for a country and its generated facts
export interface CountryData {
  name: string;
  facts: string[]; // List of generated facts for this country
}
// frontend/src/types/index.ts

// ... (other interfaces like Player, GameState) ...

// Data sent from backend on 'game:start' or 'game:roundStart'
export interface InitialGameData {
  gameId: string;
  players: { id: string; username: string; score: number }[]; // Initial scores are usually 0
  currentRound: number;
  initialFact: string;
  timer: number;
}

// Data sent from backend on 'game:newFact'
export interface NewFactData {
  fact: string;
  factsUsedByPlayerId: string; // ID of the player who requested the fact
}

// Data sent from backend on 'game:roundOver' or 'game:correctGuess'
export interface RoundOverData {
  winnerId: string | null; // ID of player who won, null if time ran out
  correctCountry: string;
  playerScores: { id: string; score: number }[]; // Updated scores for all players
  currentRound: number; // To indicate which round just finished
}

// Data sent from backend on 'game:gameOver'
export interface GameOverData {
  overallWinnerId: string | null; // ID of the overall winner, null for draw
  playerScores: { id: string; score: number }[]; // Final scores
}
