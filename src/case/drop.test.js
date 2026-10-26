import { describe, it, expect } from "vitest";
import { canDrop, dropToEdit } from "./drop.js";
import { readTarget } from "../utils/dragData.js";

const shrimp = { id: "shrimp", minPan: 3, deepShallow: "deep" };
const findProduct = (id) => (id === "shrimp" ? shrimp : undefined);

const pool = { kind: "pool", productId: "shrimp" };
const slotSrc = { kind: "slot", panId: "a", slot: 1, productId: "cod" };
const panSrc = { kind: "pan", panId: "a" };
const divider = { kind: "divider" };

const slot = { kind: "slot", panId: "b", slot: 0 };
const gap = { kind: "gap", index: 2, afterPanId: "b" };
const endGap = { kind: "gap", index: 3, afterPanId: null };
const empty = { kind: "empty" };
const pan = { kind: "pan", panId: "c", side: "right" };

describe("dropToEdit", () => {
  const cases = [
    ["pool on slot assigns, overwriting", pool, slot, { type: "assignProduct", panId: "b", slot: 0, productId: "shrimp" }],
    ["pool in a gap inserts a pan", pool, gap, { type: "insertProductPan", product: shrimp, index: 2 }],
    ["pool in the end space inserts at the end", pool, endGap, { type: "insertProductPan", product: shrimp, index: 3 }],
    ["pool on the empty case inserts first", pool, empty, { type: "insertProductPan", product: shrimp, index: 0 }],
    ["slot on slot moves or swaps", slotSrc, slot, { type: "moveProduct", from: { panId: "a", slot: 1 }, to: { panId: "b", slot: 0 } }],
    ["pan on pan reorders", panSrc, pan, { type: "reorderPan", panId: "a", targetPanId: "c", side: "right" }],
    ["slot in a gap does nothing", slotSrc, gap, null],
    ["slot on the empty case does nothing", slotSrc, empty, null],
    ["pool on a pan does nothing", pool, pan, null],
    ["pan on a slot does nothing", panSrc, slot, null],
    ["pan on itself does nothing", panSrc, { kind: "pan", panId: "a", side: "left" }, null],
    ["divider outside edit mode does nothing", divider, gap, null],
    ["unknown product in a gap does nothing", { kind: "pool", productId: "gone" }, gap, null],
    ["no source does nothing", null, slot, null],
    ["no target does nothing", pool, null, null],
  ];
  it.each(cases)("%s", (_, source, target, edit) => {
    expect(dropToEdit(source, target, { findProduct })).toEqual(edit);
  });

  it("toggles a divider in edit mode", () => {
    expect(dropToEdit(divider, gap, { dividerEditMode: true })).toEqual({ type: "toggleDivider", afterPanId: "b" });
    expect(dropToEdit(divider, { kind: "gap", index: 0, afterPanId: "start" }, { dividerEditMode: true })).toEqual({ type: "toggleDivider", afterPanId: "start" });
  });

  it("ignores a divider in the end space, which has no pan before it to attach to", () => {
    expect(dropToEdit(divider, endGap, { dividerEditMode: true })).toBe(null);
  });
});

describe("canDrop", () => {
  it("answers from the kind alone, for dragover", () => {
    expect(canDrop("slot", slot)).toBe(true);
    expect(canDrop("slot", gap)).toBe(false);
    expect(canDrop(null, slot)).toBe(false);
    expect(canDrop("divider", gap)).toBe(false);
    expect(canDrop("divider", gap, { dividerEditMode: true })).toBe(true);
  });
});

describe("readTarget", () => {
  const el = (dataset) => ({ closest: () => ({ dataset }) });

  it("reads each drop zone from its data attributes", () => {
    expect(readTarget(el({ dropType: "slot", panId: "p1", slotIdx: "2" }))).toEqual({ kind: "slot", panId: "p1", slot: 2 });
    expect(readTarget(el({ dropType: "insert", insertIdx: "0", afterPanId: "start" }))).toEqual({ kind: "gap", index: 0, afterPanId: "start" });
    expect(readTarget(el({ dropType: "insert", insertIdx: "4" }))).toEqual({ kind: "gap", index: 4, afterPanId: null });
    expect(readTarget(el({ dropType: "empty-case" }))).toEqual({ kind: "empty" });
  });

  it("returns null outside a drop zone", () => {
    expect(readTarget({ closest: () => null })).toBe(null);
    expect(readTarget(null)).toBe(null);
  });
});
