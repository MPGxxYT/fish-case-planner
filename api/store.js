import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";

// Published cases and the shared product catalog, kept in one SQLite file.
// Pans, dividers and products are stored as JSON text exactly as the app sends them.

export const PAGE_SIZE = 20;

const CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no I/O/0/1 to avoid confusion

export function generateShortCode() {
  let code = "";
  for (let i = 0; i < 6; i++) code += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
  return code;
}

export function openStore(path, { makeCode = generateShortCode } = {}) {
  if (path !== ":memory:") mkdirSync(dirname(path), { recursive: true });
  const db = new DatabaseSync(path);
  db.exec(`
    PRAGMA journal_mode = WAL;
    CREATE TABLE IF NOT EXISTS published_cases (
      short_code TEXT PRIMARY KEY,
      name       TEXT NOT NULL,
      author     TEXT NOT NULL DEFAULT '',
      case_width INTEGER NOT NULL,
      pans       TEXT NOT NULL,
      products   TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS products (
      id   TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      data TEXT NOT NULL
    );
  `);
  // Cases published before dividers were stored get an empty list.
  if (!db.prepare("PRAGMA table_info(published_cases)").all().some((c) => c.name === "dividers")) {
    db.exec("ALTER TABLE published_cases ADD COLUMN dividers TEXT NOT NULL DEFAULT '[]'");
  }

  const toCase = (row) => ({
    shortCode: row.short_code,
    name: row.name,
    author: row.author,
    caseWidth: row.case_width,
    pans: JSON.parse(row.pans),
    dividers: JSON.parse(row.dividers),
    products: JSON.parse(row.products),
    createdAt: row.created_at,
  });

  const insertCase = db.prepare(`
    INSERT INTO published_cases (short_code, name, author, case_width, pans, dividers, products, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  return {
    // Returns the new short code. Tries a few codes in case one is taken.
    publishCase({ name, author, caseWidth, pans, dividers = [], products, createdAt = new Date().toISOString() }) {
      for (let attempt = 0; attempt < 3; attempt++) {
        const code = makeCode();
        try {
          insertCase.run(code, name, author || "", caseWidth, JSON.stringify(pans), JSON.stringify(dividers), JSON.stringify(products), createdAt);
          return code;
        } catch (err) {
          if (err.errcode !== 1555) throw err; // SQLITE_CONSTRAINT_PRIMARYKEY
        }
      }
      throw new Error("Failed to generate a unique code. Please try again.");
    },

    // For api/import.js: keeps the case's own code and date.
    importCase({ shortCode, name, author, caseWidth, pans, dividers = [], products, createdAt }) {
      db.prepare(`
        INSERT OR REPLACE INTO published_cases (short_code, name, author, case_width, pans, dividers, products, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(shortCode, name, author, caseWidth, JSON.stringify(pans), JSON.stringify(dividers), JSON.stringify(products), createdAt);
    },

    // Newest first, PAGE_SIZE at a time, optionally matching name or author.
    listCases(page = 0, search = "") {
      const term = search.trim();
      const where = term ? "WHERE name LIKE ? ESCAPE '\\' OR author LIKE ? ESCAPE '\\'" : "";
      const like = `%${term.replace(/[\\%_]/g, (c) => "\\" + c)}%`;
      const params = term ? [like, like] : [];
      const rows = db
        .prepare(`SELECT * FROM published_cases ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`)
        .all(...params, PAGE_SIZE + 1, page * PAGE_SIZE);
      return { cases: rows.slice(0, PAGE_SIZE).map(toCase), hasMore: rows.length > PAGE_SIZE };
    },

    getCase(code) {
      const row = db.prepare("SELECT * FROM published_cases WHERE short_code = ?").get(code);
      return row ? toCase(row) : null;
    },

    // Returns false when no case has that code.
    updateCase(code, { caseWidth, pans, dividers = [], products }) {
      const result = db
        .prepare("UPDATE published_cases SET case_width = ?, pans = ?, dividers = ?, products = ? WHERE short_code = ?")
        .run(caseWidth, JSON.stringify(pans), JSON.stringify(dividers), JSON.stringify(products), code);
      return result.changes > 0;
    },

    deleteCase(code) {
      db.prepare("DELETE FROM published_cases WHERE short_code = ?").run(code);
    },

    listProducts() {
      return db.prepare("SELECT data FROM products ORDER BY name").all().map((row) => JSON.parse(row.data));
    },

    saveProduct(product) {
      db.prepare(`
        INSERT INTO products (id, name, data) VALUES (?, ?, ?)
        ON CONFLICT (id) DO UPDATE SET name = excluded.name, data = excluded.data
      `).run(product.id, product.name, JSON.stringify(product));
    },

    deleteProduct(id) {
      db.prepare("DELETE FROM products WHERE id = ?").run(id);
    },

    close() {
      db.close();
    },
  };
}
