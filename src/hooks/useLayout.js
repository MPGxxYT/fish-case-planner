import { useReducer, useEffect, useCallback } from "react";
import { DEFAULT_CASE_WIDTH } from "../utils/constants.js";
import { loadData, saveData } from "../utils/helpers.js";
import { createHistory, record, undo, redo } from "../case/layout.js";

// The layout is stored under the same three keys the app used before it had a
// single layout value, so existing cases load unchanged.
const KEYS = { pans: "fcp3_pans", caseWidth: "fcp3_cw", dividers: "fcp3_dividers" };

const loadLayout = () => createHistory({
  pans: loadData(KEYS.pans, []),
  caseWidth: loadData(KEYS.caseWidth, DEFAULT_CASE_WIDTH),
  dividers: loadData(KEYS.dividers, []),
});

function reducer(history, action) {
  switch (action.kind) {
    case "edit": return record(history, action.edit);
    case "undo": return undo(history);
    case "redo": return redo(history);
    default: return history;
  }
}

export function useLayout() {
  const [history, send] = useReducer(reducer, undefined, loadLayout);
  const { pans, caseWidth, dividers } = history.present;

  useEffect(() => { saveData(KEYS.pans, pans); }, [pans]);
  useEffect(() => { saveData(KEYS.caseWidth, caseWidth); }, [caseWidth]);
  useEffect(() => { saveData(KEYS.dividers, dividers); }, [dividers]);

  const dispatch = useCallback((edit) => send({ kind: "edit", edit }), []);
  const undoEdit = useCallback(() => send({ kind: "undo" }), []);
  const redoEdit = useCallback(() => send({ kind: "redo" }), []);

  return {
    layout: history.present,
    dispatch,
    undo: undoEdit,
    redo: redoEdit,
    canUndo: history.past.length > 0,
    canRedo: history.future.length > 0,
  };
}
