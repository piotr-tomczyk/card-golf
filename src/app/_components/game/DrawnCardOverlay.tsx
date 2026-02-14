"use client";

import { Card } from "./Card";
import type { Card as CardType } from "@/server/game/types";

interface DrawnCardOverlayProps {
  /** The card that was drawn */
  card: CardType;
  /** Callback when "Place in hand" is selected */
  onPlace: () => void;
  /** Callback when "Discard" is selected */
  onDiscard: () => void;
  /** Whether actions are disabled (mutation pending) */
  disabled?: boolean;
}

export function DrawnCardOverlay({
  card,
  onPlace,
  onDiscard,
  disabled = false,
}: DrawnCardOverlayProps) {
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
            : "Placing in hand lets you replace a card. Discarding means you must flip a face-down card."}
        </p>
      </div>
    </div>
  );
}
