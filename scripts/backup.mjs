import { DatabaseSync } from "node:sqlite";
import {
  chmodSync,
  closeSync,
  existsSync,
  mkdirSync,
  openSync,
  rmSync,
} from "node:fs";
import { dirname, resolve } from "node:path";
import { existingDatabase, verifyDatabase } from "./sqlite-tools.mjs";

// VACUUM INTO takes a transactionally consistent snapshot, including live WAL writes.
const [destination, ...extra] = process.argv.slice(2);
if (!destination || extra.length) {
  console.error(
    "Usage: DATABASE_PATH=/path/database.sqlite node scripts/backup.mjs /path/new-backup.sqlite",
  );
  process.exit(1);
}
let output;
let created = false;
try {
  const source = existingDatabase(
    process.env.DATABASE_PATH ||
      `${process.env.DATA_DIR || "./data"}/open-world.sqlite`,
  );
  output = resolve(destination);
  if (output === source || existsSync(output))
    throw new Error("Backup destination must not already exist.");
  process.umask(0o077);
  mkdirSync(dirname(output), { recursive: true, mode: 0o700 });
  closeSync(openSync(output, "wx", 0o600));
  created = true;
  const db = new DatabaseSync(source, { readOnly: true });
  try {
    db.exec("PRAGMA busy_timeout = 30000");
    db.prepare("VACUUM INTO ?").run(output);
  } finally {
    db.close();
  }
  chmodSync(output, 0o600);
  verifyDatabase(output);
  console.log(`Verified backup: ${output}`);
} catch (error) {
  if (created && output) rmSync(output, { force: true });
  console.error(error.message);
  process.exitCode = 1;
}
