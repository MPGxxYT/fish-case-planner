// Read-only questions about a Layout's pans: which Products are placed, which
// Slots touch, and where the color separation rule is broken.
import { DEPTH_UNITS } from "../utils/constants.js";

// Colors that blur together when the same one sits side by side. Cool is exempt.
const CLASHING_COLORS = new Set(["warm", "red"]);

export const colorsClash = (a, b) =>
  !!a && !!b && a.color === b.color && CLASHING_COLORS.has(a.color);

export const indexProducts = (products) => new Map(products.map((p) => [p.id, p]));

// Product ids placed anywhere in the pans, optionally leaving out one slot.
export function productsInCase(pans, { except } = {}) {
  const ids = new Set();
  for (const pan of pans) {
    for (const [slot, id] of Object.entries(pan.slots)) {
      if (!id) continue;
      if (except && pan.id === except.panId && +slot === except.slot) continue;
      ids.add(id);
    }
  }
  return ids;
}

// The catalog entries for every placed product, for exports and publishing.
export function placedProducts(pans, products) {
  const ids = productsInCase(pans);
  return products.filter((p) => ids.has(p.id));
}

// Front-to-back span of a slot, in depth units (front = 0).
const slotSpan = (pan, slot) => {
  const size = DEPTH_UNITS[pan.depth];
  return [slot * size, (slot + 1) * size];
};
const overlaps = ([a0, a1], [b0, b1]) => a0 < b1 && b0 < a1;

// Slots in the pans either side of (panId, slot) whose depth spans overlap it.
export function neighbourSlots(pans, panId, slot) {
  const i = pans.findIndex((p) => p.id === panId);
  if (i === -1) return [];
  const span = slotSpan(pans[i], slot);
  const result = [];
  for (const adj of [pans[i - 1], pans[i + 1]]) {
    if (!adj) continue;
    for (const s of Object.keys(adj.slots).map(Number)) {
      if (overlaps(span, slotSpan(adj, s))) result.push({ panId: adj.id, slot: s });
    }
  }
  return result;
}

// Every pair of touching slots, left to right, whose products clash.
export function colorClashes(pans, productIndex) {
  const clashes = [];
  for (let i = 0; i < pans.length - 1; i++) {
    const left = pans[i];
    const right = pans[i + 1];
    for (const ls of Object.keys(left.slots).map(Number)) {
      const a = productIndex.get(left.slots[ls]);
      if (!a) continue;
      for (const rs of Object.keys(right.slots).map(Number)) {
        if (!overlaps(slotSpan(left, ls), slotSpan(right, rs))) continue;
        const b = productIndex.get(right.slots[rs]);
        if (colorsClash(a, b)) {
          clashes.push({ a: { panId: left.id, slot: ls, product: a }, b: { panId: right.id, slot: rs, product: b } });
        }
      }
    }
  }
  return clashes;
}
