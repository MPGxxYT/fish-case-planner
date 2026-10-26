// Starts the API. On the server it runs in the fish-case-planner-api
// container with the database in the mounted /data folder; in development
// `npm run dev:api` runs it on port 8787 with the database in ./data.
import { createServer } from "node:http";
import { openStore } from "./store.js";
import { createHandler } from "./app.js";

const port = Number(process.env.PORT) || 8787;
const dbPath = process.env.DB_PATH || "data/fish-case-planner.db";

const store = openStore(dbPath);
const server = createServer(createHandler(store));
server.listen(port, () => console.log(`API listening on port ${port}, database ${dbPath}`));

// docker compose stop sends SIGTERM; close the database cleanly.
for (const signal of ["SIGTERM", "SIGINT"]) {
  process.on(signal, () => server.close(() => { store.close(); process.exit(0); }));
}
