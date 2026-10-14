import { DatabaseSync } from "node:sqlite";
import { resolve } from "node:path";
import { statSync } from "node:fs";

export function existingDatabase(path) {
  const absolute = resolve(path);
  if (!statSync(absolute).isFile())
    throw new Error("Database must be an existing regular file.");
  return absolute;
}

export function verifyDatabase(path) {
  const db = new DatabaseSync(existingDatabase(path), { readOnly: true });
  try {
    db.exec("PRAGMA busy_timeout = 30000");
    const integrity = db.prepare("PRAGMA integrity_check").all();
    if (integrity.length !== 1 || Object.values(integrity[0])[0] !== "ok") {
      throw new Error("SQLite integrity check failed.");
    }
    if (db.prepare("PRAGMA foreign_key_check").all().length) {
      throw new Error("SQLite foreign-key check failed.");
    }
  } finally {
    db.close();
  }
}
