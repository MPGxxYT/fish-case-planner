import { useState } from "react";

export function useCaseDrag(setPans) {
  const [panDragId, setPanDragId] = useState(null);
  const [insertTarget, setInsertTarget] = useState(null);

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
    if (!panDragId || panDragId === targetId || !insertTarget) {
      setInsertTarget(null);
      setPanDragId(null);
      return;
    }
    e.preventDefault();
    setPans((prev) => {
      const arr = [...prev];
      const si = arr.findIndex((p) => p.id === panDragId);
      const [moved] = arr.splice(si, 1);
      let ti = arr.findIndex((p) => p.id === targetId);
      if (insertTarget.side === "right") ti += 1;
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
    setInsertTarget,
    setPanDragId,
    onPanDragStart,
    onPanDragOver,
    onPanDrop,
    onPanDragEnd,
  };
}
