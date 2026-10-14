import { createApp } from "./app.js";

const app = createApp();
const port = Number(process.env.PORT ?? 3000);
if (!Number.isInteger(port) || port < 1 || port > 65535)
  throw new Error("PORT must be between 1 and 65535.");
const server = app.listen(port, process.env.HOST ?? "127.0.0.1", () =>
  console.log(`Open World listening on port ${port}`),
);
let stopping = false;
function stop() {
  if (stopping) return;
  stopping = true;
  server.close(() => {
    app.locals.close();
    process.exit(0);
  });
  setTimeout(() => {
    server.closeAllConnections();
    app.locals.close();
    process.exit(1);
  }, 10000).unref();
}
process.on("SIGTERM", stop);
process.on("SIGINT", stop);
