import { describe, it, expect } from "vitest";
import { toSavedCase, readSavedCase } from "./savedCase.js";
import { applyEdit } from "./layout.js";

const pan = (id, extra = {}) => ({ id, width: 6, depth: "full", panType: "shallow", slots: { 0: null }, ...extra });
const layout = { pans: [pan("a"), pan("b")], caseWidth: 81, dividers: ["start", "a"] };

describe("toSavedCase", () => {
  it("copies the layout, dividers included", () => {
    const saved = toSavedCase(layout, "Monday", "2026-10-26T00:00:00.000Z");
    expect(saved).toEqual({ name: "Monday", pans: layout.pans, caseWidth: 81, dividers: ["start", "a"], savedAt: "2026-10-26T00:00:00.000Z" });
    expect(saved.pans[0]).not.toBe(layout.pans[0]);
  });

  it("round-trips through readSavedCase and back into a layout", () => {
    const { case: read } = readSavedCase(toSavedCase(layout, "Monday"));
    const loaded = applyEdit({ pans: [], caseWidth: 50, dividers: [] }, { type: "replaceLayout", pans: read.pans, caseWidth: read.caseWidth, dividers: read.dividers });
    expect(loaded).toEqual(layout);
  });
});

describe("readSavedCase", () => {
  it("gives cases saved before dividers an empty list", () => {
    const { case: read } = readSavedCase({ name: "Old", pans: [pan("a")], caseWidth: 81, savedAt: "2025-01-01" });
    expect(read.dividers).toEqual([]);
    expect(read.savedAt).toBe("2025-01-01");
  });

  it("drops dividers whose pan is gone", () => {
    expect(readSavedCase({ ...layout, name: "x", dividers: ["start", "zzz", "a"] }).case.dividers).toEqual(["start", "a"]);
  });

  it("takes a Published Case's createdAt as its date and leaves out server fields", () => {
    const published = { shortCode: "ABCDEF", author: "Sam", products: [], name: "Pub", pans: [pan("a")], caseWidth: 81, createdAt: "2026-02-02" };
    expect(readSavedCase(published).case).toEqual({ name: "Pub", pans: [pan("a")], caseWidth: 81, dividers: [], savedAt: "2026-02-02" });
  });

  it.each([
    ["no data", null, "Missing case data."],
    ["no name", { pans: [], caseWidth: 81 }, "Case is missing a name."],
    ["bad width", { name: "x", pans: [], caseWidth: 0 }, "Invalid case width."],
    ["no pans", { name: "x", caseWidth: 81 }, "Case is missing pans array."],
    ["bad pan width", { name: "x", pans: [pan("a", { width: 5 })], caseWidth: 81 }, "Pan 1 has an invalid width."],
    ["bad depth", { name: "x", pans: [pan("a", { depth: "quarter" })], caseWidth: 81 }, "Pan 1 has an invalid depth."],
    ["bad pan type", { name: "x", pans: [pan("a", { panType: "medium" })], caseWidth: 81 }, "Pan 1 has an invalid pan type."],
    ["bad slot", { name: "x", pans: [pan("a", { slots: { 0: 5 } })], caseWidth: 81 }, "Pan 1 has an invalid slot."],
    ["duplicate ids", { name: "x", pans: [pan("a"), pan("a")], caseWidth: 81 }, "Pan 2 has the same id as another pan."],
  ])("refuses %s", (_, data, error) => {
    expect(readSavedCase(data)).toEqual({ error });
  });
});
