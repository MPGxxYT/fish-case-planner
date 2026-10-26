// Loads supabase-export.json (from `npm run export:supabase`) into the
// database. Cases keep their share codes and dates. Running it twice is
// safe: rows with the same code or id are replaced, not duplicated.
//
// On the server: docker compose exec api node api/import.js /data/supabase-export.json
import { readFileSync } from "node:fs";
import { openStore } from "./store.js";

const [file] = process.argv.slice(2);
if (!file) {
  console.error("Usage: node api/import.js <path to supabase-export.json>");
  process.exit(1);
}

const { cases, products } = JSON.parse(readFileSync(file, "utf8"));
const store = openStore(process.env.DB_PATH || "data/fish-case-planner.db");

for (const row of cases) {
  store.importCase({
    shortCode: row.short_code,
    name: row.name,
    author: row.author || "",
    caseWidth: row.case_width,
    pans: row.pans,
    products: row.products,
    createdAt: new Date(row.created_at).toISOString(),
  });
}

// Supabase stored products in snake_case columns; the app uses camelCase.
for (const row of products) {
  store.saveProduct({
    id: row.id,
    name: row.name,
    plu: row.plu,
    color: row.color,
    cookType: row.cook_type,
    fishType: row.fish_type,
    maxPan: row.max_pan,
    minPan: row.min_pan,
    deepShallow: row.deep_shallow,
    demand: row.demand,
    preferredPosition: row.preferred_position || "",
    preferredZone: row.preferred_zone || "",
    preferredSplit: row.preferred_split || "",
    labels: row.labels || [],
  });
}

store.close();
console.log(`Imported ${cases.length} published cases and ${products.length} products.`);
