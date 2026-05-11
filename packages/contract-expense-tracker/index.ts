import { z } from "zod";
import { oc } from "@orpc/contract";

export const categoriesSchema = z.object({
  id: z.number(),
  name: z.string(),
  type: z.enum(["INCOME", "EXPENSE"]),
});

export const expensesSchema = z.object({
  id: z.number(),
  amount: z.number().positive(),
  description: z.string(),
  categoryId: z.number(),
  date: z.date(),
  type: z.enum(["INCOME", "EXPENSE"]),
});

export const categoriesContract = oc
  .input(z.object({ name: z.string(), type: z.enum(["INCOME", "EXPENSE"]) }))
  .output(categoriesSchema);

export const expensesContract = oc
  .input(
    z.object({
      amount: z.number().positive,
      description: z.string(),
      categoryId: z.number(),
      date: z.date().optional(),
      type: z.enum(["INCOME", "EXPENSE"]),
    }),
  )
  .output(expensesSchema);

export const contractMethods = {
  contrat: {
    categories: categoriesContract,
    expenses: expensesContract,
  },
};
