"use client";

import { Card } from "./Card";

interface DrawPileProps {
  /** Number of cards remaining in deck */
  count: number;
  /** Whether the pile is clickable */
  selectable: boolean;
  /** Callback when pile is clicked */
  onClick?: () => void;
  /** Card size variant */
  size?: "sm" | "md" | "lg" | "xl";
}

const stackSizes = {
  sm: "w-16 h-24",
  md: "w-20 h-28",
  lg: "w-24 h-36",
  xl: "w-32 h-48",
};

export function DrawPile({ count, selectable, onClick, size = "lg" }: DrawPileProps) {
  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative">
        <Card
          card={null}
          faceUp={false}
          selectable={selectable}
          onClick={onClick}
          size={size}
        />
        {/* Stack effect */}
        {count > 1 && (
          <>
            <div
              className={`absolute top-[-2px] left-[-2px] ${stackSizes[size]} rounded-lg bg-blue-800 -z-10`}
              style={{ opacity: 0.5 }}
            />
            <div
              className={`absolute top-[-4px] left-[-4px] ${stackSizes[size]} rounded-lg bg-blue-900 -z-20`}
              style={{ opacity: 0.3 }}
            />
          </>
        )}
      </div>
      <div className="text-center">
        <p className="text-xs font-semibold text-white">Draw</p>
        <p className="text-xs text-green-300">
          {count} card{count !== 1 ? "s" : ""}
        </p>
      </div>
    </div>
  );
}
