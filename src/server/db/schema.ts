import { relations, sql } from "drizzle-orm";
import {
  boolean,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTableCreator,
  primaryKey,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { type AdapterAccount } from "next-auth/adapters";
import type { Card, GameConfig, PlayerCard } from "@/server/game/types";

/**
 * This is an example of how to use the multi-project schema feature of Drizzle ORM. Use the same
 * database instance for multiple projects.
 *
 * @see https://orm.drizzle.team/docs/goodies#multi-project-schema
 */
export const createTable = pgTableCreator((name) => `card-golf_${name}`);

export const posts = createTable(
  "post",
  (d) => ({
    id: d.integer().primaryKey().generatedByDefaultAsIdentity(),
    name: d.varchar({ length: 256 }),
    createdById: d
      .varchar({ length: 255 })
      .notNull()
      .references(() => users.id),
    createdAt: d
      .timestamp({ withTimezone: true })
      .$defaultFn(() => /* @__PURE__ */ new Date())
      .notNull(),
    updatedAt: d.timestamp({ withTimezone: true }).$onUpdate(() => new Date()),
  }),
  (t) => [
    index("created_by_idx").on(t.createdById),
    index("name_idx").on(t.name),
  ],
);

export const users = createTable("user", (d) => ({
  id: d
    .varchar({ length: 255 })
    .notNull()
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  name: d.varchar({ length: 255 }),
  email: d.varchar({ length: 255 }).notNull(),
  emailVerified: d
    .timestamp({
      mode: "date",
      withTimezone: true,
    })
    .$defaultFn(() => /* @__PURE__ */ new Date()),
  image: d.varchar({ length: 255 }),
}));

export const usersRelations = relations(users, ({ many }) => ({
  accounts: many(accounts),
}));

export const accounts = createTable(
  "account",
  (d) => ({
    userId: d
      .varchar({ length: 255 })
      .notNull()
      .references(() => users.id),
    type: d.varchar({ length: 255 }).$type<AdapterAccount["type"]>().notNull(),
    provider: d.varchar({ length: 255 }).notNull(),
    providerAccountId: d.varchar({ length: 255 }).notNull(),
    refresh_token: d.text(),
    access_token: d.text(),
    expires_at: d.integer(),
    token_type: d.varchar({ length: 255 }),
    scope: d.varchar({ length: 255 }),
    id_token: d.text(),
    session_state: d.varchar({ length: 255 }),
  }),
  (t) => [
    primaryKey({ columns: [t.provider, t.providerAccountId] }),
    index("account_user_id_idx").on(t.userId),
  ],
);

export const accountsRelations = relations(accounts, ({ one }) => ({
  user: one(users, { fields: [accounts.userId], references: [users.id] }),
}));

export const sessions = createTable(
  "session",
  (d) => ({
    sessionToken: d.varchar({ length: 255 }).notNull().primaryKey(),
    userId: d
      .varchar({ length: 255 })
      .notNull()
      .references(() => users.id),
    expires: d.timestamp({ mode: "date", withTimezone: true }).notNull(),
  }),
  (t) => [index("t_user_id_idx").on(t.userId)],
);

export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, { fields: [sessions.userId], references: [users.id] }),
}));

export const verificationTokens = createTable(
  "verification_token",
  (d) => ({
    identifier: d.varchar({ length: 255 }).notNull(),
    token: d.varchar({ length: 255 }).notNull(),
    expires: d.timestamp({ mode: "date", withTimezone: true }).notNull(),
  }),
  (t) => [primaryKey({ columns: [t.identifier, t.token] })],
);

// ─── Game tables ────────────────────────────────────────────────

export const gameStatusEnum = pgEnum("card-golf_game_status", [
  "waiting",
  "setup",
  "playing",
  "final_turn",
  "round_ended",
  "finished",
  "abandoned",
]);

export const games = createTable(
  "game",
  {
    id: uuid().defaultRandom().primaryKey(),
    code: varchar({ length: 8 }).notNull(),
    status: gameStatusEnum().notNull().default("waiting"),
    config: jsonb().$type<GameConfig>().notNull(),
    currentRound: integer().notNull().default(1),
    currentPlayerIndex: integer().notNull().default(0),
    turnNumber: integer().notNull().default(0),
    deck: jsonb().$type<Card[]>().notNull().default(sql`'[]'::jsonb`),
    discardPile: jsonb().$type<Card[]>().notNull().default(sql`'[]'::jsonb`),
    drawnCard: varchar({ length: 2 }),
    finishTriggeredBy: varchar({ length: 255 }),
    finalTurnPlayersRemaining: jsonb()
      .$type<string[]>()
      .notNull()
      .default(sql`'[]'::jsonb`),
    dealerIndex: integer().notNull().default(0),
    createdById: varchar({ length: 255 }).notNull(),
    createdAt: timestamp({ withTimezone: true })
      .$defaultFn(() => new Date())
      .notNull(),
    updatedAt: timestamp({ withTimezone: true }).$onUpdate(() => new Date()),
  },
  (t) => [
    uniqueIndex("game_code_idx").on(t.code),
    index("game_status_idx").on(t.status),
  ],
);

export const gamesRelations = relations(games, ({ many }) => ({
  players: many(gamePlayers),
  roundScores: many(roundScores),
}));

export const gamePlayers = createTable(
  "game_player",
  {
    id: uuid().defaultRandom().primaryKey(),
    gameId: uuid()
      .notNull()
      .references(() => games.id),
    userId: varchar({ length: 255 }).notNull(),
    playerIndex: integer().notNull(),
    hand: jsonb().$type<PlayerCard[]>().notNull().default(sql`'[]'::jsonb`),
    revealedCount: integer().notNull().default(0),
    totalScore: integer().notNull().default(0),
    setupComplete: boolean().notNull().default(false),
    displayName: varchar({ length: 255 }).notNull(),
    isGuest: boolean().notNull().default(false),
  },
  (t) => [
    index("game_player_game_idx").on(t.gameId),
    index("game_player_user_idx").on(t.userId),
  ],
);

export const gamePlayersRelations = relations(gamePlayers, ({ one, many }) => ({
  game: one(games, { fields: [gamePlayers.gameId], references: [games.id] }),
  roundScores: many(roundScores),
}));

export const roundScores = createTable(
  "round_score",
  {
    id: uuid().defaultRandom().primaryKey(),
    gameId: uuid()
      .notNull()
      .references(() => games.id),
    playerId: uuid()
      .notNull()
      .references(() => gamePlayers.id),
    roundNumber: integer().notNull(),
    score: integer().notNull(),
    hand: jsonb().$type<PlayerCard[]>().notNull(),
    createdAt: timestamp({ withTimezone: true })
      .$defaultFn(() => new Date())
      .notNull(),
  },
  (t) => [
    index("round_score_game_idx").on(t.gameId),
    index("round_score_player_idx").on(t.playerId),
  ],
);

export const roundScoresRelations = relations(roundScores, ({ one }) => ({
  game: one(games, { fields: [roundScores.gameId], references: [games.id] }),
  player: one(gamePlayers, {
    fields: [roundScores.playerId],
    references: [gamePlayers.id],
  }),
}));

export const guestPlayers = createTable("guest_player", {
  id: varchar({ length: 255 }).notNull().primaryKey(),
  displayName: varchar({ length: 255 }).notNull(),
  createdAt: timestamp({ withTimezone: true })
    .$defaultFn(() => new Date())
    .notNull(),
});
