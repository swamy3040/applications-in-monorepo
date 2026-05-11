import * as types from "drizzle-orm/pg-core";

export const users = types.pgTable("users", {
  id: types
    .bigint("id", { mode: "number" })
    .primaryKey()
    .generatedAlwaysAsIdentity(),
  userName: types.text("user_name").notNull(),
  email: types.text("email").notNull().unique(),
  password: types.text("password").notNull(),
  createdAt: types.timestamp("created_at").notNull().defaultNow(),
  resetToken: types.text("reset_token").unique(),
  resetTokenExpiresAt: types.timestamp("reset_token_expires_at"),
});

export const todos = types.pgTable("todos", {
  id: types
    .bigint("id", { mode: "number" })
    .primaryKey()
    .generatedAlwaysAsIdentity(),
  userId: types
    .bigint("user_id", { mode: "number" })
    .notNull()
    .references(() => users.id),
  title: types.text("title").notNull(),
  completed: types.boolean("completed").notNull().default(false),
});
