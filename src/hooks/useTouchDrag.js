import { useRef, useState } from "react";

const DRAG_THRESHOLD = 8; // px before drag starts

export function useTouchDrag({ setInsertTarget, setPanDragId, insertTargetRef, onAssignProduct, onCreatePanFromProduct, onDirectClearSlot, pans, setPans }) {
  const dragStateRef = useRef({
    active: false,
    type: null,
    productId: null,
    srcPanId: null,
    srcSlotIdx: null,
    panId: null,
    startX: 0,
    startY: 0,
    moved: false,
    ghostEl: null,
    lastTarget: null,
    sourceEl: null,
    onDragActive: null,
  });

  // Tiny React state just to expose whether a drag is active (for cursors etc.)
  const [isDragging, setIsDragging] = useState(false);

  // Keep a ref to pans so handlers always see the latest value without re-closure
  const pansRef = useRef(pans);
  pansRef.current = pans;

  function resetDragState() {
    dragStateRef.current = {
      active: false, type: null, productId: null, srcPanId: null,
      srcSlotIdx: null, panId: null, startX: 0, startY: 0,
      moved: false, ghostEl: null, lastTarget: null, sourceEl: null, onDragActive: null,
    };
  }

  function createGhost(touch) {
    const sourceEl = dragStateRef.current.sourceEl;
    if (!sourceEl) return;
    const ghost = sourceEl.cloneNode(true);
    const w = sourceEl.offsetWidth;
    const h = sourceEl.offsetHeight;
    ghost.style.cssText = [
      "position:fixed",
      "pointer-events:none",
      `z-index:9999`,
      "opacity:0.85",
      "transform:scale(1.05)",
      `width:${w}px`,
      `height:${h}px`,
      `left:${touch.clientX - w / 2}px`,
      `top:${touch.clientY - h / 2}px`,
      "transition:none",
      "border-radius:6px",
      "box-shadow:0 8px 24px rgba(0,0,0,0.5)",
    ].join(";");
    document.body.appendChild(ghost);
    dragStateRef.current.ghostEl = ghost;
    document.body.classList.add("touch-dragging");
  }

  function moveGhost(touch) {
    const ghost = dragStateRef.current.ghostEl;
    if (!ghost) return;
    const w = ghost.offsetWidth;
    const h = ghost.offsetHeight;
    ghost.style.left = (touch.clientX - w / 2) + "px";
    ghost.style.top = (touch.clientY - h / 2) + "px";
  }

  function highlightDropTarget(clientX, clientY) {
    // Remove previous highlight
    if (dragStateRef.current.lastTarget) {
      dragStateRef.current.lastTarget.style.outline = "";
      dragStateRef.current.lastTarget = null;
    }
    // Use elementsFromPoint so overlays (backdrop, ghost) don't block the real slot
    const els = document.elementsFromPoint(clientX, clientY);
    for (const el of els) {
      const target = el.closest("[data-drop-type='slot']") || el.closest("[data-drop-type='insert']");
      if (target) {
        target.style.outline = "2px solid #38bdf8";
        dragStateRef.current.lastTarget = target;
        break;
      }
    }
  }

  function clearHighlight() {
    if (dragStateRef.current.lastTarget) {
      dragStateRef.current.lastTarget.style.outline = "";
      dragStateRef.current.lastTarget = null;
    }
  }

  function updatePanInsertTarget(clientX, clientY) {
    const els = document.elementsFromPoint(clientX, clientY);
    const panEl = els.map((e) => e.closest("[data-pan-id]")).find(Boolean) ?? null;
    if (!panEl) { setInsertTarget(null); return; }
    const targetPanId = panEl.dataset.panId;
    if (targetPanId === dragStateRef.current.panId) { setInsertTarget(null); return; }
    const rect = panEl.getBoundingClientRect();
    const side = clientX < rect.left + rect.width / 2 ? "left" : "right";
    setInsertTarget({ panId: targetPanId, side });
  }

  function handlePanDrop() {
    const it = insertTargetRef.current;
    const dragId = dragStateRef.current.panId;
    if (!it || !dragId) return;
    setPans((prev) => {
      const arr = [...prev];
      const si = arr.findIndex((p) => p.id === dragId);
      if (si === -1) return prev;
      const [moved] = arr.splice(si, 1);
      let ti = arr.findIndex((p) => p.id === it.panId);
      if (ti === -1) return prev;
      if (it.side === "right") ti += 1;
      arr.splice(ti, 0, moved);
      return arr;
    });
  }

  function handleProductDrop(el) {
    const { productId } = dragStateRef.current;
    if (!productId) return;
    const slotEl = el?.closest("[data-drop-type='slot']");
    if (slotEl) {
      onAssignProduct(slotEl.dataset.panId, +slotEl.dataset.slotIdx, productId);
      return;
    }
    const insertEl = el?.closest("[data-drop-type='insert']");
    if (insertEl) {
      onCreatePanFromProduct(productId, +insertEl.dataset.insertIdx);
      return;
    }
    const emptyEl = el?.closest("[data-drop-type='empty-case']");
    if (emptyEl) {
      onCreatePanFromProduct(productId, 0);
    }
  }

  function handleSlotProductDrop(el) {
    const { productId, srcPanId, srcSlotIdx } = dragStateRef.current;
    if (!productId) return;
    const slotEl = el?.closest("[data-drop-type='slot']");
    if (slotEl) {
      const panId = slotEl.dataset.panId;
      const slotIdx = +slotEl.dataset.slotIdx;
      const targetPan = pansRef.current.find((p) => p.id === panId);
      const cur = targetPan?.slots[slotIdx] ?? null;
      onAssignProduct(panId, slotIdx, productId);
      if (cur) onAssignProduct(srcPanId, srcSlotIdx, cur);
      else onDirectClearSlot(srcPanId, srcSlotIdx);
    }
  }

  function handleTouchMove(e) {
    const touch = e.touches[0];
    const ds = dragStateRef.current;
    const dx = touch.clientX - ds.startX;
    const dy = touch.clientY - ds.startY;

    if (!ds.moved) {
      if (Math.sqrt(dx * dx + dy * dy) < DRAG_THRESHOLD) return;
      dragStateRef.current.moved = true;
      createGhost(touch);
      // Fire callback after ghost is built so the source element is still in the DOM
      dragStateRef.current.onDragActive?.();
      setIsDragging(true);
      if (ds.type === "pan") setPanDragId(ds.panId);
    }

    e.preventDefault();
    moveGhost(touch);

    if (ds.type === "pan") {
      updatePanInsertTarget(touch.clientX, touch.clientY);
    } else {
      highlightDropTarget(touch.clientX, touch.clientY);
    }
  }

  function handleTouchEnd(e) {
    document.removeEventListener("touchmove", handleTouchMove);
    document.removeEventListener("touchend", handleTouchEnd);
    document.removeEventListener("touchcancel", handleTouchEnd);

    const ghost = dragStateRef.current.ghostEl;
    if (ghost) { document.body.removeChild(ghost); dragStateRef.current.ghostEl = null; }
    document.body.classList.remove("touch-dragging");
    clearHighlight();

    if (dragStateRef.current.moved) {
      const touch = e.changedTouches[0];
      // Use elementsFromPoint so the backdrop or ghost never blocks the real drop target
      const allEls = document.elementsFromPoint(touch.clientX, touch.clientY);
      const el = allEls.find((e) => e.closest("[data-drop-type]")) ?? null;
      const type = dragStateRef.current.type;
      if (type === "pan") handlePanDrop();
      else if (type === "product") handleProductDrop(el);
      else if (type === "slotProduct") handleSlotProductDrop(el);
    }

    setInsertTarget(null);
    setPanDragId(null);
    setIsDragging(false);
    resetDragState();
  }

  function startTouchDrag(e, dragInfo, sourceEl) {
    // sourceEl can be a React ref or a DOM node
    const el = sourceEl?.current ?? sourceEl;
    const touch = e.touches[0];
    dragStateRef.current = {
      active: true,
      type: dragInfo.type,
      productId: dragInfo.productId ?? null,
      srcPanId: dragInfo.srcPanId ?? null,
      srcSlotIdx: dragInfo.srcSlotIdx ?? null,
      panId: dragInfo.panId ?? null,
      startX: touch.clientX,
      startY: touch.clientY,
      moved: false,
      ghostEl: null,
      lastTarget: null,
      sourceEl: el,
      onDragActive: dragInfo.onDragActive ?? null,
    };
    document.addEventListener("touchmove", handleTouchMove, { passive: false });
    document.addEventListener("touchend", handleTouchEnd);
    document.addEventListener("touchcancel", handleTouchEnd);
  }

  return { startTouchDrag, isDragging };
}
