import { useState, useMemo } from "react";
import { T, S, FONT, PRODUCT_COLORS, COOK_TYPES, FISH_TYPES, PRODUCT_LABELS } from "../utils/constants.js";
import ConfirmDialog from "./ConfirmDialog.jsx";

export default function ProductPool({ products, filters, setFilters, onEdit, onDelete }) {
  const [search, setSearch] = useState("");
  const [confirmDel, setConfirmDel] = useState(null);

  const filtered = useMemo(() => {
    let l = [...products];
    if (search) l = l.filter((p) => p.name.toLowerCase().includes(search.toLowerCase()) || (p.plu || "").includes(search));
    if (filters.color) l = l.filter((p) => p.color === filters.color);
    if (filters.cookType) l = l.filter((p) => p.cookType === filters.cookType);
    if (filters.fishType) l = l.filter((p) => p.fishType === filters.fishType);
    if (filters.deepShallow) l = l.filter((p) => p.deepShallow === filters.deepShallow);
    const sk = filters.sort || "name";
    l.sort((a, b) =>
      sk === "name" ? a.name.localeCompare(b.name)
      : sk === "demand" ? b.demand - a.demand
      : sk === "color" ? a.color.localeCompare(b.color)
      : a.fishType.localeCompare(b.fishType)
    );
    return l;
  }, [products, search, filters]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6, flex: 1, minHeight: 0 }}>
      <input style={S.inp} value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name / PLU..." />
      <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
        <select style={S.sel} value={filters.color || ""} onChange={(e) => setFilters((f) => ({ ...f, color: e.target.value || "" }))}>
          <option value="">All Colors</option>
          {Object.entries(PRODUCT_COLORS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
        <select style={S.sel} value={filters.cookType || ""} onChange={(e) => setFilters((f) => ({ ...f, cookType: e.target.value || "" }))}>
          <option value="">All Cook</option>
          {COOK_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
        <select style={S.sel} value={filters.fishType || ""} onChange={(e) => setFilters((f) => ({ ...f, fishType: e.target.value || "" }))}>
          <option value="">All Type</option>
          {FISH_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
      </div>
      <div style={{ display: "flex", gap: 4 }}>
        <select style={S.sel} value={filters.deepShallow || ""} onChange={(e) => setFilters((f) => ({ ...f, deepShallow: e.target.value || "" }))}>
          <option value="">All Depth</option>
          <option value="shallow">Shallow</option>
          <option value="deep">Deep</option>
        </select>
        <select style={S.sel} value={filters.sort || "name"} onChange={(e) => setFilters((f) => ({ ...f, sort: e.target.value }))}>
          <option value="name">Sort: Name</option>
          <option value="demand">Sort: Demand</option>
          <option value="color">Sort: Color</option>
          <option value="type">Sort: Type</option>
        </select>
      </div>
      <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: 2 }}>
        {filtered.map((p) => (
          <div key={p.id} draggable onDragStart={(e) => { e.dataTransfer.setData("productId", p.id); e.dataTransfer.setData("dragType", "product"); }}
            style={{ display: "flex", alignItems: "center", gap: 6, padding: "5px 8px", borderRadius: 5, background: T.surfaceAlt, border: `1px solid ${T.border}`, cursor: "grab", userSelect: "none" }}>
            <span style={{ width: 10, height: 10, borderRadius: 2, background: PRODUCT_COLORS[p.color]?.bg, flexShrink: 0 }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12, color: T.text, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{p.name}</div>
              <div style={{ fontSize: 9, color: T.textDim, fontFamily: FONT }}>
                {p.plu || "—"} · {p.fishType} · {p.cookType} · D:<span style={{ color: p.demand >= 7 ? T.success : p.demand >= 4 ? T.warning : T.danger }}>{p.demand}</span>
              </div>
              {p.preferredPosition && <div style={{ fontSize: 8, color: T.accent, fontFamily: FONT, opacity: 0.7 }}>📍 {p.preferredPosition}</div>}
              {(p.labels || []).length > 0 && (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 2, marginTop: 2 }}>
                  {(p.labels || []).map((key) => {
                    const lbl = PRODUCT_LABELS.find((l) => l.key === key);
                    if (!lbl) return null;
                    return (
                      <span key={key} style={{ fontSize: 8, padding: "1px 4px", borderRadius: 3, fontFamily: FONT, background: lbl.color + "22", color: lbl.color, fontWeight: 600 }}>
                        {lbl.abbr}
                      </span>
                    );
                  })}
                </div>
              )}
            </div>
            <span style={{ fontSize: 7, padding: "1px 4px", borderRadius: 3, fontFamily: FONT, textTransform: "uppercase", background: p.deepShallow === "deep" ? "#3b82f622" : "#f59e0b22", color: p.deepShallow === "deep" ? "#60a5fa" : "#fbbf24" }}>{p.deepShallow}</span>
            <button style={{ ...S.tb, color: T.accent }} onClick={(e) => { e.stopPropagation(); onEdit(p); }}>✎</button>
            <button style={{ ...S.tb, color: T.danger }} onClick={(e) => { e.stopPropagation(); setConfirmDel(p); }}>×</button>
          </div>
        ))}
        {filtered.length === 0 && <div style={{ color: T.textDim, fontSize: 12, padding: 8, textAlign: "center" }}>No products match</div>}
      </div>
      {confirmDel && (
        <ConfirmDialog
          message={`Delete "${confirmDel.name}"? This removes it from all pans. Consider editing instead.`}
          onConfirm={() => { onDelete(confirmDel.id); setConfirmDel(null); }}
          onCancel={() => setConfirmDel(null)}
        />
      )}
    </div>
  );
}
