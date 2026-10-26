import { test, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { openStore, PAGE_SIZE } from "./store.js";
import { createHandler } from "./app.js";

let server, base, store;

function startWith(options) {
  store = openStore(":memory:", options);
  server = createServer(createHandler(store));
  return new Promise((ready) => server.listen(0, () => {
    base = `http://localhost:${server.address().port}/api`;
    ready();
  }));
}

// fetch keeps connections open between requests, so close them or the
// server never finishes closing.
function stop() {
  return new Promise((done) => {
    server.close(() => { store.close(); done(); });
    server.closeAllConnections();
  });
}

beforeEach(() => startWith());
afterEach(() => stop());

const call = async (method, path, body) => {
  const res = await fetch(base + path, {
    method,
    headers: body === undefined ? {} : { "Content-Type": "application/json" },
    body: body === undefined ? undefined : typeof body === "string" ? body : JSON.stringify(body),
  });
  return { status: res.status, body: await res.json() };
};

const pans = [{ id: "p1", width: 6, depth: "full", slots: { 0: "salmon" } }];
const salmon = { id: "salmon", name: "Atlantic Salmon", color: "warm", maxPan: 8, minPan: 6, labels: [] };
const aCase = { name: "Monday", author: "Sam", caseWidth: 81, pans, products: [salmon] };

test("a published case can be loaded by its code in any case", async () => {
  const { status, body } = await call("POST", "/cases", aCase);
  assert.equal(status, 200);
  assert.match(body.shortCode, /^[A-HJ-NP-Z2-9]{6}$/);

  const loaded = await call("GET", `/cases/${body.shortCode.toLowerCase()}`);
  assert.equal(loaded.status, 200);
  assert.deepEqual(
    { ...loaded.body, createdAt: undefined },
    { ...aCase, shortCode: body.shortCode, createdAt: undefined },
  );
});

test("an unknown code is a 404 with a message the app can show", async () => {
  const { status, body } = await call("GET", "/cases/ZZZZZZ");
  assert.equal(status, 404);
  assert.equal(body.error, 'No case found with code "ZZZZZZ".');
});

test("publishing retries when a code is taken", async () => {
  const codes = ["AAAAAA", "AAAAAA", "BBBBBB"];
  await stop();
  await startWith({ makeCode: () => codes.shift() });

  assert.equal((await call("POST", "/cases", aCase)).body.shortCode, "AAAAAA");
  assert.equal((await call("POST", "/cases", aCase)).body.shortCode, "BBBBBB");
});

test("cases list newest first, a page at a time", async () => {
  for (let i = 0; i < PAGE_SIZE + 1; i++) {
    store.publishCase({ ...aCase, name: `Case ${i}`, createdAt: new Date(2026, 0, 1, 0, i).toISOString() });
  }
  const first = await call("GET", "/cases?page=0");
  assert.equal(first.body.cases.length, PAGE_SIZE);
  assert.equal(first.body.cases[0].name, `Case ${PAGE_SIZE}`);
  assert.equal(first.body.hasMore, true);

  const second = await call("GET", "/cases?page=1");
  assert.deepEqual(second.body.cases.map((c) => c.name), ["Case 0"]);
  assert.equal(second.body.hasMore, false);
});

test("search matches name or author, ignoring letter case", async () => {
  store.publishCase({ ...aCase, name: "Weekend Salmon", author: "Ana" });
  store.publishCase({ ...aCase, name: "Shellfish", author: "Sammy" });
  store.publishCase({ ...aCase, name: "Cod", author: "Lee" });

  const names = async (q) => (await call("GET", `/cases?search=${q}`)).body.cases.map((c) => c.name).sort();
  assert.deepEqual(await names("salmon"), ["Weekend Salmon"]);
  assert.deepEqual(await names("SAM"), ["Shellfish"]);
  assert.deepEqual(await names("100%"), []);
});

test("updating a case replaces its pans, products and width but keeps its name", async () => {
  const { shortCode } = (await call("POST", "/cases", aCase)).body;
  const update = { caseWidth: 60, pans: [], products: [] };
  assert.equal((await call("PUT", `/cases/${shortCode}`, update)).status, 200);

  const loaded = (await call("GET", `/cases/${shortCode}`)).body;
  assert.equal(loaded.name, "Monday");
  assert.equal(loaded.caseWidth, 60);
  assert.deepEqual(loaded.pans, []);
  assert.equal((await call("PUT", "/cases/ZZZZZZ", update)).status, 404);
});

test("a deleted case is gone", async () => {
  const { shortCode } = (await call("POST", "/cases", aCase)).body;
  await call("DELETE", `/cases/${shortCode}`);
  assert.equal((await call("GET", `/cases/${shortCode}`)).status, 404);
});

test("products are saved, replaced, listed by name and deleted", async () => {
  await call("PUT", "/products/salmon", salmon);
  await call("PUT", "/products/cod", { id: "cod", name: "Cod" });
  await call("PUT", "/products/salmon", { ...salmon, demand: 9 });

  const listed = (await call("GET", "/products")).body;
  assert.deepEqual(listed.map((p) => p.name), ["Atlantic Salmon", "Cod"]);
  assert.equal(listed[0].demand, 9);

  await call("DELETE", "/products/cod");
  assert.deepEqual((await call("GET", "/products")).body.map((p) => p.id), ["salmon"]);
});

test("bad requests are refused with a reason", async () => {
  assert.equal((await call("POST", "/cases", { ...aCase, name: " " })).status, 400);
  assert.equal((await call("POST", "/cases", { ...aCase, pans: "no" })).status, 400);
  assert.equal((await call("POST", "/cases", "{not json")).status, 400);
  assert.equal((await call("PUT", "/products/x", { id: "x" })).status, 400);
  assert.equal((await call("POST", "/cases", { ...aCase, name: "x".repeat(1_100_000) })).status, 413);
  assert.equal((await call("GET", "/nothing")).status, 404);
});
