import { PAN_WIDTHS } from "./constants.js";
import { uid } from "./helpers.js";

const isWarm = (c) => c === "warm" || c === "red";
const sameWarm = (a, b) => isWarm(a.color) && isWarm(b.color) && a.color === b.color;
const effDemand = (item) => item.product.demand + (item.onSale ? 4 : 0);

// Widths valid for split pans (only 3 and 6 can be split)
const SPLIT_WIDTHS = [3, 6];

function getPanWidth(product, onSale, splitPan = false) {
  const eff = product.demand + (onSale ? 4 : 0);
  const validWidths = splitPan
    ? SPLIT_WIDTHS.filter((w) => w >= product.minPan)
    : PAN_WIDTHS.filter((w) => w >= product.minPan && w <= product.maxPan);
  if (!validWidths.length) return splitPan ? 6 : product.minPan;
  if (eff >= 10) return validWidths[validWidths.length - 1];
  if (eff >= 7)  return validWidths[Math.min(validWidths.length - 1, Math.floor(validWidths.length * 0.75))];
  if (eff >= 4)  return validWidths[Math.floor(validWidths.length / 2)];
  return validWidths[0];
}

// ── Arrangement ───────────────────────────────────────────────────────────────

const ZONE_RANGE = {
  "left":         [0.00, 0.20],
  "center-left":  [0.20, 0.40],
  "center":       [0.40, 0.60],
  "center-right": [0.60, 0.80],
  "right":        [0.80, 1.00],
};

function arrangePanUnits(units) {
  if (!units.length) return [];
  const n = units.length;
  const result = new Array(n).fill(null);

  const anchored   = units.filter((u) =>  u.zone).sort((a, b) => b.eff - a.eff);
  const unanchored = units.filter((u) => !u.zone).sort((a, b) => b.eff - a.eff);

  // Place anchored units into their preferred zone range
  for (const unit of anchored) {
    const [lo, hi] = ZONE_RANGE[unit.zone] || [0.4, 0.6];
    const start = Math.floor(lo * n);
    const end   = Math.ceil(hi * n);
    let placed = false;
    for (let i = start; i < end && !placed; i++) {
      if (!result[i]) { result[i] = unit; placed = true; }
    }
    if (!placed) {
      // Drift toward center of the zone
      const mid = Math.floor((start + end) / 2);
      for (let d = 1; d <= n && !placed; d++) {
        for (const i of [mid - d, mid + d]) {
          if (i >= 0 && i < n && !result[i]) { result[i] = unit; placed = true; break; }
        }
      }
    }
  }

  // Fill remaining slots center-out with unanchored (highest demand → center)
  const emptySlots = result.map((v, i) => (v ? -1 : i)).filter((i) => i >= 0);
  const mid = (n - 1) / 2;
  emptySlots.sort((a, b) => Math.abs(a - mid) - Math.abs(b - mid));
  unanchored.forEach((unit, i) => { if (i < emptySlots.length) result[emptySlots[i]] = unit; });

  const arranged = result.filter(Boolean);

  // Color alternation: greedy swap to fix same-warm adjacency
  for (let i = 0; i < arranged.length - 1; i++) {
    if (sameWarm(arranged[i], arranged[i + 1])) {
      for (let j = i + 2; j < arranged.length; j++) {
        if (!sameWarm(arranged[i], arranged[j])) {
          [arranged[i + 1], arranged[j]] = [arranged[j], arranged[i + 1]];
          break;
        }
      }
    }
  }

  return arranged;
}

// ── Main export ───────────────────────────────────────────────────────────────

export function autoGenerateCase(items, caseWidth) {
  // 1. Separate by preferredSplit
  const halfItems  = items.filter((i) => i.product.preferredSplit === "half");
  const thirdItems = items.filter((i) => i.product.preferredSplit === "third");
  const fullItems  = items.filter((i) => i.product.preferredSplit === "full");
  // Auto ("") = pair into half pans if splittable (minPan ≤ 6), otherwise fall to full
  const autoItems  = items.filter((i) => !i.product.preferredSplit);

  const panUnits = [];

  // 2. Half-split pairs (explicit): sort by demand desc, pair highest with next highest
  const sortedHalf = [...halfItems].sort((a, b) => effDemand(b) - effDemand(a));
  for (let i = 0; i < sortedHalf.length; i += 2) {
    if (i + 1 < sortedHalf.length) {
      const a = sortedHalf[i], b = sortedHalf[i + 1];
      const w = Math.max(getPanWidth(a.product, a.onSale, true), getPanWidth(b.product, b.onSale, true));
      panUnits.push({
        type: "half",
        items: [a, b],
        width: w,
        eff: Math.max(effDemand(a), effDemand(b)),
        zone: a.product.preferredZone || b.product.preferredZone || "",
        color: effDemand(a) >= effDemand(b) ? a.product.color : b.product.color,
        panType: (a.product.deepShallow === "deep" || b.product.deepShallow === "deep") ? "deep" : "shallow",
      });
    } else {
      // Odd one out → treat as full
      fullItems.push(sortedHalf[i]);
    }
  }

  // 3. Third-split triples (explicit): sort by demand desc, group in threes
  const sortedThird = [...thirdItems].sort((a, b) => effDemand(b) - effDemand(a));
  for (let i = 0; i < sortedThird.length; i += 3) {
    const group = sortedThird.slice(i, i + 3);
    if (group.length === 3) {
      const w = Math.max(...group.map((x) => getPanWidth(x.product, x.onSale, true)));
      panUnits.push({
        type: "third",
        items: group,
        width: w,
        eff: Math.max(...group.map(effDemand)),
        zone: group.find((x) => x.product.preferredZone)?.product.preferredZone || "",
        color: group[0].product.color,
        panType: group.some((x) => x.product.deepShallow === "deep") ? "deep" : "shallow",
      });
    } else {
      // Incomplete group → treat as full
      fullItems.push(...group);
    }
  }

  // 4. Auto items: pair splittable ones (minPan ≤ 6) into half pans; rest fall to full
  const autoQueue = [...autoItems].sort((a, b) => effDemand(b) - effDemand(a));
  while (autoQueue.length > 0) {
    const a = autoQueue.shift();
    if (a.product.minPan > 6) { fullItems.push(a); continue; }
    const partnerIdx = autoQueue.findIndex((x) => x.product.minPan <= 6);
    if (partnerIdx >= 0) {
      const b = autoQueue.splice(partnerIdx, 1)[0];
      const w = Math.max(getPanWidth(a.product, a.onSale, true), getPanWidth(b.product, b.onSale, true));
      panUnits.push({
        type: "half",
        items: [a, b],
        width: w,
        eff: Math.max(effDemand(a), effDemand(b)),
        zone: a.product.preferredZone || b.product.preferredZone || "",
        color: effDemand(a) >= effDemand(b) ? a.product.color : b.product.color,
        panType: (a.product.deepShallow === "deep" || b.product.deepShallow === "deep") ? "deep" : "shallow",
      });
    } else {
      fullItems.push(a); // no splittable partner available → full
    }
  }

  // 5. Full pans
  for (const item of fullItems) {
    panUnits.push({
      type: "full",
      items: [item],
      width: getPanWidth(item.product, item.onSale, false),
      eff: effDemand(item),
      zone: item.product.preferredZone || "",
      color: item.product.color,
      panType: item.product.deepShallow || "shallow",
    });
  }

  // 6. Scale down lowest-priority units if total > caseWidth
  let total = panUnits.reduce((s, u) => s + u.width, 0);
  if (total > caseWidth) {
    const byPriority = [...panUnits].sort((a, b) => a.eff - b.eff);
    for (const unit of byPriority) {
      if (total <= caseWidth) break;
      const isSplit = unit.type !== "full";
      const minW = isSplit
        ? Math.max(...unit.items.map((i) => i.product.minPan))
        : unit.items[0].product.minPan;
      const smaller = (isSplit ? SPLIT_WIDTHS : PAN_WIDTHS).filter((w) => w >= minW && w < unit.width);
      if (smaller.length) {
        const newW = smaller[smaller.length - 1];
        total -= unit.width - newW;
        unit.width = newW;
      }
    }
  }

  // 7. Arrange: zone placement, center-out demand, color alternation
  const arranged = arrangePanUnits(panUnits);

  // 8. Build pan objects, stop if we exceed case width
  let rem = caseWidth;
  return arranged
    .filter((unit) => {
      if (unit.width <= rem) { rem -= unit.width; return true; }
      return false;
    })
    .map((unit) => {
      if (unit.type === "half") {
        return { id: uid(), width: unit.width, depth: "half", panType: unit.panType, slots: { 0: unit.items[0].product.id, 1: unit.items[1].product.id } };
      }
      if (unit.type === "third") {
        return { id: uid(), width: unit.width, depth: "third", panType: unit.panType, slots: { 0: unit.items[0].product.id, 1: unit.items[1].product.id, 2: unit.items[2].product.id } };
      }
      return { id: uid(), width: unit.width, depth: "full", panType: unit.panType, slots: { 0: unit.items[0].product.id } };
    });
}

// ── Width estimator (used by AutoGenModal live bar) ───────────────────────────

export function estimateTotalWidth(selectedProducts, sel) {
  const items = selectedProducts.map((p) => ({ product: p, onSale: sel[p.id]?.onSale ?? false }));

  const half  = [...items.filter((i) => i.product.preferredSplit === "half")].sort((a, b) => effDemand(b) - effDemand(a));
  const third = [...items.filter((i) => i.product.preferredSplit === "third")].sort((a, b) => effDemand(b) - effDemand(a));
  const full  = items.filter((i) => i.product.preferredSplit === "full");
  const auto  = [...items.filter((i) => !i.product.preferredSplit)].sort((a, b) => effDemand(b) - effDemand(a));

  let total = 0;
  for (let i = 0; i < half.length; i += 2) {
    if (i + 1 < half.length) total += Math.max(getPanWidth(half[i].product, half[i].onSale, true), getPanWidth(half[i + 1].product, half[i + 1].onSale, true));
    else total += getPanWidth(half[i].product, half[i].onSale, true);
  }
  for (let i = 0; i < third.length; i += 3) {
    const group = third.slice(i, i + 3);
    total += Math.max(...group.map((x) => getPanWidth(x.product, x.onSale, true)));
  }
  for (const item of full) total += getPanWidth(item.product, item.onSale, false);

  // Auto: pair splittable ones (minPan ≤ 6) into half pans, rest count as full
  const autoQueue = [...auto];
  while (autoQueue.length > 0) {
    const a = autoQueue.shift();
    if (a.product.minPan > 6) { total += getPanWidth(a.product, a.onSale, false); continue; }
    const partnerIdx = autoQueue.findIndex((x) => x.product.minPan <= 6);
    if (partnerIdx >= 0) {
      const b = autoQueue.splice(partnerIdx, 1)[0];
      total += Math.max(getPanWidth(a.product, a.onSale, true), getPanWidth(b.product, b.onSale, true));
    } else {
      total += getPanWidth(a.product, a.onSale, false);
    }
  }
  return total;
}
