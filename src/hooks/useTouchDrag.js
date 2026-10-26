import { useRef, useState } from "react";
import { readTarget } from "../utils/dragData.js";
import { canDrop } from "../case/drop.js";

const DRAG_THRESHOLD = 8; // px before drag starts

const idleState = () => ({ source: null, startX: 0, startY: 0, moved: false, ghostEl: null, lastTarget: null, sourceEl: null });

// Touch drag: follows the finger with a ghost of the source element, then
// reports the drop as (source, target) to onDrop, like mouse drag does.
export function useTouchDrag({ setInsertTarget, setPanDragId, insertTargetRef, onDrop }) {
  const dragStateRef = useRef(idleState());

  // Tiny React state just to expose whether a drag is active (for cursors etc.)
  const [isDragging, setIsDragging] = useState(false);

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

  // Use elementsFromPoint so overlays (backdrop, ghost) don't block the real target
  function dropTargetAt(clientX, clientY) {
    const kind = dragStateRef.current.source?.kind;
    for (const el of document.elementsFromPoint(clientX, clientY)) {
      const target = readTarget(el);
      if (canDrop(kind, target)) return { el: el.closest("[data-drop-type]"), target };
    }
    return null;
  }

  function clearHighlight() {
    if (dragStateRef.current.lastTarget) {
      dragStateRef.current.lastTarget.style.outline = "";
      dragStateRef.current.lastTarget = null;
    }
  }

  function highlightDropTarget(clientX, clientY) {
    clearHighlight();
    const hit = dropTargetAt(clientX, clientY);
    if (hit) {
      hit.el.style.outline = "2px solid #38bdf8";
      dragStateRef.current.lastTarget = hit.el;
    }
  }

  function updatePanInsertTarget(clientX, clientY) {
    const els = document.elementsFromPoint(clientX, clientY);
    const panEl = els.map((e) => e.closest("[data-pan-id]")).find(Boolean) ?? null;
    if (!panEl) { setInsertTarget(null); return; }
    const targetPanId = panEl.dataset.panId;
    if (targetPanId === dragStateRef.current.source.panId) { setInsertTarget(null); return; }
    const rect = panEl.getBoundingClientRect();
    const side = clientX < rect.left + rect.width / 2 ? "left" : "right";
    setInsertTarget({ panId: targetPanId, side });
  }

  function handleTouchMove(e) {
    const touch = e.touches[0];
    const ds = dragStateRef.current;
    const dx = touch.clientX - ds.startX;
    const dy = touch.clientY - ds.startY;

    if (!ds.moved) {
      if (Math.sqrt(dx * dx + dy * dy) < DRAG_THRESHOLD) return;
      ds.moved = true;
      createGhost(touch);
      setIsDragging(true);
      if (ds.source.kind === "pan") setPanDragId(ds.source.panId);
    }

    e.preventDefault();
    moveGhost(touch);

    if (ds.source.kind === "pan") updatePanInsertTarget(touch.clientX, touch.clientY);
    else highlightDropTarget(touch.clientX, touch.clientY);
  }

  function handleTouchEnd(e) {
    document.removeEventListener("touchmove", handleTouchMove);
    document.removeEventListener("touchend", handleTouchEnd);
    document.removeEventListener("touchcancel", handleTouchEnd);

    const { ghostEl, moved, source } = dragStateRef.current;
    if (ghostEl) document.body.removeChild(ghostEl);
    document.body.classList.remove("touch-dragging");
    clearHighlight();

    if (moved) {
      if (source.kind === "pan") {
        const it = insertTargetRef.current;
        if (it) onDrop(source, { kind: "pan", panId: it.panId, side: it.side });
      } else {
        const touch = e.changedTouches[0];
        const hit = dropTargetAt(touch.clientX, touch.clientY);
        if (hit) onDrop(source, hit.target);
      }
    }

    setInsertTarget(null);
    setPanDragId(null);
    setIsDragging(false);
    dragStateRef.current = idleState();
  }

  // source is a drop source (see case/drop.js); sourceEl a React ref or DOM node to ghost
  function startTouchDrag(e, source, sourceEl) {
    const touch = e.touches[0];
    dragStateRef.current = {
      ...idleState(),
      source,
      startX: touch.clientX,
      startY: touch.clientY,
      sourceEl: sourceEl?.current ?? sourceEl,
    };
    document.addEventListener("touchmove", handleTouchMove, { passive: false });
    document.addEventListener("touchend", handleTouchEnd);
    document.addEventListener("touchcancel", handleTouchEnd);
  }

  return { startTouchDrag, isDragging };
}
