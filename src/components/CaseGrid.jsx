import { useState, useEffect, useLayoutEffect, useRef, useMemo } from "react";
import { T, FONT } from "../utils/constants.js";
import { usedWidth as sumWidth } from "../case/layout.js";
import { dragKind, getDragSource } from "../utils/dragData.js";
import { canDrop } from "../case/drop.js";
import PanColumn from "./PanColumn.jsx";
import CaseOverview from "./CaseOverview.jsx";

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
      title={!dividerEditMode ? "Tap Dividers below the case to add or remove dividers" : hasDivider ? "Tap to remove this divider" : "Tap to add a divider here"}
      style={{
        width: hasDivider ? 8 : 6,
        minWidth: hasDivider ? 8 : 6,
        marginLeft: hasDivider ? -4 : -3,
        marginRight: hasDivider ? -4 : -3,
        position: "relative", zIndex: 5,
        cursor: isPanDragging ? "copy" : canToggleDivider ? "pointer" : "default",
      }}
    >
      {/* While editing dividers, a 44px tap area centered on the gap */}
      {canToggleDivider && <div aria-hidden="true" style={{ position: "absolute", top: 0, bottom: 0, left: "50%", width: 44, transform: "translateX(-50%)" }} />}
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
  return Object.entries(counts).map(([k, v]) => `${k} ×${v}`).join(", ");
}

export default function CaseGrid({ pans, products, caseWidth, onDrop, onOpenPanSheet, onLoadPublished, drag, isMobile, isPortrait, startTouchDrag, selectedProductId, onPickProduct, dividers = new Set(), dividerEditMode = false, onToggleDividerEditMode }) {
  const { insertTarget, panDragId } = drag;
  const caseRef = useRef();
  const [containerWidth, setContainerWidth] = useState(800);
  const [hoverInsertIdx, setHoverInsertIdx] = useState(null);
  const [hoverDividerIdx, setHoverDividerIdx] = useState(null);
  // Where the case view is scrolled, for the overview's frame.
  const [view, setView] = useState({ scrollLeft: 0, clientWidth: 0, scrollWidth: 0 });
  const readView = () => {
    const el = caseRef.current;
    if (el) setView({ scrollLeft: el.scrollLeft, clientWidth: el.clientWidth, scrollWidth: el.scrollWidth });
  };

  useEffect(() => {
    const obs = new ResizeObserver((entries) => {
      if (entries[0]) setContainerWidth(entries[0].contentRect.width);
      readView();
    });
    if (caseRef.current) obs.observe(caseRef.current);
    return () => obs.disconnect();
  }, []);
  useEffect(readView, [pans, caseWidth]);

  const jumpTo = (fraction) => {
    const el = caseRef.current;
    if (el) el.scrollTo({ left: fraction * el.scrollWidth - el.clientWidth / 2, behavior: "smooth" });
  };

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
  const overflows = view.scrollWidth > view.clientWidth + 1;
  const sideLabel = { fontSize: 11, color: T.textMuted, fontFamily: FONT, textTransform: "uppercase", letterSpacing: 1 };
  const edgeLabel = { display: "flex", alignItems: "center", padding: isMobile ? "0 4px" : "0 8px" };

  return (
    <>
      {/* Sticky on phones so the overview stays in view while the page scrolls */}
      {pans.length > 0 && overflows && (
        <div style={{ position: isMobile ? "sticky" : "static", top: 0, zIndex: 20, background: T.bg, padding: isMobile ? "0 22px" : "0 30px" }}>
          <CaseOverview pans={pans} products={products} caseWidth={caseWidth} view={view} onJump={jumpTo} />
        </div>
      )}
      <div style={{ display: "flex", alignItems: "stretch", gap: 0 }}>
        <div style={edgeLabel}>
          <span style={{ fontSize: isMobile ? 12 : 14, fontWeight: 700, color: T.textDim, fontFamily: FONT }}>L</span>
        </div>

        {/* Case container */}
        <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
          <div style={{ ...sideLabel, textAlign: "center", marginBottom: 4 }}>Customer side</div>
          <div
            ref={caseRef}
            onScroll={readView}
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
                <span style={{ fontSize: 14, color: T.textMuted, textAlign: "center", padding: "0 16px" }}>The case is empty</span>
                {onLoadPublished && (
                  <button type="button" onClick={onLoadPublished} style={{ minHeight: 44, padding: "0 16px", borderRadius: 8, background: T.accent, color: T.bg, border: "none", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>
                    Load a published case
                  </button>
                )}
                <span style={{ fontSize: 12, color: T.textMuted, textAlign: "center", padding: "0 16px" }}>Or add a pan, tap Auto, or drag a product here from Products</span>
              </div>
            ) : (
              <>
                {/* Insert zone before first pan */}
                <InsertZone idx={0} hoverInsertIdx={hoverInsertIdx} setHoverInsertIdx={setHoverInsertIdx} hoverDividerIdx={hoverDividerIdx} setHoverDividerIdx={setHoverDividerIdx} panDragId={panDragId} onDrop={onDrop} afterPanId="start" hasDivider={dividers.has("start")} dividerEditMode={dividerEditMode} />
                {pans.map((pan, i) => (
                  <span key={pan.id} style={{ display: "contents" }}>
                    <PanColumn
                      pan={pan} position={i + 1} products={products}
                      onDrop={onDrop}
                      unitSize={unitSize} onOpenPanSheet={onOpenPanSheet}
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

          {/* The employee side is the bottom edge; the Dividers toggle sits beside it */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", position: "relative", marginTop: 4, minHeight: isMobile ? 44 : undefined }}>
            <span style={sideLabel}>Your side</span>
            {onToggleDividerEditMode && (
              <button
                type="button"
                onClick={onToggleDividerEditMode}
                aria-pressed={dividerEditMode}
                style={{
                  position: "absolute", left: 0, top: "50%", transform: "translateY(-50%)",
                  display: "flex", alignItems: "center", gap: 4,
                  fontSize: isMobile ? 12 : 9, padding: "3px 8px", minHeight: isMobile ? 44 : undefined, borderRadius: 5, cursor: "pointer",
                  fontFamily: FONT, fontWeight: 700, letterSpacing: 0.3,
                  border: `1px solid ${dividerEditMode ? T.accent : T.border}`,
                  background: dividerEditMode ? T.accent : T.surfaceAlt,
                  color: dividerEditMode ? T.bg : T.textDim,
                }}
              >╫ {dividerEditMode ? "Done" : "Dividers"}</button>
            )}
          </div>
          {dividerEditMode && (
            <div role="status" style={{ marginTop: 6, fontSize: 11, color: T.accent, textAlign: "center" }}>
              Tap a gap between pans to add or remove a divider
            </div>
          )}
        </div>

        <div style={edgeLabel}>
          <span style={{ fontSize: isMobile ? 12 : 14, fontWeight: 700, color: T.textDim, fontFamily: FONT }}>R</span>
        </div>
      </div>

      {pans.length > 0 && (
        <div style={{ fontSize: 12, color: T.textMuted, fontFamily: FONT, padding: "2px 0" }}>
          {pans.length} {pans.length === 1 ? "pan" : "pans"} to grab: {summary}
        </div>
      )}
    </>
  );
}
