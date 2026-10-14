import test from "node:test";
import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import {
  mkdtempSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

test("backup includes WAL commits; restore checks integrity and refuses overwrite or stale sidecars", () => {
  const directory = mkdtempSync(join(tmpdir(), "open-world-backup-"));
  const source = join(directory, "source.sqlite");
  const backup = join(directory, "backup.sqlite");
  const restored = join(directory, "restored.sqlite");
  const db = new DatabaseSync(source);
  const run = (script, args) =>
    spawnSync(process.execPath, [script, ...args], {
      encoding: "utf8",
      env: { ...process.env, DATABASE_PATH: source },
    });
  try {
    db.exec(
      "PRAGMA journal_mode=WAL; PRAGMA wal_autocheckpoint=0; CREATE TABLE records (value TEXT);",
    );
    db.prepare("INSERT INTO records VALUES (?)").run("committed in WAL");
    let result = run("scripts/backup.mjs", [backup]);
    assert.equal(result.status, 0, result.stderr);
    assert.equal(statSync(backup).mode & 0o777, 0o600);
    result = run("scripts/restore.mjs", [backup, restored, "--app-stopped"]);
    assert.equal(result.status, 0, result.stderr);
    const restoredDb = new DatabaseSync(restored, { readOnly: true });
    assert.equal(
      restoredDb.prepare("SELECT value FROM records").get().value,
      "committed in WAL",
    );
    restoredDb.close();
    const before = readFileSync(restored);
    assert.notEqual(
      run("scripts/restore.mjs", [backup, restored, "--app-stopped"]).status,
      0,
    );
    assert.deepEqual(readFileSync(restored), before);
    const sidecarDestination = join(directory, "sidecar.sqlite");
    writeFileSync(`${sidecarDestination}-wal`, "stale");
    assert.notEqual(
      run("scripts/restore.mjs", [backup, sidecarDestination, "--app-stopped"])
        .status,
      0,
    );
    const corrupt = join(directory, "corrupt.sqlite");
    writeFileSync(corrupt, "not a database");
    assert.notEqual(
      run("scripts/restore.mjs", [
        corrupt,
        join(directory, "bad.sqlite"),
        "--app-stopped",
      ]).status,
      0,
    );
    assert.notEqual(
      run("scripts/restore.mjs", [
        backup,
        join(directory, "unacknowledged.sqlite"),
      ]).status,
      0,
    );
    assert.notEqual(run("scripts/backup.mjs", [backup]).status, 0);
  } finally {
    db.close();
    rmSync(directory, { recursive: true, force: true });
  }
});
