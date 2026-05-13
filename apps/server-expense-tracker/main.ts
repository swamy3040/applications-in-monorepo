import { createServer } from "node:http";
import { RPCHandler } from "@orpc/server/node";
import { CORSPlugin } from "@orpc/server/plugins";
import { onError } from "@orpc/server";
import { appRouter } from "./index";

const handler = new RPCHandler(appRouter, {
  plugins: [
    new CORSPlugin({
      origin: ["http://localhost:5174"], // Added both common Vite ports
      credentials: true, // 👈 CRITICAL for cookies to work!
    }),
  ],
  interceptors: [
    onError((error) => {
      console.error("❌ oRPC Server Error:", error);
    }),
  ],
});

const server = createServer(async (req, res) => {
  const result = await handler.handle(req, res, {
    prefix: "/orpc",
    // 1. INJECT CONTEXT: This is the "Fuel" for your middleware and login cookies
    context: {
      req,
      res,
      authUser: null, // Initial state; middleware will update this
    },
  });

  if (!result.matched) {
    res.statusCode = 404;
    res.end("No Procedure matched");
  }
});

const PORT = 3000;
server.listen(PORT, () => {
  console.log("-----------------------------------------");
  console.log(`🚀 API RUNNING: http://localhost:${PORT}/orpc`);
  console.log(`📂 DB CONNECTED: Expense Tracker`);
  console.log(`🔒 AUTH READY: JWT + HttpOnly Cookies`);
  console.log("-----------------------------------------");
});
