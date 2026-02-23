import { PAN_WIDTHS } from "./constants.js";
import { uid } from "./helpers.js";

export function autoGenerateCase(items, caseWidth) {
  const sorted = [...items].sort(
    (a, b) => b.product.demand + (b.onSale ? 4 : 0) - (a.product.demand + (a.onSale ? 4 : 0))
  );

  const assignments = sorted.map((item) => {
    const p = item.product;
    const eff = p.demand + (item.onSale ? 4 : 0);
    let ts;
    if (eff >= 10) {
      ts = p.maxPan;
    } else if (eff >= 7) {
      const sz = PAN_WIDTHS.filter((w) => w >= p.minPan && w <= p.maxPan);
      ts = sz[Math.min(sz.length - 1, Math.floor(sz.length * 0.75))] || p.maxPan;
    } else if (eff >= 4) {
      const sz = PAN_WIDTHS.filter((w) => w >= p.minPan && w <= p.maxPan);
      ts = sz[Math.floor(sz.length / 2)] || p.minPan;
    } else {
      ts = p.minPan;
    }
    return { ...item, targetSize: ts };
  });

  let total = assignments.reduce((s, a) => s + a.targetSize, 0);
  if (total > caseWidth) {
    const rev = [...assignments].reverse();
    for (const a of rev) {
      if (total <= caseWidth) break;
      const old = a.targetSize;
      const sz = PAN_WIDTHS.filter((w) => w >= a.product.minPan && w < old);
      a.targetSize = sz.length > 0 ? sz[sz.length - 1] : a.product.minPan;
      total -= old - a.targetSize;
    }
  }

  const arranged = [];
  const pool = [...assignments];
  const isWarm = (c) => c === "warm" || c === "red";
  let lastWarm = false;
  while (pool.length > 0) {
    let idx = pool.findIndex((a) => isWarm(a.product.color) !== lastWarm);
    if (idx === -1) idx = 0;
    arranged.push(pool.splice(idx, 1)[0]);
    lastWarm = isWarm(arranged[arranged.length - 1].product.color);
  }

  let rem = caseWidth;
  return arranged
    .filter((a) => {
      if (a.targetSize <= rem) {
        rem -= a.targetSize;
        return true;
      }
      return false;
    })
    .map((a) => ({
      id: uid(),
      width: a.targetSize,
      depth: "full",
      panType: a.product.deepShallow || "shallow",
      slots: { 0: a.product.id },
    }));
}
