// DOM side of drag and drop: carries a drop source through the HTML5
// dataTransfer and reads drop targets from data-drop-type attributes. Both
// mouse and touch drag use readTarget, so targets are described one way.

// The source kind goes in the type itself: during dragover the browser only
// exposes types, and drop zones need the kind to decide whether to accept.
const PREFIX = "x-fishcase/";

// Pan headers and Slots drag with useTouchDrag on touch screens. Marking them
// draggable there lets the browser start its own drag on a longer press, which
// takes over the touch and freezes the touch drag, so only a mouse gets it.
export const mouseDrag = typeof window !== "undefined" && !window.matchMedia?.("(pointer: coarse)").matches;

export function setDragSource(e, source) {
  e.dataTransfer.setData(PREFIX + source.kind, JSON.stringify(source));
  e.dataTransfer.effectAllowed = "move";
}

export function dragKind(e) {
  const type = [...(e.dataTransfer?.types || [])].find((t) => t.startsWith(PREFIX));
  return type ? type.slice(PREFIX.length) : null;
}

export function getDragSource(e) {
  const kind = dragKind(e);
  if (!kind) return null;
  try {
    return JSON.parse(e.dataTransfer.getData(PREFIX + kind));
  } catch {
    return null;
  }
}

// The drop target an element sits in, or null.
export function readTarget(el) {
  const t = el?.closest?.("[data-drop-type]");
  if (!t) return null;
  switch (t.dataset.dropType) {
    case "slot": return { kind: "slot", panId: t.dataset.panId, slot: +t.dataset.slotIdx };
    case "insert": return { kind: "gap", index: +t.dataset.insertIdx, afterPanId: t.dataset.afterPanId || null };
    case "empty-case": return { kind: "empty" };
    default: return null;
  }
}
