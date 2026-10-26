// One-time copy of everything in Supabase into supabase-export.json, for
// api/import.js to load on the server. Reads VITE_SUPABASE_URL and
// VITE_SUPABASE_ANON_KEY from .env and only reads, never writes.
//
// Usage: npm run export:supabase
import { writeFileSync } from "node:fs";

const url = process.env.VITE_SUPABASE_URL;
const key = process.env.VITE_SUPABASE_ANON_KEY;
if (!url || !key) {
  console.error("Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to .env first.");
  process.exit(1);
}

// Supabase answers at most 1000 rows per request, so read in pages.
async function readAll(table) {
  const rows = [];
  for (let from = 0; ; from += 1000) {
    const res = await fetch(`${url}/rest/v1/${table}?select=*`, {
      headers: { apikey: key, Authorization: `Bearer ${key}`, Range: `${from}-${from + 999}` },
    });
    if (!res.ok) throw new Error(`Reading ${table} failed: ${res.status} ${await res.text()}`);
    const page = await res.json();
    rows.push(...page);
    if (page.length < 1000) return rows;
  }
}

const cases = await readAll("published_cases");
const products = await readAll("products");

writeFileSync("supabase-export.json", JSON.stringify({ cases, products }, null, 2));
console.log(`Wrote supabase-export.json: ${cases.length} published cases, ${products.length} products.`);
