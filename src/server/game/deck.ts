import { type Card, RANKS, SUITS } from "./types";

/** Create a standard 52-card deck, optionally multiple decks */
export function createDeck(deckCount = 1): Card[] {
  const deck: Card[] = [];
  for (let d = 0; d < deckCount; d++) {
    for (const rank of RANKS) {
      for (const suit of SUITS) {
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
        deck.push(`${rank}${suit}` as Card);
      }
    }
  }
  return deck;
}

/** Fisher-Yates shuffle (in-place, returns same array) */
export function shuffle<T>(array: T[]): T[] {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j]!, array[i]!];
  }
  return array;
}

/** Create a shuffled deck */
export function createShuffledDeck(deckCount = 1): Card[] {
  return shuffle(createDeck(deckCount));
}

/** Deal cards from the deck. Mutates the deck array. */
export function dealCards(deck: Card[], count: number): Card[] {
  return deck.splice(0, count);
}
