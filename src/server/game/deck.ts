import { type Card, RANKS, SUITS } from "./types";

/** Create a standard 52-card deck (+ 2 Jokers per deck when withJokers=true), optionally multiple decks */
export function createDeck(deckCount = 1, withJokers = false): Card[] {
  const deck: Card[] = [];
  for (let d = 0; d < deckCount; d++) {
    for (const rank of RANKS) {
      if (rank === "*") continue; // Jokers are added separately below
      for (const suit of SUITS) {
        deck.push(`${rank}${suit}`);
      }
    }
    if (withJokers) {
      deck.push("*S"); // Red Joker
      deck.push("*H"); // Black Joker
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
export function createShuffledDeck(deckCount = 1, withJokers = false): Card[] {
  return shuffle(createDeck(deckCount, withJokers));
}

/** Deal cards from the deck. Mutates the deck array. */
export function dealCards(deck: Card[], count: number): Card[] {
  return deck.splice(0, count);
}
