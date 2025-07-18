import React, { useEffect } from "react";
// If you want confetti, install canvas-confetti: npm install canvas-confetti
// import confetti from "canvas-confetti";

interface WinnerPopupProps {
  winnerName: string;
  onClose: () => void;
  show: boolean;
  isGameOver?: boolean;
}

const WinnerPopup: React.FC<WinnerPopupProps> = ({
  winnerName,
  onClose,
  show,
  isGameOver = false,
}) => {
  useEffect(() => {
    if (show) {
      // Uncomment if using canvas-confetti
      // confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 } });
    }
  }, [show]);

  if (!show) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-70">
      <div className="bg-white rounded-xl shadow-2xl p-10 flex flex-col items-center animate-bounce-in">
        <div className="text-6xl mb-4">🏆</div>
        <h2 className="text-3xl font-bold text-green-700 mb-2">
          {isGameOver ? "Game Winner!" : "Round Winner!"}
        </h2>
        <p className="text-2xl font-semibold text-gray-800 mb-6">
          {winnerName}
        </p>
        <button
          onClick={onClose}
          className="px-6 py-2 rounded-md bg-green-600 text-white font-bold hover:bg-green-700 transition"
        >
          Close
        </button>
      </div>
      <style jsx>{`
        @keyframes bounce-in {
          0% {
            transform: scale(0.7);
            opacity: 0;
          }
          60% {
            transform: scale(1.1);
            opacity: 1;
          }
          100% {
            transform: scale(1);
          }
        }
        .animate-bounce-in {
          animation: bounce-in 0.7s cubic-bezier(0.68, -0.55, 0.27, 1.55);
        }
      `}</style>
    </div>
  );
};

export default WinnerPopup;
