"use client";

interface TurnIndicatorProps {
  /** Current player name */
  currentPlayerName: string;
  /** Whether it's the current user's turn */
  isYourTurn: boolean;
  /** Current turn number */
  turnNumber: number;
  /** Current round number */
  currentRound: number;
  /** Total number of rounds */
  totalRounds: number;
  /** Whether in final turn phase */
  isFinalTurn: boolean;
}

export function TurnIndicator({
  currentPlayerName,
  isYourTurn,
  turnNumber,
  currentRound,
  totalRounds,
  isFinalTurn,
}: TurnIndicatorProps) {
  return (
    <div
      className={`sticky top-0 z-10 rounded-lg px-4 py-3 ${
        isFinalTurn
          ? "bg-yellow-600 animate-pulse"
          : isYourTurn
            ? "bg-green-600"
            : "bg-green-900/80"
      }`}
    >
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          {isFinalTurn && (
            <span className="shrink-0 text-sm font-bold text-white">FINAL TURN</span>
          )}
          {isYourTurn ? (
            <span className="text-lg font-bold text-white truncate">
              Your Turn
            </span>
          ) : (
            <span className="text-lg font-bold text-white/80 truncate">
              {currentPlayerName}&apos;s Turn
            </span>
          )}
        </div>

        <span className="shrink-0 text-sm text-white/70">
          Round {currentRound}/{totalRounds} &middot; Turn {turnNumber}
        </span>
      </div>
    </div>
  );
}
