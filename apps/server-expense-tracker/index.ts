import { implement } from "@orpc/server";
import { config } from "dotenv";
import path from "path";
import { contractMethods } from "@repo/contract-expense-tracker";
import * as schema from "@repo/db-expense-tracker";

// 1. Load Environment Variables
config({ path: path.resolve(__dirname, "../../.env") });

const connectionString = process.env.DATABASE_URL_EXPENSE_TRACKER!;
if (!connectionString) {
  throw new Error("DATABASE_URL is missing! Check your .env file.");
}

// 2. Initialize Database
export const db = schema.createDb(connectionString);

// 3. Setup oRPC Implementation Base
const implemented = implement(contractMethods.contract);

// --- HANDLERS ---

export const createCategory = implemented.categories.handler(
  async ({ input }) => {
    const [newCategory] = await db
      .insert(schema.categories)
      .values({
        name: input.name,
        type: input.type,
      })
      .returning();

    console.log(`✨ [DB] Category Created: ${newCategory.name}`);
    return newCategory;
  },
);

export const createExpense = implemented.expenses.handler(async ({ input }) => {
  const [newExpense] = await db
    .insert(schema.expenses)
    .values({
      amount: input.amount.toFixed(),
      description: input.description,
      categoryId: input.categoryId,
      type: input.type,
      date: input.date ? new Date(input.date) : new Date(),
    })
    .returning();

  console.log(
    `💸 [DB] Expense Logged: ${newExpense.description} (ID: ${newExpense.id})`,
  );
  return {
    ...newExpense,
    amount: Number(newExpense.amount),
  };
});

export const listCategories = implemented.listCategories.handler(async () => {
  const allCategories = await db.select().from(schema.categories);
  console.log(allCategories);
  return allCategories;
});

export const listExpenses = implemented.listExpenses.handler(async () => {
  const allExpenses = await db.select().from(schema.expenses);
  const allExpensesAmoutCorection = allExpenses.map((expense) => {
    return {
      ...expense,
      amount: Number(expense.amount),
    };
  });
  console.log(allExpensesAmoutCorection);
  return allExpensesAmoutCorection;
});


// 4. Group into App Router
export const appRouter = implemented.router({
  listExpenses,
  listCategories,
  categories: createCategory,
  expenses: createExpense,
});

export type AppRouter = typeof appRouter;
