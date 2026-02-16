import { neon } from "@neondatabase/serverless";
import { drizzle as drizzleNeon } from "drizzle-orm/neon-http";
import { drizzle as drizzlePostgres } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import { env } from "@/env";
import * as schema from "./schema";

const createDb = () => {
  if (env.NODE_ENV === "production") {
    const sql = neon(env.DATABASE_URL);
    return drizzleNeon({ client: sql, schema });
  }

  const globalForDb = globalThis as unknown as {
    conn: postgres.Sql | undefined;
  };
  const conn = globalForDb.conn ?? postgres(env.DATABASE_URL);
  globalForDb.conn = conn;
  return drizzlePostgres(conn, { schema });
};

export const db = createDb();
