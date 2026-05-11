import { defineConfig } from "drizzle-kit";
import { config } from "dotenv";
import path from "path";

// __dirname is 'packages/db'
// ../ takes us to 'packages'
// ../../ takes us to 'MYTURBOPROJECTNEW'
config({ path: path.resolve(__dirname, "../../.env") });

export default defineConfig({
  schema: "./schema.ts",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});
