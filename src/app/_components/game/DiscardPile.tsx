"use client";

import { Card } from "./Card";
import type { Card as CardType } from "@/server/game/types";

interface DiscardPileProps {
  /** Top card of discard pile (null if empty) */
  topCard: CardType | null;
  /** Whether the pile is clickable */
  selectable: boolean;
  /** Callback when pile is clicked */
  onClick?: () => void;
}

export function DiscardPile({
  topCard,
  selectable,
  onClick,
}: DiscardPileProps) {
  if (!topCard) {
    return (
      <div className="flex flex-col items-center gap-2">
        <div className="flex h-36 w-24 items-center justify-center rounded-lg border-4 border-dashed border-green-700 bg-green-900/30">
          <p className="text-center text-xs text-green-500">Empty</p>
        </div>
        <div className="text-center">
          <p className="text-sm font-semibold text-white">Discard Pile</p>
          <p className="text-xs text-green-300">No cards</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <Card
        card={topCard}
        faceUp={true}
        selectable={selectable}
        onClick={onClick}
        size="lg"
      />
      <div className="text-center">
        <p className="text-sm font-semibold text-white">Discard Pile</p>
        <p className="text-xs text-green-300">
          {selectable ? "Click to take" : "\u00A0"}
        </p>
      </div>
    </div>
  );
}
