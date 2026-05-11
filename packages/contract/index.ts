import { z } from "zod";
import { oc } from "@orpc/contract";

export const UserSchema = z.object({
  id: z.number(),
  userName: z.string(),
  email: z.string(),
  createdAt: z.string(),
});

export type User = z.infer<typeof UserSchema>;

export const TodoSchema = z.object({
  id: z.number(),
  userId: z.number(),
  title: z.string(),
  completed: z.boolean(),
});

export type Todo = z.infer<typeof TodoSchema>;

export const requestPasswordResetContract = oc
  .input(z.object({ email: z.string() }))
  .output(z.boolean());

export const resetPasswordContract = oc
  .input(
    z.object({
      token: z.string(),
      newPassword: z.string(),
    }),
  )
  .output(z.boolean());

export const updateProfileContract = oc
  .input(z.object({ userName: z.string() }))
  .output(UserSchema);

export const logoutContract = oc.input(z.void()).output(z.boolean());

export const getMeContract = oc.input(z.void()).output(UserSchema.nullable());

export const loginContract = oc
  .input(z.object({ userName: z.string(), password: z.string() }))
  .output(UserSchema);

export const createUser = oc
  .input(
    z.object({ userName: z.string(), email: z.string(), password: z.string() }),
  )
  .output(UserSchema);

export const listUsers = oc.input(z.void()).output(z.array(UserSchema));

export const updateTodoContract = oc
  .input(z.object({ id: z.number(), title: z.string() }))
  .output(TodoSchema);

export const deleteTodoContract = oc.input(z.number()).output(z.boolean());

export const toggleTodoContract = oc.input(z.number()).output(TodoSchema);

export const createTodoContract = oc
  .input(z.object({ title: z.string() }))
  .output(TodoSchema);

export const listTodoContract = oc
  .input(
    z
      .object({
        searchQuery: z.string().optional(),
        status: z.enum(["ALL", "COMPLETED", "PENDING"]).optional(),
      })
      .optional(), // Makes the whole input object optional
  )
  .output(z.array(TodoSchema));

export const contractMethods = {
  contract: {
    resetPassword: resetPasswordContract,
    requestPasswordReset: requestPasswordResetContract,
    updateProfile: updateProfileContract,
    logout: logoutContract,
    getMe: getMeContract,
    login: loginContract,
    createUser,
    listUsers,
    updateTodo: updateTodoContract,
    deleteTodo: deleteTodoContract,
    toggleTodo: toggleTodoContract,
    createTodo: createTodoContract,
    listTodo: listTodoContract,
  },
};
