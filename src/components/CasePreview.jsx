import { useMemo } from "react";
import { T, FONT, PRODUCT_COLORS, DEPTH_UNITS, CASE_DEPTH } from "../utils/constants.js";
import { getDepthSlots } from "../utils/helpers.js";

function getPanSummary(pans) {
  const counts = {};
  pans.forEach((p) => {
    const key = `${p.width}${p.panType === "deep" ? "D" : "S"}`;
    counts[key] = (counts[key] || 0) + 1;
  });
  return Object.entries(counts).map(([k, v]) => `${k} (${v})`).join(", ");
}

export { getPanSummary };

export default function CasePreview({ pans, products, caseWidth, height = 220 }) {
  const usedWidth = pans.reduce((s, p) => s + p.width, 0);
  const summary = useMemo(() => getPanSummary(pans), [pans]);
  const getSlotType = (pan, idx) => pan.slotTypes?.[idx] ?? pan.panType;

  return (
    <div>
      <div style={{ display: "flex", alignItems: "stretch" }}>
        <div style={{ display: "flex", alignItems: "center", padding: "0 8px" }}>
          <span style={{ fontSize: 14, fontWeight: 700, color: T.textDim, fontFamily: FONT }}>L</span>
        </div>
        <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", border: `1px solid ${T.borderLight}`, height, background: T.surface, borderRadius: 4, overflow: "hidden", width: "100%" }}>
            {pans.length === 0 ? (
              <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <span style={{ fontSize: 11, color: T.textDim }}>No pans</span>
              </div>
            ) : pans.map((pan) => {
              const sl = getDepthSlots(pan.depth);
              const isSplit = pan.depth !== "full";
              const pct = ((pan.width / usedWidth) * 100).toFixed(4);
              return (
                <div key={pan.id} style={{ width: `${pct}%`, minWidth: 0, borderRight: `1px solid ${T.borderLight}`, display: "flex", flexDirection: "column", boxSizing: "border-box" }}>
                  <div style={{ height: 20, background: T.surfaceAlt, display: "flex", alignItems: "center", justifyContent: "center", borderBottom: `1px solid ${T.border}`, fontSize: 9, fontWeight: 700, color: T.accent, fontFamily: FONT }}>
                    {pan.width}
                    {!isSplit && <span style={{ color: pan.panType === "deep" ? "#60a5fa" : "#fbbf24", marginLeft: 1, fontSize: 7 }}>{pan.panType === "deep" ? "D" : "S"}</span>}
                  </div>
                  {sl.map((idx, i) => {
                    const pr = pan.slots[idx] ? products.find((p) => p.id === pan.slots[idx]) : null;
                    const c = pr ? (PRODUCT_COLORS[pr.color] || PRODUCT_COLORS.cool) : null;
                    const st = getSlotType(pan, idx);
                    return (
                      <div key={idx} style={{
                        height: `${(DEPTH_UNITS[pan.depth] / CASE_DEPTH) * 100}%`,
                        background: c ? c.bg + "1a" : "transparent",
                        borderBottom: i < sl.length - 1 ? `1px dashed ${T.borderLight}` : "none",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        borderLeft: c ? `3px solid ${c.bg}` : "none",
                        position: "relative",
                      }}>
                        {pr && <span style={{ fontSize: 7, fontWeight: 600, color: c.bg, textAlign: "center", wordBreak: "break-word", padding: "0 1px" }}>{pr.name}</span>}
                        {isSplit && (
                          <span style={{ position: "absolute", bottom: 1, right: 2, fontSize: 6, fontWeight: 700, color: st === "deep" ? "#60a5fa" : "#fbbf24", fontFamily: FONT }}>
                            {st === "deep" ? "D" : "S"}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
          <div style={{ textAlign: "center", marginTop: 4 }}>
            <span style={{ fontSize: 10, color: T.textDim, fontFamily: FONT, textTransform: "uppercase", letterSpacing: 1 }}>Top Of Case</span>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", padding: "0 8px" }}>
          <span style={{ fontSize: 14, fontWeight: 700, color: T.textDim, fontFamily: FONT }}>R</span>
        </div>
      </div>
      {summary && (
        <div style={{ marginTop: 8, fontSize: 10, color: T.textMuted, fontFamily: FONT }}>
          Pans: {summary} — {usedWidth}/{caseWidth} units
        </div>
      )}
    </div>
  );
}
