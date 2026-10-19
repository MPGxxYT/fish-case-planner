// Layout: the case being edited (pans in order, case width, dividers).
// Every change goes through applyEdit, which returns a new layout or the same
// object when the edit can't apply. History wraps applyEdit so undo covers
// every edit the same way.
import { uid } from "../utils/helpers.js";

export const MAX_CASE_WIDTH = 208;
export const HISTORY_LIMIT = 20;

export const canSplitDepth = (w) => w === 3 || w === 6;
const slotCount = (depth) => (depth === "half" ? 2 : depth === "third" ? 3 : 1);
const emptySlots = (n) => Object.fromEntries(Array.from({ length: n }, (_, i) => [i, null]));

export const usedWidth = (pans) => pans.reduce((s, p) => s + p.width, 0);

// Clamp a requested case width to [used width, MAX_CASE_WIDTH]; NaN keeps the current width.
export function clampCaseWidth(layout, raw) {
  const n = parseInt(raw, 10);
  if (!Number.isFinite(n)) return layout.caseWidth;
  return Math.min(MAX_CASE_WIDTH, Math.max(usedWidth(layout.pans), Math.max(1, n)));
}

// Used width after the edit, for the edits that can grow the case.
function widthAfter(layout, edit) {
  const used = usedWidth(layout.pans);
  switch (edit.type) {
    case "addPan": return used + edit.width;
    case "insertProductPan": return used + edit.product.minPan;
    case "resizePan": {
      const pan = layout.pans.find((p) => p.id === edit.panId);
      return pan ? used - pan.width + edit.width : used;
    }
    default: return used;
  }
}

// Does the edit fit in the current case width? requiredWidth is the case width it would need.
export function checkFit(layout, edit) {
  const requiredWidth = widthAfter(layout, edit);
  return { fits: requiredWidth <= layout.caseWidth, requiredWidth };
}

// Case width to use for a growing edit, or null when it can't apply.
function fitWidth(layout, edit) {
  const { fits, requiredWidth } = checkFit(layout, edit);
  if (fits) return layout.caseWidth;
  if (!edit.expandCase || requiredWidth > MAX_CASE_WIDTH) return null;
  return requiredWidth;
}

const mapPan = (layout, panId, fn) => {
  let changed = false;
  const pans = layout.pans.map((pan) => {
    if (pan.id !== panId) return pan;
    const next = fn(pan);
    if (next !== pan) changed = true;
    return next;
  });
  return changed ? { ...layout, pans } : layout;
};

const setSlot = (layout, panId, slot, productId) =>
  mapPan(layout, panId, (pan) => {
    if (!(slot in pan.slots) || pan.slots[slot] === productId) return pan;
    return { ...pan, slots: { ...pan.slots, [slot]: productId } };
  });

const insertPan = (layout, pan, index, caseWidth) => {
  const pans = [...layout.pans];
  pans.splice(Math.max(0, Math.min(index, pans.length)), 0, pan);
  return { ...layout, pans, caseWidth };
};

export function applyEdit(layout, edit, { makeId = uid } = {}) {
  switch (edit.type) {
    case "addPan": {
      if (edit.depth !== "full" && !canSplitDepth(edit.width)) return layout;
      const caseWidth = fitWidth(layout, edit);
      if (caseWidth === null) return layout;
      const pan = { id: makeId(), width: edit.width, depth: edit.depth, panType: edit.panType, slots: emptySlots(slotCount(edit.depth)) };
      return insertPan(layout, pan, layout.pans.length, caseWidth);
    }

    case "insertProductPan": {
      const { product } = edit;
      const caseWidth = fitWidth(layout, edit);
      if (caseWidth === null) return layout;
      const pan = { id: makeId(), width: product.minPan, depth: "full", panType: product.deepShallow, slots: { 0: product.id } };
      return insertPan(layout, pan, edit.index, caseWidth);
    }

    case "removePan": {
      if (!layout.pans.some((p) => p.id === edit.panId)) return layout;
      return {
        ...layout,
        pans: layout.pans.filter((p) => p.id !== edit.panId),
        dividers: layout.dividers.filter((d) => d !== edit.panId),
      };
    }

    case "resizePan": {
      const pan = layout.pans.find((p) => p.id === edit.panId);
      if (!pan || pan.width === edit.width) return layout;
      const caseWidth = fitWidth(layout, edit);
      if (caseWidth === null) return layout;
      const resized = { ...pan, width: edit.width };
      if (!canSplitDepth(edit.width) && pan.depth !== "full") {
        resized.depth = "full";
        resized.slots = { 0: pan.slots[0] || null };
        delete resized.slotTypes;
      }
      return { ...mapPan(layout, pan.id, () => resized), caseWidth };
    }

    case "setPanDepth":
      return mapPan(layout, edit.panId, (pan) => {
        if (pan.depth === edit.depth) return pan;
        if (edit.depth !== "full" && !canSplitDepth(pan.width)) return pan;
        const n = slotCount(edit.depth);
        const next = { ...pan, depth: edit.depth, slots: {} };
        for (let i = 0; i < n; i++) next.slots[i] = pan.slots[i] || null;
        delete next.slotTypes;
        if (pan.slotTypes) {
          const kept = Object.fromEntries(Object.entries(pan.slotTypes).filter(([k]) => +k < n));
          if (Object.keys(kept).length > 0) next.slotTypes = kept;
        }
        return next;
      });

    case "setPanType":
      return mapPan(layout, edit.panId, (pan) => (pan.panType === edit.panType ? pan : { ...pan, panType: edit.panType }));

    case "setSlotType":
      return mapPan(layout, edit.panId, (pan) =>
        pan.slotTypes?.[edit.slot] === edit.panType ? pan : { ...pan, slotTypes: { ...pan.slotTypes, [edit.slot]: edit.panType } });

    case "assignProduct":
      return setSlot(layout, edit.panId, edit.slot, edit.productId);

    case "clearSlot":
      return setSlot(layout, edit.panId, edit.slot, null);

    case "moveProduct": {
      const { from, to } = edit;
      if (from.panId === to.panId && from.slot === to.slot) return layout;
      const src = layout.pans.find((p) => p.id === from.panId);
      const dst = layout.pans.find((p) => p.id === to.panId);
      if (!src || !dst || !src.slots[from.slot] || !(to.slot in dst.slots)) return layout;
      const moving = src.slots[from.slot];
      const displaced = dst.slots[to.slot] ?? null;
      return setSlot(setSlot(layout, to.panId, to.slot, moving), from.panId, from.slot, displaced);
    }

    case "reorderPan": {
      if (edit.panId === edit.targetPanId) return layout;
      const pans = [...layout.pans];
      const si = pans.findIndex((p) => p.id === edit.panId);
      if (si === -1 || !pans.some((p) => p.id === edit.targetPanId)) return layout;
      const [moved] = pans.splice(si, 1);
      let ti = pans.findIndex((p) => p.id === edit.targetPanId);
      if (edit.side === "right") ti += 1;
      pans.splice(ti, 0, moved);
      if (pans.every((p, i) => p === layout.pans[i])) return layout;
      return { ...layout, pans };
    }

    case "toggleDivider": {
      const key = edit.afterPanId;
      const dividers = layout.dividers.includes(key)
        ? layout.dividers.filter((d) => d !== key)
        : [...layout.dividers, key];
      return { ...layout, dividers };
    }

    case "setCaseWidth": {
      const caseWidth = clampCaseWidth(layout, edit.width);
      return caseWidth === layout.caseWidth ? layout : { ...layout, caseWidth };
    }

    case "removeProductEverywhere": {
      let changed = false;
      const pans = layout.pans.map((pan) => {
        if (!Object.values(pan.slots).includes(edit.productId)) return pan;
        changed = true;
        const slots = { ...pan.slots };
        for (const k of Object.keys(slots)) if (slots[k] === edit.productId) slots[k] = null;
        return { ...pan, slots };
      });
      return changed ? { ...layout, pans } : layout;
    }

    case "replaceLayout":
      return { pans: edit.pans, caseWidth: edit.caseWidth, dividers: [] };

    default:
      return layout;
  }
}

// ─── History ──────────────────────────────────────────────────────────────────

export const createHistory = (layout) => ({ past: [], present: layout, future: [] });

export function record(history, edit, opts) {
  const next = applyEdit(history.present, edit, opts);
  if (next === history.present) return history;
  return {
    past: [...history.past.slice(-(HISTORY_LIMIT - 1)), history.present],
    present: next,
    future: [],
  };
}

export function undo(history) {
  if (history.past.length === 0) return history;
  return {
    past: history.past.slice(0, -1),
    present: history.past[history.past.length - 1],
    future: [...history.future, history.present],
  };
}

export function redo(history) {
  if (history.future.length === 0) return history;
  return {
    past: [...history.past.slice(-(HISTORY_LIMIT - 1)), history.present],
    present: history.future[history.future.length - 1],
    future: history.future.slice(0, -1),
  };
}
