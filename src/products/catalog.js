// Operations on the Product list, kept pure so they can be tested without React.

// Older catalogs used orange/white/blue; the color separation rule uses warm/cool/red.
const migrateColor = (c) => (c === "orange" ? "warm" : c === "white" || c === "blue" ? "cool" : c);

// Fills fields added after a Product was first saved and maps old colors.
export const normalizeProduct = (p) => ({
  preferredZone: "",
  preferredSplit: "",
  ...p,
  color: migrateColor(p.color),
  preferredPosition: p.preferredPosition || "",
  labels: p.labels || [],
});

export const normalizeProducts = (ps) => (Array.isArray(ps) ? ps.map(normalizeProduct) : []);

// Replaces the Product with the same id, or appends it.
export function upsertProduct(products, product) {
  const p = normalizeProduct(product);
  const i = products.findIndex((x) => x.id === p.id);
  if (i === -1) return [...products, p];
  const next = [...products];
  next[i] = p;
  return next;
}

export const removeProduct = (products, id) => products.filter((p) => p.id !== id);
