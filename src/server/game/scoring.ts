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
 * Squares only activate for positive-value ranks (K=0 and 2=−2 are excluded).
 * For other grids: checks columns only.
 *
 * Jokers (*) never form line or square matches — they use the pair scoring rule instead.
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

  const checkLine = (positions: number[], type: MatchType) => {
    const valid = positions
      .map((pos) => ({ pos, slot: hand[pos] }))
      .filter(({ slot }) => slot?.faceUp && slot.card !== null);

    if (valid.length !== positions.length) return;
    const firstRank = valid[0]!.slot!.card!.slice(0, 1);
    if (firstRank === "*") return; // Jokers use pair rule, not line matching
    if (!valid.every(({ slot }) => slot!.card!.startsWith(firstRank))) return;

    for (const { pos } of valid) {
      if (!(pos in result)) result[pos] = type;
    }
  };

  if (isNineCard) {
    // 2×2 squares (highest priority) — only for positive-value ranks
    for (const block of SQUARE_BLOCKS) {
      const valid = block
        .map((pos) => ({ pos, slot: hand[pos] }))
        .filter(({ slot }) => slot?.faceUp && slot.card !== null);
      if (valid.length !== 4) continue;
      const firstRank = valid[0]!.slot!.card!.slice(0, 1);
      if (firstRank === "*") continue; // Jokers use pair rule
      if (!valid.every(({ slot }) => slot!.card!.startsWith(firstRank))) continue;
      if ((CARD_VALUES[firstRank as Rank] ?? 0) <= 0) continue; // K and 2 don't activate
      for (const { pos } of valid) {
        if (!(pos in result)) result[pos] = "square";
      }
    }
    // Columns (priority 2)
    for (let col = 0; col < gridCols; col++) {
      checkLine([0, 1, 2].map((row) => row * gridCols + col), "column");
    }
    // Rows (priority 3)
    for (let row = 0; row < gridRows; row++) {
      checkLine([0, 1, 2].map((col) => row * gridCols + col), "row");
    }
    // Diagonals (priority 4)
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
 * Returns the total bonus from matched 2×2 square groups for face-up cards.
 * Each matched square contributes −(face value of the rank) once for the group.
 * Only positive-value ranks are counted (K=0 and 2=−2 are excluded).
 */
export function calcSquareBonuses(
  hand: { card: string | null; faceUp: boolean }[],
  gridCols: number,
): number {
  if (hand.length !== 9 || gridCols !== 3) return 0;
  let bonus = 0;
  for (const block of SQUARE_BLOCKS) {
    const slots = block.map((pos) => hand[pos]);
    if (!slots.every((s) => s?.faceUp && s.card !== null)) continue;
    const firstRank = slots[0]!.card!.slice(0, 1) as Rank;
    if (firstRank === "*") continue; // Jokers use pair rule
    if (!slots.every((s) => s!.card!.startsWith(firstRank))) continue;
    const rankValue = CARD_VALUES[firstRank] ?? 0;
    if (rankValue <= 0) continue;
    bonus -= rankValue; // one negative value for the whole group
  }
  return bonus;
}

/**
 * Score contribution from Jokers in a hand.
 * - 2+ Jokers: pairScore total for the pair (default −5)
 * - 1 Joker: singleScore (default +15)
 * - 0 Jokers: 0
 */
export function calcJokerScore(jokerCount: number, singleScore = 15, pairScore = -5): number {
  if (jokerCount >= 2) return pairScore;
  if (jokerCount === 1) return singleScore;
  return 0;
}

/**
 * Calculate score for a hand.
 * - Classic: if all cards in a column share the same rank, that column scores 0.
 * - 3×3: matched 2×2 squares score 0 per card plus −(rank value) once for the group;
 *   matched columns/rows/diagonals score 0; all other cards score normally.
 * - Jokers: singleScore individually (default +15), or pairScore as a pair (default −5).
 *   Jokers never participate in column/row/diagonal/square matches.
 */
export function calculateScore(hand: PlayerCard[], gridCols: number, jokerSingleScore = 15, jokerPairScore = -5): number {
  const gridRows = hand.length / gridCols;
  const isNineCard = gridRows === 3 && gridCols === 3;

  if (isNineCard) {
    const asVisible = hand.map((c) => ({ card: c.card as string | null, faceUp: true }));
    const matchMap = getMatchedLineTypes(asVisible, gridCols);

    let total = 0;
    let jokerCount = 0;
    for (let i = 0; i < hand.length; i++) {
      const card = hand[i];
      if (!card?.card) continue;
      if (getRank(card.card) === "*") {
        jokerCount++;
        continue; // Scored separately below
      }
      if (!matchMap[i]) {
        total += CARD_VALUES[getRank(card.card)] ?? 0;
      }
      // square and line positions: 0 individually
    }
    // Add one group bonus per matched square
    total += calcSquareBonuses(asVisible, gridCols);
    total += calcJokerScore(jokerCount, jokerSingleScore, jokerPairScore);
    return total;
  }

  // Classic: columns only
  let total = 0;
  let jokerCount = 0;
  for (let col = 0; col < gridCols; col++) {
    const columnCards: PlayerCard[] = [];
    for (let row = 0; row < gridRows; row++) {
      const card = hand[row * gridCols + col];
      if (!card?.card) continue;
      if (getRank(card.card) === "*") {
        jokerCount++;
        continue; // Scored separately below
      }
      columnCards.push(card);
    }
    if (columnCards.length === 0) continue;

    const firstRank = getRank(columnCards[0]!.card);
    const allMatch = columnCards.every((c) => getRank(c.card) === firstRank);
    if (allMatch && columnCards.length > 1) continue;

    for (const pc of columnCards) {
      total += CARD_VALUES[getRank(pc.card)] ?? 0;
    }
  }
  total += calcJokerScore(jokerCount);
  return total;
}
