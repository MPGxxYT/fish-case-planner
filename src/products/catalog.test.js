import { describe, it, expect } from "vitest";
import { normalizeProduct, normalizeProducts, upsertProduct, removeProduct } from "./catalog.js";

describe("normalizeProduct", () => {
  it("maps old colors to the color groups", () => {
    expect(["orange", "white", "blue", "red", "warm", "cool"].map((color) => normalizeProduct({ id: "x", color }).color))
      .toEqual(["warm", "cool", "cool", "red", "warm", "cool"]);
  });

  it("fills fields added later without overwriting set ones", () => {
    expect(normalizeProduct({ id: "x", color: "red", preferredZone: "left" })).toEqual({
      id: "x", color: "red", preferredZone: "left", preferredSplit: "", preferredPosition: "", labels: [],
    });
  });

  it("treats a missing list as empty", () => {
    expect(normalizeProducts(undefined)).toEqual([]);
  });
});

describe("upsertProduct and removeProduct", () => {
  const list = normalizeProducts([{ id: "cod", name: "Cod", color: "cool" }, { id: "king", name: "King", color: "red" }]);

  it("replaces a product in place", () => {
    const next = upsertProduct(list, { id: "cod", name: "Atlantic Cod", color: "white" });
    expect(next.map((p) => p.name)).toEqual(["Atlantic Cod", "King"]);
    expect(next[0].color).toBe("cool");
    expect(list[0].name).toBe("Cod");
  });

  it("appends a new product", () => {
    expect(upsertProduct(list, { id: "mahi", name: "Mahi", color: "cool" }).map((p) => p.id)).toEqual(["cod", "king", "mahi"]);
  });

  it("removes by id", () => {
    expect(removeProduct(list, "cod").map((p) => p.id)).toEqual(["king"]);
  });
});
