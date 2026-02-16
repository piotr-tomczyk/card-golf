import { createShuffledDeck } from "./deck";
import type { Card, GameState, PlayerCard, PlayerState } from "./types";

/** Deep-clone game state for immutable updates */
export function cloneState(state: GameState): GameState {
  return JSON.parse(JSON.stringify(state)) as GameState;
}

/** Reveal initial cards during setup phase */
export function revealInitialCards(
  state: GameState,
  player: PlayerState,
  positions: number[],
): GameState {
  const next = cloneState(state);
  const p = next.players.find((pl) => pl.id === player.id)!;

  for (const pos of positions) {
    p.hand[pos]!.faceUp = true;
  }
  p.revealedCount = positions.length;
  p.setupComplete = true;

  // Check if all players have completed setup
  const allReady = next.players.every((pl) => pl.setupComplete);
  if (allReady) {
    next.status = "playing";
    // Player after dealer goes first
    next.currentPlayerIndex =
      (next.dealerIndex + 1) % next.players.length;
    next.turnNumber = 1;
  }

  return next;
}

/** Draw the top card from the deck. Returns new state with drawnCard set. */
export function drawCard(state: GameState): GameState {
  const next = cloneState(state);
  const card = next.deck.shift();
  if (!card) throw new Error("Deck is empty");
  next.drawnCard = card;
  return next;
}

/**
 * Place the drawn card at a position in the current player's hand.
 * The replaced card goes to the discard pile.
 */
export function placeDrawnCard(
  state: GameState,
  player: PlayerState,
  position: number,
): GameState {
  const next = cloneState(state);
  const p = next.players.find((pl) => pl.id === player.id)!;

  const drawnCard = next.drawnCard!;
  const oldCard = p.hand[position]!.card;

  // Place drawn card face up, old card goes to discard pile
  p.hand[position] = { card: drawnCard, faceUp: true };
  next.discardPile.push(oldCard);
  next.drawnCard = null;

  return advanceTurn(next, p);
}

/** Discard the drawn card. Ends the turn. */
export function discardDrawnCard(state: GameState): GameState {
  const next = cloneState(state);
  const currentPlayer = next.players.find(
    (p) => p.playerIndex === next.currentPlayerIndex,
  )!;
  next.discardPile.push(next.drawnCard!);
  next.drawnCard = null;
  return advanceTurn(next, currentPlayer);
}

/**
 * After discarding, the player must uncover a face-down card.
 * This completes their turn.
 */
export function uncoverCard(
  state: GameState,
  player: PlayerState,
  position: number,
): GameState {
  const next = cloneState(state);
  const p = next.players.find((pl) => pl.id === player.id)!;

  p.hand[position]!.faceUp = true;

  return advanceTurn(next, p);
}

/**
 * Take the top card from the discard pile and replace a card in hand.
 * The replaced card goes to the discard pile. Completes the turn.
 */
export function takeDiscardAndReplace(
  state: GameState,
  player: PlayerState,
  position: number,
): GameState {
  const next = cloneState(state);
  const p = next.players.find((pl) => pl.id === player.id)!;

  const discardCard = next.discardPile.pop();
  if (!discardCard) throw new Error("Discard pile is empty");

  // Replace hand card with discard card; old hand card goes to discard pile
  const oldCard = p.hand[position]!.card;
  p.hand[position] = { card: discardCard, faceUp: true };
  next.discardPile.push(oldCard);

  return advanceTurn(next, p);
}

/** Check if a player has all cards face up */
function allCardsFaceUp(player: PlayerState): boolean {
  return player.hand.every((c) => c.faceUp);
}

/**
 * Advance turn to next player, handling final_turn and round_ended transitions.
 */
function advanceTurn(state: GameState, actingPlayer: PlayerState): GameState {
  // Check if acting player just revealed all their cards → trigger final turn
  if (
    state.status === "playing" &&
    allCardsFaceUp(actingPlayer)
  ) {
    state.status = "final_turn";
    state.finishTriggeredBy = actingPlayer.userId;
    // Everyone else gets one more turn
    state.finalTurnPlayersRemaining = state.players
      .filter((p) => p.userId !== actingPlayer.userId)
      .map((p) => p.userId);
  }

  if (state.status === "final_turn") {
    // Remove acting player from remaining list
    state.finalTurnPlayersRemaining =
      state.finalTurnPlayersRemaining.filter(
        (id) => id !== actingPlayer.userId,
      );

    if (state.finalTurnPlayersRemaining.length === 0) {
      // Round is over
      state.status = "round_ended";
      // Reveal all cards
      for (const p of state.players) {
        for (const card of p.hand) {
          card.faceUp = true;
        }
      }
      return state;
    }
  }

  // Move to next player
  state.currentPlayerIndex =
    (state.currentPlayerIndex + 1) % state.players.length;
  state.turnNumber++;

  return state;
}

/** Deal a fresh hand to all players, set up deck and discard pile for a new round */
export function setupNewRound(state: GameState): GameState {
  const next = cloneState(state);
  const { gridRows, gridCols, deckCount } = next.config;
  const handSize = gridRows * gridCols;

  // Create and shuffle a fresh deck
  next.deck = createShuffledDeck(deckCount);

  // Deal to each player
  for (const player of next.players) {
    const cards: PlayerCard[] = [];
    for (let i = 0; i < handSize; i++) {
      const card = next.deck.shift()!;
      cards.push({ card, faceUp: false });
    }
    player.hand = cards;
    player.setupComplete = false;
    player.revealedCount = 0;
  }

  // Start discard pile with one card
  const firstDiscard = next.deck.shift()!;
  next.discardPile = [firstDiscard];

  // Reset turn state
  next.drawnCard = null;
  next.finishTriggeredBy = null;
  next.finalTurnPlayersRemaining = [];
  next.status = "setup";
  next.turnNumber = 0;
  next.currentPlayerIndex = 0;

  return next;
}
