import { repositoryKey } from "./repository.js";
import { resolve } from "node:path";
import { openDatabase } from "./db.js";
import { randomUUID } from "node:crypto";

const [command, username] = process.argv.slice(2);
if (
  !["promote", "import-photocraft"].includes(command) ||
  (command === "promote" && !username)
) {
  console.error(
    "Usage: node server/admin.js promote <username> | import-photocraft",
  );
  process.exit(1);
}
const db = openDatabase(
  process.env.DATABASE_PATH ??
    resolve(process.env.DATA_DIR ?? "data", "commons.sqlite"),
);
try {
  if (command === "promote") {
    const result = db
      .prepare("UPDATE users SET role='admin', suspended=0 WHERE username=?")
      .run(username.toLowerCase());
    if (!result.changes)
      throw new Error(
        "Account not found. Register the account before promotion.",
      );
    console.log("Administrator role assigned.");
  } else {
    const repo = "https://github.com/storytold/photocraft";
    if (
      !db
        .prepare("SELECT id FROM projects WHERE repo_key=? OR repo=?")
        .get(repositoryKey(repo), repo)
    ) {
      const date = new Date().toISOString();
      db.prepare(
        "INSERT INTO projects(id,owner_id,author,name,description,details,repo,repo_key,category,tags,needs,status,art,letter,external,created_at,updated_at) VALUES(?,NULL,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
      ).run(
        randomUUID(),
        "storytold",
        "PhotoCraft",
        "An open-source image editor built in Rust, exploring a clean-room rebuild of familiar Photoshop workflows.",
        "Curated external reference. Commons is not affiliated with the repository or its maintainer. Check the repository for current details and licensing.",
        repo,
        repositoryKey(repo),
        "Creative tools",
        JSON.stringify(["Rust", "Image editing"]),
        "",
        "In progress",
        "photo",
        "P",
        1,
        date,
        date,
      );
    }
    console.log(
      "Curated PhotoCraft reference is available. No community account or activity was created.",
    );
  }
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
} finally {
  db.close();
}
