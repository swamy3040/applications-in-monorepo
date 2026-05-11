// db.ts
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";
import "dotenv/config"; // This automatically loads your .env file
import { config } from "dotenv";
import path from "path";

config({ path: path.resolve(__dirname, "../../.env") });
// 1. Grab the connection string from your .env
const connectionString = process.env.DATABASE_URL_PLAYGROUND;

if (!connectionString) {
  throw new Error("Missing DATABASE_URL_PLAYGROUND in .env");
}

// 2. Create the direct client
const client = postgres(connectionString);

// 3. Export the connected DB so we can use it in our scripts!
export const db = drizzle(client, { schema });
