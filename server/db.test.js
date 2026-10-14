import test from "node:test";
import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { openDatabase } from "./db.js";

test("launch database migrates without losing ownership, credentials, sessions or moderation; reopening is idempotent", (t) => {
  const dir = mkdtempSync(join(tmpdir(), "commons-migration-"));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const path = join(dir, "launch.sqlite");
  const launch = new DatabaseSync(path);
  launch.exec(
    readFileSync(
      new URL("./fixtures/launch-schema.sql", import.meta.url),
      "utf8",
    ),
  );
  launch
    .prepare(
      "INSERT INTO users(id,username,display_name,password,recovery,role,created_at) VALUES(?,?,?,?,?,?,?)",
    )
    .run(
      "owner",
      "patrick__eff",
      "Patrick",
      "original-password-hash",
      "original-recovery-hash",
      "admin",
      "2026-10-14T00:00:00.000Z",
    );
  launch
    .prepare("INSERT INTO sessions VALUES(?,?,?,?)")
    .run("original-session", "owner", "original-csrf", Date.now() + 86400_000);
  launch
    .prepare(
      "INSERT INTO projects(id,owner_id,author,name,description,repo,category,tags,status,art,letter,hidden,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
    )
    .run(
      "existing-project",
      "owner",
      "patrick__eff",
      "Existing work",
      "Description",
      "https://github.com/StoryTold/PhotoCraft.git/",
      "Creative tools",
      "[]",
      "In progress",
      "canvas",
      "E",
      1,
      "2026-10-14T00:00:00.000Z",
      "2026-10-14T00:00:00.000Z",
    );
  launch
    .prepare("INSERT INTO messages VALUES(?,?,?,?,?,?)")
    .run(
      "existing-message",
      "existing-project",
      "owner",
      "Original discussion",
      "2026-10-14T00:00:00.000Z",
      "2026-10-14T00:00:00.000Z",
    );
  launch.close();
  let db = openDatabase(path);
  assert.equal(db.prepare("PRAGMA user_version").get().user_version, 3);
  const user = db.prepare("SELECT * FROM users").get();
  assert.equal(user.role, "admin");
  assert.equal(user.password, "original-password-hash");
  assert.equal(user.recovery, "original-recovery-hash");
  assert.equal(user.email, null);
  assert.equal(
    db.prepare("SELECT token FROM sessions").get().token,
    "original-session",
  );
  const p = db.prepare("SELECT * FROM projects").get();
  assert.equal(p.owner_id, "owner");
  assert.equal(p.hidden, 1);
  assert.equal(p.repo_key, "https://github.com/storytold/photocraft");
  assert.equal(
    db.prepare("SELECT parent_id FROM messages").get().parent_id,
    null,
  );
  assert.equal(db.prepare("SELECT COUNT(*) n FROM activity").get().n, 0);
  assert.deepEqual(db.prepare("PRAGMA foreign_key_check").all(), []);
  assert.equal(
    db.prepare("PRAGMA integrity_check").get().integrity_check,
    "ok",
  );
  db.close();
  db = openDatabase(path);
  assert.equal(db.prepare("SELECT COUNT(*) n FROM users").get().n, 1);
  db.prepare("PRAGMA user_version=99").run();
  db.close();
  assert.throws(() => openDatabase(path), /newer than this Commons release/);
});
