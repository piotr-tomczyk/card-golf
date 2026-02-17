"use client";

import { useDraggable, useDroppable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { Card } from "./Card";
import type { Card as CardType } from "@/server/game/types";

interface DrawnCardInlineProps {
  card: CardType;
  onDiscard: () => void;
  disabled?: boolean;
}

function DraggableCard({ card }: { card: CardType }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({
      id: "drawn-card",
      data: { type: "drawn-card" },
    });

  const style = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.5 : 1,
    touchAction: "none" as const,
  };

  return (
    <div ref={setNodeRef} style={style} {...listeners} {...attributes}>
      <Card card={card} faceUp={true} size="xl" className="cursor-grab active:cursor-grabbing" />
    </div>
  );
}

function DiscardDropZone({
  onDiscard,
  disabled,
}: {
  onDiscard: () => void;
  disabled: boolean;
}) {
  const { isOver, setNodeRef } = useDroppable({
    id: "discard-zone",
    data: { type: "discard-zone" },
  });

  return (
    <div ref={setNodeRef}>
      <button
        onClick={onDiscard}
        disabled={disabled}
        className={`
          rounded-lg border-2 border-dashed px-6 py-3 font-semibold transition-all
          ${
            isOver
              ? "border-red-400 bg-red-600/50 text-white scale-105"
              : "border-red-500/50 bg-red-900/30 text-red-300 hover:bg-red-800/40 hover:border-red-400"
          }
          disabled:opacity-50 disabled:cursor-not-allowed
        `}
      >
        Discard
      </button>
    </div>
  );
}

export function DrawnCardInline({
  card,
  onDiscard,
  disabled = false,
}: DrawnCardInlineProps) {
  return (
    <div className="rounded-lg bg-yellow-900/30 border-2 border-yellow-600/50 p-6">
      <p className="text-center text-sm font-semibold text-yellow-200 mb-4">
        You drew — drag to a hand position or discard
      </p>
      <div className="flex items-center justify-center gap-6">
        <DraggableCard card={card} />
        <DiscardDropZone onDiscard={onDiscard} disabled={disabled} />
      </div>
    </div>
  );
}
