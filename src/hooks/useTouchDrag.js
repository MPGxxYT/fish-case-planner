import { useRef, useState } from "react";
import { readTarget } from "../utils/dragData.js";
import { canDrop } from "../case/drop.js";

const DRAG_THRESHOLD = 8; // px before an immediate drag starts
const LONG_PRESS_MS = 300; // hold this long before a press-to-drag starts
const PRESS_TOLERANCE = 10; // px a finger may wander while holding; more is a scroll

const idleState = () => ({
  source: null, startX: 0, startY: 0, lastX: 0, lastY: 0,
  started: false, pressTimer: null, ghostEl: null, lastTarget: null, sourceEl: null,
});

// Touch drag: follows the finger with a ghost of the source element, then
// reports the drop as (source, target) to onDrop, like mouse drag does.
//
// Sources inside the scrolling case (Slots, Pan headers) start on a long press,
// so a swipe across the case scrolls it instead of moving a Product or Pan.
// Explicit grips pass { delay: 0 } and start as soon as the finger moves.
export function useTouchDrag({ setInsertTarget, setPanDragId, insertTargetRef, onDrop }) {
  const dragStateRef = useRef(idleState());

  // Tiny React state just to expose whether a drag is active (for cursors etc.)
  const [isDragging, setIsDragging] = useState(false);

  function createGhost(x, y) {
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
      `left:${x - w / 2}px`,
      `top:${y - h / 2}px`,
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

  function beginDrag() {
    const ds = dragStateRef.current;
    ds.started = true;
    createGhost(ds.lastX, ds.lastY);
    setIsDragging(true);
    if (ds.source.kind === "pan") setPanDragId(ds.source.panId);
  }

  // The click that follows a long press would open the Slot picker or a menu.
  function swallowNextClick() {
    const swallow = (e) => { e.stopPropagation(); e.preventDefault(); };
    document.addEventListener("click", swallow, { capture: true, once: true });
    setTimeout(() => document.removeEventListener("click", swallow, { capture: true }), 400);
  }

  function handleTouchMove(e) {
    const ds = dragStateRef.current;
    if (e.touches.length > 1) { finish(null); return; }
    const touch = e.touches[0];
    const dist = Math.hypot(touch.clientX - ds.startX, touch.clientY - ds.startY);
    ds.lastX = touch.clientX;
    ds.lastY = touch.clientY;

    if (!ds.started) {
      if (ds.pressTimer) {
        // Still waiting for the long press: moving means the finger is scrolling.
        if (dist > PRESS_TOLERANCE) finish(null);
        return;
      }
      if (dist < DRAG_THRESHOLD) return;
      beginDrag();
    }

    e.preventDefault();
    moveGhost(touch);

    if (ds.source.kind === "pan") updatePanInsertTarget(touch.clientX, touch.clientY);
    else highlightDropTarget(touch.clientX, touch.clientY);
  }

  function handleTouchEnd(e) {
    finish(e.changedTouches?.[0] ?? null);
  }

  function handleCancel() {
    finish(null);
  }

  // Ends the gesture. With a touch point a started drag drops there; without
  // one (scroll, second finger, cancel, window blur) it is abandoned.
  function finish(touch) {
    document.removeEventListener("touchmove", handleTouchMove);
    document.removeEventListener("touchend", handleTouchEnd);
    document.removeEventListener("touchcancel", handleCancel);
    window.removeEventListener("blur", handleCancel);

    const { ghostEl, started, source, pressTimer } = dragStateRef.current;
    clearTimeout(pressTimer);
    if (ghostEl) ghostEl.remove();
    document.body.classList.remove("touch-dragging");
    clearHighlight();

    if (started) {
      swallowNextClick();
      if (touch) {
        if (source.kind === "pan") {
          const it = insertTargetRef.current;
          if (it) onDrop(source, { kind: "pan", panId: it.panId, side: it.side });
        } else {
          const hit = dropTargetAt(touch.clientX, touch.clientY);
          if (hit) onDrop(source, hit.target);
        }
      }
      setInsertTarget(null);
      setPanDragId(null);
      setIsDragging(false);
    }

    dragStateRef.current = idleState();
  }

  // source is a drop source (see case/drop.js); sourceEl a React ref or DOM node to ghost.
  // delay: ms to hold before the drag starts; 0 starts on movement instead.
  function startTouchDrag(e, source, sourceEl, { delay = LONG_PRESS_MS } = {}) {
    if (e.touches.length > 1) return;
    if (dragStateRef.current.source) finish(null);
    const touch = e.touches[0];
    dragStateRef.current = {
      ...idleState(),
      source,
      startX: touch.clientX,
      startY: touch.clientY,
      lastX: touch.clientX,
      lastY: touch.clientY,
      sourceEl: sourceEl?.current ?? sourceEl,
    };
    if (delay > 0) {
      dragStateRef.current.pressTimer = setTimeout(() => {
        dragStateRef.current.pressTimer = null;
        navigator.vibrate?.(15);
        beginDrag();
      }, delay);
    }
    document.addEventListener("touchmove", handleTouchMove, { passive: false });
    document.addEventListener("touchend", handleTouchEnd);
    document.addEventListener("touchcancel", handleCancel);
    window.addEventListener("blur", handleCancel);
  }

  return { startTouchDrag, isDragging };
}
