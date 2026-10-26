// Starts the API and nginx containers the way deploy/compose.yaml does, with
// deploy/conf and the build in dist/, and fails unless the site answers the
// way the server should: the app with no caching on index.html, long caching
// on hashed assets, a missing asset as a 404, and /api forwarded to the API
// so a case can be published and loaded back.
// Needs Docker and a build in dist/, so it runs in CI.
//
// Usage: node scripts/check-server.mjs
import { execFileSync } from "node:child_process";
import { readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const PORT = 8091;
const NETWORK = "fish-case-planner-check";
const WEB = "fish-case-planner-check";
const API = "fish-case-planner-api"; // the name nginx forwards to
const compose = readFileSync("deploy/compose.yaml", "utf8");
const [WEB_IMAGE, API_IMAGE] = [...compose.matchAll(/^\s*image:\s*(\S+)/gm)].map((m) => m[1]);

const docker = (...args) => execFileSync("docker", args, { stdio: ["ignore", "ignore", "inherit"] });

docker("network", "create", NETWORK);
const failures = [];
try {
  docker(
    "run", "--detach", "--rm", "--name", API, "--network", NETWORK,
    "--workdir", "/app", "--env", "PORT=3000", "--env", "DB_PATH=/tmp/check.db",
    "--volume", `${resolve("api")}:/app/api:ro`,
    API_IMAGE, "node", "api/index.js",
  );
  docker(
    "run", "--detach", "--rm", "--name", WEB, "--network", NETWORK, "--publish", `${PORT}:80`,
    "--volume", `${resolve("dist")}:/usr/share/nginx/html:ro`,
    "--volume", `${resolve("deploy/conf")}:/etc/nginx/conf.d:ro`,
    WEB_IMAGE,
  );
  await waitFor("/api/products");
  const asset = readdirSync("dist/assets").find((name) => name.endsWith(".js"));

  await expect("/", 200, { "cache-control": "no-cache", "content-type": "text/html" });
  await expect(`/assets/${asset}`, 200, { "cache-control": "public, max-age=31536000, immutable" });
  await expect("/assets/missing.js", 404, {});
  await expect("/api/products", 200, { "content-type": "application/json" });

  const published = await fetch(`http://localhost:${PORT}/api/cases`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: "Check", author: "", caseWidth: 81, pans: [], products: [] }),
  }).then((res) => res.json());
  await expect(`/api/cases/${published.shortCode}`, 200, { "content-type": "application/json" });
} finally {
  for (const name of [WEB, API]) {
    try { docker("stop", name); } catch { /* it never started */ }
  }
  docker("network", "rm", NETWORK);
}

if (failures.length > 0) {
  console.error(`The server config isn't answering as it should:\n  ${failures.join("\n  ")}`);
  process.exit(1);
}
console.log("The server config answers as it should.");

async function expect(path, status, headers) {
  const response = await fetch(`http://localhost:${PORT}${path}`);
  if (response.status !== status) failures.push(`${path}: status ${response.status}, expected ${status}`);
  for (const [name, value] of Object.entries(headers)) {
    const actual = response.headers.get(name) ?? "";
    if (!actual.startsWith(value)) failures.push(`${path}: ${name} is "${actual}", expected "${value}"`);
  }
}

async function waitFor(path) {
  for (let tries = 0; tries < 40; tries++) {
    try {
      if ((await fetch(`http://localhost:${PORT}${path}`)).ok) return;
    } catch { /* not up yet */ }
    await new Promise((done) => setTimeout(done, 250));
  }
  throw new Error("The containers did not start.");
}
