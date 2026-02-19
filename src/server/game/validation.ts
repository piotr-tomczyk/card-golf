import type { GameState, PlayerState } from "./types";

export class GameError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "GameError";
  }
}

export function getPlayer(state: GameState, userId: string): PlayerState {
  const player = state.players.find((p) => p.userId === userId);
  if (!player) throw new GameError("Player not in this game");
  return player;
}

export function getCurrentPlayer(state: GameState): PlayerState {
  const player = state.players.find(
    (p) => p.playerIndex === state.currentPlayerIndex,
  );
  if (!player) throw new GameError("Current player not found");
  return player;
}

export function validateIsCurrentPlayer(
  state: GameState,
  userId: string,
): PlayerState {
  const current = getCurrentPlayer(state);
  if (current.userId !== userId) {
    throw new GameError("Not your turn");
  }
  return current;
}

export function validateSetupPhase(state: GameState): void {
  if (state.status !== "setup") {
    throw new GameError("Game is not in setup phase");
  }
}

export function validatePlayingPhase(state: GameState): void {
  if (state.status !== "playing" && state.status !== "final_turn") {
    throw new GameError("Game is not in playing phase");
  }
}

export function validatePosition(
  position: number,
  handSize: number,
): void {
  if (position < 0 || position >= handSize) {
    throw new GameError(`Invalid position: ${position}`);
  }
}

export function validateHasDrawnCard(state: GameState): void {
  if (!state.drawnCard) {
    throw new GameError("No card has been drawn");
  }
}

export function validateNoDrawnCard(state: GameState): void {
  if (state.drawnCard) {
    throw new GameError("Must place or discard drawn card first");
  }
}

export function validateCanDraw(state: GameState): void {
  validatePlayingPhase(state);
  validateNoDrawnCard(state);
  if (state.deck.length === 0) {
    throw new GameError("Deck is empty");
  }
}

export function validateRevealInitialCards(
  state: GameState,
  userId: string,
  positions: number[],
): PlayerState {
  validateSetupPhase(state);
  const player = getPlayer(state, userId);

  if (player.setupComplete) {
    throw new GameError("Already completed setup");
  }

  if (positions.length !== state.config.initialRevealCount) {
    throw new GameError(
      `Must reveal exactly ${state.config.initialRevealCount} cards`,
    );
  }

  const unique = new Set(positions);
  if (unique.size !== positions.length) {
    throw new GameError("Duplicate positions");
  }

  for (const pos of positions) {
    validatePosition(pos, player.hand.length);
    if (player.hand[pos]!.faceUp) {
      throw new GameError(`Card at position ${pos} is already face up`);
    }
  }

  return player;
}
