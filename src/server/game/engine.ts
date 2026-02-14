import {
  discardDrawnCard,
  drawCard,
  placeDrawnCard,
  revealInitialCards,
  setupNewRound,
  takeDiscardAndReplace,
  uncoverCard,
} from "./actions";
import { calculateScore } from "./scoring";
import type { Card, GameState, PlayerCard } from "./types";
import {
  GameError,
  getCurrentPlayer,
  getPlayer,
  validateCanDraw,
  validateHasDrawnCard,
  validateIsCurrentPlayer,
  validateNoDrawnCard,
  validatePlayingPhase,
  validatePosition,
  validateRevealInitialCards,
} from "./validation";

export { GameError } from "./validation";

/** Handle setup phase: player reveals initial cards */
export function handleRevealInitialCards(
  state: GameState,
  userId: string,
  positions: number[],
): GameState {
  const player = validateRevealInitialCards(state, userId, positions);
  return revealInitialCards(state, player, positions);
}

/** Handle draw from deck */
export function handleDrawCard(
  state: GameState,
  userId: string,
): GameState {
  validateIsCurrentPlayer(state, userId);
  validateCanDraw(state);
  return drawCard(state);
}

/** Handle placing drawn card at a position */
export function handlePlaceDrawnCard(
  state: GameState,
  userId: string,
  position: number,
): GameState {
  const player = validateIsCurrentPlayer(state, userId);
  validatePlayingPhase(state);
  validateHasDrawnCard(state);
  validatePosition(position, player.hand.length);
  return placeDrawnCard(state, player, position);
}

/** Handle discarding the drawn card */
export function handleDiscardDrawnCard(
  state: GameState,
  userId: string,
): GameState {
  validateIsCurrentPlayer(state, userId);
  validatePlayingPhase(state);
  validateHasDrawnCard(state);
  return discardDrawnCard(state);
}

/** Handle uncovering a face-down card after discard */
export function handleUncoverCard(
  state: GameState,
  userId: string,
  position: number,
): GameState {
  const player = validateIsCurrentPlayer(state, userId);
  validatePlayingPhase(state);
  validateNoDrawnCard(state); // Must have discarded first
  validatePosition(position, player.hand.length);

  if (player.hand[position]!.faceUp) {
    throw new GameError("Card is already face up");
  }

  return uncoverCard(state, player, position);
}

/** Handle taking from discard pile and replacing a card */
export function handleTakeDiscardAndReplace(
  state: GameState,
  userId: string,
  position: number,
): GameState {
  const player = validateIsCurrentPlayer(state, userId);
  validatePlayingPhase(state);
  validateNoDrawnCard(state);
  validatePosition(position, player.hand.length);

  if (state.discardPile.length === 0) {
    throw new GameError("Discard pile is empty");
  }

  return takeDiscardAndReplace(state, player, position);
}

/** Calculate round scores and check if game is finished */
export function handleRoundEnd(state: GameState): {
  state: GameState;
  roundScores: Array<{
    playerId: string;
    score: number;
    hand: PlayerCard[];
  }>;
} {
  if (state.status !== "round_ended") {
    throw new GameError("Round has not ended");
  }

  const roundScores = state.players.map((p) => ({
    playerId: p.id,
    score: calculateScore(p.hand, state.config.gridCols),
    hand: p.hand.map((c) => ({ ...c, faceUp: true })),
  }));

  // Apply scores
  const next = JSON.parse(JSON.stringify(state)) as GameState;
  for (const rs of roundScores) {
    const player = next.players.find((p) => p.id === rs.playerId)!;
    player.totalScore += rs.score;
  }

  // Check if this was the last round
  if (next.currentRound >= next.config.totalRounds) {
    next.status = "finished";
  }

  return { state: next, roundScores };
}

/** Start the next round */
export function handleStartNextRound(state: GameState): GameState {
  if (state.status !== "round_ended") {
    throw new GameError("Cannot start next round - round not ended");
  }

  if (state.currentRound >= state.config.totalRounds) {
    throw new GameError("All rounds have been played");
  }

  let next = JSON.parse(JSON.stringify(state)) as GameState;
  next.currentRound++;
  next.dealerIndex = (next.dealerIndex + 1) % next.players.length;

  next = setupNewRound(next);
  return next;
}

/** Initialize a new game's first round */
export function initializeGame(state: GameState): GameState {
  return setupNewRound(state);
}
