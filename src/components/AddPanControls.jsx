import { useState, useEffect, useCallback } from "react";
import { T, S, FONT, PAN_WIDTHS, PAN_DEPTHS_SPLIT } from "../utils/constants.js";
import { canSplitDepth } from "../utils/helpers.js";
import { useIsMobile } from "../hooks/useIsMobile.js";
import { DIVIDER_COLOR } from "./CaseGrid.jsx";

const KEY_WIDTH_MAP = { "3": 3, "6": 6, "8": 8, "0": 12 };
const KEY_DEPTH_MAP = { q: "full", w: "half", e: "third" };
const KEY_TYPE_MAP  = { r: "shallow", t: "deep" };

export default function AddPanControls({ onAddPan, remainingWidth, dividerEditMode = false }) {
  const [w, setW] = useState(6);
  const [d, setD] = useState("full");
  const [pt, setPt] = useState("shallow");
  const [kbMode, setKbMode] = useState(false);
  const { isMobile } = useIsMobile();

  const ad = canSplitDepth(w) ? PAN_DEPTHS_SPLIT : ["full"];

  useEffect(() => {
    if (!canSplitDepth(w)) setD("full");
  }, [w]);

  const handleKeyDown = useCallback((e) => {
    const tag = e.target.tagName;
    if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || e.target.isContentEditable) return;

    const key = e.key.toLowerCase();

    if (key in KEY_DEPTH_MAP) {
      const newDepth = KEY_DEPTH_MAP[key];
      if (newDepth === "full" || canSplitDepth(w)) {
        setD(newDepth);
        e.preventDefault();
      }
      return;
    }

    if (key in KEY_TYPE_MAP) {
      setPt(KEY_TYPE_MAP[key]);
      e.preventDefault();
      return;
    }

    const width = KEY_WIDTH_MAP[key];
    if (width !== undefined) {
      e.preventDefault();
      const effectiveDepth = canSplitDepth(width) ? d : "full";
      setW(width);
      if (!canSplitDepth(width)) setD("full");
      if (width <= remainingWidth) {
        onAddPan(width, effectiveDepth, pt);
      }
    }
  }, [w, d, pt, remainingWidth, onAddPan]);

  useEffect(() => {
    if (!kbMode) return;
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [kbMode, handleKeyDown]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", padding: "8px 12px", background: T.surfaceAlt, borderRadius: kbMode ? "8px 8px 0 0" : 8, border: `1px solid ${T.border}`, borderBottom: kbMode ? `1px solid ${T.accent}33` : `1px solid ${T.border}` }}>
        {!isMobile && (
          <button
            title="Keyboard mode: use number keys to add pans"
            onClick={() => setKbMode((v) => !v)}
            style={{
              ...S.ch,
              fontSize: 13,
              padding: "3px 7px",
              background: kbMode ? T.accent : T.surface,
              color: kbMode ? T.bg : T.textDim,
              border: `1px solid ${kbMode ? T.accent : T.border}`,
              borderRadius: 5,
              fontFamily: "monospace",
              letterSpacing: 0,
            }}
          >
            ⌨
          </button>
        )}
        <div
          draggable={dividerEditMode}
          onDragStart={(e) => { if (!dividerEditMode) { e.preventDefault(); return; } e.dataTransfer.setData("dragType", "divider"); e.dataTransfer.setData("divider", "1"); }}
          title={dividerEditMode ? "Drag into the case to place a divider" : "Turn on divider editing (tab below the case) to place dividers"}
          style={{ display: "flex", alignItems: "center", gap: 5, padding: "4px 8px", borderRadius: 5, border: `1px solid ${T.border}`, background: T.surface, cursor: dividerEditMode ? "grab" : "not-allowed", userSelect: "none", opacity: dividerEditMode ? 1 : 0.4 }}
        >
          <div style={{ width: 3, height: 18, background: DIVIDER_COLOR, borderRadius: 1, flexShrink: 0 }} />
          <span style={{ fontSize: 10, color: T.textDim, fontFamily: FONT }}>Divider</span>
        </div>
        <button style={{ ...S.bp, opacity: w > remainingWidth ? 0.3 : 1, fontSize: 12, padding: "5px 14px" }} disabled={w > remainingWidth} onClick={() => onAddPan(w, d, pt)}>+ Add</button>
        <span style={{ fontSize: 11, color: T.textMuted, fontFamily: FONT, fontWeight: 700 }}>Pan</span>
        <div style={{ display: "flex", gap: 3 }}>
          {PAN_WIDTHS.map((v) => (
            <button key={v} onClick={() => setW(v)} style={{ ...S.ch, background: w === v ? T.accent : T.surface, color: w === v ? T.bg : T.textMuted, fontWeight: w === v ? 800 : 500 }}>{v}</button>
          ))}
        </div>
        <div style={{ display: "flex", gap: 3 }}>
          {ad.map((v) => (
            <button key={v} onClick={() => setD(v)} style={{ ...S.ch, fontSize: 10, background: d === v ? T.accent : T.surface, color: d === v ? T.bg : T.textMuted }}>
              {v === "full" ? "Full" : v === "half" ? "Half" : "Third"}
            </button>
          ))}
        </div>
        <div style={{ display: "flex", gap: 3 }}>
          {["shallow", "deep"].map((v) => (
            <button key={v} onClick={() => setPt(v)} style={{ ...S.ch, fontSize: 10, background: pt === v ? (v === "deep" ? "#3b82f6" : "#f59e0b") : T.surface, color: pt === v ? "#fff" : T.textMuted }}>
              {v === "shallow" ? "Shallow" : "Deep"}
            </button>
          ))}
        </div>
        <span style={{ fontSize: 10, color: T.textDim, fontFamily: FONT }}>{remainingWidth} left</span>
      </div>

      {kbMode && !isMobile && (
        <div style={{
          display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap",
          padding: "5px 12px", background: T.bg,
          border: `1px solid ${T.border}`, borderTop: "none", borderRadius: "0 0 8px 8px",
        }}>
          <span style={{ fontSize: 10, color: T.accent, fontFamily: FONT, fontWeight: 700, letterSpacing: "0.05em" }}>KB</span>
          <KbHint label="Width" items={[["3","3u"],["6","6u"],["8","8u"],["0","12u"]]} />
          <KbHint label="Depth" items={[["Q","Full"],["W","Half"],["E","Third"]]} />
          <KbHint label="Type"  items={[["R","Shallow"],["T","Deep"]]} />
        </div>
      )}
    </div>
  );
}

function KbHint({ label, items }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
      <span style={{ fontSize: 9, color: T.textDim, fontFamily: FONT, marginRight: 2 }}>{label}:</span>
      {items.map(([key, desc]) => (
        <span key={key} style={{ display: "flex", alignItems: "center", gap: 2 }}>
          <span style={{
            display: "inline-block", padding: "1px 5px", borderRadius: 3,
            background: T.surface, border: `1px solid ${T.border}`,
            fontSize: 9, fontFamily: "monospace", color: T.text, lineHeight: 1.6,
          }}>{key}</span>
          <span style={{ fontSize: 9, color: T.textDim, fontFamily: FONT }}>{desc}</span>
        </span>
      ))}
    </div>
  );
}
