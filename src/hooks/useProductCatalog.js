import { useState, useEffect, useCallback } from "react";
import { useLocalStorage } from "./useLocalStorage.js";
import { fetchPublicProducts, upsertPublicProduct, deletePublicProduct } from "../lib/api.js";
import { normalizeProducts, upsertProduct, removeProduct } from "../products/catalog.js";

// The shared Product catalog. The server is the source of truth; localStorage
// keeps the last list so the app opens with Products even when offline.
// save and remove change the list only after the server accepts the change,
// and reject with the server's message otherwise.
export function useProductCatalog() {
  const [products, setProducts] = useLocalStorage("fcp3_products", [], normalizeProducts);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const fresh = normalizeProducts(await fetchPublicProducts());
    setProducts(fresh);
    return fresh;
  }, [setProducts]);

  // On open: show the cached list, then the server's. Offline keeps the cache.
  useEffect(() => { load().catch(() => {}); }, [load]);

  const refresh = async () => {
    setRefreshing(true);
    try {
      return await load();
    } finally {
      setRefreshing(false);
    }
  };

  const save = async (product) => {
    await upsertPublicProduct(product);
    setProducts((ps) => upsertProduct(ps, product));
  };

  const remove = async (id) => {
    await deletePublicProduct(id);
    setProducts((ps) => removeProduct(ps, id));
  };

  return { products, save, remove, refresh, refreshing };
}
