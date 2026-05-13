import * as types from "drizzle-orm/pg-core";

export const categories = types.pgTable("categories", {
  id: types
    .bigint("id", { mode: "number" })
    .primaryKey()
    .generatedAlwaysAsIdentity(),
  name: types.text("name").notNull(),
  type: types.text("type").$type<"INCOME" | "EXPENSE">().notNull(),
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
});
