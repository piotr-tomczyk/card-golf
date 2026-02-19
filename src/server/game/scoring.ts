import { CARD_VALUES, getRank, type PlayerCard } from "./types";

type MatchType = "column" | "row" | "diagonal";

/**
 * Returns a map of card positions → match type for all positions that are
 * part of a matching line (same rank). Only includes face-up, non-null cards.
 *
 * For 3×3 grids: checks columns, rows, and diagonals.
 * For other grids: checks columns only.
 *
 * Priority when a card is in multiple matching lines: column > row > diagonal.
 */
export function getMatchedLineTypes(
  hand: { card: string | null; faceUp: boolean }[],
  gridCols: number,
): Record<number, MatchType> {
  const gridRows = hand.length / gridCols;
  const result: Record<number, MatchType> = {};
  const isNineCard = gridRows === 3 && gridCols === 3;

  const checkLine = (positions: number[], type: MatchType) => {
    const valid = positions
      .map((pos) => ({ pos, slot: hand[pos] }))
      .filter(({ slot }) => slot?.faceUp && slot.card !== null);

    if (valid.length !== positions.length) return; // not all visible
    const firstRank = valid[0]!.slot!.card!.slice(0, 1);
    if (!valid.every(({ slot }) => slot!.card!.startsWith(firstRank))) return;

    for (const { pos } of valid) {
      if (!(pos in result)) result[pos] = type; // first match wins (priority)
    }
  };

  if (isNineCard) {
    // Columns (priority 1)
    for (let col = 0; col < gridCols; col++) {
      checkLine([0, 1, 2].map((row) => row * gridCols + col), "column");
    }
    // Rows (priority 2)
    for (let row = 0; row < gridRows; row++) {
      checkLine([0, 1, 2].map((col) => row * gridCols + col), "row");
    }
    // Diagonals (priority 3)
    checkLine([0, 4, 8], "diagonal");
    checkLine([2, 4, 6], "diagonal");
  } else {
    // Classic: columns only
    for (let col = 0; col < gridCols; col++) {
      const positions: number[] = [];
      for (let row = 0; row < gridRows; row++) positions.push(row * gridCols + col);
      checkLine(positions, "column");
    }
  }

  return result;
}

/**
 * Calculate score for a hand.
 * - Classic: if all cards in a column share the same rank, that column scores 0.
 * - 3×3: any column, row, or diagonal where all 3 cards share the same rank scores 0.
 */
export function calculateScore(hand: PlayerCard[], gridCols: number): number {
  const gridRows = hand.length / gridCols;
  const isNineCard = gridRows === 3 && gridCols === 3;

  if (isNineCard) {
    // Build a face-up-all version (server always has real cards)
    const asVisible = hand.map((c) => ({ card: c.card as string | null, faceUp: true }));
    const zeroSet = getMatchedLineTypes(asVisible, gridCols);

    let total = 0;
    for (let i = 0; i < hand.length; i++) {
      if (i in zeroSet) continue;
      const card = hand[i];
      if (card?.card) {
        total += CARD_VALUES[getRank(card.card)] ?? 0;
      }
    }
    return total;
  }

  // Classic: columns only
  let total = 0;
  for (let col = 0; col < gridCols; col++) {
    const columnCards: PlayerCard[] = [];
    for (let row = 0; row < gridRows; row++) {
      const card = hand[row * gridCols + col];
      if (card && card.card) columnCards.push(card);
    }
    if (columnCards.length === 0) continue;

    const firstRank = getRank(columnCards[0]!.card);
    const allMatch = columnCards.every((c) => getRank(c.card) === firstRank);
    if (allMatch && columnCards.length > 1) continue;

    for (const pc of columnCards) {
      total += CARD_VALUES[getRank(pc.card)] ?? 0;
    }
  }
  return total;
}
