import { useState, useEffect, useLayoutEffect, useRef, useMemo } from "react";
import { T, FONT } from "../utils/constants.js";
import { usedWidth as sumWidth } from "../case/layout.js";
import { dragKind, getDragSource } from "../utils/dragData.js";
import { canDrop } from "../case/drop.js";
import PanColumn from "./PanColumn.jsx";

export const DIVIDER_COLOR = "#94a3b8";

function InsertZone({ idx, afterPanId, hoverInsertIdx, setHoverInsertIdx, hoverDividerIdx, setHoverDividerIdx, panDragId, onDrop, hasDivider, dividerEditMode }) {
  const isProductHover = hoverInsertIdx === idx;
  const isDividerHover = hoverDividerIdx === idx;
  const isPanDragging = !!panDragId;
  const canToggleDivider = dividerEditMode && !isPanDragging;
  const target = { kind: "gap", index: idx, afterPanId };

  return (
    <div
      data-drop-type="insert"
      data-insert-idx={idx}
      data-after-pan-id={afterPanId}
      onDragOver={(e) => {
        const kind = dragKind(e);
        if (!canDrop(kind, target, { dividerEditMode })) return;
        e.preventDefault();
        e.stopPropagation();
        if (kind === "divider") setHoverDividerIdx(idx);
        else setHoverInsertIdx(idx);
      }}
      onDragLeave={() => {
        setHoverInsertIdx((prev) => prev === idx ? null : prev);
        setHoverDividerIdx((prev) => prev === idx ? null : prev);
      }}
      onDrop={(e) => {
        const source = getDragSource(e);
        if (source && canDrop(source.kind, target, { dividerEditMode })) {
          e.preventDefault();
          e.stopPropagation();
          onDrop(source, target);
        }
        setHoverInsertIdx(null);
        setHoverDividerIdx(null);
      }}
      onClick={() => { if (canToggleDivider) onDrop({ kind: "divider" }, target); }}
      title={!dividerEditMode ? "Enable divider editing (tab below case) to add or remove dividers" : hasDivider ? "Click to remove divider" : "Drag a divider here, or click to toggle"}
      style={{
        width: hasDivider ? 8 : 6,
        minWidth: hasDivider ? 8 : 6,
        marginLeft: hasDivider ? -4 : -3,
        marginRight: hasDivider ? -4 : -3,
        position: "relative", zIndex: 5,
        cursor: isPanDragging ? "copy" : canToggleDivider ? "pointer" : "default",
      }}
    >
      {/* Existing divider bar */}
      {hasDivider && (
        <div style={{
          position: "absolute", left: "50%", transform: "translateX(-50%)",
          top: 0, bottom: 0, width: 3,
          background: (isProductHover || isDividerHover) ? "#e2e8f0" : DIVIDER_COLOR,
          borderRadius: 1, pointerEvents: "none", transition: "background 0.15s",
        }} />
      )}
      {/* Divider drag drop preview */}
      {isDividerHover && !hasDivider && (
        <div style={{
          position: "absolute", left: "50%", transform: "translateX(-50%)",
          top: 0, bottom: 0, width: 3,
          background: DIVIDER_COLOR, borderRadius: 1, pointerEvents: "none",
          opacity: 0.7,
        }} />
      )}
      {/* Product drag insert indicator */}
      {isProductHover && !isDividerHover && (
        <div style={{
          position: "absolute", left: "50%", transform: "translateX(-50%)",
          top: 0, bottom: 0, width: 3,
          background: T.accent, borderRadius: 2, pointerEvents: "none",
        }} />
      )}
      {/* Click hover hint (no divider, not dragging anything) */}
      {isProductHover && !isPanDragging && !hasDivider && !isDividerHover && (
        <div style={{
          position: "absolute", left: "50%", transform: "translateX(-50%)",
          top: 0, bottom: 0, width: 2,
          background: DIVIDER_COLOR + "55", borderRadius: 1, pointerEvents: "none",
        }} />
      )}
    </div>
  );
}

function getPanSummary(pans) {
  const counts = {};
  pans.forEach((p) => {
    const key = `${p.width}${p.panType === "deep" ? "D" : "S"}`;
    counts[key] = (counts[key] || 0) + 1;
  });
  return Object.entries(counts).map(([k, v]) => `${k} (${v})`).join(", ");
}

export default function CaseGrid({ pans, products, caseWidth, onDrop, onClearSlot, onRemovePan, onSetPanType, onSetSlotType, onSetPanWidth, onSetPanDepth, drag, isMobile, isPortrait, startTouchDrag, selectedProductId, onPickProduct, dividers = new Set(), dividerEditMode = false, onToggleDividerEditMode }) {
  const { insertTarget, panDragId } = drag;
  const caseRef = useRef();
  const [containerWidth, setContainerWidth] = useState(800);
  const [hoverInsertIdx, setHoverInsertIdx] = useState(null);
  const [hoverDividerIdx, setHoverDividerIdx] = useState(null);

  useEffect(() => {
    const obs = new ResizeObserver((entries) => {
      if (entries[0]) setContainerWidth(entries[0].contentRect.width);
    });
    if (caseRef.current) obs.observe(caseRef.current);
    return () => obs.disconnect();
  }, []);

  // On mobile: instantly reset horizontal scroll when case shrinks so iOS doesn't animate it
  const prevCaseWidthRef = useRef(caseWidth);
  useLayoutEffect(() => {
    if (isMobile && caseRef.current && caseWidth < prevCaseWidthRef.current) {
      caseRef.current.scrollLeft = 0;
    }
    prevCaseWidthRef.current = caseWidth;
  }, [caseWidth, isMobile]);

  const usedWidth = sumWidth(pans);
  const remainingWidth = caseWidth - usedWidth;
  // On mobile, enforce a minimum pixel size per unit so the case scrolls rather than shrinks
  const minUnit = isMobile ? 8 : 3;
  const unitSize = Math.max(minUnit, (containerWidth - 2) / Math.max(caseWidth, usedWidth));
  const summary = useMemo(() => getPanSummary(pans), [pans]);

  return (
    <>
      <div style={{ display: "flex", alignItems: "stretch", gap: 0 }}>
        {/* Left label */}
        <div style={{ display: "flex", alignItems: "center", padding: "0 8px" }}>
          <span style={{ fontSize: 14, fontWeight: 700, color: T.textDim, fontFamily: FONT }}>L</span>
        </div>

        {/* Case container */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
          <div
            ref={caseRef}
            className="case-container"
            style={{
              display: "flex", border: `2px solid ${T.borderLight}`, borderRadius: 6,
              height: isMobile ? (isPortrait ? 340 : "calc(100svh - 194px)") : 300, background: T.surface,
              overflowX: "auto", overflowY: "hidden", position: "relative",
            }}
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => { setHoverInsertIdx(null); drag.reset(); }}
          >
            {pans.length === 0 ? (
              <div
                data-drop-type="empty-case"
                style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 6 }}
                onDragOver={(e) => {
                  if (!canDrop(dragKind(e), { kind: "empty" })) return;
                  e.preventDefault();
                  setHoverInsertIdx(0);
                }}
                onDrop={(e) => {
                  const source = getDragSource(e);
                  if (source && canDrop(source.kind, { kind: "empty" })) {
                    e.preventDefault();
                    e.stopPropagation();
                    onDrop(source, { kind: "empty" });
                  }
                  setHoverInsertIdx(null);
                }}
              >
                <span style={{ fontSize: 28, opacity: 0.25 }}>🐟</span>
                <span style={{ fontSize: 12, color: T.textDim }}>Add pans or use Auto Generate</span>
                <span style={{ fontSize: 10, color: T.textDim }}>Drag products from the pool into slots or between pans</span>
              </div>
            ) : (
              <>
                {/* Insert zone before first pan */}
                <InsertZone idx={0} hoverInsertIdx={hoverInsertIdx} setHoverInsertIdx={setHoverInsertIdx} hoverDividerIdx={hoverDividerIdx} setHoverDividerIdx={setHoverDividerIdx} panDragId={panDragId} onDrop={onDrop} afterPanId="start" hasDivider={dividers.has("start")} dividerEditMode={dividerEditMode} />
                {pans.map((pan, i) => (
                  <span key={pan.id} style={{ display: "contents" }}>
                    <PanColumn
                      pan={pan} products={products}
                      onDrop={onDrop} onClearSlot={onClearSlot}
                      unitSize={unitSize} onRemovePan={onRemovePan} onSetPanType={onSetPanType}
                      onSetSlotType={onSetSlotType} onSetPanWidth={onSetPanWidth} onSetPanDepth={onSetPanDepth}
                      remainingWidth={remainingWidth}
                      insertIndicator={insertTarget?.panId === pan.id ? insertTarget.side : null}
                      drag={drag}
                      startTouchDrag={startTouchDrag} isMobile={isMobile}
                      selectedProductId={selectedProductId}
                      onPickProduct={onPickProduct}
                    />
                    {/* Insert zone after each pan */}
                    <InsertZone idx={i + 1} hoverInsertIdx={hoverInsertIdx} setHoverInsertIdx={setHoverInsertIdx} hoverDividerIdx={hoverDividerIdx} setHoverDividerIdx={setHoverDividerIdx} panDragId={panDragId} onDrop={onDrop} afterPanId={pan.id} hasDivider={dividers.has(pan.id)} dividerEditMode={dividerEditMode} />
                  </span>
                ))}
                {remainingWidth > 0 && (
                  <div
                    data-drop-type="insert"
                    data-insert-idx={pans.length}
                    style={{ flex: `0 0 ${remainingWidth * unitSize}px`, minWidth: 0, overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center", borderLeft: `1px dashed ${T.borderLight}` }}
                    onDragOver={(e) => {
                      if (!canDrop(dragKind(e), { kind: "gap", index: pans.length, afterPanId: null })) return;
                      e.preventDefault();
                      e.stopPropagation();
                      setHoverInsertIdx(pans.length);
                    }}
                    onDragLeave={() => setHoverInsertIdx((prev) => prev === pans.length ? null : prev)}
                    onDrop={(e) => {
                      const source = getDragSource(e);
                      const target = { kind: "gap", index: pans.length, afterPanId: null };
                      if (source && canDrop(source.kind, target)) {
                        e.preventDefault();
                        e.stopPropagation();
                        onDrop(source, target);
                      }
                      setHoverInsertIdx(null);
                    }}
                  >
                    <span style={{ fontSize: 10, color: T.textDim, fontFamily: FONT }}>{remainingWidth} empty</span>
                  </div>
                )}
              </>
            )}
          </div>

          {/* "Top Of Case" label below, with a small tab to toggle divider editing */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", position: "relative", marginTop: 4 }}>
            <span style={{ fontSize: 10, color: T.textDim, fontFamily: FONT, textTransform: "uppercase", letterSpacing: 1 }}>Top Of Case</span>
            {onToggleDividerEditMode && (
              <button
                type="button"
                onClick={onToggleDividerEditMode}
                title={dividerEditMode ? "Divider editing is on — tap gaps between pans to add/remove dividers. Tap to turn off." : "Turn on divider editing to add or remove dividers between pans"}
                style={{
                  position: "absolute", left: 0, top: "50%", transform: "translateY(-50%)",
                  display: "flex", alignItems: "center", gap: 4,
                  fontSize: 9, padding: "3px 8px", borderRadius: 5, cursor: "pointer",
                  fontFamily: FONT, fontWeight: 700, letterSpacing: 0.3,
                  border: `1px solid ${dividerEditMode ? T.accent : T.border}`,
                  background: dividerEditMode ? T.accent : T.surfaceAlt,
                  color: dividerEditMode ? T.bg : T.textDim,
                }}
              >╫ {dividerEditMode ? "Editing" : "Dividers"}</button>
            )}
          </div>
        </div>

        {/* Right label */}
        <div style={{ display: "flex", alignItems: "center", padding: "0 8px" }}>
          <span style={{ fontSize: 14, fontWeight: 700, color: T.textDim, fontFamily: FONT }}>R</span>
        </div>
      </div>

      {/* Pan summary */}
      {pans.length > 0 && (
        <div style={{ fontSize: 10, color: T.textMuted, fontFamily: FONT, padding: "2px 0" }}>
          Pans: {summary} — {usedWidth}/{caseWidth} units
        </div>
      )}

      {pans.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
          {pans.map((pan) => {
            const prods = Object.values(pan.slots).filter(Boolean).map((id) => products.find((p) => p.id === id)).filter(Boolean);
            return (
              <div key={pan.id} style={{ fontSize: 9, padding: "2px 6px", borderRadius: 3, background: T.surfaceAlt, border: `1px solid ${T.border}`, color: T.textMuted, fontFamily: FONT }}>
                <span style={{ color: T.accent, fontWeight: 700 }}>{pan.width}</span>
                <span style={{ color: pan.panType === "deep" ? "#60a5fa" : "#fbbf24", marginLeft: 2 }}>{pan.panType === "deep" ? "D" : "S"}</span>
                {pan.depth !== "full" && <span> {pan.depth === "half" ? "½" : "⅓"}</span>}
                {prods.length > 0 && <span> — {prods.map((p) => p.name).join(", ")}</span>}
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}
