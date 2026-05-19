import { implement } from "@orpc/server";
import { config } from "dotenv";
import path from "path";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import { eq, and, sql } from "drizzle-orm";
import { contractMethods } from "@repo/contract-expense-tracker";
import * as schema from "@repo/db-expense-tracker";
import crypto from "crypto";

// 1. Load Environment Variables
config({ path: path.resolve(__dirname, "../../.env") });

const JWT_SECRET = process.env.JWT_SECRET_EXPENSE_TRACKER;
if (!JWT_SECRET) throw new Error("JWT_SECRET_EXPENSE_TRACKER is missing!");

const connectionString = process.env.DATABASE_URL_EXPENSE_TRACKER!;
export const db = schema.createDb(connectionString);

// 2. Define Context Type
type AuthContext = {
  req: any;
  res: any;
  authUser: { userId: number } | null;
};

// 3. Initialize Implementation
const implemented = implement(contractMethods).$context<AuthContext>();

/**
 * AUTH MIDDLEWARE & PASSWORD RESET
 */
export const requestPasswordReset =
  implemented.auth.requestPasswordReset.handler(async ({ input }) => {
    const user = await db.query.users.findFirst({
      where: eq(schema.users.email, input.email.toLowerCase()),
    });

    if (!user) return true; // Still return true for security (prevent email fishing)

    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 3600000); // 1 hour expiry

    await db
      .update(schema.users)
      .set({ resetToken: token, resetTokenExpiresAt: expiresAt })
      .where(eq(schema.users.id, user.id));

    console.log("-----------------------------------------");
    console.log(`🔑 RESET LINK FOR: ${user.email}`);
    console.log(`URL: http://localhost:5174/reset-password?token=${token}`);
    console.log("-----------------------------------------");

    return true;
  });

export const resetPassword = implemented.auth.resetPassword.handler(
  async ({ input }) => {
    const user = await db.query.users.findFirst({
      where: eq(schema.users.resetToken, input.token),
    });

    if (
      !user ||
      !user.resetTokenExpiresAt ||
      user.resetTokenExpiresAt < new Date()
    ) {
      throw new Error("Invalid or expired reset token");
    }

    const hashedPassword = await bcrypt.hash(input.newPassword, 10);

    await db
      .update(schema.users)
      .set({
        password: hashedPassword,
        resetToken: null,
        resetTokenExpiresAt: null,
      })
      .where(eq(schema.users.id, user.id));

    return true;
  },
);

const authMiddleware = implemented.middleware(async ({ context, next }) => {
  const cookieHeader = context.req.headers?.cookie || "";
  const token = cookieHeader.split("token=")[1]?.split(";")[0];

  if (!token)
    return next({ context: { ...context, authUser: null } as AuthContext });

  try {
    const decoded = jwt.verify(token, JWT_SECRET!) as { userId: number };
    return next({ context: { ...context, authUser: decoded } as AuthContext });
  } catch (err) {
    return next({ context: { ...context, authUser: null } as AuthContext });
  }
});

// --- AUTH HANDLERS ---
export const register = implemented.auth.register.handler(async ({ input }) => {
  const hashedPassword = await bcrypt.hash(input.password, 10);
  const [newUser] = await db
    .insert(schema.users)
    .values({
      userName: input.userName,
      email: input.email.toLowerCase(),
      password: hashedPassword,
    })
    .returning();

  return { ...newUser, createdAt: newUser.createdAt.toISOString() };
});

export const login = implemented.auth.login.handler(
  async ({ input, context }) => {
    const user = await db.query.users.findFirst({
      where: eq(
        sql`lower(${schema.users.userName})`,
        input.userName.toLowerCase(),
      ),
    });

    if (!user || !(await bcrypt.compare(input.password, user.password))) {
      throw new Error("Invalid email or password");
    }

    const token = jwt.sign({ userId: user.id }, JWT_SECRET!, {
      expiresIn: "7d",
    });

    context.res.setHeader(
      "Set-Cookie",
      `token=${token}; HttpOnly; Path=/; Max-Age=${60 * 60 * 24 * 7}; SameSite=Lax; Secure`,
    );

    return { ...user, createdAt: user.createdAt.toISOString() };
  },
);

export const getMe = implemented.auth.getMe
  .use(authMiddleware)
  .handler(async ({ context }) => {
    if (!context.authUser) return null;
    const user = await db.query.users.findFirst({
      where: eq(schema.users.id, context.authUser.userId),
    });
    return user ? { ...user, createdAt: user.createdAt.toISOString() } : null;
  });

export const logout = implemented.auth.logout.handler(async ({ context }) => {
  context.res.setHeader(
    "Set-Cookie",
    "token=; HttpOnly; Path=/; Max-Age=0; SameSite=Lax",
  );
  return true;
});

// --- CATEGORY HANDLERS ---
export const createCategory = implemented.categories.create
  .use(authMiddleware)
  .handler(async ({ input, context }) => {
    if (!context.authUser) throw new Error("Unauthorized");
    const [newCategory] = await db
      .insert(schema.categories)
      .values({
        name: input.name,
        type: input.type,
        userId: context.authUser.userId,
      })
      .returning();
    return newCategory;
  });

export const listCategories = implemented.categories.list
  .use(authMiddleware)
  .handler(async ({ context }) => {
    if (!context.authUser) throw new Error("Unauthorized");
    return await db
      .select()
      .from(schema.categories)
      .where(eq(schema.categories.userId, context.authUser.userId));
  });

export const updateCategory = implemented.categories.update
  .use(authMiddleware)
  .handler(async ({ input, context }) => {
    if (!context.authUser) throw new Error("Unauthorized");
    const [updated] = await db
      .update(schema.categories)
      .set({
        ...(input.name && { name: input.name }),
        ...(input.type && { type: input.type }),
      })
      .where(
        and(
          eq(schema.categories.id, input.id),
          eq(schema.categories.userId, context.authUser.userId),
        ),
      )
      .returning();
    if (!updated) throw new Error("Category not found or unauthorized");
    return updated;
  });

export const deleteCategory = implemented.categories.delete
  .use(authMiddleware)
  .handler(async ({ input, context }) => {
    if (!context.authUser) throw new Error("Unauthorized");
    const [deleted] = await db
      .delete(schema.categories)
      .where(
        and(
          eq(schema.categories.id, input.id),
          eq(schema.categories.userId, context.authUser.userId),
        ),
      )
      .returning();
    if (!deleted) throw new Error("Category not found or unauthorized");
    return true;
  });

// --- EXPENSE HANDLERS ---
export const createExpense = implemented.expenses.create
  .use(authMiddleware)
  .handler(async ({ input, context }) => {
    if (!context.authUser) throw new Error("Unauthorized");
    const [newExpense] = await db
      .insert(schema.expenses)
      .values({
        amount: input.amount.toString(),
        description: input.description,
        categoryId: input.categoryId,
        type: input.type,
        userId: context.authUser.userId,
        date: input.date ? new Date(input.date) : new Date(),
      })
      .returning();
    return { ...newExpense, amount: Number(newExpense.amount) };
  });

export const listExpenses = implemented.expenses.list
  .use(authMiddleware)
  .handler(async ({ context }) => {
    if (!context.authUser) throw new Error("Unauthorized");
    const result = await db
      .select()
      .from(schema.expenses)
      .where(eq(schema.expenses.userId, context.authUser.userId));
    return result.map((e) => ({ ...e, amount: Number(e.amount) }));
  });

export const updateExpense = implemented.expenses.update
  .use(authMiddleware)
  .handler(async ({ input, context }) => {
    if (!context.authUser) throw new Error("Unauthorized");
    const [updated] = await db
      .update(schema.expenses)
      .set({
        ...(input.amount && { amount: input.amount.toString() }),
        ...(input.description && { description: input.description }),
        ...(input.categoryId && { categoryId: input.categoryId }),
        ...(input.type && { type: input.type }),
        ...(input.date && { date: new Date(input.date) }),
      })
      .where(
        and(
          eq(schema.expenses.id, input.id),
          eq(schema.expenses.userId, context.authUser.userId),
        ),
      )
      .returning();
    if (!updated) throw new Error("Expense not found or unauthorized");
    return { ...updated, amount: Number(updated.amount) };
  });

export const deleteExpense = implemented.expenses.delete
  .use(authMiddleware)
  .handler(async ({ input, context }) => {
    if (!context.authUser) throw new Error("Unauthorized");
    const [deleted] = await db
      .delete(schema.expenses)
      .where(
        and(
          eq(schema.expenses.id, input.id),
          eq(schema.expenses.userId, context.authUser.userId),
        ),
      )
      .returning();
    if (!deleted) throw new Error("Expense not found or unauthorized");
    return true;
  });

// 4. Final Router
export const appRouter = implemented.router({
  auth: {
    register,
    login,
    getMe,
    logout,
    requestPasswordReset,
    resetPassword,
  },
  categories: {
    create: createCategory,
    list: listCategories,
    update: updateCategory,
    delete: deleteCategory,
  },
  expenses: {
    create: createExpense,
    list: listExpenses,
    update: updateExpense,
    delete: deleteExpense,
  },
});

export type AppRouter = typeof appRouter;
