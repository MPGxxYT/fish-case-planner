import { useState, useMemo } from "react";
import { T, S, DFONT, FONT, DEFAULT_CASE_WIDTH, PRODUCT_COLORS, COOK_TYPES, FISH_TYPES } from "../utils/constants.js";

export default function AutoGenModal({ products, onGenerate, onClose }) {
  const [sel, setSel] = useState({});
  const [cw, setCw] = useState(DEFAULT_CASE_WIDTH);
  const [search, setSearch] = useState("");
  const [colorFilter, setColorFilter] = useState("");
  const [cookFilter, setCookFilter] = useState("");
  const [fishFilter, setFishFilter] = useState("");
  const [sortKey, setSortKey] = useState("name");

  const toggle = (pid) => setSel((s) => {
    const c = { ...s };
    if (c[pid]) delete c[pid];
    else c[pid] = { onSale: false };
    return c;
  });

  const filtered = useMemo(() => {
    let list = [...products];
    const q = search.toLowerCase().trim();
    if (q) list = list.filter((p) => p.name.toLowerCase().includes(q) || (p.plu && p.plu.includes(q)));
    if (colorFilter) list = list.filter((p) => p.color === colorFilter);
    if (cookFilter) list = list.filter((p) => p.cookType === cookFilter);
    if (fishFilter) list = list.filter((p) => p.fishType === fishFilter);
    list.sort((a, b) => {
      if (sortKey === "name") return a.name.localeCompare(b.name);
      if (sortKey === "demand") return b.demand - a.demand;
      if (sortKey === "color") return a.color.localeCompare(b.color);
      if (sortKey === "type") return a.fishType.localeCompare(b.fishType);
      return 0;
    });
    return list;
  }, [products, search, colorFilter, cookFilter, fishFilter, sortKey]);

  return (
    <div style={S.ov} onClick={onClose}>
      <div style={{ ...S.mod, maxWidth: 500, maxHeight: "80vh", overflowY: "auto" }} onClick={(e) => e.stopPropagation()}>
        <h3 style={{ margin: 0, fontFamily: DFONT, fontSize: 18, color: T.text }}>Auto Generate Case</h3>
        <label style={{ ...S.fl, marginTop: 12 }}>
          Case Width
          <input type="number" style={{ ...S.inp, width: 80 }} value={cw} onChange={(e) => setCw(Math.max(1, +e.target.value))} />
        </label>
        <p style={{ fontSize: 11, color: T.textDim, margin: "8px 0 4px" }}>
          Pan sizes based on product <strong style={{ color: T.textMuted }}>demand</strong>. "Sale" boosts size priority.
        </p>

        {/* Search / Filter / Sort controls */}
        <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 8 }}>
          <input
            style={{ ...S.inp, fontSize: 11, padding: "5px 8px" }}
            placeholder="Search by name or PLU..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
            <select style={S.sel} value={colorFilter} onChange={(e) => setColorFilter(e.target.value)}>
              <option value="">All Colors</option>
              {Object.entries(PRODUCT_COLORS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
            <select style={S.sel} value={cookFilter} onChange={(e) => setCookFilter(e.target.value)}>
              <option value="">All Cook</option>
              {COOK_TYPES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            <select style={S.sel} value={fishFilter} onChange={(e) => setFishFilter(e.target.value)}>
              <option value="">All Types</option>
              {FISH_TYPES.map((f) => <option key={f} value={f}>{f}</option>)}
            </select>
            <select style={S.sel} value={sortKey} onChange={(e) => setSortKey(e.target.value)}>
              <option value="name">Sort: Name</option>
              <option value="demand">Sort: Demand</option>
              <option value="color">Sort: Color</option>
              <option value="type">Sort: Type</option>
            </select>
          </div>
        </div>

        <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 3, maxHeight: 350, overflowY: "auto" }}>
          {filtered.map((p) => {
            const s = sel[p.id];
            return (
              <div key={p.id} style={{
                display: "flex", alignItems: "center", gap: 8, padding: "5px 8px", borderRadius: 6,
                background: s ? T.accentDim + "33" : "transparent",
                border: `1px solid ${s ? T.accent + "44" : T.border}`,
              }}>
                <input type="checkbox" checked={!!s} onChange={() => toggle(p.id)} />
                <span style={{ width: 10, height: 10, borderRadius: 2, background: PRODUCT_COLORS[p.color]?.bg, flexShrink: 0 }} />
                <span style={{ flex: 1, fontSize: 12, color: T.text }}>{p.name}</span>
                <span style={{ fontSize: 9, color: T.textDim, fontFamily: FONT }}>D:{p.demand}</span>
                {s && (
                  <label style={{ fontSize: 10, color: T.textMuted, display: "flex", alignItems: "center", gap: 3 }}>
                    <input type="checkbox" checked={s.onSale} onChange={(e) => setSel((o) => ({ ...o, [p.id]: { ...o[p.id], onSale: e.target.checked } }))} />
                    Sale
                  </label>
                )}
              </div>
            );
          })}
        </div>
        <div style={{ display: "flex", gap: 8, marginTop: 16, justifyContent: "flex-end" }}>
          <button style={S.bs} onClick={onClose}>Cancel</button>
          <button style={S.bp} onClick={() => {
            const items = Object.entries(sel)
              .map(([pid, opts]) => ({ product: products.find((p) => p.id === pid), ...opts }))
              .filter((i) => i.product);
            onGenerate(items, cw);
          }} disabled={!Object.keys(sel).length}>Generate</button>
        </div>
      </div>
    </div>
  );
}
