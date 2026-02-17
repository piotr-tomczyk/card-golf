import { and, eq } from "drizzle-orm";
import { z } from "zod";

import { createTRPCRouter, playerProcedure } from "@/server/api/trpc";
import { db } from "@/server/db";
import { gamePlayers, games, roundScores } from "@/server/db/schema";
import {
  GameError,
  handleDiscardDrawnCard,
  handleDrawCard,
  handlePlaceDrawnCard,
  handleRoundEnd,
  handleRevealInitialCards,
  handleStartNextRound,
  handleTakeDiscardAndReplace,
  handleUncoverCard,
  initializeGame,
} from "@/server/game/engine";
import type { Card, GameConfig, GameState, PlayerCard, PlayerState } from "@/server/game/types";
import { DEFAULT_CONFIG } from "@/server/game/types";
import { TRPCError } from "@trpc/server";

function generateCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

/** Load full game state from DB into engine-compatible format */
async function loadGameState(
  db: typeof import("@/server/db").db,
  gameId: string,
): Promise<GameState> {
  const game = await db.query.games.findFirst({
    where: eq(games.id, gameId),
    with: { players: true },
  });
  if (!game) throw new TRPCError({ code: "NOT_FOUND", message: "Game not found" });

  return {
    id: game.id,
    code: game.code,
    status: game.status,
    config: game.config,
    currentRound: game.currentRound,
    currentPlayerIndex: game.currentPlayerIndex,
    turnNumber: game.turnNumber,
    deck: game.deck,
    discardPile: game.discardPile,
    drawnCard: (game.drawnCard as Card) ?? null,
    finishTriggeredBy: game.finishTriggeredBy,
    finalTurnPlayersRemaining: game.finalTurnPlayersRemaining,
    dealerIndex: game.dealerIndex,
    players: game.players
      .sort((a, b) => a.playerIndex - b.playerIndex)
      .map((p) => ({
        id: p.id,
        userId: p.userId,
        playerIndex: p.playerIndex,
        hand: p.hand,
        revealedCount: p.revealedCount,
        totalScore: p.totalScore,
        setupComplete: p.setupComplete,
        displayName: p.displayName,
        isGuest: p.isGuest,
      })),
  };
}

/** Save game state back to DB */
async function saveGameState(
  db: typeof import("@/server/db").db,
  state: GameState,
): Promise<void> {
  await db
    .update(games)
    .set({
      status: state.status,
      currentRound: state.currentRound,
      currentPlayerIndex: state.currentPlayerIndex,
      turnNumber: state.turnNumber,
      deck: state.deck,
      discardPile: state.discardPile,
      drawnCard: state.drawnCard,
      finishTriggeredBy: state.finishTriggeredBy,
      finalTurnPlayersRemaining: state.finalTurnPlayersRemaining,
      dealerIndex: state.dealerIndex,
    })
    .where(eq(games.id, state.id));

  for (const player of state.players) {
    await db
      .update(gamePlayers)
      .set({
        hand: player.hand,
        revealedCount: player.revealedCount,
        totalScore: player.totalScore,
        setupComplete: player.setupComplete,
      })
      .where(eq(gamePlayers.id, player.id));
  }
}

/** Process round end: calculate scores, save to DB, update game state.
 *  Idempotent — checks for existing scores before inserting. */
async function processRoundEnd(
  database: typeof import("@/server/db").db,
  state: GameState,
): Promise<GameState> {
  if (state.status !== "round_ended") return state;

  // Check if scores were already saved (idempotent)
  const existingScores = await database.query.roundScores.findMany({
    where: (rs, { eq, and: andOp }) =>
      andOp(
        eq(roundScores.gameId, state.id),
        eq(roundScores.roundNumber, state.currentRound),
      ),
  });

  // Scores already processed — totalScore in DB is already correct
  if (existingScores.length > 0) {
    return state;
  }

  const result = handleRoundEnd(state);

  for (const rs of result.roundScores) {
    await database.insert(roundScores).values({
      gameId: state.id,
      playerId: rs.playerId,
      roundNumber: state.currentRound,
      score: rs.score,
      hand: rs.hand,
    });
  }

  return result.state;
}

/** Strip hidden info from game state for a specific player */
function sanitizeForPlayer(state: GameState, playerId: string) {
  return {
    id: state.id,
    code: state.code,
    status: state.status,
    config: state.config,
    currentRound: state.currentRound,
    currentPlayerIndex: state.currentPlayerIndex,
    turnNumber: state.turnNumber,
    deckCount: state.deck.length,
    discardTop: state.discardPile.length > 0
      ? state.discardPile[state.discardPile.length - 1]
      : null,
    drawnCard: state.players.find((p) => p.userId === playerId)
      ? state.drawnCard
      : null,
    finishTriggeredBy: state.finishTriggeredBy,
    dealerIndex: state.dealerIndex,
    players: state.players.map((p) => ({
      id: p.id,
      userId: p.userId,
      playerIndex: p.playerIndex,
      displayName: p.displayName,
      isGuest: p.isGuest,
      totalScore: p.totalScore,
      setupComplete: p.setupComplete,
      hand: p.hand.map((card) => {
        // Show all cards if round ended or finished
        if (state.status === "round_ended" || state.status === "finished") {
          return card;
        }
        // Show own cards (face-up ones), hide opponent face-down cards
        if (p.userId === playerId) {
          return card;
        }
        return card.faceUp ? card : { card: null, faceUp: false };
      }),
    })),
  };
}

export const gameRouter = createTRPCRouter({
  create: playerProcedure
    .input(
      z
        .object({
          totalRounds: z.number().min(1).max(18).optional(),
        })
        .optional(),
    )
    .mutation(async ({ ctx, input }) => {
      const config: GameConfig = {
        ...DEFAULT_CONFIG,
        ...(input?.totalRounds ? { totalRounds: input.totalRounds } : {}),
      };

      const code = generateCode();

      const [game] = await ctx.db
        .insert(games)
        .values({
          code,
          status: "waiting",
          config,
          createdById: ctx.playerId,
        })
        .returning();

      await ctx.db.insert(gamePlayers).values({
        gameId: game!.id,
        userId: ctx.playerId,
        playerIndex: 0,
        displayName: ctx.playerName,
        isGuest: ctx.isGuest,
      });

      return { code, gameId: game!.id };
    }),

  join: playerProcedure
    .input(z.object({ code: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const game = await ctx.db.query.games.findFirst({
        where: eq(games.code, input.code.toUpperCase()),
        with: { players: true },
      });

      if (!game) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Game not found" });
      }

      if (game.status !== "waiting") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Game has already started",
        });
      }

      // Check if already in game
      const existing = game.players.find((p) => p.userId === ctx.playerId);
      if (existing) {
        return { code: game.code, gameId: game.id };
      }

      if (game.players.length >= game.config.maxPlayers) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Game is full",
        });
      }

      await ctx.db.insert(gamePlayers).values({
        gameId: game.id,
        userId: ctx.playerId,
        playerIndex: game.players.length,
        displayName: ctx.playerName,
        isGuest: ctx.isGuest,
      });

      // If game is now full, transition to setup and deal
      if (game.players.length + 1 >= game.config.maxPlayers) {
        let state = await loadGameState(ctx.db, game.id);
        state = initializeGame(state);
        await saveGameState(ctx.db, state);
      }

      return { code: game.code, gameId: game.id };
    }),

  getByCode: playerProcedure
    .input(z.object({ code: z.string() }))
    .query(async ({ ctx, input }) => {
      const game = await ctx.db.query.games.findFirst({
        where: eq(games.code, input.code.toUpperCase()),
      });

      if (!game) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Game not found" });
      }

      const state = await loadGameState(ctx.db, game.id);
      return sanitizeForPlayer(state, ctx.playerId);
    }),

  pollState: playerProcedure
    .input(z.object({ gameId: z.string(), lastTurnNumber: z.number() }))
    .query(async ({ ctx, input }) => {
      const game = await ctx.db.query.games.findFirst({
        where: eq(games.id, input.gameId),
      });

      if (!game) return null;

      // Return full state if turn changed or status changed
      if (game.turnNumber !== input.lastTurnNumber || game.status !== "playing") {
        const state = await loadGameState(ctx.db, game.id);
        return sanitizeForPlayer(state, ctx.playerId);
      }

      return null;
    }),

  revealInitialCards: playerProcedure
    .input(
      z.object({
        gameId: z.string(),
        positions: z.array(z.number()),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      let state = await loadGameState(ctx.db, input.gameId);
      try {
        state = handleRevealInitialCards(state, ctx.playerId, input.positions);
      } catch (e) {
        if (e instanceof GameError) {
          throw new TRPCError({ code: "BAD_REQUEST", message: e.message });
        }
        throw e;
      }
      await saveGameState(ctx.db, state);
      return sanitizeForPlayer(state, ctx.playerId);
    }),

  drawCard: playerProcedure
    .input(z.object({ gameId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      let state = await loadGameState(ctx.db, input.gameId);
      try {
        state = handleDrawCard(state, ctx.playerId);
      } catch (e) {
        if (e instanceof GameError) {
          throw new TRPCError({ code: "BAD_REQUEST", message: e.message });
        }
        throw e;
      }
      await saveGameState(ctx.db, state);
      return sanitizeForPlayer(state, ctx.playerId);
    }),

  placeDrawnCard: playerProcedure
    .input(z.object({ gameId: z.string(), position: z.number() }))
    .mutation(async ({ ctx, input }) => {
      let state = await loadGameState(ctx.db, input.gameId);
      try {
        state = handlePlaceDrawnCard(state, ctx.playerId, input.position);
      } catch (e) {
        if (e instanceof GameError) {
          throw new TRPCError({ code: "BAD_REQUEST", message: e.message });
        }
        throw e;
      }
      state = await processRoundEnd(ctx.db, state);
      await saveGameState(ctx.db, state);
      return sanitizeForPlayer(state, ctx.playerId);
    }),

  discardDrawnCard: playerProcedure
    .input(z.object({ gameId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      let state = await loadGameState(ctx.db, input.gameId);
      try {
        state = handleDiscardDrawnCard(state, ctx.playerId);
      } catch (e) {
        if (e instanceof GameError) {
          throw new TRPCError({ code: "BAD_REQUEST", message: e.message });
        }
        throw e;
      }
      state = await processRoundEnd(ctx.db, state);
      await saveGameState(ctx.db, state);
      return sanitizeForPlayer(state, ctx.playerId);
    }),

  takeDiscardAndReplace: playerProcedure
    .input(z.object({ gameId: z.string(), position: z.number() }))
    .mutation(async ({ ctx, input }) => {
      let state = await loadGameState(ctx.db, input.gameId);
      try {
        state = handleTakeDiscardAndReplace(
          state,
          ctx.playerId,
          input.position,
        );
      } catch (e) {
        if (e instanceof GameError) {
          throw new TRPCError({ code: "BAD_REQUEST", message: e.message });
        }
        throw e;
      }
      state = await processRoundEnd(ctx.db, state);
      await saveGameState(ctx.db, state);
      return sanitizeForPlayer(state, ctx.playerId);
    }),

  uncoverCard: playerProcedure
    .input(z.object({ gameId: z.string(), position: z.number() }))
    .mutation(async ({ ctx, input }) => {
      let state = await loadGameState(ctx.db, input.gameId);
      try {
        state = handleUncoverCard(state, ctx.playerId, input.position);
      } catch (e) {
        if (e instanceof GameError) {
          throw new TRPCError({ code: "BAD_REQUEST", message: e.message });
        }
        throw e;
      }

      state = await processRoundEnd(ctx.db, state);

      await saveGameState(ctx.db, state);
      return sanitizeForPlayer(state, ctx.playerId);
    }),

  startNextRound: playerProcedure
    .input(z.object({ gameId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      let state = await loadGameState(ctx.db, input.gameId);

      // Process round end if not already processed
      state = await processRoundEnd(ctx.db, state);

      if (state.status === "finished") {
        await saveGameState(ctx.db, state);
        return sanitizeForPlayer(state, ctx.playerId);
      }

      try {
        state = handleStartNextRound(state);
      } catch (e) {
        if (e instanceof GameError) {
          throw new TRPCError({ code: "BAD_REQUEST", message: e.message });
        }
        throw e;
      }
      await saveGameState(ctx.db, state);
      return sanitizeForPlayer(state, ctx.playerId);
    }),

  getRoundScores: playerProcedure
    .input(z.object({ gameId: z.string() }))
    .query(async ({ ctx, input }) => {
      const scores = await ctx.db.query.roundScores.findMany({
        where: eq(roundScores.gameId, input.gameId),
        with: { player: true },
        orderBy: (rs, { asc }) => [asc(rs.roundNumber)],
      });

      return scores.map((s) => ({
        roundNumber: s.roundNumber,
        playerId: s.playerId,
        playerName: s.player.displayName,
        score: s.score,
        hand: s.hand,
      }));
    }),

  getResults: playerProcedure
    .input(z.object({ gameId: z.string() }))
    .query(async ({ ctx, input }) => {
      const state = await loadGameState(ctx.db, input.gameId);

      const scores = await ctx.db.query.roundScores.findMany({
        where: eq(roundScores.gameId, input.gameId),
        with: { player: true },
        orderBy: (rs, { asc }) => [asc(rs.roundNumber)],
      });

      const playerResults = state.players.map((p) => ({
        playerId: p.id,
        displayName: p.displayName,
        totalScore: p.totalScore,
        rounds: scores
          .filter((s) => s.playerId === p.id)
          .map((s) => ({
            roundNumber: s.roundNumber,
            score: s.score,
            hand: s.hand,
          })),
      }));

      // Sort by total score (lowest wins)
      playerResults.sort((a, b) => a.totalScore - b.totalScore);

      return {
        status: state.status,
        players: playerResults,
        winnerId: state.status === "finished" ? playerResults[0]?.playerId : null,
      };
    }),

  abandon: playerProcedure
    .input(z.object({ gameId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db
        .update(games)
        .set({ status: "abandoned" })
        .where(eq(games.id, input.gameId));

      return { success: true };
    }),
});
