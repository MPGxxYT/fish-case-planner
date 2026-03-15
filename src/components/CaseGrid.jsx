import { useState, useEffect, useLayoutEffect, useRef, useMemo } from "react";
import { T, FONT } from "../utils/constants.js";
import PanColumn from "./PanColumn.jsx";

export const DIVIDER_COLOR = "#94a3b8";

function InsertZone({ idx, hoverInsertIdx, setHoverInsertIdx, hoverDividerIdx, setHoverDividerIdx, panDragId, onCreatePanFromProduct, hasDivider, onToggleDivider }) {
  const isProductHover = hoverInsertIdx === idx;
  const isDividerHover = hoverDividerIdx === idx;
  const isPanDragging = !!panDragId;

  return (
    <div
      data-drop-type="insert"
      data-insert-idx={idx}
      onDragOver={(e) => {
        const dt = e.dataTransfer.types;
        if (isPanDragging) return;
        if (dt.includes("divider")) {
          e.preventDefault();
          e.stopPropagation();
          setHoverDividerIdx(idx);
          return;
        }
        const isSlotDrag = dt.includes("srcpanid");
        if (!isSlotDrag) {
          e.preventDefault();
          e.stopPropagation();
          setHoverInsertIdx(idx);
        }
      }}
      onDragLeave={() => {
        setHoverInsertIdx((prev) => prev === idx ? null : prev);
        setHoverDividerIdx((prev) => prev === idx ? null : prev);
      }}
      onDrop={(e) => {
        const dragType = e.dataTransfer.getData("dragType");
        if (dragType === "divider") {
          e.preventDefault();
          e.stopPropagation();
          onToggleDivider();
        } else {
          const pid = e.dataTransfer.getData("productId");
          if (dragType === "product" && pid) {
            e.preventDefault();
            e.stopPropagation();
            onCreatePanFromProduct(pid, idx);
          }
        }
        setHoverInsertIdx(null);
        setHoverDividerIdx(null);
      }}
      onClick={() => { if (!isPanDragging) onToggleDivider(); }}
      title={hasDivider ? "Click to remove divider" : "Drag a divider here, or click to toggle"}
      style={{
        width: hasDivider ? 8 : 6,
        minWidth: hasDivider ? 8 : 6,
        marginLeft: hasDivider ? -4 : -3,
        marginRight: hasDivider ? -4 : -3,
        position: "relative", zIndex: 5,
        cursor: isPanDragging ? "copy" : "pointer",
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

export default function CaseGrid({ pans, products, caseWidth, onAssignProduct, onClearSlot, onDirectClearSlot, onRemovePan, onSetPanType, onSetSlotType, onSetPanWidth, onSetPanDepth, onCreatePanFromProduct, insertTarget, onPanDragStart, onPanDragOver, onPanDrop, onPanDragEnd, setInsertTarget, setPanDragId, panDragId, isMobile, isPortrait, startTouchDrag, selectedProductId, onMobilePlaceProduct, onPickProduct, dividers = new Set(), onToggleDivider }) {
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

  const usedWidth = pans.reduce((s, p) => s + p.width, 0);
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
            onDrop={() => { setHoverInsertIdx(null); setInsertTarget(null); setPanDragId(null); }}
          >
            {pans.length === 0 ? (
              <div
                data-drop-type="empty-case"
                style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 6 }}
                onDragOver={(e) => {
                  const dt = e.dataTransfer.types;
                  if (!dt.includes("srcpanid")) {
                    e.preventDefault();
                    setHoverInsertIdx(0);
                  }
                }}
                onDrop={(e) => {
                  const pid = e.dataTransfer.getData("productId");
                  const dragType = e.dataTransfer.getData("dragType");
                  if (dragType === "product" && pid) {
                    e.preventDefault();
                    e.stopPropagation();
                    onCreatePanFromProduct(pid, 0);
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
                <InsertZone idx={0} hoverInsertIdx={hoverInsertIdx} setHoverInsertIdx={setHoverInsertIdx} hoverDividerIdx={hoverDividerIdx} setHoverDividerIdx={setHoverDividerIdx} panDragId={panDragId} onCreatePanFromProduct={onCreatePanFromProduct} hasDivider={dividers.has("start")} onToggleDivider={() => onToggleDivider("start")} />
                {pans.map((pan, i) => (
                  <span key={pan.id} style={{ display: "contents" }}>
                    <PanColumn
                      pan={pan} products={products}
                      onAssignProduct={onAssignProduct} onClearSlot={onClearSlot} onDirectClearSlot={onDirectClearSlot}
                      unitSize={unitSize} onRemovePan={onRemovePan} onSetPanType={onSetPanType}
                      onSetSlotType={onSetSlotType} onSetPanWidth={onSetPanWidth} onSetPanDepth={onSetPanDepth}
                      remainingWidth={remainingWidth}
                      insertIndicator={insertTarget?.panId === pan.id ? insertTarget.side : null}
                      onPanDragStart={onPanDragStart} onPanDragOver={onPanDragOver}
                      onPanDrop={onPanDrop} onPanDragEnd={onPanDragEnd}
                      startTouchDrag={startTouchDrag} isMobile={isMobile}
                      selectedProductId={selectedProductId} onMobilePlaceProduct={onMobilePlaceProduct}
                      onPickProduct={onPickProduct}
                    />
                    {/* Insert zone after each pan */}
                    <InsertZone idx={i + 1} hoverInsertIdx={hoverInsertIdx} setHoverInsertIdx={setHoverInsertIdx} hoverDividerIdx={hoverDividerIdx} setHoverDividerIdx={setHoverDividerIdx} panDragId={panDragId} onCreatePanFromProduct={onCreatePanFromProduct} hasDivider={dividers.has(pan.id)} onToggleDivider={() => onToggleDivider(pan.id)} />
                  </span>
                ))}
                {remainingWidth > 0 && (
                  <div
                    data-drop-type="insert"
                    data-insert-idx={pans.length}
                    style={{ flex: `0 0 ${remainingWidth * unitSize}px`, minWidth: 0, overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center", borderLeft: `1px dashed ${T.borderLight}` }}
                    onDragOver={(e) => {
                      const dt = e.dataTransfer.types;
                      if (panDragId || dt.includes("srcpanid")) return;
                      e.preventDefault();
                      e.stopPropagation();
                      setHoverInsertIdx(pans.length);
                    }}
                    onDragLeave={() => setHoverInsertIdx((prev) => prev === pans.length ? null : prev)}
                    onDrop={(e) => {
                      const pid = e.dataTransfer.getData("productId");
                      const dragType = e.dataTransfer.getData("dragType");
                      if (dragType === "product" && pid) {
                        e.preventDefault();
                        e.stopPropagation();
                        onCreatePanFromProduct(pid, pans.length);
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

          {/* "Top Of Case" label below */}
          <div style={{ textAlign: "center", marginTop: 4 }}>
            <span style={{ fontSize: 10, color: T.textDim, fontFamily: FONT, textTransform: "uppercase", letterSpacing: 1 }}>Top Of Case</span>
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
