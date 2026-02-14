import { CARD_VALUES, getRank, type PlayerCard } from "./types";

/**
 * Calculate score for a hand.
 * - Column bonus: if all cards in a column have the same rank, they all score 0.
 * - Otherwise, each card scores its face value.
 */
export function calculateScore(hand: PlayerCard[], gridCols: number): number {
  const gridRows = hand.length / gridCols;
  let total = 0;

  for (let col = 0; col < gridCols; col++) {
    // Collect cards in this column
    const columnCards: PlayerCard[] = [];
    for (let row = 0; row < gridRows; row++) {
      const card = hand[row * gridCols + col];
      if (card && card.card) {
        columnCards.push(card);
      }
    }

    if (columnCards.length === 0) continue;

    // Check if all cards in column have the same rank
    const firstRank = getRank(columnCards[0]!.card);
    const allMatch = columnCards.every((c) => getRank(c.card) === firstRank);

    if (allMatch && columnCards.length > 1) {
      // Column bonus: all count as 0
      continue;
    }

    // Normal scoring
    for (const pc of columnCards) {
      const rank = getRank(pc.card);
      const value = CARD_VALUES[rank];
      if (value !== undefined) {
        total += value;
      }
    }
  }

  return total;
}
