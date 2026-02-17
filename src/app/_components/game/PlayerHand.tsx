"use client";

import { useDroppable } from "@dnd-kit/core";
import { Card } from "./Card";
import type { PlayerCard, Card as CardType } from "@/server/game/types";

export interface PlayerHandProps {
  /** Array of cards in hand (length should match grid size) */
  cards: (PlayerCard | { card: CardType | null; faceUp: boolean })[];
  /** Label for the hand (e.g., "Your Hand", "Opponent") */
  label: string;
  /** Whether this is the current player's hand */
  isCurrentPlayer: boolean;
  /** Callback when a card position is clicked */
  onCardClick?: (position: number) => void;
  /** Which positions are selectable */
  selectablePositions?: number[];
  /** Which positions are currently selected */
  selectedPositions?: number[];
  /** Which positions are droppable (accept dragged cards) */
  droppablePositions?: number[];
  /** Grid size (2x3 = 6 cards, 3x3 = 9 cards) */
  gridSize?: { rows: number; cols: number };
  /** Card size */
  size?: "sm" | "md" | "lg" | "xl";
}

function DroppableCardSlot({
  index,
  children,
}: {
  index: number;
  children: (isOver: boolean) => React.ReactNode;
}) {
  const { isOver, setNodeRef } = useDroppable({
    id: `hand-position-${index}`,
    data: { type: "hand-position", position: index },
  });

  return <div ref={setNodeRef}>{children(isOver)}</div>;
}

export function PlayerHand({
  cards,
  label,
  isCurrentPlayer,
  onCardClick,
  selectablePositions = [],
  selectedPositions = [],
  droppablePositions = [],
  gridSize = { rows: 2, cols: 3 },
  size = "md",
}: PlayerHandProps) {
  return (
    <div className="space-y-3">
      {/* Label */}
      <div className="text-center">
        <h3 className="text-xl font-bold text-white">{label}</h3>
      </div>

      {/* Card Grid */}
      <div className="flex justify-center">
      <div
        className="inline-grid gap-2"
        style={{
          gridTemplateColumns: `repeat(${gridSize.cols}, auto)`,
          gridTemplateRows: `repeat(${gridSize.rows}, auto)`,
        }}
      >
        {cards.map((playerCard, index) => {
          const isSelectable = selectablePositions.includes(index);
          const isSelected = selectedPositions.includes(index);
          const isDroppable = droppablePositions.includes(index);

          // For opponent cards, only show if revealed
          const showCard = isCurrentPlayer
            ? playerCard.faceUp
            : playerCard.faceUp;

          if (isDroppable) {
            return (
              <DroppableCardSlot key={index} index={index}>
                {(isOver) => (
                  <Card
                    card={showCard ? playerCard.card : null}
                    faceUp={showCard}
                    selectable={isSelectable}
                    selected={isSelected}
                    isDropTarget={isOver}
                    onClick={() => onCardClick?.(index)}
                    size={size}
                  />
                )}
              </DroppableCardSlot>
            );
          }

          return (
            <Card
              key={index}
              card={showCard ? playerCard.card : null}
              faceUp={showCard}
              selectable={isSelectable}
              selected={isSelected}
              onClick={() => onCardClick?.(index)}
              size={size}
            />
          );
        })}
      </div>
      </div>
    </div>
  );
}
