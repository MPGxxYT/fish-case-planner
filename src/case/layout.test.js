import { describe, it, expect } from "vitest";
import { applyEdit, checkFit, clampCaseWidth, createHistory, record, undo, redo, HISTORY_LIMIT, MAX_CASE_WIDTH } from "./layout.js";

const pan = (id, width, depth = "full", slots = null, extra = {}) => ({
  id, width, depth, panType: "shallow",
  slots: slots ?? (depth === "half" ? { 0: null, 1: null } : depth === "third" ? { 0: null, 1: null, 2: null } : { 0: null }),
  ...extra,
});
const layoutOf = (pans, caseWidth = 81, dividers = []) => ({ pans, caseWidth, dividers });
const ids = (layout) => layout.pans.map((p) => p.id);
const counter = () => { let n = 0; return { makeId: () => `new${++n}` }; };

const salmon = { id: "salmon", minPan: 6, deepShallow: "shallow" };
const shrimp = { id: "shrimp", minPan: 3, deepShallow: "deep" };

describe("addPan", () => {
  it("appends a pan with empty slots for its depth", () => {
    const next = applyEdit(layoutOf([]), { type: "addPan", width: 6, depth: "third", panType: "deep" }, counter());
    expect(next.pans).toEqual([{ id: "new1", width: 6, depth: "third", panType: "deep", slots: { 0: null, 1: null, 2: null } }]);
  });

  it("ignores a split depth on a width that can't split", () => {
    const l = layoutOf([]);
    expect(applyEdit(l, { type: "addPan", width: 8, depth: "half", panType: "shallow" })).toBe(l);
  });

  it("does nothing when it won't fit, unless expandCase is set", () => {
    const l = layoutOf([pan("a", 12)], 12);
    const edit = { type: "addPan", width: 6, depth: "full", panType: "shallow" };
    expect(applyEdit(l, edit)).toBe(l);
    const expanded = applyEdit(l, { ...edit, expandCase: true }, counter());
    expect(expanded.caseWidth).toBe(18);
    expect(ids(expanded)).toEqual(["a", "new1"]);
  });
});

describe("checkFit", () => {
  it("reports the case width a growing edit needs", () => {
    const l = layoutOf([pan("a", 8), pan("b", 6)], 16);
    expect(checkFit(l, { type: "resizePan", panId: "b", width: 12 })).toEqual({ fits: false, requiredWidth: 20 });
    expect(checkFit(l, { type: "insertProductPan", product: shrimp, index: 0 })).toEqual({ fits: false, requiredWidth: 17 });
    expect(checkFit(l, { type: "resizePan", panId: "b", width: 3 })).toEqual({ fits: true, requiredWidth: 11 });
  });

  it("treats non-growing edits as fitting", () => {
    expect(checkFit(layoutOf([pan("a", 8)], 8), { type: "clearSlot", panId: "a", slot: 0 }).fits).toBe(true);
  });
});

describe("expandCase", () => {
  it("never grows the case past the maximum width", () => {
    const l = layoutOf([pan("a", 12)], MAX_CASE_WIDTH);
    l.pans = Array.from({ length: 17 }, (_, i) => pan(`p${i}`, 12)); // 204 used
    expect(applyEdit(l, { type: "addPan", width: 6, depth: "full", panType: "shallow", expandCase: true })).toBe(l);
  });
});

describe("insertProductPan", () => {
  it("inserts a full pan at the product's min width and pan type", () => {
    const l = layoutOf([pan("a", 8), pan("b", 8)]);
    const next = applyEdit(l, { type: "insertProductPan", product: shrimp, index: 1 }, counter());
    expect(ids(next)).toEqual(["a", "new1", "b"]);
    expect(next.pans[1]).toEqual({ id: "new1", width: 3, depth: "full", panType: "deep", slots: { 0: "shrimp" } });
  });
});

describe("removePan", () => {
  it("removes the pan and the divider after it", () => {
    const l = layoutOf([pan("a", 6), pan("b", 6)], 81, ["a", "start"]);
    const next = applyEdit(l, { type: "removePan", panId: "a" });
    expect(ids(next)).toEqual(["b"]);
    expect(next.dividers).toEqual(["start"]);
  });
});

describe("resizePan", () => {
  it("forces full depth and keeps the front product when the new width can't split", () => {
    const l = layoutOf([pan("a", 6, "half", { 0: "cod", 1: "halibut" }, { slotTypes: { 1: "deep" } })]);
    const next = applyEdit(l, { type: "resizePan", panId: "a", width: 8 });
    expect(next.pans[0]).toEqual({ id: "a", width: 8, depth: "full", panType: "shallow", slots: { 0: "cod" } });
  });

  it("expands the case and resizes in one edit", () => {
    const l = layoutOf([pan("a", 6)], 6);
    const next = applyEdit(l, { type: "resizePan", panId: "a", width: 12, expandCase: true });
    expect(next.caseWidth).toBe(12);
    expect(next.pans[0].width).toBe(12);
  });
});

describe("setPanDepth", () => {
  it("drops slots past the new count and their slot types", () => {
    const l = layoutOf([pan("a", 6, "third", { 0: "cod", 1: "halibut", 2: "mahi" }, { slotTypes: { 0: "deep", 2: "deep" } })]);
    const next = applyEdit(l, { type: "setPanDepth", panId: "a", depth: "half" });
    expect(next.pans[0].slots).toEqual({ 0: "cod", 1: "halibut" });
    expect(next.pans[0].slotTypes).toEqual({ 0: "deep" });
  });

  it("adds empty slots when splitting further", () => {
    const l = layoutOf([pan("a", 3, "full", { 0: "cod" })]);
    expect(applyEdit(l, { type: "setPanDepth", panId: "a", depth: "third" }).pans[0].slots).toEqual({ 0: "cod", 1: null, 2: null });
  });

  it("does nothing on a width that can't split", () => {
    const l = layoutOf([pan("a", 12)]);
    expect(applyEdit(l, { type: "setPanDepth", panId: "a", depth: "half" })).toBe(l);
  });
});

describe("moveProduct", () => {
  const l = layoutOf([pan("a", 6, "half", { 0: "cod", 1: null }), pan("b", 6, "full", { 0: "salmon" })]);

  it("swaps two filled slots", () => {
    const next = applyEdit(l, { type: "moveProduct", from: { panId: "a", slot: 0 }, to: { panId: "b", slot: 0 } });
    expect(next.pans[0].slots[0]).toBe("salmon");
    expect(next.pans[1].slots[0]).toBe("cod");
  });

  it("moves into an empty slot and clears the source", () => {
    const next = applyEdit(l, { type: "moveProduct", from: { panId: "b", slot: 0 }, to: { panId: "a", slot: 1 } });
    expect(next.pans[0].slots).toEqual({ 0: "cod", 1: "salmon" });
    expect(next.pans[1].slots).toEqual({ 0: null });
  });

  it("swaps within one pan", () => {
    const next = applyEdit(l, { type: "moveProduct", from: { panId: "a", slot: 0 }, to: { panId: "a", slot: 1 } });
    expect(next.pans[0].slots).toEqual({ 0: null, 1: "cod" });
  });

  it("does nothing for the same slot, an empty source, or a missing slot", () => {
    expect(applyEdit(l, { type: "moveProduct", from: { panId: "a", slot: 0 }, to: { panId: "a", slot: 0 } })).toBe(l);
    expect(applyEdit(l, { type: "moveProduct", from: { panId: "a", slot: 1 }, to: { panId: "b", slot: 0 } })).toBe(l);
    expect(applyEdit(l, { type: "moveProduct", from: { panId: "a", slot: 0 }, to: { panId: "b", slot: 2 } })).toBe(l);
  });
});

describe("assignProduct and clearSlot", () => {
  it("assigns and clears a slot", () => {
    const l = layoutOf([pan("a", 6)]);
    const assigned = applyEdit(l, { type: "assignProduct", panId: "a", slot: 0, productId: "cod" });
    expect(assigned.pans[0].slots[0]).toBe("cod");
    expect(applyEdit(assigned, { type: "clearSlot", panId: "a", slot: 0 }).pans[0].slots[0]).toBe(null);
  });

  it("does nothing for an unknown pan", () => {
    const l = layoutOf([pan("a", 6)]);
    expect(applyEdit(l, { type: "assignProduct", panId: "zzz", slot: 0, productId: "cod" })).toBe(l);
  });
});

describe("reorderPan", () => {
  const l = layoutOf([pan("a", 6), pan("b", 6), pan("c", 6)], 81, ["a"]);

  it("inserts the pan on the chosen side of the target", () => {
    expect(ids(applyEdit(l, { type: "reorderPan", panId: "a", targetPanId: "c", side: "right" }))).toEqual(["b", "c", "a"]);
    expect(ids(applyEdit(l, { type: "reorderPan", panId: "c", targetPanId: "a", side: "left" }))).toEqual(["c", "a", "b"]);
  });

  it("keeps the divider attached to its pan", () => {
    expect(applyEdit(l, { type: "reorderPan", panId: "a", targetPanId: "c", side: "right" }).dividers).toEqual(["a"]);
  });

  it("does nothing when the order doesn't change", () => {
    expect(applyEdit(l, { type: "reorderPan", panId: "a", targetPanId: "b", side: "left" })).toBe(l);
    expect(applyEdit(l, { type: "reorderPan", panId: "a", targetPanId: "missing", side: "left" })).toBe(l);
  });
});

describe("toggleDivider", () => {
  it("adds then removes a divider", () => {
    const on = applyEdit(layoutOf([pan("a", 6)]), { type: "toggleDivider", afterPanId: "start" });
    expect(on.dividers).toEqual(["start"]);
    expect(applyEdit(on, { type: "toggleDivider", afterPanId: "start" }).dividers).toEqual([]);
  });
});

describe("setCaseWidth", () => {
  const l = layoutOf([pan("a", 12), pan("b", 8)], 81);

  it("clamps between used width and the maximum", () => {
    expect(clampCaseWidth(l, "5")).toBe(20);
    expect(clampCaseWidth(l, "500")).toBe(MAX_CASE_WIDTH);
    expect(clampCaseWidth(l, "abc")).toBe(81);
    expect(applyEdit(l, { type: "setCaseWidth", width: "40" }).caseWidth).toBe(40);
  });

  it("does nothing when the clamped width is unchanged", () => {
    expect(applyEdit(l, { type: "setCaseWidth", width: "81" })).toBe(l);
  });
});

describe("removeProductEverywhere", () => {
  it("clears every slot holding the product", () => {
    const l = layoutOf([pan("a", 6, "half", { 0: "cod", 1: "mahi" }), pan("b", 6, "full", { 0: "cod" })]);
    const next = applyEdit(l, { type: "removeProductEverywhere", productId: "cod" });
    expect(next.pans.map((p) => p.slots)).toEqual([{ 0: null, 1: "mahi" }, { 0: null }]);
  });

  it("does nothing when the product isn't placed", () => {
    const l = layoutOf([pan("a", 6, "full", { 0: "mahi" })]);
    expect(applyEdit(l, { type: "removeProductEverywhere", productId: "cod" })).toBe(l);
  });
});

describe("replaceLayout", () => {
  it("replaces pans and width and clears dividers", () => {
    const l = layoutOf([pan("a", 6)], 81, ["a", "start"]);
    expect(applyEdit(l, { type: "replaceLayout", pans: [pan("z", 8)], caseWidth: 40 })).toEqual(layoutOf([pan("z", 8)], 40, []));
  });
});

describe("history", () => {
  const start = layoutOf([pan("a", 6, "full", { 0: "cod" }), pan("b", 6)], 12);

  it("undo restores pans, case width and dividers together", () => {
    let h = createHistory(start);
    h = record(h, { type: "toggleDivider", afterPanId: "a" });
    h = record(h, { type: "resizePan", panId: "b", width: 12, expandCase: true });
    expect(h.present.caseWidth).toBe(18);
    h = undo(h);
    expect(h.present.caseWidth).toBe(12);
    expect(h.present.dividers).toEqual(["a"]);
    h = undo(h);
    expect(h.present).toBe(start);
  });

  it("drag swaps are undoable", () => {
    let h = record(createHistory(start), { type: "moveProduct", from: { panId: "a", slot: 0 }, to: { panId: "b", slot: 0 } });
    expect(h.present.pans[1].slots[0]).toBe("cod");
    expect(undo(h).present).toBe(start);
  });

  it("redo reapplies, and a new edit clears redo", () => {
    let h = record(createHistory(start), { type: "setPanType", panId: "a", panType: "deep" });
    h = undo(h);
    expect(redo(h).present.pans[0].panType).toBe("deep");
    h = record(h, { type: "clearSlot", panId: "a", slot: 0 });
    expect(h.future).toEqual([]);
  });

  it("skips edits that change nothing", () => {
    const h = createHistory(start);
    expect(record(h, { type: "removePan", panId: "missing" })).toBe(h);
  });

  it("keeps at most HISTORY_LIMIT steps", () => {
    let h = createHistory(layoutOf([], 81));
    for (let i = 0; i < HISTORY_LIMIT + 5; i++) h = record(h, { type: "toggleDivider", afterPanId: "start" });
    expect(h.past.length).toBe(HISTORY_LIMIT);
  });
});
