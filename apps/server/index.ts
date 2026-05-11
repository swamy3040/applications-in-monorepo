import { implement } from "@orpc/server";
import path from "path";
config({ path: path.resolve(__dirname, "../../.env") });
import { contractMethods } from "@repo/contract";
import { config } from "dotenv";
import * as schema from "@repo/db";
import { eq, and, sql, like, SQL } from "drizzle-orm";
import jwt from "jsonwebtoken";
import bycrypt from "bcrypt";
import crypto from "crypto";

type AuthContext = {
  req: any;
  res: any;
  authUser: { userId: number } | null;
};

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error("JWT_SECRET is missing! Check your .env file.");
}

// The server still needs the URL to pass it to the "Connection Creator"
const connectionString = process.env.DATABASE_URL!;
if (!connectionString) {
  throw new Error("DATABASE_URL is missing! Check your .env file.");
}
export const db = schema.createDb(connectionString);

const implemented = implement(contractMethods.contract).$context<AuthContext>();

export const requestPasswordReset = implemented.requestPasswordReset.handler(
  async ({ input }) => {
    const user = await db.query.users.findFirst({
      where: eq(schema.users.email, input.email),
    });

    if (!user) {
      return true; // Don't reveal that the email doesn't exist
    }

    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 3600000); // 1 hour from now

    await db
      .update(schema.users)
      .set({ resetToken: token, resetTokenExpiresAt: expiresAt })
      .where(eq(schema.users.id, user.id));

    console.log("-----------------------------------------");
    console.log(`PASSWORD RESET REQUEST FOR: ${user.userName}`);
    console.log(`LINK: http://localhost:5173/reset-password?token=${token}`);
    console.log("-----------------------------------------");

    return true;
  },
);

export const resetPassword = implemented.resetPassword.handler(
  async ({ input }) => {
    const user = await db.query.users.findFirst({
      where: eq(schema.users.resetToken, input.token),
    });

    if (
      !user ||
      !user.resetTokenExpiresAt ||
      user.resetTokenExpiresAt < new Date()
    ) {
      throw new Error("Invalid or expired token");
    }

    const hashedPassword = await bycrypt.hash(input.newPassword, 10);
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

export const login = implemented.login.handler(async ({ input, context }) => {
  // 1. Prepare the input: trim spaces and make it lowercase
  const normalizedInput = input.userName.trim().toLowerCase();

  // 2. Query the DB: Tell the DB to lowercase the 'userName' column
  // ONLY for this specific check
  const user = await db.query.users.findFirst({
    where: eq(sql`lower(${schema.users.userName})`, normalizedInput),
  });

  if (!user) {
    throw new Error("User not found");
  }

  const passwordMatch = await bycrypt.compare(input.password, user.password);
  if (!passwordMatch) {
    throw new Error("Invalid password");
  }

  const token = jwt.sign({ userId: user.id }, JWT_SECRET!, { expiresIn: "1h" });
  context.res.setHeader(
    "Set-Cookie",
    `token=${token}; HttpOnly; Path=/; Max-Age=3600; SameSite=Lax`,
  );
  return {
    id: user.id,
    userName: user.userName,
    email: user.email,
    createdAt: user.createdAt.toISOString(),
  };
});

const authMiddleware = implemented.middleware(async ({ context, next }) => {
  const cookieHeader = context.req.headers?.cookie || "";
  const token = cookieHeader.split("token=")[1]?.split(";")[0];
  if (!token) {
    const test = { context: { authUser: null } as AuthContext };
    console.log("No token found in cookies.", test);
    return next({ context: { authUser: null } as AuthContext });
  }
  try {
    const decoded = jwt.verify(token, JWT_SECRET!) as { userId: number };
    return next({
      context: { authUser: decoded } as AuthContext,
    });
  } catch (err) {
    return next({ context: { authUser: null } as AuthContext });
  }
});

export const updateProfile = implemented.updateProfile
  .use(authMiddleware)
  .handler(async ({ input, context }) => {
    if (!context.authUser) {
      throw new Error("You must be logged in to update your profile.");
    }

    if (!input.userName.trim()) {
      throw new Error("Username cannot be empty.");
    }

    const [updatedProfile] = await db
      .update(schema.users)
      .set({ userName: input.userName })
      .where(eq(schema.users.id, context.authUser.userId))
      .returning();

    return {
      ...updatedProfile,
      createdAt: updatedProfile.createdAt.toISOString(),
    };
  });

export const getMe = implemented.getMe
  .use(authMiddleware)
  .handler(async ({ context }) => {
    if (!context.authUser) return null;

    const [user] = await db
      .select()
      .from(schema.users)
      .where(eq(schema.users.id, context.authUser.userId));

    return user ? { ...user, createdAt: user.createdAt.toISOString() } : null;
  });

export const logout = implemented.logout.handler(async ({ context }) => {
  // We send a header that tells the browser: "Delete this cookie immediately"
  context.res.setHeader(
    "Set-Cookie",
    "token=; HttpOnly; Path=/; Max-Age=0; SameSite=Lax",
  );

  return true; // Matches your contract output (z.boolean())
});

let database = [{ id: 1, title: "Learn oRPC", completed: false }];

export const listUsers = implemented.listUsers.handler(async ({ input }) => {
  const allUsers = await db.select().from(schema.users);
  return allUsers.map((user) => {
    return {
      ...user,
      createdAt: user.createdAt.toISOString(),
    };
  });
});

export const createUser = implemented.createUser.handler(async ({ input }) => {
  const hashedPassword = await bycrypt.hash(input.password, 10);
  const [newUser] = await db
    .insert(schema.users)
    .values({
      userName: input.userName,
      email: input.email,
      password: hashedPassword,
    })
    .returning();

  return {
    id: newUser.id,
    userName: newUser.userName,
    email: newUser.email,
    createdAt: newUser.createdAt.toISOString(),
  };
});

// export const listTodo = implemented.listTodo.handler(async ({ input }) => {
//   // MOCK:
//   // return database;

//   // DB: Standard Drizzle select
//   const result = await db
//     .select()
//     .from(schema.todos)
//     .where(eq(schema.todos.userId, input));
//   return result;
// });
export const listTodo = implemented.listTodo
  .use(authMiddleware)
  .handler(async ({ context, input }) => {
    if (!context.authUser) {
      throw new Error("You must be logged in to see todos.");
    }

    const conditions: SQL[] = [];

    // 1. ALWAYS lock it to the logged-in user
    conditions.push(eq(schema.todos.userId, context.authUser.userId));

    // 2. Only add filters if the frontend actually sent an input
    if (input) {
      // Add the Search filter if it exists (don't forget the % signs!)
      const normalizedSearch = input.searchQuery?.toLowerCase();

      // 2. Tell the DB to lowercase the title column before comparing
      conditions.push(
        like(sql`lower(${schema.todos.title})`, `%${normalizedSearch}%`),
      );

      // Add the Status filter if it exists
      if (input.status === "COMPLETED") {
        conditions.push(eq(schema.todos.completed, true));
      } else if (input.status === "PENDING") {
        conditions.push(eq(schema.todos.completed, false)); // Fixed typo here
      }
    }

    // 3. Run the query with the spread operator
    const searchedTodos = await db
      .select()
      .from(schema.todos)
      .where(and(...conditions));

    return searchedTodos;
  });

export const createTodo = implemented.createTodo
  .use(authMiddleware)
  .handler(async ({ input, context }) => {
    // MOCK:
    // const newTodo = { id: Date.now(), title: input, completed: false };
    // database.push(newTodo);
    // return newTodo;
    if (!context.authUser) {
      throw new Error("You must be logged in to create todos.");
    }

    // DB: Notice we don't provide an ID; the DB generates it!
    const [newTodo] = await db
      .insert(schema.todos)
      .values({ title: input.title, userId: context.authUser.userId })
      .returning(); // This returns the created row back to TypeScript

    return newTodo;
  });

export const toggleTodo = implemented.toggleTodo
  .use(authMiddleware)
  .handler(async ({ input, context }) => {
    /* MOCK:
  const todo = database.find((t) => t.id === input);
  if (todo) {
    todo.completed = !todo.completed;
    return todo;
  }
  throw new Error("Not found"); 
  */

    if (!context.authUser) {
      throw new Error("You must be logged in to toggle todos.");
    }

    // 1. Fetch the current status of this specific todo
    const [current] = await db
      .select()
      .from(schema.todos)
      .where(
        and(
          eq(schema.todos.id, input),
          eq(schema.todos.userId, context.authUser.userId),
        ),
      );

    if (!current) throw new Error("Todo not found in Database");

    // 2. Update the 'completed' column to the opposite of what it currently is
    const [updated] = await db
      .update(schema.todos)
      .set({ completed: !current.completed })
      .where(
        and(
          eq(schema.todos.id, input), // Use the Task ID from input
          eq(schema.todos.userId, context.authUser.userId), // Secure it to the owner
        ),
      )
      .returning();

    return updated;
  });

export const deleteTodo = implemented.deleteTodo
  .use(authMiddleware)
  .handler(async ({ input, context }) => {
    /* MOCK:
  const exists = database.some((t) => t.id === input);
  if (!exists) {
    console.log(`Delete failed: ID ${input} does not exist.`);
    return false;
  }
  database = database.filter((t) => t.id !== input);
  return true; 
  */

    if (!context.authUser) {
      throw new Error("You must be logged in to delete todos.");
    }

    // DB: Delete the row where ID matches
    const deletedRows = await db
      .delete(schema.todos)
      .where(
        and(
          eq(schema.todos.id, input),
          eq(schema.todos.userId, context.authUser.userId),
        ),
      )
      .returning();

    // If deletedRows has a length, it means something was actually removed
    return deletedRows.length > 0;
  });

export const updateTodo = implemented.updateTodo
  .use(authMiddleware)
  .handler(async ({ input, context }) => {
    /* MOCK:
  const todo = database.find((t) => t.id === input.id);
  if (todo) {
    todo.title = input.title;
    return todo;
  }
  throw new Error("Not found"); 
  */

    if (!context.authUser) {
      throw new Error("You must be logged in to update todos.");
    }
    // DB: Update the title for the specific ID
    const [updated] = await db
      .update(schema.todos)
      .set({ title: input.title })
      .where(
        and(
          eq(schema.todos.id, input.id),
          eq(schema.todos.userId, context.authUser.userId),
        ),
      )
      .returning();

    if (!updated) throw new Error("Todo not found in Database");

    return updated;
  });

export const appRouter = implemented.router({
  resetPassword,
  requestPasswordReset,
  updateProfile,
  login,
  getMe,
  logout,
  listUsers,
  createUser,
  listTodo,
  createTodo,
  toggleTodo,
  deleteTodo,
  updateTodo,
});

export type AppRouter = typeof appRouter;
