import { useState, useRef } from "react";

export function useCaseDrag(setPans) {
  const [panDragId, setPanDragId] = useState(null);
  const [insertTarget, setInsertTargetState] = useState(null);
  const insertTargetRef = useRef(null);

  const setInsertTarget = (val) => {
    const resolved = typeof val === "function" ? val(insertTargetRef.current) : val;
    insertTargetRef.current = resolved;
    setInsertTargetState(resolved);
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
    if (!panDragId || panDragId === targetId || !insertTargetRef.current) {
      setInsertTarget(null);
      setPanDragId(null);
      return;
    }
    e.preventDefault();
    const it = insertTargetRef.current;
    setPans((prev) => {
      const arr = [...prev];
      const si = arr.findIndex((p) => p.id === panDragId);
      const [moved] = arr.splice(si, 1);
      let ti = arr.findIndex((p) => p.id === targetId);
      if (it.side === "right") ti += 1;
      arr.splice(ti, 0, moved);
      return arr;
    });
    setInsertTarget(null);
    setPanDragId(null);
  };

  const onPanDragEnd = () => {
    setPanDragId(null);
    setInsertTarget(null);
  };

  return {
    panDragId,
    insertTarget,
    insertTargetRef,
    setInsertTarget,
    setPanDragId,
    onPanDragStart,
    onPanDragOver,
    onPanDrop,
    onPanDragEnd,
  };
}
