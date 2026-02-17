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
}

export function ActionBar({
  turnState,
  isYourTurn,
}: ActionBarProps) {
  if (!isYourTurn) {
    return (
      <p className="text-sm text-green-300 text-center">
        Waiting for opponent...
      </p>
    );
  }

  if (turnState === "idle") {
    return (
      <p className="text-xs text-green-300 text-center">
        Tap deck to draw &middot; Tap discard to take &middot; Tap face-down card to reveal
      </p>
    );
  }

  if (turnState === "holding_drawn_card") {
    return (
      <p className="text-sm text-yellow-200 text-center">
        Drag or tap a hand position to replace, or discard
      </p>
    );
  }

  if (turnState === "choosing_replacement") {
    return (
      <p className="text-sm font-semibold text-blue-200 text-center">
        Tap a card in your hand to replace it
      </p>
    );
  }

  return null;
}
