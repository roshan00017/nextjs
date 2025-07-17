// frontend/src/types/index.ts

// Basic Player interface (as might be on backend)
export interface Player {
  id: string; // Assuming 'id' is present
  username: string; // Assuming 'username' is present
  score: number; // <--- Add this line
  // Add any other properties your Player object might have,
  // e.g., factsUsedThisRound, guessAttemptsThisRound, etc.
  factsUsedThisRound?: number;
  guessAttemptsThisRound?: number;
  readyForNextRound?: boolean;
  // ... other properties
}

export interface CountryData {
  name: string;
  facts: string[];
}

// This is for the frontend's GameBoard component's internal state
export interface PlayerDisplay {
  id: string;
  username: string;
  score: number;
  factsUsedThisRound: number; // Added for frontend display
  guessAttemptsThisRound: number; // Added for frontend display
}

// Data structure for game:start event
export interface InitialGameData {
  gameId: string;
  players: Array<{
    // Ensure this matches what your backend sends
    id: string;
    username: string;
    score: number;
    factsUsedThisRound: number; // Crucial: Backend must send this
    guessAttemptsThisRound: number; // Crucial: Backend must send this
  }>;
  currentRound: number;
  initialFact: string;
  timer: number;
}

// Data structure for game:roundOver event
export interface RoundOverData {
  winnerId: string | null;
  correctCountry: string;
  playerScores: Array<{
    // Ensure this matches what your backend sends
    id: string;
    score: number;
    factsUsedThisRound: number; // Crucial: Backend must send this
    guessAttemptsThisRound: number; // Crucial: Backend must send this
  }>;
  currentRound: number;
}

// Data structure for game:gameOver event
export interface GameOverData {
  overallWinnerId: string | null;
  playerScores: Array<{ id: string; score: number }>; // Typically just final scores needed here
}

// Data structure for game:newFact event
export interface GameFactData {
  fact: string;
  factsUsedByPlayer: number; // This is the specific property for the requesting player's count
}

// Data structure for game:guessResult event
export interface GuessResultData {
  isCorrect: boolean;
  correctCountry?: string | null;
  points?: number;
  message?: string;
  remainingAttempts?: number;
  factsUsed?: number; // The total facts used by the guessing player
}

export interface NoMoreFactsData {
  message?: string;
}
