// Published cases and the shared product catalog, stored by the API in
// api/. In development Vite forwards /api to `npm run dev:api`; on the
// server nginx does.

async function request(method, path, body) {
  let res;
  try {
    res = await fetch(`/api${path}`, {
      method,
      headers: body === undefined ? undefined : { "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new Error("Couldn't reach the server. Check your connection and try again.");
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `The server answered ${res.status}.`);
  return data;
}

function getUsedProducts(pans, products) {
  const usedIds = new Set();
  for (const pan of pans) {
    for (const pid of Object.values(pan.slots)) {
      if (pid) usedIds.add(pid);
    }
  }
  return products.filter((p) => usedIds.has(p.id));
}

export function publishCase(name, author, pans, products, caseWidth) {
  return request("POST", "/cases", { name, author: author || "", caseWidth, pans, products: getUsedProducts(pans, products) });
}

export function fetchPublicCases(page = 0, search = "") {
  const params = new URLSearchParams({ page: String(page), search: search.trim() });
  return request("GET", `/cases?${params}`);
}

export function fetchCaseByCode(code) {
  return request("GET", `/cases/${encodeURIComponent(code.toUpperCase().trim())}`);
}

export async function deletePublicCase(shortCode) {
  await request("DELETE", `/cases/${encodeURIComponent(shortCode)}`);
}

export async function updatePublicCase(shortCode, pans, products, caseWidth) {
  await request("PUT", `/cases/${encodeURIComponent(shortCode)}`, { caseWidth, pans, products: getUsedProducts(pans, products) });
}

// ─── Shared Product Catalog ───────────────────────────────────────────────────

export function fetchPublicProducts() {
  return request("GET", "/products");
}

export async function upsertPublicProduct(product) {
  await request("PUT", `/products/${encodeURIComponent(product.id)}`, product);
}

export async function deletePublicProduct(id) {
  await request("DELETE", `/products/${encodeURIComponent(id)}`);
}
