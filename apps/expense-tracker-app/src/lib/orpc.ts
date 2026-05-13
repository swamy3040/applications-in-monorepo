import { createORPCClient } from "@orpc/client";
import { RPCLink } from "@orpc/client/fetch";
import { createORPCReactQueryUtils } from "@orpc/react-query";
import type { RouterClient } from "@orpc/server"; // 👈 Add this import
import type { AppRouter } from "../../../server-expense-tracker/index";

const link = new RPCLink({
  url: "http://localhost:3000/orpc",
  fetch: (url, init) => {
    return fetch(url, {
      ...init,
      credentials: "include", // 👈 THIS IS THE MISSING KEY
    });
  },
});

// 1. Create the base client
export const client = createORPCClient<RouterClient<AppRouter>>(link);

// 2. Create the Smart Utils
// We use RouterClient<AppRouter> here to "Filter" the types for the frontend
export const orpc = createORPCReactQueryUtils<RouterClient<AppRouter>>(client);
