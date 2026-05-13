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

export const categories = types.pgTable("categories", {
  id: types
    .bigint("id", { mode: "number" })
    .primaryKey()
    .generatedAlwaysAsIdentity(),
  name: types.text("name").notNull(),
  type: types.text("type").$type<"INCOME" | "EXPENSE">().notNull(),
  userId: types
    .bigint("user_id", { mode: "number" }) // 👈 Added owner
    .references(() => users.id)
    .notNull(),
});

export const expenses = types.pgTable("expenses", {
  id: types
    .bigint("id", { mode: "number" })
    .primaryKey()
    .generatedAlwaysAsIdentity(),
  amount: types.decimal("amount", { precision: 12, scale: 2 }).notNull(),
  description: types.text("description").notNull(),
  categoryId: types
    .bigint("category_id", { mode: "number" })
    .references(() => categories.id)
    .notNull(),
  date: types.timestamp("date").defaultNow().notNull(),
  type: types.text("type").$type<"INCOME" | "EXPENSE">().notNull(),
  userId: types
    .bigint("user_id", { mode: "number" }) // 👈 Added owner
    .references(() => users.id)
    .notNull(),
});
