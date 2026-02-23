import { PRODUCT_COLORS } from "./constants.js";

const isWarmGroup = (c) => c === "warm" || c === "red";

export function checkColorConflicts(pans, products) {
  const w = [];
  for (let i = 0; i < pans.length - 1; i++) {
    const pA = Object.values(pans[i].slots)
      .filter(Boolean)
      .map((id) => products.find((p) => p.id === id))
      .filter(Boolean);
    const pB = Object.values(pans[i + 1].slots)
      .filter(Boolean)
      .map((id) => products.find((p) => p.id === id))
      .filter(Boolean);
    for (const a of pA) {
      for (const b of pB) {
        if (isWarmGroup(a.color) && isWarmGroup(b.color)) {
          w.push(
            `"${a.name}" & "${b.name}" adjacent — both ${PRODUCT_COLORS[a.color]?.label || a.color}/${PRODUCT_COLORS[b.color]?.label || b.color}`
          );
        }
      }
    }
  }
  return w;
}
