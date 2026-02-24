import {
  discardDrawnCard,
  drawCard,
  placeDrawnCard,
  revealInitialCards,
  setupNewRound,
  takeDiscardAndReplace,
  uncoverCard,
  applyJackAbility,
  applyQueenAbility,
  applyKingAbility,
  applyJokerAbility,
} from "./actions";
import { calculateScore } from "./scoring";
import type { Card, GameState, PlayerCard } from "./types";
import {
  GameError,
  validateCanDraw,
  validateHasDrawnCard,
  validateIsCurrentPlayer,
  validateIsFaceDown,
  validateIsPowerCard,
  validateNoDrawnCard,
  validatePlayingPhase,
  validatePosition,
  validateRevealInitialCards,
  validateSpecialAbilities,
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
    score: calculateScore(
      p.hand,
      state.config.gridCols,
      state.config.jokerSingleScore ?? 15,
      state.config.jokerPairScore ?? -5,
    ),
    hand: p.hand.map((c) => ({ ...c, faceUp: true })),
  }));

  // Apply scores
  const next = JSON.parse(JSON.stringify(state)) as GameState;
  for (const rs of roundScores) {
    const player = next.players.find((p) => p.id === rs.playerId)!;
    player.totalScore += rs.score;
  }

  return { state: next, roundScores };
}

/** Start the next round, or finalize the game if all rounds are complete */
export function handleStartNextRound(state: GameState): GameState {
  if (state.status !== "round_ended") {
    throw new GameError("Cannot start next round - round not ended");
  }

  // Last round finished — transition to finished so GameOverScreen renders
  if (state.currentRound >= state.config.totalRounds) {
    const next = JSON.parse(JSON.stringify(state)) as GameState;
    next.status = "finished";
    return next;
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

/** Handle Jack ability: peek at one of your own face-down cards */
export function handleUseJackAbility(
  state: GameState,
  userId: string,
  position: number,
): { state: GameState; peekedCard: Card } {
  const player = validateIsCurrentPlayer(state, userId);
  validatePlayingPhase(state);
  validateHasDrawnCard(state);
  validateSpecialAbilities(state);
  validateIsPowerCard(state.drawnCard!);
  validatePosition(position, player.hand.length);
  validateIsFaceDown(player.hand, position);
  return applyJackAbility(state, player, position);
}

/** Handle Queen ability: peek at one of the opponent's face-down cards */
export function handleUseQueenAbility(
  state: GameState,
  userId: string,
  opponentId: string,
  position: number,
): { state: GameState; peekedCard: Card } {
  const player = validateIsCurrentPlayer(state, userId);
  validatePlayingPhase(state);
  validateHasDrawnCard(state);
  validateSpecialAbilities(state);
  validateIsPowerCard(state.drawnCard!);
  const opponent = state.players.find((p) => p.id === opponentId);
  if (!opponent) throw new GameError("Opponent not found");
  validatePosition(position, opponent.hand.length);
  validateIsFaceDown(opponent.hand, position);
  return applyQueenAbility(state, player, opponentId, position);
}

/** Handle King ability: swap one of your cards with one of the opponent's cards */
export function handleUseKingAbility(
  state: GameState,
  userId: string,
  myPosition: number,
  opponentId: string,
  opponentPosition: number,
): GameState {
  const player = validateIsCurrentPlayer(state, userId);
  validatePlayingPhase(state);
  validateHasDrawnCard(state);
  validateSpecialAbilities(state);
  validateIsPowerCard(state.drawnCard!);
  validatePosition(myPosition, player.hand.length);
  const opponent = state.players.find((p) => p.id === opponentId);
  if (!opponent) throw new GameError("Opponent not found");
  validatePosition(opponentPosition, opponent.hand.length);
  return applyKingAbility(state, player, myPosition, opponentId, opponentPosition);
}

/** Handle Joker ability: swap any two of the opponent's card positions */
export function handleUseJokerAbility(
  state: GameState,
  userId: string,
  opponentId: string,
  pos1: number,
  pos2: number,
): GameState {
  const player = validateIsCurrentPlayer(state, userId);
  validatePlayingPhase(state);
  validateHasDrawnCard(state);
  validateSpecialAbilities(state);
  validateIsPowerCard(state.drawnCard!);
  const opponent = state.players.find((p) => p.id === opponentId);
  if (!opponent) throw new GameError("Opponent not found");
  validatePosition(pos1, opponent.hand.length);
  validatePosition(pos2, opponent.hand.length);
  if (pos1 === pos2) throw new GameError("Must select two different positions");
  return applyJokerAbility(state, player, opponentId, pos1, pos2);
}
