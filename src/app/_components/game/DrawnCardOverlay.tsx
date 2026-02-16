"use client";

import { useState } from "react";
import { Card } from "./Card";
import { PlayerHand } from "./PlayerHand";
import type { Card as CardType, PlayerCard } from "@/server/game/types";

interface DrawnCardOverlayProps {
  /** The card that was drawn */
  card: CardType;
  /** Current player's hand */
  hand: (PlayerCard | { card: CardType | null; faceUp: boolean })[];
  /** Callback when "Place in hand" is selected */
  onPlace: () => void;
  /** Callback when "Discard" is selected */
  onDiscard: () => void;
  /** Whether actions are disabled (mutation pending) */
  disabled?: boolean;
}

export function DrawnCardOverlay({
  card,
  hand,
  onPlace,
  onDiscard,
  disabled = false,
}: DrawnCardOverlayProps) {
  const [showHand, setShowHand] = useState(false);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="max-w-md space-y-6 rounded-2xl bg-green-900 p-8 shadow-2xl">
        {/* Title */}
        <h2 className="text-center text-3xl font-bold text-white">
          You Drew
        </h2>

        {/* Card Display */}
        <div className="flex justify-center">
          <div className="scale-150">
            <Card card={card} faceUp={true} size="lg" />
          </div>
        </div>

        {/* Instructions */}
        <p className="text-center text-green-200">
          Choose what to do with this card
        </p>

        {/* View Hand Toggle */}
        <button
          onClick={() => setShowHand(!showHand)}
          className="w-full rounded-lg bg-green-800 px-4 py-2 text-sm font-medium text-green-200 transition hover:bg-green-700"
        >
          {showHand ? "Hide your hand" : "View your hand"}
        </button>

        {showHand && (
          <div className="rounded-lg bg-green-950/50 p-3">
            <PlayerHand
              cards={hand}
              label="Your Hand"
              isCurrentPlayer={false}
              size="sm"
            />
          </div>
        )}

        {/* Action Buttons */}
        <div className="space-y-3">
          <button
            onClick={onPlace}
            disabled={disabled}
            className="w-full rounded-lg bg-green-600 px-6 py-4 text-xl font-semibold text-white transition hover:bg-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Place in Hand
          </button>

          <button
            onClick={onDiscard}
            disabled={disabled}
            className="w-full rounded-lg bg-red-600 px-6 py-4 text-xl font-semibold text-white transition hover:bg-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Discard
          </button>
        </div>

        <p className="text-center text-xs text-green-400">
          {disabled
            ? "Processing..."
            : "Placing replaces a card in your hand. Discarding ends your turn."}
        </p>
      </div>
    </div>
  );
}
