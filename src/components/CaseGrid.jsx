import { useState, useEffect, useRef, useMemo } from "react";
import { T, FONT } from "../utils/constants.js";
import PanColumn from "./PanColumn.jsx";

function InsertZone({ idx, hoverInsertIdx, setHoverInsertIdx, panDragId, onCreatePanFromProduct }) {
  const isHovered = hoverInsertIdx === idx;
  return (
    <div
      data-drop-type="insert"
      data-insert-idx={idx}
      onDragOver={(e) => {
        const dt = e.dataTransfer.types;
        if (panDragId) return;
        const isSlotDrag = dt.includes("srcpanid");
        if (!isSlotDrag) {
          e.preventDefault();
          e.stopPropagation();
          setHoverInsertIdx(idx);
        }
      }}
      onDragLeave={() => setHoverInsertIdx((prev) => prev === idx ? null : prev)}
      onDrop={(e) => {
        const pid = e.dataTransfer.getData("productId");
        const dragType = e.dataTransfer.getData("dragType");
        if (dragType === "product" && pid) {
          e.preventDefault();
          e.stopPropagation();
          onCreatePanFromProduct(pid, idx);
        }
        setHoverInsertIdx(null);
      }}
      style={{
        width: 6, minWidth: 6,
        marginLeft: -3, marginRight: -3,
        position: "relative", zIndex: 5,
        cursor: "copy",
      }}
    >
      {isHovered && (
        <div style={{
          position: "absolute",
          left: "50%", transform: "translateX(-50%)",
          top: 0, bottom: 0,
          width: 3, background: T.accent, borderRadius: 2,
          pointerEvents: "none",
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

export default function CaseGrid({ pans, products, caseWidth, onAssignProduct, onClearSlot, onDirectClearSlot, onRemovePan, onSetPanType, onSetSlotType, onSetPanWidth, onSetPanDepth, onCreatePanFromProduct, insertTarget, onPanDragStart, onPanDragOver, onPanDrop, onPanDragEnd, setInsertTarget, setPanDragId, panDragId, isMobile, isPortrait, startTouchDrag, selectedProductId, onMobilePlaceProduct }) {
  const caseRef = useRef();
  const [containerWidth, setContainerWidth] = useState(800);
  const [hoverInsertIdx, setHoverInsertIdx] = useState(null);

  useEffect(() => {
    const obs = new ResizeObserver((entries) => {
      if (entries[0]) setContainerWidth(entries[0].contentRect.width);
    });
    if (caseRef.current) obs.observe(caseRef.current);
    return () => obs.disconnect();
  }, []);

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
                <InsertZone idx={0} hoverInsertIdx={hoverInsertIdx} setHoverInsertIdx={setHoverInsertIdx} panDragId={panDragId} onCreatePanFromProduct={onCreatePanFromProduct} />
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
                    />
                    {/* Insert zone after each pan */}
                    <InsertZone idx={i + 1} hoverInsertIdx={hoverInsertIdx} setHoverInsertIdx={setHoverInsertIdx} panDragId={panDragId} onCreatePanFromProduct={onCreatePanFromProduct} />
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
