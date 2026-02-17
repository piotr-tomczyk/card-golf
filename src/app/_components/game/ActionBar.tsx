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
      <div className="rounded-lg bg-green-900/50 px-4 py-3 text-center">
        <p className="text-sm text-green-300">
          Waiting for opponent...
        </p>
      </div>
    );
  }

  if (turnState === "idle") {
    return (
      <div className="flex flex-wrap items-center justify-center gap-2">
        {!deckEmpty && (
          <button
            onClick={onDrawFromDeck}
            disabled={isPending}
            className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isPending ? "Drawing..." : "Draw from Deck"}
          </button>
        )}
        {!discardEmpty && (
          <span className="text-xs text-green-300">
            Tap discard to take &middot; Tap face-down card to reveal
          </span>
        )}
        {discardEmpty && (
          <span className="text-xs text-green-300">
            Tap a face-down card to reveal it
          </span>
        )}
        {deckEmpty && discardEmpty && (
          <span className="text-xs text-red-300">
            No cards available
          </span>
        )}
      </div>
    );
  }

  if (turnState === "holding_drawn_card") {
    return (
      <div className="rounded-lg bg-yellow-900/30 border border-yellow-600/50 px-4 py-2 text-center">
        <p className="text-sm text-yellow-200">
          Drag or tap a hand position to replace, or discard
        </p>
      </div>
    );
  }

  if (turnState === "choosing_replacement") {
    return (
      <div className="rounded-lg bg-blue-900/50 border border-blue-600 px-4 py-2 text-center">
        <p className="text-sm font-semibold text-blue-200">
          Tap a card in your hand to replace it
        </p>
      </div>
    );
  }

  return null;
}
