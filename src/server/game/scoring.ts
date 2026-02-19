import { CARD_VALUES, getRank, type PlayerCard, type Rank } from "./types";

export type MatchType = "column" | "row" | "diagonal" | "square";

/** The four 2×2 blocks in a 3×3 grid (by position index). */
const SQUARE_BLOCKS: number[][] = [
  [0, 1, 3, 4], // top-left
  [1, 2, 4, 5], // top-right
  [3, 4, 6, 7], // bottom-left
  [4, 5, 7, 8], // bottom-right
];

/**
 * Returns a map of card positions → match type for all positions that are
 * part of a matching line or square (same rank). Only includes face-up, non-null cards.
 *
 * For 3×3 grids: checks 2×2 squares first, then columns, rows, and diagonals.
 * For other grids: checks columns only.
 *
 * Priority: square > column > row > diagonal (first match per position wins).
 */
export function getMatchedLineTypes(
  hand: { card: string | null; faceUp: boolean }[],
  gridCols: number,
): Record<number, MatchType> {
  const gridRows = hand.length / gridCols;
  const result: Record<number, MatchType> = {};
  const isNineCard = gridRows === 3 && gridCols === 3;

  const checkGroup = (positions: number[], type: MatchType) => {
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
    // 2×2 squares (highest priority)
    for (const block of SQUARE_BLOCKS) {
      checkGroup(block, "square");
    }
    // Columns (priority 2)
    for (let col = 0; col < gridCols; col++) {
      checkGroup([0, 1, 2].map((row) => row * gridCols + col), "column");
    }
    // Rows (priority 3)
    for (let row = 0; row < gridRows; row++) {
      checkGroup([0, 1, 2].map((col) => row * gridCols + col), "row");
    }
    // Diagonals (priority 4)
    checkGroup([0, 4, 8], "diagonal");
    checkGroup([2, 4, 6], "diagonal");
  } else {
    // Classic: columns only
    for (let col = 0; col < gridCols; col++) {
      const positions: number[] = [];
      for (let row = 0; row < gridRows; row++) positions.push(row * gridCols + col);
      checkGroup(positions, "column");
    }
  }

  return result;
}

/**
 * Score for a card in a 2×2 square match: the negation of its normal value.
 * Positive-scoring cards become negative (A → −1, 5 → −5, J/Q/T → −10).
 * K stays 0. 2 (normally −2) becomes +2 (a risk for squaring 2s).
 */
export function squareCardScore(rank: Rank): number {
  return -(CARD_VALUES[rank] ?? 0);
}

/**
 * Calculate score for a hand.
 * - Classic: if all cards in a column share the same rank, that column scores 0.
 * - 3×3: 2×2 matching squares score negative (negated value); matching columns/rows/
 *   diagonals score 0; all other cards score normally.
 */
export function calculateScore(hand: PlayerCard[], gridCols: number): number {
  const gridRows = hand.length / gridCols;
  const isNineCard = gridRows === 3 && gridCols === 3;

  if (isNineCard) {
    const asVisible = hand.map((c) => ({ card: c.card as string | null, faceUp: true }));
    const matchMap = getMatchedLineTypes(asVisible, gridCols);

    let total = 0;
    for (let i = 0; i < hand.length; i++) {
      const card = hand[i];
      if (!card?.card) continue;
      const rank = getRank(card.card);
      const type = matchMap[i];
      if (type === "square") {
        total += squareCardScore(rank);
      } else if (!type) {
        total += CARD_VALUES[rank] ?? 0;
      }
      // line types (column/row/diagonal): add 0
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
