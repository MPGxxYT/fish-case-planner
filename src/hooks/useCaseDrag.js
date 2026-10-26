import { useState, useRef } from "react";

// Hover state for dragging a Pan by its header (which Pan is moving, and the
// insert line beside the Pan under the pointer). The drop itself goes to onDrop.
export function useCaseDrag(onDrop) {
  const [panDragId, setPanDragId] = useState(null);
  const [insertTarget, setInsertTargetState] = useState(null);
  const insertTargetRef = useRef(null);

  const setInsertTarget = (val) => {
    const resolved = typeof val === "function" ? val(insertTargetRef.current) : val;
    insertTargetRef.current = resolved;
    setInsertTargetState(resolved);
  };

  const reset = () => {
    setPanDragId(null);
    setInsertTarget(null);
  };

  const onPanDragStart = (e, id) => setPanDragId(id);

  const onPanDragOver = (e, targetId) => {
    if (!panDragId || panDragId === targetId) {
      setInsertTarget(null);
      return;
    }
    e.preventDefault();
    const rect = e.currentTarget.getBoundingClientRect();
    setInsertTarget({
      panId: targetId,
      side: e.clientX < rect.left + rect.width / 2 ? "left" : "right",
    });
  };

  const onPanDrop = (e, targetId) => {
    const it = insertTargetRef.current;
    if (panDragId && panDragId !== targetId && it) {
      e.preventDefault();
      onDrop({ kind: "pan", panId: panDragId }, { kind: "pan", panId: targetId, side: it.side });
    }
    reset();
  };

  return {
    panDragId,
    insertTarget,
    insertTargetRef,
    setInsertTarget,
    setPanDragId,
    reset,
    onPanDragStart,
    onPanDragOver,
    onPanDrop,
    onPanDragEnd: reset,
  };
}
