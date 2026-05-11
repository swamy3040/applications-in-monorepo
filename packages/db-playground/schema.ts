import * as types from "drizzle-orm/pg-core";

export const projects = types.pgTable("projects", {
  id: types.integer("id").primaryKey().generatedAlwaysAsIdentity(),
  name: types.varchar("name", { length: 255 }).notNull(),
});

export const testSuites = types.pgTable("test_suites", {
  id: types.integer("id").primaryKey().generatedAlwaysAsIdentity(),
  name: types.varchar("name", { length: 255 }).notNull(),
  projectId: types
    .integer("project_id")
    .notNull()
    .references(() => projects.id),
});

export const testCases = types.pgTable("test_cases", {
  id: types.integer("id").primaryKey().generatedAlwaysAsIdentity(),
  title: types.text("title").notNull(),
  suiteId: types
    .integer("suite_id")
    .notNull()
    .references(() => testSuites.id),
  status: types
    .text("status")
    .$type<"PASS" | "FAIL" | "PENDING">()
    .default("PENDING"),
  priority: types.text("priority").$type<"HIGH" | "MEDIUM" | "LOW">().notNull(),
});
