import { useRef } from "react";
import { T, FONT } from "../utils/constants.js";
import { getDepthSlots } from "../utils/helpers.js";
import { setDragSource } from "../utils/dragData.js";
import PanSlot from "./PanSlot.jsx";

export default function PanColumn({ pan, position, products, onDrop, unitSize, onOpenPanSheet, insertIndicator, drag, startTouchDrag, isMobile, selectedProductId, onPickProduct }) {
  const ds = getDepthSlots(pan.depth);
  const isSplit = pan.depth !== "full";
  const headerRef = useRef();

  return (
    <div style={{ position: "relative", display: "flex", height: "100%" }}>
      {insertIndicator === "left" && <div style={{ position: "absolute", left: -2, top: 0, bottom: 0, width: 4, background: T.accent, borderRadius: 2, zIndex: 10 }} />}
      <div
        data-pan-id={pan.id}
        onDragOver={(e) => drag.onPanDragOver(e, pan.id)}
        onDrop={(e) => drag.onPanDrop(e, pan.id)}
        style={{
          width: pan.width * unitSize, minWidth: pan.width * unitSize, height: "100%",
          borderRight: `1px solid ${T.border}`, display: "flex", flexDirection: "column",
          position: "relative",
        }}
      >
        {/* Header: hold to drag, tap to open the Pan sheet */}
        <div
          ref={headerRef}
          role="button"
          tabIndex={0}
          aria-label={`Pan ${position}, ${pan.width} wide, ${pan.depth}${isSplit ? "" : `, ${pan.panType}`}. Edit pan`}
          draggable
          onDragStart={(e) => { setDragSource(e, { kind: "pan", panId: pan.id }); drag.onPanDragStart(e, pan.id); }}
          onDragEnd={drag.onPanDragEnd}
          onTouchStart={(e) => startTouchDrag(e, { kind: "pan", panId: pan.id }, headerRef)}
          onClick={() => onOpenPanSheet(pan.id)}
          onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onOpenPanSheet(pan.id); } }}
          style={{
            height: isMobile ? 44 : 34, background: T.surfaceAlt, borderBottom: `1px solid ${T.border}`,
            display: "flex", alignItems: "center", justifyContent: "center", gap: 4, flexShrink: 0, position: "relative",
            cursor: "pointer",
          }}
        >
          <span style={{ fontSize: 16, fontWeight: 800, color: T.accent, fontFamily: FONT }}>{pan.width}</span>
          {isSplit && <span style={{ fontSize: 9, color: T.textDim, fontFamily: FONT }}>{pan.depth === "half" ? "½" : "⅓"}</span>}
          {/* Deep/shallow shows here for full pans; split pans show it per slot */}
          {!isSplit && (
            <span
              aria-hidden="true"
              style={{
                fontSize: 10, padding: "1px 4px", borderRadius: 2, fontFamily: FONT, textTransform: "uppercase",
                background: pan.panType === "deep" ? "#3b82f622" : "#f59e0b22",
                color: pan.panType === "deep" ? "#60a5fa" : "#fbbf24",
              }}
            >
              {pan.panType === "deep" ? "D" : "S"}
            </span>
          )}
        </div>
        {/* Slots area */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
          {ds.map((idx) => (
            <PanSlot
              key={idx} pan={pan} slotIdx={idx} products={products}
              onDrop={onDrop}
              totalDepthSlots={ds.length}
              startTouchDrag={startTouchDrag}
              selectedProductId={selectedProductId}
              onPickProduct={onPickProduct}
            />
          ))}
        </div>
      </div>
      {insertIndicator === "right" && <div style={{ position: "absolute", right: -2, top: 0, bottom: 0, width: 4, background: T.accent, borderRadius: 2, zIndex: 10 }} />}
    </div>
  );
}
