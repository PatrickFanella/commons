import {
  copyFileSync,
  chmodSync,
  existsSync,
  mkdirSync,
  rmSync,
  constants,
} from "node:fs";
import { dirname, resolve } from "node:path";
import { existingDatabase, verifyDatabase } from "./sqlite-tools.mjs";

const [backup, destination, acknowledgement, ...extra] = process.argv.slice(2);
if (
  !backup ||
  !destination ||
  acknowledgement !== "--app-stopped" ||
  extra.length
) {
  console.error(
    "Usage: node scripts/restore.mjs backup.sqlite new-database.sqlite --app-stopped",
  );
  console.error(
    "Stop every database writer first. Restore never overwrites an existing database.",
  );
  process.exit(1);
}
let output;
let created = false;
try {
  const source = existingDatabase(backup);
  output = resolve(destination);
  if (
    [output, `${output}-wal`, `${output}-shm`, `${output}-journal`].some(
      existsSync,
    )
  ) {
    throw new Error(
      "Destination and its SQLite sidecars must not exist; preserve the previous database separately.",
    );
  }
  if ([`${source}-wal`, `${source}-journal`].some(existsSync)) {
    throw new Error(
      "Source has a journal or WAL; use a completed VACUUM INTO backup.",
    );
  }
  verifyDatabase(source);
  process.umask(0o077);
  mkdirSync(dirname(output), { recursive: true, mode: 0o700 });
  copyFileSync(source, output, constants.COPYFILE_EXCL);
  created = true;
  chmodSync(output, 0o600);
  verifyDatabase(output);
  console.log(`Verified restore: ${output}`);
} catch (error) {
  if (created && output) rmSync(output, { force: true });
  console.error(error.message);
  process.exitCode = 1;
}
