import { createApp } from "./app.js";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

const entry = resolve("dist-ssr/entry-server.js");
if (process.env.NODE_ENV === "production" && !existsSync(entry))
  throw new Error("Run npm run build before starting the production server.");
const render = existsSync(entry)
  ? (await import(pathToFileURL(entry).href)).render
  : undefined;
const app = createApp({ seedCatalog: true, render });
app.locals.mail.start();
const port = Number(process.env.PORT ?? 3000);
if (!Number.isInteger(port) || port < 1 || port > 65535)
  throw new Error("PORT must be between 1 and 65535.");
const server = app.listen(port, process.env.HOST ?? "127.0.0.1", () =>
  console.log(`Commons listening on port ${port}`),
);
let stopping = false;
function stop() {
  if (stopping) return;
  stopping = true;
  server.close(async () => {
    await app.locals.mail.stop();
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
