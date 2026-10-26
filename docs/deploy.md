# Deploying Fish Case Planner

The app runs on the home server as two containers behind Nginx Proxy Manager, which handles HTTPS:

- `fish-case-planner` (nginx) serves the build and forwards anything under `/api/` to the API.
- `fish-case-planner-api` (Node) answers `/api/` and keeps published cases and the shared product catalog in one SQLite file, `~/fish-case-planner/data/fish-case-planner.db`. It has no dependencies beyond Node itself; the routes are listed at the top of [`api/app.js`](../api/app.js).

Both are defined in [`deploy/compose.yaml`](../deploy/compose.yaml); nginx's rules are in [`deploy/conf/default.conf`](../deploy/conf/default.conf). The API is only on the project's own Docker network, so the proxy manager and the internet can reach it only through nginx.

## How a deploy works

Every push to `main` runs the `CI` workflow: the API tests, a build, and `npm run check:server`, which starts both containers on the runner and checks that pages, caching and `/api` answer as they should. Once those pass, the `deploy` job joins the tailnet, copies `deploy/`, the tested build and `api/` to `~/fish-case-planner` with rsync, restarts the API and reloads nginx.

`data/` is excluded from the copy, so deploys never touch the database.

## Running it locally

Run the API and the app in two terminals:

```bash
npm run dev:api
```

```bash
npm run dev
```

Vite forwards `/api` to the API on port 8787. The local database is `data/fish-case-planner.db` (gitignored); delete it to start empty.

## Setting up the server (once)

These match the Home Server Deploy Kit's "Each project" steps.

1. In the GitHub repo, under Settings > Secrets and variables > Actions, add `TAILSCALE_AUTHKEY`, `SERVER_HOST`, `SERVER_USER` and `SSH_PRIVATE_KEY`, the same values Fizzwick uses.
2. Point `fishcase.mortality.app` at the server in DNS, if a wildcard record doesn't already.
3. In Nginx Proxy Manager, add a Proxy Host: domain `fishcase.mortality.app`, scheme `http`, forward hostname `fish-case-planner`, port `80`. Leave Cache Assets off. On the SSL tab, request a Let's Encrypt certificate and turn on Force SSL and HTTP/2.
4. Merge to `main`. The first deploy creates `~/fish-case-planner` and starts both containers.

## Moving the data out of Supabase (once)

Do this after the first deploy, while Supabase still has the latest data.

1. On your PC, in this repo, with the Supabase values still in `.env`:

   ```bash
   npm run export:supabase
   ```

   It only reads, and writes `supabase-export.json` (gitignored).
2. Copy the file into the server's data folder:

   ```bash
   scp supabase-export.json <user>@<server>:fish-case-planner/data/
   ```

3. On the server, load it:

   ```bash
   cd ~/fish-case-planner && docker compose exec api node api/import.js /data/supabase-export.json
   ```

   Share codes and dates stay the same. Running it again replaces rows rather than duplicating them.
4. Open the site, check a share code you know loads, then delete `supabase-export.json` from both places.

After that, the Vercel project, the Supabase project and the two `VITE_SUPABASE_*` lines in `.env` can all go. Anyone with the old Vercel address needs the new one.

## Backups

The whole database is `~/fish-case-planner/data/fish-case-planner.db` (plus `-wal` and `-shm` files while it's open), so copying that file alone can miss recent changes. To make a complete copy while the API runs:

```bash
cd ~/fish-case-planner && docker compose exec api node api/backup.js
```

It writes `data/backup-<date>.db`; copy that off the server.

## When something breaks

- A deploy that fails at "Connect to Tailscale" usually means the auth key expired (90 days at most). Make a new reusable, ephemeral key and update the secret.
- "502 Bad Gateway" from the site: check `docker compose ps` in `~/fish-case-planner`. If the API keeps restarting, `docker compose logs api` says why.
- The app loads but sharing fails with "Couldn't reach the server": nginx can't reach the API. `docker compose restart api && docker compose exec web nginx -s reload`.
