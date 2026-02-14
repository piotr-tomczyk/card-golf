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
    <div className="rounded-lg bg-green-900/50 p-4 text-center">
      <div className="space-y-2">
        {/* Final turn warning */}
        {isFinalTurn && (
          <div className="mb-2 rounded-lg bg-yellow-600 px-4 py-2 text-lg font-bold text-white animate-pulse">
            ⚠️ FINAL TURN!
          </div>
        )}

        {/* Current turn */}
        <div>
          {isYourTurn ? (
            <p className="text-2xl font-bold text-green-300">
              Your Turn
            </p>
          ) : (
            <p className="text-2xl font-bold text-white">
              {currentPlayerName}'s Turn
            </p>
          )}
        </div>

        {/* Round and turn info */}
        <div className="flex items-center justify-center gap-4 text-sm text-green-300">
          <span>
            Round {currentRound} of {totalRounds}
          </span>
          <span>•</span>
          <span>Turn {turnNumber}</span>
        </div>
      </div>
    </div>
  );
}
