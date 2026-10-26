// The HTTP routes the app calls, all under /api. Nginx sends /api requests
// here and serves everything else from the build.
//
//   GET    /api/cases?page=0&search=   newest published cases
//   POST   /api/cases                  publish, answers { shortCode }
//   GET    /api/cases/:code            one case
//   PUT    /api/cases/:code            replace its pans, products and width
//   DELETE /api/cases/:code
//   GET    /api/products               the shared catalog
//   PUT    /api/products/:id           add or replace a product
//   DELETE /api/products/:id

const MAX_BODY = 1_000_000; // bytes; a full case is a few kilobytes

class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

export function createHandler(store) {
  const routes = [
    ["GET", /^\/api\/cases$/, (req, url) =>
      store.listCases(Math.max(0, Number(url.searchParams.get("page")) || 0), url.searchParams.get("search") || "")],
    ["POST", /^\/api\/cases$/, async (req) => {
      const body = await readCase(req, { named: true });
      return { shortCode: store.publishCase(body) };
    }],
    ["GET", /^\/api\/cases\/([^/]+)$/, (req, url, code) => {
      const found = store.getCase(normalizeCode(code));
      if (!found) throw new HttpError(404, `No case found with code "${code}".`);
      return found;
    }],
    ["PUT", /^\/api\/cases\/([^/]+)$/, async (req, url, code) => {
      const body = await readCase(req, { named: false });
      if (!store.updateCase(normalizeCode(code), body)) throw new HttpError(404, `No case found with code "${code}".`);
      return {};
    }],
    ["DELETE", /^\/api\/cases\/([^/]+)$/, (req, url, code) => {
      store.deleteCase(normalizeCode(code));
      return {};
    }],
    ["GET", /^\/api\/products$/, () => store.listProducts()],
    ["PUT", /^\/api\/products\/([^/]+)$/, async (req, url, id) => {
      const product = await readJson(req);
      if (typeof product?.name !== "string" || !product.name.trim()) throw new HttpError(400, "A product needs a name.");
      store.saveProduct({ ...product, id });
      return {};
    }],
    ["DELETE", /^\/api\/products\/([^/]+)$/, (req, url, id) => {
      store.deleteProduct(id);
      return {};
    }],
  ];

  return async (req, res) => {
    const url = new URL(req.url, "http://localhost");
    try {
      for (const [method, pattern, run] of routes) {
        const match = url.pathname.match(pattern);
        if (!match || req.method !== method) continue;
        const params = match.slice(1).map(decodeURIComponent);
        return send(res, 200, await run(req, url, ...params));
      }
      throw new HttpError(404, "Not found.");
    } catch (err) {
      if (err instanceof HttpError) return send(res, err.status, { error: err.message });
      console.error(err);
      send(res, 500, { error: "Something went wrong on the server." });
    }
  };
}

function normalizeCode(code) {
  return code.toUpperCase().trim();
}

async function readCase(req, { named }) {
  const body = await readJson(req);
  if (named && (typeof body?.name !== "string" || !body.name.trim())) throw new HttpError(400, "A case needs a name.");
  if (!Array.isArray(body?.pans) || !Array.isArray(body?.products)) throw new HttpError(400, "A case needs pans and products.");
  if (!Number.isFinite(body.caseWidth)) throw new HttpError(400, "A case needs a width.");
  return {
    name: named ? body.name.trim() : undefined,
    author: typeof body.author === "string" ? body.author.trim() : "",
    caseWidth: body.caseWidth,
    pans: body.pans,
    products: body.products,
  };
}

async function readJson(req) {
  let size = 0;
  const chunks = [];
  for await (const chunk of req) {
    size += chunk.length;
    if (size > MAX_BODY) throw new HttpError(413, "That case is too large to save.");
    chunks.push(chunk);
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    throw new HttpError(400, "The request body isn't valid JSON.");
  }
}

function send(res, status, body) {
  res.writeHead(status, { "Content-Type": "application/json", "Cache-Control": "no-store" });
  res.end(JSON.stringify(body));
}
