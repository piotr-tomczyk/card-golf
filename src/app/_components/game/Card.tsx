"use client";

import Image from "next/image";

export interface CardProps {
  /** Card value (e.g., "AS" for Ace of Spades, or null for unknown) */
  card: string | null;
  /** Whether the card is face-up */
  faceUp: boolean;
  /** Optional click handler */
  onClick?: () => void;
  /** Whether the card is selectable/clickable */
  selectable?: boolean;
  /** Whether the card is currently selected */
  selected?: boolean;
  /** Whether a drag is hovering over this card (drop target) */
  isDropTarget?: boolean;
  /** Whether this card is part of a matched column */
  matched?: boolean;
  /** Size variant */
  size?: "sm" | "md" | "lg" | "xl";
  /** Additional CSS classes */
  className?: string;
}

export function Card({
  card,
  faceUp,
  onClick,
  selectable = false,
  selected = false,
  isDropTarget = false,
  matched = false,
  size = "md",
  className = "",
}: CardProps) {
  const sizeClasses = {
    sm: "w-16 h-24",
    md: "w-20 h-28",
    lg: "w-24 h-36",
    xl: "w-32 h-48",
  };

  const cardImage = faceUp && card ? `/cards/${card}.svg` : "/cards/back.svg";

  return (
    <button
      onClick={selectable ? onClick : undefined}
      disabled={!selectable}
      className={`
        ${sizeClasses[size]}
        relative
        rounded-lg
        transition-all
        duration-200
        ${selectable ? "cursor-pointer hover:scale-105 hover:shadow-lg" : "cursor-default"}
        ${matched ? "matched-card" : ""}
        ${selected ? "ring-4 ring-yellow-400 scale-105 shadow-lg" : ""}
        ${isDropTarget ? "ring-4 ring-blue-400 scale-110 shadow-lg shadow-blue-500/50" : ""}
        ${!faceUp && selectable ? "hover:brightness-110" : ""}
        ${className}
      `}
      style={{
        filter: selected
          ? "drop-shadow(0 0 8px rgba(251, 191, 36, 0.8))"
          : isDropTarget
            ? "drop-shadow(0 0 12px rgba(96, 165, 250, 0.8))"
            : undefined,
      }}
    >
      <div className="relative w-full h-full">
        <Image
          src={cardImage}
          alt={faceUp && card ? `${card} card` : "Card back"}
          fill
          draggable={false}
          className="rounded-lg object-fill select-none"
          unoptimized // SVGs don't need optimization
        />
      </div>

      {/* Selection indicator */}
      {selected && (
        <div className="absolute -top-2 -right-2 flex h-6 w-6 items-center justify-center rounded-full bg-yellow-400 text-xs font-bold text-black">
          ✓
        </div>
      )}
    </button>
  );
}
