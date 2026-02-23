import { useState, useMemo } from "react";
import { T, S, DFONT, FONT, PRODUCT_COLORS, DEPTH_UNITS, CASE_DEPTH } from "../utils/constants.js";
import { getDepthSlots } from "../utils/helpers.js";

function getPanSummary(pans) {
  const counts = {};
  pans.forEach((p) => {
    const key = `${p.width}${p.panType === "deep" ? "D" : "S"}`;
    counts[key] = (counts[key] || 0) + 1;
  });
  return Object.entries(counts).map(([k, v]) => `${k} (${v})`).join(", ");
}

export default function PrintView({ pans, products, caseWidth, onClose }) {
  const [title, setTitle] = useState(`Fish Case — ${caseWidth} units`);
  const usedWidth = pans.reduce((s, p) => s + p.width, 0);
  const summary = useMemo(() => getPanSummary(pans), [pans]);

  const getSlotType = (pan, idx) => pan.slotTypes?.[idx] ?? pan.panType;

  const handlePrint = () => {
    const w = window.open("", "_blank");
    if (!w) return;
    w.document.write(`<html><head><title>${title}</title><style>
      *{print-color-adjust:exact;-webkit-print-color-adjust:exact;box-sizing:border-box}
      body{margin:20px;font-family:sans-serif;print-color-adjust:exact;-webkit-print-color-adjust:exact}
      .case-row{display:flex;align-items:stretch}
      .side-label{display:flex;align-items:center;padding:0 10px;font-size:16px;font-weight:bold;color:#666}
      .case{display:flex;border:1px solid #555;height:300px;width:100%}
      .pan{border-right:1px solid #555;display:flex;flex-direction:column;box-sizing:border-box}
      .pan:last-child{border-right:none}
      .hdr{height:22px;background:#eee;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:bold;border-bottom:1px solid #555}
      .slot{flex:1;display:flex;align-items:center;justify-content:center;text-align:center;font-size:9px;padding:2px;position:relative}
      .slot-divider{border-bottom:1px dashed #999}
      .c-warm{background:#fed7aa}.c-cool{background:#f3f4f6}.c-red{background:#fecaca}
      .ds-badge{position:absolute;bottom:1px;right:2px;font-size:7px;font-weight:bold;color:#555}
      .bottom-label{text-align:center;margin-top:6px;font-size:11px;color:#666;text-transform:uppercase;letter-spacing:1px}
      .summary{font-size:10px;margin-top:6px;color:#444}
      @media print{body{margin:10px}}
    </style></head><body><h2>${title}</h2><div class="case-row"><div class="side-label">L</div><div class="case">${pans.map((pan) => {
      const sl = getDepthSlots(pan.depth);
      const isSplit = pan.depth !== "full";
      const pct = ((pan.width / usedWidth) * 100).toFixed(4);
      return `<div class="pan" style="width:${pct}%"><div class="hdr">${pan.width}${!isSplit ? (pan.panType === "deep" ? "D" : "S") : ""}</div>${sl.map((idx, i) => {
        const pr = pan.slots[idx] ? products.find((p) => p.id === pan.slots[idx]) : null;
        const st = getSlotType(pan, idx);
        const dividerClass = i < sl.length - 1 ? " slot-divider" : "";
        return `<div class="slot${dividerClass} ${pr ? "c-" + pr.color : ""}" style="height:${(DEPTH_UNITS[pan.depth] / CASE_DEPTH) * 100}%">${pr ? pr.name : ""}${isSplit ? `<span class="ds-badge">${st === "deep" ? "D" : "S"}</span>` : ""}</div>`;
      }).join("")}</div>`;
    }).join("")}</div><div class="side-label">R</div></div><div class="bottom-label">Top Of Case</div><div class="summary">Pans: ${summary} — ${usedWidth}/${caseWidth} units</div><div style="font-size:10px;margin-top:4px;color:#666">Generated ${new Date().toLocaleString()}</div></body></html>`);
    w.document.close();
    w.print();
  };

  return (
    <div style={S.ov} onClick={onClose}>
      <div style={{ ...S.mod, maxWidth: "95vw", width: 900, maxHeight: "85vh", overflowY: "auto" }} onClick={(e) => e.stopPropagation()}>
        <h3 style={{ margin: 0, fontFamily: DFONT, color: T.text }}>Print / Export</h3>

        {/* Editable title */}
        <label style={{ display: "flex", flexDirection: "column", gap: 4, marginTop: 12, fontSize: 10, color: T.textMuted, fontFamily: FONT, textTransform: "uppercase", letterSpacing: 0.5 }}>
          Print Title
          <input
            style={{ ...S.inp, fontSize: 13, padding: "6px 10px" }}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </label>

        {/* Preview with L / R / Top Of Case — pans fill full width */}
        <div style={{ marginTop: 12, display: "flex", alignItems: "stretch" }}>
          <div style={{ display: "flex", alignItems: "center", padding: "0 8px" }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: T.textDim, fontFamily: FONT }}>L</span>
          </div>
          <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", border: `1px solid ${T.borderLight}`, height: 220, background: T.surface, borderRadius: 4, overflow: "hidden", width: "100%" }}>
              {pans.map((pan) => {
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

        {/* Pan summary */}
        {summary && (
          <div style={{ marginTop: 8, fontSize: 10, color: T.textMuted, fontFamily: FONT }}>
            Pans: {summary} — {usedWidth}/{caseWidth} units
          </div>
        )}

        <div style={{ display: "flex", gap: 8, marginTop: 16, justifyContent: "flex-end" }}>
          <button style={S.bs} onClick={onClose}>Close</button>
          <button style={S.bp} onClick={handlePrint}>🖨 Print</button>
        </div>
      </div>
    </div>
  );
}
