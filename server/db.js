import { DatabaseSync } from "node:sqlite";
import { mkdirSync, chmodSync } from "node:fs";
import { dirname } from "node:path";
import { repositoryKey } from "./repository.js";

export function openDatabase(path = ":memory:") {
  if (path !== ":memory:") {
    mkdirSync(dirname(path), { recursive: true, mode: 0o700 });
  }
  const db = new DatabaseSync(path);
  if (path !== ":memory:") chmodSync(path, 0o600);
  const version = db.prepare("PRAGMA user_version").get().user_version;
  if (version > 3) {
    db.close();
    throw new Error("Database schema is newer than this Commons release.");
  }
  db.exec(`PRAGMA foreign_keys=ON; PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000;
    CREATE TABLE IF NOT EXISTS users(id TEXT PRIMARY KEY, username TEXT UNIQUE NOT NULL, display_name TEXT NOT NULL, bio TEXT NOT NULL DEFAULT '', skills TEXT NOT NULL DEFAULT '[]', website TEXT NOT NULL DEFAULT '', password TEXT NOT NULL, recovery TEXT NOT NULL, role TEXT NOT NULL DEFAULT 'member', suspended INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS sessions(token TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, csrf TEXT NOT NULL, expires INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS projects(id TEXT PRIMARY KEY, owner_id TEXT REFERENCES users(id) ON DELETE CASCADE, author TEXT NOT NULL, name TEXT NOT NULL, description TEXT NOT NULL, details TEXT NOT NULL DEFAULT '', repo TEXT NOT NULL, category TEXT NOT NULL, tags TEXT NOT NULL, needs TEXT NOT NULL DEFAULT '', status TEXT NOT NULL, art TEXT NOT NULL, letter TEXT NOT NULL, hidden INTEGER NOT NULL DEFAULT 0, featured INTEGER NOT NULL DEFAULT 0, external INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL, updated_at TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS bookmarks(user_id TEXT REFERENCES users(id) ON DELETE CASCADE, project_id TEXT REFERENCES projects(id) ON DELETE CASCADE, PRIMARY KEY(user_id,project_id));
    CREATE TABLE IF NOT EXISTS memberships(user_id TEXT REFERENCES users(id) ON DELETE CASCADE, project_id TEXT REFERENCES projects(id) ON DELETE CASCADE, role TEXT NOT NULL DEFAULT '', PRIMARY KEY(user_id,project_id));
    CREATE TABLE IF NOT EXISTS messages(id TEXT PRIMARY KEY, project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, text TEXT NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS reports(id TEXT PRIMARY KEY, project_id TEXT REFERENCES projects(id) ON DELETE CASCADE, message_id TEXT REFERENCES messages(id) ON DELETE CASCADE, user_id TEXT REFERENCES users(id) ON DELETE SET NULL, reason TEXT NOT NULL, resolved INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL);
    CREATE INDEX IF NOT EXISTS sessions_user ON sessions(user_id); CREATE INDEX IF NOT EXISTS messages_project ON messages(project_id); CREATE INDEX IF NOT EXISTS projects_owner ON projects(owner_id);`);
  if (version < 1) {
    db.exec("BEGIN IMMEDIATE");
    try {
      db.exec(`
        ALTER TABLE users ADD COLUMN email TEXT;
        ALTER TABLE users ADD COLUMN pending_email TEXT;
        CREATE UNIQUE INDEX users_email ON users(email) WHERE email IS NOT NULL;
        ALTER TABLE projects ADD COLUMN listed_by TEXT REFERENCES users(id) ON DELETE SET NULL;
        ALTER TABLE projects ADD COLUMN repo_key TEXT;
        CREATE INDEX projects_repo_key ON projects(repo_key);
        ALTER TABLE messages ADD COLUMN parent_id TEXT REFERENCES messages(id) ON DELETE CASCADE;
        CREATE INDEX messages_parent ON messages(parent_id);
        CREATE TABLE auth_tokens(token TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, purpose TEXT NOT NULL CHECK(purpose IN ('verify','reset')), email TEXT NOT NULL, created_at INTEGER NOT NULL, expires INTEGER NOT NULL);
        CREATE UNIQUE INDEX auth_tokens_user_purpose ON auth_tokens(user_id,purpose);
        CREATE TABLE mail_outbox(id TEXT PRIMARY KEY, token TEXT NOT NULL REFERENCES auth_tokens(token) ON DELETE CASCADE, recipient TEXT NOT NULL, subject TEXT NOT NULL, body TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'queued', attempts INTEGER NOT NULL DEFAULT 0, next_attempt INTEGER NOT NULL, provider_id TEXT, last_error TEXT);
        CREATE INDEX mail_outbox_due ON mail_outbox(status,next_attempt);
        CREATE TABLE project_updates(id TEXT PRIMARY KEY, project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, title TEXT NOT NULL, body TEXT NOT NULL, created_at TEXT NOT NULL);
        CREATE INDEX updates_project ON project_updates(project_id,created_at);
        CREATE TABLE activity(id INTEGER PRIMARY KEY AUTOINCREMENT, project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, kind TEXT NOT NULL, message_id TEXT REFERENCES messages(id) ON DELETE CASCADE, update_id TEXT REFERENCES project_updates(id) ON DELETE CASCADE, created_at TEXT NOT NULL);
        CREATE INDEX activity_project ON activity(project_id,id);
        CREATE TABLE repository_claims(id TEXT PRIMARY KEY, project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, repo TEXT NOT NULL, proof_hash TEXT NOT NULL, expires INTEGER NOT NULL, created_at INTEGER NOT NULL, UNIQUE(project_id,user_id));
        PRAGMA user_version=1;
      `);
      for (const project of db.prepare("SELECT id,repo FROM projects").all()) {
        const key = repositoryKey(project.repo);
        db.prepare("UPDATE projects SET repo_key=? WHERE id=?").run(
          key,
          project.id,
        );
      }
      db.exec("COMMIT");
    } catch (error) {
      db.exec("ROLLBACK");
      db.close();
      throw error;
    }
  }
  if (version < 2) {
    db.exec("BEGIN IMMEDIATE");
    try {
      db.exec(
        `ALTER TABLE reports ADD COLUMN update_id TEXT REFERENCES project_updates(id) ON DELETE CASCADE; PRAGMA user_version=2;`,
      );
      db.exec("COMMIT");
    } catch (error) {
      db.exec("ROLLBACK");
      db.close();
      throw error;
    }
  }
  if (version < 3) {
    db.exec("BEGIN IMMEDIATE");
    try {
      db.exec(
        `ALTER TABLE projects ADD COLUMN repository_verified INTEGER NOT NULL DEFAULT 0; PRAGMA user_version=3;`,
      );
      db.exec("COMMIT");
    } catch (error) {
      db.exec("ROLLBACK");
      db.close();
      throw error;
    }
  }
  return db;
}
