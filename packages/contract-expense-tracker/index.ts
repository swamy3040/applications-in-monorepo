import { xid, z } from "zod";
import { oc } from "@orpc/contract";

export const UserSchema = z.object({
  id: z.number(),
  userName: z.string(),
  email: z.string(),
  createdAt: z.date().or(z.string()),
});

export type User = z.infer<typeof UserSchema>;

export const categoriesSchema = z.object({
  id: z.number(),
  name: z.string(),
  type: z.enum(["INCOME", "EXPENSE"]),
  userId: z.number(),
  isActive: z.boolean(),
});

export const expensesSchema = z.object({
  id: z.number(),
  amount: z.number().positive(),
  description: z.string(),
  categoryId: z.number(),
  date: z.date(),
  type: z.enum(["INCOME", "EXPENSE"]),
  userId: z.number(),
  categoryName: z.string().nullable().optional(),
});

// --- AUTH CONTRACTS ---
export const registerContract = oc
  .input(
    z.object({
      userName: z.string().min(2),
      email: z.string(),
      password: z.string().min(6),
    }),
  )
  .output(UserSchema);

export const loginContract = oc
  .input(z.object({ userName: z.string(), password: z.string() }))
  .output(UserSchema);

export const requestPasswordResetContract = oc
  .input(z.object({ email: z.string().email() }))
  .output(z.boolean());

export const resetPasswordContract = oc
  .input(z.object({ token: z.string(), newPassword: z.string().min(6) }))
  .output(z.boolean());

export const getMeContract = oc.input(z.void()).output(UserSchema.nullable());

export const logoutContract = oc.input(z.void()).output(z.boolean());

// --- CATEGORY CONTRACTS ---
export const createCategoryContract = oc
  .input(z.object({ name: z.string(), type: z.enum(["INCOME", "EXPENSE"]) }))
  .output(categoriesSchema);

export const listCategoriesContract = oc
  .input(
    z
      .object({
        search: z.string().optional(),
      })
      .optional(),
  )
  .output(z.array(categoriesSchema));

export const updateCategoryContract = oc
  .input(
    z.object({
      id: z.number(),
      name: z.string().optional(),
      type: z.enum(["INCOME", "EXPENSE"]).optional(),
    }),
  )
  .output(categoriesSchema);

export const deleteCategoryContract = oc
  .input(
    z.object({
      id: z.number(),
      deleteTransactions: z.boolean().default(false).optional(),
    }),
  )
  .output(z.boolean());

// --- EXPENSE CONTRACTS ---
export const createExpenseContract = oc
  .input(
    z.object({
      amount: z.number().positive(),
      description: z.string(),
      categoryId: z.number().optional(),
      date: z.date().optional(),
      type: z.enum(["INCOME", "EXPENSE"]),
    }),
  )
  .output(expensesSchema);

export const listExpensesContract = oc
  .input(
    z
      .object({
        search: z.string().optional(),
      })
      .optional(),
  )
  .output(z.array(expensesSchema));

// 👇 NEW: Update Expense
export const updateExpenseContract = oc
  .input(
    z.object({
      id: z.number(),
      amount: z.number().positive().optional(),
      description: z.string().optional(),
      categoryId: z.number().optional(),
      date: z.date().optional(),
      type: z.enum(["INCOME", "EXPENSE"]).optional(),
    }),
  )
  .output(expensesSchema);

export const deleteExpenseContract = oc
  .input(z.object({ id: z.number() }))
  .output(z.boolean());

export const bulkDeleteExpenseContract = oc
  .input(
    z.object({
      ids: z.array(z.number()),
    }),
  )
  .output(z.boolean());

export const bulkImportExpenseContract = oc
  .input(
    z.object({
      transactions: z.array(
        z.object({
          date: z.string(), // We send dates as strings from the CSV
          description: z.string(),
          amount: z.number().positive(),
          type: z.enum(["INCOME", "EXPENSE"]),
          categoryName: z.string().optional(), // We pass the string name, not the ID
        }),
      ),
    }),
  )
  .output(
    z.object({
      success: z.boolean(),
      insertedCount: z.number(),
    }),
  );

// --- DASHBOARD SCHEMAS ---
export const dashboardOverviewSchema = z.object({
  totalIncome: z.number(),
  totalExpenses: z.number(),
  balance: z.number(),
  savingsRate: z.number(),
});

export const dashboardHighlightsSchema = z.object({
  topSpendingCategory: z.string().nullable(), // Nullable in case the user has 0 expenses
  topSpendingAmount: z.number(),
});

export const dashboardMonthlyCashFlowSchema = z.object({
  month: z.string(),
  Income: z.number(),
  Expenses: z.number(),
});

export const dashboardExpenseBreakdownSchema = z.object({
  categoryId: z.number(),
  name: z.string(),
  amount: z.number(),
  percentage: z.number(),
});

export const dashboardRecentTransactionSchema = z.object({
  id: z.number(),
  date: z.date().or(z.string()), // Accept both Date objects or string dates
  amount: z.number(),
  category: z.string(),
});

// This is the final master schema that combines them all
export const dashboardSummarySchema = z.object({
  overview: dashboardOverviewSchema,
  highlights: dashboardHighlightsSchema,
  monthlyCashFlow: z.array(dashboardMonthlyCashFlowSchema),
  expenseBreakdown: z.array(dashboardExpenseBreakdownSchema),
  recentTransactions: z.array(dashboardRecentTransactionSchema),
});

// --- DASHBOARD CONTRACTS ---

export const getDashboardSummaryContract = oc
  .input(
    // It is good practice to allow optional dates so you can filter by "This Month" or "This Year" later
    z
      .object({
        startDate: z.string().optional(),
        endDate: z.string().optional(),
      })
      .optional(),
  )
  .output(dashboardSummarySchema);

/**
 * 4. THE CONTRACT METHODS OBJECT
 */
export const contractMethods = {
  auth: {
    register: registerContract,
    login: loginContract,
    getMe: getMeContract,
    logout: logoutContract,
    requestPasswordReset: requestPasswordResetContract,
    resetPassword: resetPasswordContract,
  },
  categories: {
    create: createCategoryContract,
    list: listCategoriesContract,
    update: updateCategoryContract,
    delete: deleteCategoryContract,
  },
  expenses: {
    create: createExpenseContract,
    list: listExpensesContract,
    update: updateExpenseContract,
    delete: deleteExpenseContract,
    bulkDelete: bulkDeleteExpenseContract,
    bulkImport: bulkImportExpenseContract,
  },
  dashboard: {
    getSummary: getDashboardSummaryContract,
  },
};
