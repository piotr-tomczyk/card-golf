"use client";

export type TurnState =
  | "idle" // Start of turn, can draw/take from discard/reveal a face-down card
  | "holding_drawn_card" // Drew from deck, need to place or discard
  | "choosing_replacement"; // Took from discard, need to choose where to place

interface ActionBarProps {
  /** Current turn state */
  turnState: TurnState;
  /** Whether it's the player's turn */
  isYourTurn: boolean;
  /** Whether deck is empty */
  deckEmpty: boolean;
  /** Whether discard pile is empty */
  discardEmpty: boolean;
  /** Callback to draw from deck */
  onDrawFromDeck?: () => void;
  /** Whether mutations are pending */
  isPending?: boolean;
}

export function ActionBar({
  turnState,
  isYourTurn,
  deckEmpty,
  discardEmpty,
  onDrawFromDeck,
  isPending = false,
}: ActionBarProps) {
  if (!isYourTurn) {
    return (
      <div className="rounded-lg bg-green-900/50 p-4 text-center">
        <p className="text-lg text-green-300">
          Waiting for opponent to play...
        </p>
      </div>
    );
  }

  // Idle state - can draw or take from discard
  if (turnState === "idle") {
    return (
      <div className="rounded-lg bg-green-900/50 p-6 space-y-4">
        <p className="text-center text-xl font-bold text-white">
          Your Turn - Choose an Action
        </p>

        <div className="grid gap-3">
          {!deckEmpty && (
            <button
              onClick={onDrawFromDeck}
              disabled={isPending}
              className="rounded-lg bg-blue-600 px-6 py-4 text-lg font-semibold text-white transition hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isPending ? "Drawing..." : "Draw from Deck"}
            </button>
          )}

          {!discardEmpty && (
            <div className="rounded-lg bg-green-700/50 px-6 py-3 text-center">
              <p className="text-sm text-green-200">
                Or click the discard pile to take that card
              </p>
            </div>
          )}

          <div className="rounded-lg bg-green-700/50 px-6 py-3 text-center">
            <p className="text-sm text-green-200">
              Or click a face-down card to reveal it
            </p>
          </div>

          {deckEmpty && discardEmpty && (
            <div className="rounded-lg bg-red-900/50 border-2 border-red-600 px-6 py-3 text-center">
              <p className="text-red-200">
                No cards available! Round should end soon.
              </p>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Holding drawn card - shown inline above hand
  if (turnState === "holding_drawn_card") {
    return (
      <div className="rounded-lg bg-yellow-900/30 border border-yellow-600/50 p-4 text-center">
        <p className="text-lg text-yellow-200">
          Drag the card onto a hand position to replace it, or click a hand position
        </p>
      </div>
    );
  }

  // Choosing replacement - took from discard, need to place
  if (turnState === "choosing_replacement") {
    return (
      <div className="rounded-lg bg-blue-900/50 border-2 border-blue-600 p-6 text-center">
        <p className="text-xl font-bold text-blue-200">
          Choose where to place this card
        </p>
        <p className="mt-2 text-sm text-blue-300">
          Click any card position in your hand to replace it
        </p>
      </div>
    );
  }

  return null;
}
