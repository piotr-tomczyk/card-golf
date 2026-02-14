"use client";

import { Card } from "./Card";

interface DrawPileProps {
  /** Number of cards remaining in deck */
  count: number;
  /** Whether the pile is clickable */
  selectable: boolean;
  /** Callback when pile is clicked */
  onClick?: () => void;
}

export function DrawPile({ count, selectable, onClick }: DrawPileProps) {
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative">
        <Card
          card={null}
          faceUp={false}
          selectable={selectable}
          onClick={onClick}
          size="lg"
        />
        {/* Stack effect - show multiple card backs */}
        {count > 1 && (
          <>
            <div
              className="absolute top-[-2px] left-[-2px] w-24 h-36 rounded-lg bg-blue-800 -z-10"
              style={{ opacity: 0.5 }}
            />
            <div
              className="absolute top-[-4px] left-[-4px] w-24 h-36 rounded-lg bg-blue-900 -z-20"
              style={{ opacity: 0.3 }}
            />
          </>
        )}
      </div>
      <div className="text-center">
        <p className="text-sm font-semibold text-white">Draw Pile</p>
        <p className="text-xs text-green-300">
          {count} card{count !== 1 ? "s" : ""}
        </p>
      </div>
    </div>
  );
}
