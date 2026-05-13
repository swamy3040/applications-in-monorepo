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
 * AUTH MIDDLEWARE
 * Standard security gate for all protected routes
 */

export const requestPasswordReset =
  implemented.auth.requestPasswordReset.handler(async ({ input }) => {
    const user = await db.query.users.findFirst({
      where: eq(schema.users.email, input.email.toLowerCase()),
    });

    // We return true even if user isn't found to prevent "email fishing"
    if (!user) {
      console.log(`❌ No user found for reset: ${input.email}`);
      return true; // Still return true for security
    }

    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 3600000); // 1 hour expiry

    await db
      .update(schema.users)
      .set({
        resetToken: token,
        resetTokenExpiresAt: expiresAt,
      })
      .where(eq(schema.users.id, user.id));

    // In a real app, you'd email this. For now, we log it to the console.
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

// --- BUSINESS HANDLERS (PROTECTED) ---

export const createCategory = implemented.categories.create
  .use(authMiddleware)
  .handler(async ({ input, context }) => {
    if (!context.authUser) throw new Error("Unauthorized");

    const [newCategory] = await db
      .insert(schema.categories)
      .values({
        name: input.name,
        type: input.type,
        userId: context.authUser.userId, // 👈 Linked to Owner
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
      .where(eq(schema.categories.userId, context.authUser.userId)); // 👈 Only see YOURS
  });

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
        userId: context.authUser.userId, // 👈 Linked to Owner
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
      .where(eq(schema.expenses.userId, context.authUser.userId)); // 👈 Privacy first

    return result.map((e) => ({ ...e, amount: Number(e.amount) }));
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
  categories: { create: createCategory, list: listCategories },
  expenses: { create: createExpense, list: listExpenses },
});

export type AppRouter = typeof appRouter;
