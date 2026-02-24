// Card encoding: 2-char strings - rank + suit
// Ranks: A, 2-9, T, J, Q, K, * (Joker)
// Suits: S (Spades), H (Hearts), D (Diamonds), C (Clubs)
// Example: "AS" = Ace of Spades, "TH" = 10 of Hearts, "*S" = Red Joker, "*H" = Black Joker

export const RANKS = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "T", "J", "Q", "K", "*"] as const;
export const SUITS = ["S", "H", "D", "C"] as const;

export type Rank = (typeof RANKS)[number];
export type Suit = (typeof SUITS)[number];
export type Card = `${Rank}${Suit}`;

export interface PlayerCard {
  card: Card;
  faceUp: boolean;
}

export interface GameConfig {
  maxPlayers: number;
  gridRows: number;
  gridCols: number;
  deckCount: number;
  initialRevealCount: number;
  totalRounds: number;
  specialAbilities: boolean;
  /** Whether Joker cards are included in the deck */
  includeJokers?: boolean;
  /** Score for a single Joker in hand (default 15) */
  jokerSingleScore?: number;
  /** Score for a pair of Jokers in hand — total, not per card (default −5) */
  jokerPairScore?: number;
}

export const DEFAULT_CONFIG: GameConfig = {
  maxPlayers: 2,
  gridRows: 2,
  gridCols: 3,
  deckCount: 1,
  initialRevealCount: 2,
  totalRounds: 9,
  specialAbilities: false,
  includeJokers: false,
  jokerSingleScore: 15,
  jokerPairScore: -5,
};

export type GameStatus =
  | "waiting"
  | "setup"
  | "playing"
  | "final_turn"
  | "round_ended"
  | "finished"
  | "abandoned";

export type TurnActionType =
  | "draw_card"
  | "place_drawn_card"
  | "discard_drawn_card"
  | "take_discard_and_replace"
  | "uncover_card";

export interface TurnAction {
  type: TurnActionType;
  playerId: string;
  position?: number; // grid index for placement/uncover
}

/** Score values per card rank */
export const CARD_VALUES: Record<Rank, number> = {
  A: 1,
  "2": -2,
  "3": 3,
  "4": 4,
  "5": 5,
  "6": 6,
  "7": 7,
  "8": 8,
  "9": 9,
  T: 10,
  J: 10,
  Q: 10,
  K: 0,
  "*": 15,
};

export function getRank(card: Card): Rank {
  return card[0] as Rank;
}

export function getSuit(card: Card): Suit {
  return card[1] as Suit;
}

/** Returns true if the card is a power card (J, Q, K, or Joker). */
export function isPowerCard(card: Card): boolean {
  const rank = getRank(card);
  return rank === "J" || rank === "Q" || rank === "K" || rank === "*";
}

/** Returns true if the card is a Joker. */
export function isJoker(card: Card): boolean {
  return getRank(card) === "*";
}

/** The full game state as stored in DB (used by engine) */
export interface GameState {
  id: string;
  code: string;
  status: GameStatus;
  config: GameConfig;
  currentRound: number;
  currentPlayerIndex: number;
  turnNumber: number;
  deck: Card[];
  discardPile: Card[];
  drawnCard: Card | null;
  finishTriggeredBy: string | null;
  finalTurnPlayersRemaining: string[];
  dealerIndex: number;
  players: PlayerState[];
}

export interface PlayerState {
  id: string;
  userId: string;
  playerIndex: number;
  hand: PlayerCard[];
  revealedCount: number;
  totalScore: number;
  setupComplete: boolean;
  displayName: string;
  isGuest: boolean;
}
