import { useState, useMemo } from "react";
import { T, S, FONT, PRODUCT_COLORS, COOK_TYPES, FISH_TYPES, PRODUCT_LABELS } from "../utils/constants.js";
import ConfirmDialog from "./ConfirmDialog.jsx";

const SORT_LABEL = { name: "Name", demand: "Demand", color: "Color", type: "Type" };

export default function ProductPool({ products, filters, setFilters, onEdit, onDelete, startTouchDrag, isMobile, selectedProductId, onSelectProduct }) {
  const [search, setSearch] = useState("");
  const [confirmDel, setConfirmDel] = useState(null);
  const [showFiltersPanel, setShowFiltersPanel] = useState(false);
  const [showSortPanel, setShowSortPanel] = useState(false);
  const activeFilterCount = [filters.color, filters.cookType, filters.fishType, filters.deepShallow].filter(Boolean).length;

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
      {/* Search + Filter/Sort — inline row */}
      <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
        <input style={{ ...S.inp, flex: "1 1 auto", minWidth: 0, maxWidth: "50%" }} value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name / PLU..." />
        <button
          type="button"
          onClick={() => { setShowFiltersPanel((v) => !v); setShowSortPanel(false); }}
          style={{ ...S.sel, cursor: "pointer", flexShrink: 0, padding: "6px 10px", background: activeFilterCount > 0 ? T.accentDim + "55" : T.surfaceAlt, color: activeFilterCount > 0 ? T.accent : T.text, border: `1px solid ${activeFilterCount > 0 ? T.accent + "66" : T.borderLight}`, textAlign: "center" }}
        >
          {isMobile ? (activeFilterCount > 0 ? `Filter(${activeFilterCount})` : "Filter") : (activeFilterCount > 0 ? `Filters (${activeFilterCount})` : "Filters")} {showFiltersPanel ? "▲" : "▼"}
        </button>
        <button
          type="button"
          onClick={() => { setShowSortPanel((v) => !v); setShowFiltersPanel(false); }}
          style={{ ...S.sel, cursor: "pointer", flexShrink: 0, padding: "6px 10px", color: T.text, border: `1px solid ${T.borderLight}`, textAlign: "center" }}
        >
          {isMobile ? `Sort ${showSortPanel ? "▲" : "▼"}` : `Sort: ${SORT_LABEL[filters.sort || "name"]} ${showSortPanel ? "▲" : "▼"}`}
        </button>
      </div>
      {showFiltersPanel && (
        <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
          <div style={{ display: "flex", gap: 3 }}>
            <select style={S.sel} value={filters.color || ""} onChange={(e) => setFilters((f) => ({ ...f, color: e.target.value || "" }))}>
              <option value="">All Colors</option>
              {Object.entries(PRODUCT_COLORS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
            <select style={S.sel} value={filters.fishType || ""} onChange={(e) => setFilters((f) => ({ ...f, fishType: e.target.value || "" }))}>
              <option value="">All Type</option>
              {FISH_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div style={{ display: "flex", gap: 3 }}>
            <select style={S.sel} value={filters.cookType || ""} onChange={(e) => setFilters((f) => ({ ...f, cookType: e.target.value || "" }))}>
              <option value="">All Cook</option>
              {COOK_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
            <select style={S.sel} value={filters.deepShallow || ""} onChange={(e) => setFilters((f) => ({ ...f, deepShallow: e.target.value || "" }))}>
              <option value="">All Depth</option>
              <option value="shallow">Shallow</option>
              <option value="deep">Deep</option>
            </select>
          </div>
        </div>
      )}
      {showSortPanel && (
        <div style={{ display: "flex", gap: 3 }}>
          {[["name", "Name"], ["demand", "Demand"], ["color", "Color"], ["type", "Type"]].map(([k, l]) => (
            <button
              key={k}
              type="button"
              onClick={() => { setFilters((f) => ({ ...f, sort: k })); setShowSortPanel(false); }}
              style={{
                flex: 1, padding: "4px 2px", borderRadius: 4, fontSize: 10, fontFamily: FONT, cursor: "pointer",
                border: `1px solid ${(filters.sort || "name") === k ? T.accent + "66" : T.border}`,
                background: (filters.sort || "name") === k ? T.accent + "22" : T.surfaceAlt,
                color: (filters.sort || "name") === k ? T.accent : T.text,
                fontWeight: (filters.sort || "name") === k ? 700 : 400,
              }}
            >{l}</button>
          ))}
        </div>
      )}

      {/* Mobile hint */}
      {isMobile && (
        <div style={{ fontSize: 10, color: T.textDim, fontFamily: FONT, textAlign: "center", lineHeight: 1.4 }}>
          Tap card to select · drag ⠿ to insert new pan
        </div>
      )}

      <div style={{
        flex: 1,
        overflowY: "auto",
        display: "grid",
        gridTemplateColumns: isMobile ? "repeat(4, 1fr)" : "repeat(auto-fill, minmax(180px, 1fr))",
        gap: 4,
        alignContent: "start",
      }}>
        {filtered.map((p) => {
          const isSelected = selectedProductId === p.id;
          const color = PRODUCT_COLORS[p.color];

          if (isMobile) {
            // Compact card for mobile
            return (
              <div
                key={p.id}
                data-pool-item
                draggable
                onDragStart={(e) => { e.dataTransfer.setData("productId", p.id); e.dataTransfer.setData("dragType", "product"); }}
                onClick={() => onSelectProduct?.(p.id)}
                style={{
                  display: "flex", flexDirection: "column", gap: 3,
                  padding: "6px 5px",
                  borderRadius: 6,
                  background: isSelected ? T.accent + "22" : T.surfaceAlt,
                  border: `1.5px solid ${isSelected ? T.accent : T.border}`,
                  cursor: "pointer",
                  userSelect: "none",
                  position: "relative",
                  minHeight: 64,
                }}
              >
                {/* Color bar on left */}
                <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 3, borderRadius: "6px 0 0 6px", background: color?.bg ?? "#888" }} />
                {/* Top row: name */}
                <div style={{ paddingLeft: 6, paddingRight: 6 }}>
                  <div style={{
                    fontSize: 11, fontWeight: 700, color: isSelected ? T.accent : T.text,
                    lineHeight: 1.25, wordBreak: "break-word",
                  }}>
                    {p.name}
                  </div>
                </div>
                {/* Bottom row: edit + demand + deep/shallow + grip handle */}
                <div style={{ display: "flex", alignItems: "center", gap: 3, paddingLeft: 2, marginTop: "auto" }}>
                  <button
                    onClick={(e) => { e.stopPropagation(); onEdit(p); }}
                    style={{
                      background: "none", border: "none", color: T.accent,
                      fontSize: 13, cursor: "pointer", lineHeight: 1, opacity: 0.7,
                      width: 22, height: 22, flexShrink: 0,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      padding: 0,
                    }}
                    title="Edit product"
                  >✎</button>
                  <span style={{
                    fontSize: 9, fontFamily: FONT, fontWeight: 700,
                    color: p.demand >= 7 ? T.success : p.demand >= 4 ? T.warning : T.danger,
                  }}>D:{p.demand}</span>
                  <span style={{
                    fontSize: 8, padding: "1px 3px", borderRadius: 2, fontFamily: FONT, textTransform: "uppercase",
                    background: p.deepShallow === "deep" ? "#3b82f622" : "#f59e0b22",
                    color: p.deepShallow === "deep" ? "#60a5fa" : "#fbbf24",
                  }}>{p.deepShallow === "deep" ? "D" : "S"}</span>
                  <div style={{ flex: 1 }} />
                  {/* Grip handle — touchAction none here only, so scrolling works on the rest of the card */}
                  <span
                    onTouchStart={(e) => { e.stopPropagation(); startTouchDrag(e, { type: "product", productId: p.id }, e.currentTarget.closest("[data-pool-item]")); }}
                    style={{ fontSize: 13, color: T.textDim, cursor: "grab", padding: "2px 3px", touchAction: "none", lineHeight: 1 }}
                    title="Drag to insert new pan"
                  >⠿</span>
                </div>
                {/* Selected checkmark */}
                {isSelected && (
                  <div style={{ position: "absolute", bottom: 3, right: 3, width: 14, height: 14, borderRadius: "50%", background: T.accent, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <span style={{ fontSize: 9, color: T.bg, fontWeight: 900, lineHeight: 1 }}>✓</span>
                  </div>
                )}
              </div>
            );
          }

          // Desktop: grid card
          return (
            <div key={p.id} data-pool-item draggable
              onDragStart={(e) => { e.dataTransfer.setData("productId", p.id); e.dataTransfer.setData("dragType", "product"); }}
              style={{
                display: "flex", flexDirection: "column",
                padding: "7px 8px 6px", borderRadius: 6,
                background: T.surfaceAlt, border: `1px solid ${T.border}`,
                cursor: "grab", userSelect: "none", position: "relative",
                minHeight: 52, overflow: "hidden",
              }}>
              {/* Color bar */}
              <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 3, borderRadius: "6px 0 0 6px", background: color?.bg ?? "#888" }} />
              <div style={{ paddingLeft: 6, flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: T.text, lineHeight: 1.25, wordBreak: "break-word" }}>{p.name}</div>
                <div style={{ fontSize: 9, color: T.textDim, fontFamily: FONT, marginTop: 1 }}>
                  {p.plu || "—"} · {p.fishType} · D:<span style={{ color: p.demand >= 7 ? T.success : p.demand >= 4 ? T.warning : T.danger }}>{p.demand}</span>
                </div>
                {(p.labels || []).length > 0 && (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 2, marginTop: 2 }}>
                    {(p.labels || []).map((key) => {
                      const lbl = PRODUCT_LABELS.find((l) => l.key === key);
                      if (!lbl) return null;
                      return <span key={key} style={{ fontSize: 7, padding: "1px 3px", borderRadius: 3, fontFamily: FONT, background: lbl.color + "22", color: lbl.color, fontWeight: 600 }}>{lbl.abbr}</span>;
                    })}
                  </div>
                )}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 4, paddingLeft: 4, marginTop: 4 }}>
                <span style={{
                  fontSize: 8, padding: "1px 4px", borderRadius: 2, fontFamily: FONT, textTransform: "uppercase", flexShrink: 0,
                  background: p.deepShallow === "deep" ? "#3b82f622" : "#f59e0b22",
                  color: p.deepShallow === "deep" ? "#60a5fa" : "#fbbf24",
                }}>{p.deepShallow === "deep" ? "Deep" : "Shallow"}</span>
                <div style={{ flex: 1 }} />
                <button
                  onClick={(e) => { e.stopPropagation(); onEdit(p); }}
                  style={{ background: "none", border: "none", cursor: "pointer", color: T.accent, fontSize: 13, lineHeight: 1, padding: "2px 4px", flexShrink: 0 }}
                >✎</button>
                <button
                  onClick={(e) => { e.stopPropagation(); setConfirmDel(p); }}
                  style={{ background: "none", border: "none", cursor: "pointer", color: T.danger, fontSize: 13, lineHeight: 1, padding: "2px 4px", flexShrink: 0 }}
                >×</button>
              </div>
            </div>
          );
        })}
        {filtered.length === 0 && <div style={{ color: T.textDim, fontSize: 12, padding: 8, textAlign: "center", gridColumn: "1/-1" }}>No products match</div>}
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
