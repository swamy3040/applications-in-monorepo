import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";
export * from "./schema";

// This function creates the connection once and shares it
export const createDb = (connectionString: string) => {
  const client = postgres(connectionString, { prepare: false });
  return drizzle(client, { schema });
};
