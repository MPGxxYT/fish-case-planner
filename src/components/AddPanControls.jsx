import { useState, useEffect } from "react";
import { T, S, FONT, PAN_WIDTHS, PAN_DEPTHS_SPLIT } from "../utils/constants.js";
import { canSplitDepth } from "../utils/helpers.js";

export default function AddPanControls({ onAddPan, remainingWidth }) {
  const [w, setW] = useState(6);
  const [d, setD] = useState("full");
  const [pt, setPt] = useState("shallow");
  const ad = canSplitDepth(w) ? PAN_DEPTHS_SPLIT : ["full"];

  useEffect(() => {
    if (!canSplitDepth(w)) setD("full");
  }, [w]);

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", padding: "8px 12px", background: T.surfaceAlt, borderRadius: 8, border: `1px solid ${T.border}` }}>
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
  );
}
