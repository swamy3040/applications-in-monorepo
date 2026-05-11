import { createORPCClient } from "@orpc/client";
import { RPCLink } from "@orpc/client/fetch";
import type { RouterClient } from "@orpc/server"; // The "Filter"
import type { AppRouter } from "../../../server/index"; // The "Raw Material"

const link = new RPCLink({
  url: "http://localhost:3000/orpc",
  fetch: (url, init) =>
    fetch(url, {
      ...init,
      credentials: "include",
    }),
});


export const orpc: RouterClient<AppRouter> = createORPCClient(link);
