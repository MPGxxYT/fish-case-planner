import { useState } from "react";
import { T, S, FONT, DFONT, PRODUCT_COLORS, COOK_TYPES, FISH_TYPES, PAN_WIDTHS, PRODUCT_LABELS } from "../utils/constants.js";
import { uid, toProperCase } from "../utils/helpers.js";

export default function ProductFormModal({ product, onSave, onClose }) {
  const [f, setF] = useState(
    product || {
      id: uid(), name: "", plu: "", color: "cool", cookType: "Unassigned",
      fishType: "Unassigned", maxPan: 8, minPan: 3, deepShallow: "shallow", demand: 5,
      preferredPosition: "", labels: [],
    }
  );
  const s = (k, v) => setF((o) => ({ ...o, [k]: v }));

  return (
    <div style={S.ov} onClick={onClose}>
      <div style={S.mod} onClick={(e) => e.stopPropagation()}>
        <h3 style={{ margin: 0, fontFamily: DFONT, fontSize: 18, color: T.text }}>
          {product ? "Edit Product" : "Add Product"}
        </h3>
        <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 16 }}>
          <label style={S.fl}>
            Name
            <input style={S.inp} value={f.name} onChange={(e) => s("name", e.target.value)} placeholder="e.g. Atlantic Fillet" />
          </label>
          <label style={S.fl}>
            PLU (optional)
            <input style={S.inp} value={f.plu} onChange={(e) => s("plu", e.target.value.replace(/\D/g, "").slice(0, 5))} placeholder="5 digits" />
          </label>
          <div style={S.fl}>
            Labels
            <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 2 }}>
              {PRODUCT_LABELS.map((l) => {
                const active = (f.labels || []).includes(l.key);
                return (
                  <button
                    key={l.key}
                    onClick={() => {
                      const cur = f.labels || [];
                      s("labels", active ? cur.filter((k) => k !== l.key) : [...cur, l.key]);
                    }}
                    style={{
                      padding: "4px 10px", borderRadius: 4, border: `1px solid ${active ? l.color + "88" : T.border}`,
                      cursor: "pointer", fontSize: 11, fontFamily: FONT, fontWeight: active ? 700 : 400,
                      background: active ? l.color + "22" : T.surfaceAlt,
                      color: active ? l.color : T.textDim,
                    }}
                  >
                    {l.label}
                  </button>
                );
              })}
            </div>
          </div>
          <label style={S.fl}>
            Color
            <div style={{ display: "flex", gap: 8 }}>
              {Object.entries(PRODUCT_COLORS).map(([k, v]) => (
                <button key={k} onClick={() => s("color", k)} style={{
                  width: 40, height: 30, borderRadius: 5, border: "none", cursor: "pointer", background: v.bg,
                  outline: f.color === k ? `2px solid ${T.accent}` : "2px solid transparent", outlineOffset: 2,
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  <span style={{ fontSize: 10, color: k === "cool" ? "#333" : "#fff", fontWeight: 600 }}>{v.label}</span>
                </button>
              ))}
            </div>
          </label>
          <div style={{ display: "flex", gap: 12 }}>
            <label style={{ ...S.fl, flex: 1 }}>
              Cook Type
              <select style={S.inp} value={f.cookType} onChange={(e) => s("cookType", e.target.value)}>
                {COOK_TYPES.map((t) => <option key={t}>{t}</option>)}
              </select>
            </label>
            <label style={{ ...S.fl, flex: 1 }}>
              Fish Type
              <select style={S.inp} value={f.fishType} onChange={(e) => s("fishType", e.target.value)}>
                {FISH_TYPES.map((t) => <option key={t}>{t}</option>)}
              </select>
            </label>
          </div>
          <div style={{ display: "flex", gap: 12 }}>
            <label style={{ ...S.fl, flex: 1 }}>
              Min Pan
              <select style={S.inp} value={f.minPan} onChange={(e) => s("minPan", +e.target.value)}>
                {PAN_WIDTHS.map((w) => <option key={w} value={w}>{w}</option>)}
              </select>
            </label>
            <label style={{ ...S.fl, flex: 1 }}>
              Max Pan
              <select style={S.inp} value={f.maxPan} onChange={(e) => s("maxPan", +e.target.value)}>
                {PAN_WIDTHS.map((w) => <option key={w} value={w}>{w}</option>)}
              </select>
            </label>
          </div>
          <div style={{ display: "flex", gap: 12 }}>
            <label style={{ ...S.fl, flex: 1 }}>
              Depth Pref
              <select style={S.inp} value={f.deepShallow} onChange={(e) => s("deepShallow", e.target.value)}>
                <option value="shallow">Shallow</option>
                <option value="deep">Deep</option>
              </select>
            </label>
            <label style={{ ...S.fl, flex: 1 }}>
              Demand (1-10)
              <select style={S.inp} value={f.demand} onChange={(e) => s("demand", +e.target.value)}>
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                  <option key={n} value={n}>{n}{n <= 3 ? " — Low" : n <= 6 ? " — Med" : " — High"}</option>
                ))}
              </select>
            </label>
          </div>
          <label style={S.fl}>
            Preferred Position (optional)
            <input style={S.inp} value={f.preferredPosition || ""} onChange={(e) => s("preferredPosition", e.target.value)} placeholder="e.g. 2-3 from left, far right" />
          </label>
        </div>
        <div style={{ display: "flex", gap: 8, marginTop: 20, justifyContent: "flex-end" }}>
          <button style={S.bs} onClick={onClose}>Cancel</button>
          <button style={S.bp} onClick={() => { if (f.name.trim()) onSave({ ...f, name: toProperCase(f.name.trim()) }); }}>Save</button>
        </div>
      </div>
    </div>
  );
}
