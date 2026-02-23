import { useState, useRef } from "react";
import { T, FONT, DFONT, PRODUCT_COLORS, DEPTH_UNITS, CASE_DEPTH, PRODUCT_LABELS } from "../utils/constants.js";
import { getSlotLabel } from "../utils/helpers.js";

export default function PanSlot({ pan, slotIdx, products, onAssignProduct, onClearSlot, onDirectClearSlot, onSetSlotType, totalDepthSlots, startTouchDrag, selectedProductId, onMobilePlaceProduct }) {
  const [dOver, setDOver] = useState(false);
  const slotRef = useRef();
  const product = pan.slots[slotIdx] ? products.find((p) => p.id === pan.slots[slotIdx]) : null;
  const color = product ? (PRODUCT_COLORS[product.color] || PRODUCT_COLORS.cool) : null;
  const depthLabel = getSlotLabel(pan.depth, slotIdx);
  const slotH = (DEPTH_UNITS[pan.depth] / CASE_DEPTH) * 100;
  const isSplit = pan.depth !== "full";
  const slotType = pan.slotTypes?.[slotIdx] ?? pan.panType;
  const isPlaceMode = !!selectedProductId;

  const handleSlotClick = () => {
    if (isPlaceMode) {
      onMobilePlaceProduct?.(pan.id, slotIdx);
      return;
    }
    if (product) onClearSlot(pan.id, slotIdx);
  };

  return (
    <div
      ref={slotRef}
      data-drop-type="slot"
      data-pan-id={pan.id}
      data-slot-idx={slotIdx}
      draggable={!!product}
      onClick={handleSlotClick}
      onDragStart={product ? (e) => {
        e.stopPropagation();
        e.dataTransfer.setData("productId", product.id);
        e.dataTransfer.setData("dragType", "slotProduct");
        e.dataTransfer.setData("srcPanId", pan.id);
        e.dataTransfer.setData("srcSlotIdx", String(slotIdx));
      } : undefined}
      onTouchStart={product ? (e) => {
        startTouchDrag(e, { type: "slotProduct", productId: product.id, srcPanId: pan.id, srcSlotIdx: slotIdx }, slotRef);
      } : undefined}
      onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); setDOver(true); }}
      onDragLeave={() => setDOver(false)}
      onDrop={(e) => {
        e.preventDefault(); e.stopPropagation(); setDOver(false);
        const dt = e.dataTransfer.getData("dragType");
        const pid = e.dataTransfer.getData("productId");
        if (dt === "product" && pid) {
          onAssignProduct(pan.id, slotIdx, pid);
        } else if (dt === "slotProduct" && pid) {
          const sPan = e.dataTransfer.getData("srcPanId");
          const sIdx = +e.dataTransfer.getData("srcSlotIdx");
          const cur = pan.slots[slotIdx];
          onAssignProduct(pan.id, slotIdx, pid);
          if (cur) onAssignProduct(sPan, sIdx, cur);
          else onDirectClearSlot(sPan, sIdx);
        }
      }}
      style={{
        width: "100%", height: `${slotH}%`,
        background: dOver ? T.accentDim + "66" : color ? color.bg + "18" : isPlaceMode ? T.accentDim + "15" : T.surfaceAlt,
        borderBottom: slotIdx < totalDepthSlots - 1 ? `1px dashed ${T.borderLight}` : "none",
        outline: isPlaceMode ? `1px dashed ${T.accent}55` : "none",
        outlineOffset: -1,
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
        position: "relative", overflow: "hidden", transition: "background 0.12s",
        cursor: isPlaceMode ? "copy" : product ? "grab" : "default", userSelect: "none",
      }}
      title={isPlaceMode ? "Tap to place here" : product ? `${product.name}${product.plu ? ` (${product.plu})` : ""}\nDrag to swap · Tap to remove` : undefined}
    >
      {color && <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 3, background: color.bg, opacity: 0.8 }} />}
      {depthLabel && (
        <span style={{ position: "absolute", top: 2, right: 4, fontSize: 10, color: T.textDim, fontFamily: FONT, textTransform: "uppercase" }}>{depthLabel}</span>
      )}
      {product ? (
        <div style={{ textAlign: "center", padding: "0 4px" }}>
          <span style={{
            fontSize: pan.width <= 3 ? 9 : 10, fontWeight: 700, color: color.bg, fontFamily: DFONT, lineHeight: 1.2,
            ...(pan.width <= 3 ? { display: "block", writingMode: "vertical-lr", overflow: "hidden", maxHeight: "90%", whiteSpace: "nowrap", textOverflow: "ellipsis", margin: "0 auto" } : { wordBreak: "break-word" }),
          }}>{product.name}</span>
          {product.plu && pan.width > 3 && <div style={{ fontSize: 8, color: T.textDim, fontFamily: FONT, marginTop: 1 }}>{product.plu}</div>}
          {pan.width > 3 && (product.labels || []).length > 0 && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 2, justifyContent: "center", marginTop: 2 }}>
              {(product.labels || []).map((key) => {
                const lbl = PRODUCT_LABELS.find((l) => l.key === key);
                if (!lbl) return null;
                return (
                  <span key={key} style={{ fontSize: 7, padding: "0 3px", borderRadius: 2, fontFamily: FONT, background: lbl.color + "22", color: lbl.color, fontWeight: 700 }}>
                    {lbl.abbr}
                  </span>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        <span style={{ fontSize: 16, color: isPlaceMode ? T.accent + "99" : T.borderLight + "88", fontWeight: 300, pointerEvents: "none" }}>+</span>
      )}
      {/* Per-slot deep/shallow badge for split pans */}
      {isSplit && (
        <span
          onClick={(e) => { e.stopPropagation(); onSetSlotType(pan.id, slotIdx, slotType === "deep" ? "shallow" : "deep"); }}
          style={{
            position: "absolute", bottom: 2, right: 3,
            fontSize: 10, padding: "0 3px", borderRadius: 2, cursor: "pointer", fontFamily: FONT, textTransform: "uppercase",
            background: slotType === "deep" ? "#3b82f622" : "#f59e0b22",
            color: slotType === "deep" ? "#60a5fa" : "#fbbf24",
          }}
          title="Toggle deep/shallow for this slot"
        >
          {slotType === "deep" ? "D" : "S"}
        </span>
      )}
    </div>
  );
}
