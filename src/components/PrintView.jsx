import { useState, useMemo } from "react";
import { T, S, DFONT, FONT, PRODUCT_COLORS, DEPTH_UNITS, CASE_DEPTH } from "../utils/constants.js";
import { getDepthSlots } from "../utils/helpers.js";
import CasePreview, { getPanSummary } from "./CasePreview.jsx";

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

        <div style={{ marginTop: 12 }}>
          <CasePreview pans={pans} products={products} caseWidth={caseWidth} height={220} />
        </div>

        <div style={{ display: "flex", gap: 8, marginTop: 16, justifyContent: "flex-end" }}>
          <button style={S.bs} onClick={onClose}>Close</button>
          <button style={S.bp} onClick={handlePrint}>🖨 Print</button>
        </div>
      </div>
    </div>
  );
}
