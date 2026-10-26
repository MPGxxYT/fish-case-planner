// What a case's layout must look like: its pans, case width and dividers.
// Shared by the API (before it stores a case) and the app (before it loads
// one), so both accept the same cases. No dependencies, so the app's build
// can import it from here.

const PAN_WIDTHS = new Set([3, 6, 8, 12]);
const DEPTHS = new Set(["full", "half", "third"]);
const PAN_TYPES = new Set(["deep", "shallow"]);

// Returns a sentence describing the first problem, or null when the layout is valid.
export function checkLayout({ pans, caseWidth }) {
  if (!Number.isInteger(caseWidth) || caseWidth < 1) return "Invalid case width.";
  if (!Array.isArray(pans)) return "Case is missing pans array.";
  const ids = new Set();
  for (let i = 0; i < pans.length; i++) {
    const pan = pans[i];
    const n = i + 1;
    if (!pan || typeof pan !== "object") return `Pan ${n} is not a pan.`;
    if (typeof pan.id !== "string" || !pan.id) return `Pan ${n} is missing an id.`;
    if (ids.has(pan.id)) return `Pan ${n} has the same id as another pan.`;
    ids.add(pan.id);
    if (!PAN_WIDTHS.has(pan.width)) return `Pan ${n} has an invalid width.`;
    if (!DEPTHS.has(pan.depth)) return `Pan ${n} has an invalid depth.`;
    if (!PAN_TYPES.has(pan.panType)) return `Pan ${n} has an invalid pan type.`;
    if (!pan.slots || typeof pan.slots !== "object") return `Pan ${n} is missing slots.`;
    if (Object.values(pan.slots).some((v) => v !== null && typeof v !== "string")) return `Pan ${n} has an invalid slot.`;
  }
  return null;
}

// Dividers that still have a place: "start" or the id of one of the pans. Missing
// or malformed dividers (cases saved before dividers were stored) become [].
export function cleanDividers(pans, dividers) {
  if (!Array.isArray(dividers)) return [];
  const ids = new Set(pans.map((p) => p.id));
  return [...new Set(dividers.filter((d) => d === "start" || ids.has(d)))];
}
