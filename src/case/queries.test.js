import { describe, it, expect } from "vitest";
import { colorsClash, indexProducts, productsInCase, placedProducts, neighbourSlots, colorClashes } from "./queries.js";

const pan = (id, depth, slots) => ({ id, width: 6, depth, panType: "shallow", slots });
const catalog = [
  { id: "atl", name: "Atlantic Fillet", color: "warm" },
  { id: "ctr", name: "Atlantic Centers", color: "warm" },
  { id: "king", name: "King Salmon", color: "red" },
  { id: "sock", name: "Sockeye Salmon", color: "red" },
  { id: "cod", name: "Cod", color: "cool" },
  { id: "hal", name: "Halibut", color: "cool" },
];
const index = indexProducts(catalog);
const pairs = (pans) => colorClashes(pans, index).map(({ a, b }) => `${a.product.id}-${b.product.id}`);

describe("colorsClash", () => {
  it("clashes only on the same warm or red color", () => {
    expect(colorsClash({ color: "warm" }, { color: "warm" })).toBe(true);
    expect(colorsClash({ color: "red" }, { color: "red" })).toBe(true);
    expect(colorsClash({ color: "warm" }, { color: "red" })).toBe(false);
    expect(colorsClash({ color: "cool" }, { color: "cool" })).toBe(false);
    expect(colorsClash({ color: "warm" }, undefined)).toBe(false);
  });
});

describe("productsInCase", () => {
  const pans = [pan("a", "half", { 0: "cod", 1: "atl" }), pan("b", "full", { 0: "cod" })];

  it("collects each placed product once", () => {
    expect([...productsInCase(pans)].sort()).toEqual(["atl", "cod"]);
  });

  it("can leave out one slot", () => {
    expect([...productsInCase(pans, { except: { panId: "a", slot: 1 } })]).toEqual(["cod"]);
  });

  it("placedProducts returns their catalog entries", () => {
    expect(placedProducts(pans, catalog).map((p) => p.id)).toEqual(["atl", "cod"]);
  });
});

describe("neighbourSlots", () => {
  const pans = [pan("full", "full", { 0: null }), pan("half", "half", { 0: null, 1: null }), pan("third", "third", { 0: null, 1: null, 2: null })];

  it("a full pan touches every slot beside it", () => {
    expect(neighbourSlots(pans, "full", 0)).toEqual([{ panId: "half", slot: 0 }, { panId: "half", slot: 1 }]);
  });

  it("split pans touch only slots whose depth overlaps", () => {
    // half back covers 6-12; third mid covers 4-8, third back 8-12
    expect(neighbourSlots(pans, "half", 1)).toEqual([{ panId: "full", slot: 0 }, { panId: "third", slot: 1 }, { panId: "third", slot: 2 }]);
    // third front covers 0-4: only the half front (0-6)
    expect(neighbourSlots(pans, "third", 0)).toEqual([{ panId: "half", slot: 0 }]);
  });

  it("returns nothing for an unknown pan", () => {
    expect(neighbourSlots(pans, "missing", 0)).toEqual([]);
  });
});

describe("colorClashes", () => {
  it("flags the same color side by side", () => {
    expect(pairs([pan("a", "full", { 0: "atl" }), pan("b", "full", { 0: "ctr" })])).toEqual(["atl-ctr"]);
  });

  it("does not flag warm next to red, or cool next to cool", () => {
    expect(pairs([pan("a", "full", { 0: "atl" }), pan("b", "full", { 0: "king" }), pan("c", "full", { 0: "cod" }), pan("d", "full", { 0: "hal" })])).toEqual([]);
  });

  it("does not flag split slots that don't touch", () => {
    // half back (6-12) holds King Salmon; third front (0-4) holds Sockeye
    const pans = [pan("a", "half", { 0: "cod", 1: "king" }), pan("b", "third", { 0: "sock", 1: "hal", 2: "cod" })];
    expect(pairs(pans)).toEqual([]);
  });

  it("flags split slots that do touch", () => {
    const pans = [pan("a", "half", { 0: "cod", 1: "king" }), pan("b", "third", { 0: "hal", 1: "sock", 2: "cod" })];
    expect(pairs(pans)).toEqual(["king-sock"]);
  });

  it("ignores products missing from the catalog", () => {
    expect(pairs([pan("a", "full", { 0: "gone" }), pan("b", "full", { 0: "atl" })])).toEqual([]);
  });
});
