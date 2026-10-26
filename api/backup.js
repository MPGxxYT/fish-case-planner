// Writes a consistent copy of the database next to it, safe to run while the
// API is serving. Copy the file it names off the server.
//
// On the server: docker compose exec api node api/backup.js
import { DatabaseSync } from "node:sqlite";
import { dirname, join } from "node:path";

const dbPath = process.env.DB_PATH || "data/fish-case-planner.db";
const target = join(dirname(dbPath), `backup-${new Date().toISOString().slice(0, 10)}.db`);

const db = new DatabaseSync(dbPath);
db.prepare("VACUUM INTO ?").run(target);
db.close();
console.log(`Wrote ${target}`);
