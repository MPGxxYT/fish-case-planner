// The Saved Case record: a named copy of a Layout. Every way a case comes in
// (local saves, .fishcase files, Published Cases) goes through readSavedCase,
// which checks it with the same rules the API uses before storing one.
import { checkLayout, cleanDividers } from "../../api/caseShape.js";

export function toSavedCase(layout, name, savedAt = new Date().toISOString()) {
  return {
    name,
    pans: structuredClone(layout.pans),
    caseWidth: layout.caseWidth,
    dividers: [...layout.dividers],
    savedAt,
  };
}

// { case } with a clean Saved Case, or { error } with a sentence to show.
// Published Cases carry createdAt instead of savedAt; older ones have no dividers.
export function readSavedCase(data) {
  if (!data || typeof data !== "object") return { error: "Missing case data." };
  if (typeof data.name !== "string" || !data.name.trim()) return { error: "Case is missing a name." };
  const problem = checkLayout(data);
  if (problem) return { error: problem };
  return {
    case: {
      name: data.name,
      pans: data.pans,
      caseWidth: data.caseWidth,
      dividers: cleanDividers(data.pans, data.dividers),
      savedAt: data.savedAt || data.createdAt || new Date().toISOString(),
    },
  };
}
