import { useState, useRef, useEffect } from "react";
import { T, FONT, PAN_WIDTHS } from "../utils/constants.js";
import { getDepthSlots, canSplitDepth } from "../utils/helpers.js";
import PanSlot from "./PanSlot.jsx";

const DEPTH_OPTIONS = [
  { key: "full", label: "Full" },
  { key: "half", label: "Half" },
  { key: "third", label: "Third" },
];

export default function PanColumn({ pan, products, onAssignProduct, onClearSlot, onDirectClearSlot, unitSize, onRemovePan, onSetPanType, onSetSlotType, onSetPanWidth, onSetPanDepth, remainingWidth, insertIndicator, onPanDragStart, onPanDragOver, onPanDrop, onPanDragEnd }) {
  const ds = getDepthSlots(pan.depth);
  const isSplit = pan.depth !== "full";
  const maxAllowed = (remainingWidth || 0) + pan.width;
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef();
  const triggerRef = useRef();
  const [menuPos, setMenuPos] = useState({ left: 0, top: 0 });

  useEffect(() => {
    if (!showMenu) return;
    const handler = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setShowMenu(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showMenu]);

  const selectWidth = (w) => {
    onSetPanWidth(pan.id, w);
    setShowMenu(false);
  };

  const selectDepth = (d) => {
    onSetPanDepth(pan.id, d);
    setShowMenu(false);
  };

  return (
    <div style={{ position: "relative", display: "flex", height: "100%" }}>
      {insertIndicator === "left" && <div style={{ position: "absolute", left: -2, top: 0, bottom: 0, width: 4, background: T.accent, borderRadius: 2, zIndex: 10 }} />}
      <div
        onDragOver={(e) => onPanDragOver(e, pan.id)}
        onDrop={(e) => onPanDrop(e, pan.id)}
        style={{
          width: pan.width * unitSize, minWidth: pan.width * unitSize, height: "100%",
          borderRight: `1px solid ${T.border}`, display: "flex", flexDirection: "column",
          position: "relative",
        }}
      >
        {/* Header — draggable for pan reordering */}
        <div
          draggable
          onDragStart={(e) => { e.dataTransfer.setData("dragType", "pan"); e.dataTransfer.setData("panId", pan.id); onPanDragStart(e, pan.id); }}
          onDragEnd={onPanDragEnd}
          style={{
            height: 34, background: T.surfaceAlt, borderBottom: `1px solid ${T.border}`,
            display: "flex", alignItems: "center", justifyContent: "center", gap: 6, flexShrink: 0, position: "relative",
            cursor: "grab",
          }}
        >
          {/* Width number — clickable to open quick-select */}
          <span
            ref={triggerRef}
            onClick={(e) => {
              e.stopPropagation();
              if (!showMenu && triggerRef.current) {
                const rect = triggerRef.current.getBoundingClientRect();
                setMenuPos({ left: rect.left + rect.width / 2, top: rect.bottom });
              }
              setShowMenu((s) => !s);
            }}
            style={{ fontSize: 16, fontWeight: 800, color: T.accent, fontFamily: FONT, cursor: "pointer", padding: "0 4px" }}
            title="Click to change pan width/split"
          >{pan.width}</span>
          {pan.depth !== "full" && <span style={{ fontSize: 9, color: T.textDim, fontFamily: FONT }}>{pan.depth === "half" ? "½" : "⅓"}</span>}
          {/* Only show header deep/shallow badge for full pans */}
          {!isSplit && (
            <span
              onClick={(e) => { e.stopPropagation(); onSetPanType(pan.id, pan.panType === "deep" ? "shallow" : "deep"); }}
              style={{
                position: "absolute", bottom: 1, right: 2,
                fontSize: 10, padding: "1px 4px", borderRadius: 2, cursor: "pointer", fontFamily: FONT, textTransform: "uppercase",
                background: pan.panType === "deep" ? "#3b82f622" : "#f59e0b22",
                color: pan.panType === "deep" ? "#60a5fa" : "#fbbf24",
              }}
              title="Toggle deep/shallow"
            >
              {pan.panType === "deep" ? "D" : "S"}
            </span>
          )}
          <button
            onClick={(e) => { e.stopPropagation(); onRemovePan(pan.id); }}
            style={{
              position: "absolute", top: 1, right: 2, background: "none", border: "none",
              color: T.textDim, cursor: "pointer", fontSize: 12, padding: "0 2px", lineHeight: 1, opacity: 0.4,
            }}
            title="Remove pan"
          >
            ×
          </button>

          {/* Quick-select menu: width + depth split */}
          {showMenu && (
            <div ref={menuRef} style={{
              position: "fixed", top: menuPos.top + 2, left: Math.max(8, menuPos.left - 50),
              zIndex: 1000, background: T.surface, border: `1px solid ${T.borderLight}`,
              borderRadius: 6, padding: 6, display: "flex", flexDirection: "column", gap: 4,
              boxShadow: "0 4px 12px rgba(0,0,0,0.4)", minWidth: 100,
            }}>
              {/* Width row */}
              <div style={{ fontSize: 8, color: T.textDim, fontFamily: FONT, textTransform: "uppercase", letterSpacing: 0.5 }}>Width</div>
              <div style={{ display: "flex", gap: 2 }}>
                {PAN_WIDTHS.map((w) => (
                  <button
                    key={w}
                    disabled={w > maxAllowed}
                    onClick={(e) => { e.stopPropagation(); selectWidth(w); }}
                    style={{
                      background: w === pan.width ? T.accent : T.surfaceAlt,
                      color: w === pan.width ? T.bg : w > maxAllowed ? T.textDim + "44" : T.text,
                      border: "none", borderRadius: 4, padding: "4px 8px", fontSize: 13,
                      fontWeight: 700, fontFamily: FONT, cursor: w > maxAllowed ? "not-allowed" : "pointer",
                      opacity: w > maxAllowed ? 0.4 : 1, flex: 1,
                    }}
                  >
                    {w}
                  </button>
                ))}
              </div>
              {/* Depth split row — only for widths that can split */}
              {canSplitDepth(pan.width) && (
                <>
                  <div style={{ fontSize: 8, color: T.textDim, fontFamily: FONT, textTransform: "uppercase", letterSpacing: 0.5, marginTop: 2 }}>Split</div>
                  <div style={{ display: "flex", gap: 2 }}>
                    {DEPTH_OPTIONS.map((d) => (
                      <button
                        key={d.key}
                        onClick={(e) => { e.stopPropagation(); selectDepth(d.key); }}
                        style={{
                          background: pan.depth === d.key ? T.accent : T.surfaceAlt,
                          color: pan.depth === d.key ? T.bg : T.text,
                          border: "none", borderRadius: 4, padding: "4px 6px", fontSize: 10,
                          fontWeight: 600, fontFamily: FONT, cursor: "pointer", flex: 1,
                        }}
                      >
                        {d.label}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}
        </div>
        {/* Slots area */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
          {ds.map((idx) => (
            <PanSlot
              key={idx} pan={pan} slotIdx={idx} products={products}
              onAssignProduct={onAssignProduct} onClearSlot={onClearSlot} onDirectClearSlot={onDirectClearSlot}
              onSetSlotType={onSetSlotType}
              totalDepthSlots={ds.length}
            />
          ))}
        </div>
      </div>
      {insertIndicator === "right" && <div style={{ position: "absolute", right: -2, top: 0, bottom: 0, width: 4, background: T.accent, borderRadius: 2, zIndex: 10 }} />}
    </div>
  );
}
