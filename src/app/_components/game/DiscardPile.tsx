"use client";

import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { Card } from "./Card";
import type { Card as CardType } from "@/server/game/types";

interface DiscardPileProps {
  /** Top card of discard pile (null if empty) */
  topCard: CardType | null;
  /** Whether the pile is clickable/draggable */
  selectable: boolean;
  /** Callback when pile is clicked */
  onClick?: () => void;
  /** Card size variant */
  size?: "sm" | "md" | "lg" | "xl";
}

const emptySizes = {
  sm: "h-24 w-16",
  md: "h-28 w-20",
  lg: "h-36 w-24",
  xl: "h-48 w-32",
};

function DraggableDiscardCard({
  card,
  onClick,
  size = "lg",
}: {
  card: CardType;
  onClick?: () => void;
  size?: "sm" | "md" | "lg" | "xl";
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({
      id: "discard-card",
      data: { type: "discard-card" },
    });

  const style = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.5 : 1,
    touchAction: "none" as const,
  };

  return (
    <div ref={setNodeRef} style={style} {...listeners} {...attributes}>
      <Card
        card={card}
        faceUp={true}
        selectable={true}
        onClick={onClick}
        size={size}
        className="cursor-grab active:cursor-grabbing"
      />
    </div>
  );
}

export function DiscardPile({
  topCard,
  selectable,
  onClick,
  size = "lg",
}: DiscardPileProps) {
  if (!topCard) {
    return (
      <div className="flex flex-col items-center gap-1">
        <div className={`flex ${emptySizes[size]} items-center justify-center rounded-lg border-4 border-dashed border-green-700 bg-green-900/30`}>
          <p className="text-center text-xs text-green-500">Empty</p>
        </div>
        <div className="text-center">
          <p className="text-xs font-semibold text-white">Discard</p>
          <p className="text-xs text-green-300">No cards</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-1">
      {selectable ? (
        <DraggableDiscardCard card={topCard} onClick={onClick} size={size} />
      ) : (
        <Card
          card={topCard}
          faceUp={true}
          selectable={false}
          size={size}
        />
      )}
      <div className="text-center">
        <p className="text-xs font-semibold text-white">Discard</p>
        <p className="text-xs text-green-300">
          {selectable ? "Tap to take" : "\u00A0"}
        </p>
      </div>
    </div>
  );
}
