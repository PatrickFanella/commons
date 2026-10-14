import { resolve } from "node:path";
import { openDatabase } from "./db.js";
import { catalog, importCatalog } from "./catalog.js";

const [command, username] = process.argv.slice(2);
if (
  !["promote", "import-photocraft", "import-catalog"].includes(command) ||
  (command === "promote" && !username)
) {
  console.error(
    "Usage: node server/admin.js promote <username> | import-catalog | import-photocraft",
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
    const entries =
      command === "import-photocraft"
        ? catalog.filter((p) => p.slug === "photocraft")
        : catalog;
    const imported = importCatalog(db, entries);
    console.log(
      `${imported} curated references imported. Existing metadata refreshed; hidden/deleted listings and community activity preserved.`,
    );
  }
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
} finally {
  db.close();
}
