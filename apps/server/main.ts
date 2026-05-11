import { createServer } from "node:http";
import { RPCHandler } from "@orpc/server/node";
import { CORSPlugin } from "@orpc/server/plugins";
import { onError } from "@orpc/server";
import { appRouter } from "./index";

const handler = new RPCHandler(appRouter, {
  plugins: [
    new CORSPlugin({
      origin: ["http://localhost:5173"], 
      credentials: true, 
    }),
  ],
  interceptors: [
    onError((error) => {
      console.error("Server Error:", error);
    }),
  ],
});

// const server = createServer(async (req, res) => {
//   const result = await handler.handle(req, res, {
//     prefix: "/orpc",
//   });

//   if (!result.matched) {
//     res.statusCode = 404;
//     res.end("No Procedure matched");
//   }
// });
const server = createServer(async (req, res) => {
  const result = await handler.handle(req, res, {
    prefix: "/orpc",
    // ADD THIS LINE: This makes 'req' and 'res' available in your context!
    context: { req, res, authUser: null },
  });

  if (!result.matched) {
    res.statusCode = 404;
    res.end("No Procedure matched");
  }
});

server.listen(3000, () => {
  console.log("Server is running on http://localhost:3000/orpc");
});
