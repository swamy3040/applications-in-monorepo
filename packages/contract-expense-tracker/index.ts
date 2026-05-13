import { z } from "zod";
import { oc } from "@orpc/contract";

export const UserSchema = z.object({
  id: z.number(),
  userName: z.string(),
  email: z.string(),
  createdAt: z.date().or(z.string()), // Flexible for DB or JSON
});

export const categoriesSchema = z.object({
  id: z.number(),
  name: z.string(),
  type: z.enum(["INCOME", "EXPENSE"]),
  userId: z.number(),
});

export const expensesSchema = z.object({
  id: z.number(),
  amount: z.number().positive(),
  description: z.string(),
  categoryId: z.number(),
  date: z.date(),
  type: z.enum(["INCOME", "EXPENSE"]),
  userId: z.number(),
});

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
  .input(
    z.object({
      userName: z.string(),
      password: z.string(),
    }),
  )
  .output(UserSchema);

export const requestPasswordResetContract = oc
  .input(z.object({ email: z.string().email() }))
  .output(z.boolean());

export const resetPasswordContract = oc
  .input(
    z.object({
      token: z.string(),
      newPassword: z.string().min(6),
    }),
  )
  .output(z.boolean());

export const getMeContract = oc.input(z.void()).output(UserSchema.nullable());

export const logoutContract = oc.input(z.void()).output(z.boolean());

export const createCategoryContract = oc
  .input(z.object({ name: z.string(), type: z.enum(["INCOME", "EXPENSE"]) }))
  .output(categoriesSchema);

export const listCategoriesContract = oc
  .input(z.void())
  .output(z.array(categoriesSchema));

export const createExpenseContract = oc
  .input(
    z.object({
      amount: z.number().positive(),
      description: z.string(),
      categoryId: z.number(),
      date: z.date().optional(),
      type: z.enum(["INCOME", "EXPENSE"]),
    }),
  )
  .output(expensesSchema);

export const listExpensesContract = oc
  .input(z.void())
  .output(z.array(expensesSchema));

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
  },
  expenses: {
    create: createExpenseContract,
    list: listExpensesContract,
  },
};
