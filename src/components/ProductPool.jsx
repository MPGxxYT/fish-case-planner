import { useState, useMemo } from "react";
import { T, S, FONT, PRODUCT_COLORS, COOK_TYPES, FISH_TYPES, PRODUCT_LABELS } from "../utils/constants.js";

const SORT_LABEL = { name: "Name", demand: "Demand", color: "Color", type: "Type", next: "Next Pick" };

export default function ProductPool({ products, filters, setFilters, startTouchDrag, isMobile, selectedProductId, onSelectProduct, productsInCase = new Set() }) {
  const [search, setSearch] = useState("");
  const [showFiltersPanel, setShowFiltersPanel] = useState(false);
  const [showSortPanel, setShowSortPanel] = useState(false);
  const activeFilterCount = [filters.color, filters.cookType, filters.fishType, filters.deepShallow].filter(Boolean).length + (filters.hideInCase ? 1 : 0);

  const filtered = useMemo(() => {
    let l = [...products];
    if (search) l = l.filter((p) => p.name.toLowerCase().includes(search.toLowerCase()) || (p.plu || "").includes(search));
    if (filters.color) l = l.filter((p) => p.color === filters.color);
    if (filters.cookType) l = l.filter((p) => p.cookType === filters.cookType);
    if (filters.fishType) l = l.filter((p) => p.fishType === filters.fishType);
    if (filters.deepShallow) l = l.filter((p) => p.deepShallow === filters.deepShallow);
    if (filters.hideInCase) l = l.filter((p) => !productsInCase.has(p.id));
    const sk = filters.sort || "name";
    l.sort((a, b) => {
      if (sk === "next") {
        // Products not yet in the case, highest demand first — those are the
        // most likely candidates for the next slot. Already-placed products
        // sink to the bottom (still ranked by demand among themselves).
        const aIn = productsInCase.has(a.id) ? 1 : 0;
        const bIn = productsInCase.has(b.id) ? 1 : 0;
        if (aIn !== bIn) return aIn - bIn;
        return b.demand - a.demand;
      }
      return sk === "name" ? a.name.localeCompare(b.name)
        : sk === "demand" ? b.demand - a.demand
        : sk === "color" ? a.color.localeCompare(b.color)
        : a.fishType.localeCompare(b.fishType);
    });
    // When searching, promote exact and prefix matches above substring matches
    if (search) {
      const sq = search.toLowerCase();
      l.sort((a, b) => {
        const scoreA = a.name.toLowerCase() === sq ? 0 : a.name.toLowerCase().startsWith(sq) ? 1 : 2;
        const scoreB = b.name.toLowerCase() === sq ? 0 : b.name.toLowerCase().startsWith(sq) ? 1 : 2;
        return scoreA - scoreB;
      });
    }
    return l;
  }, [products, search, filters, productsInCase]);

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
          <button
            type="button"
            onClick={() => setFilters((f) => ({ ...f, hideInCase: !f.hideInCase }))}
            style={{
              display: "flex", alignItems: "center", gap: 6, padding: "5px 8px", borderRadius: 4, fontSize: 10, fontFamily: FONT, cursor: "pointer", textAlign: "left",
              border: `1px solid ${filters.hideInCase ? T.accent + "66" : T.border}`,
              background: filters.hideInCase ? T.accent + "22" : T.surfaceAlt,
              color: filters.hideInCase ? T.accent : T.text,
            }}
          >
            <span>{filters.hideInCase ? "☑" : "☐"}</span>
            Hide products already in the case
          </button>
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
        <div style={{ display: "flex", flexWrap: "wrap", gap: 3 }}>
          {[["name", "Name"], ["demand", "Demand"], ["next", "Next Pick"], ["color", "Color"], ["type", "Type"]].map(([k, l]) => (
            <button
              key={k}
              type="button"
              onClick={() => { setFilters((f) => ({ ...f, sort: k })); setShowSortPanel(false); }}
              style={{
                flex: "1 1 30%", minWidth: 70, padding: "4px 2px", borderRadius: 4, fontSize: 10, fontFamily: FONT, cursor: "pointer",
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
        gridTemplateColumns: isMobile ? "repeat(4, 1fr)" : "repeat(auto-fill, minmax(160px, 1fr))",
        gap: 4,
        alignContent: "start",
      }}>
        {filtered.map((p) => {
          const isSelected = selectedProductId === p.id;
          const color = PRODUCT_COLORS[p.color];

          if (isMobile) {
            return (
              <div
                key={p.id}
                data-pool-item
                draggable
                onDragStart={(e) => { e.dataTransfer.setData("productId", p.id); e.dataTransfer.setData("dragType", "product"); }}
                onClick={() => onSelectProduct?.(p.id)}
                style={{
                  display: "flex", flexDirection: "column", gap: 3,
                  padding: "6px 5px", borderRadius: 6,
                  background: isSelected ? T.accent + "22" : T.surfaceAlt,
                  border: `1.5px solid ${isSelected ? T.accent : T.border}`,
                  cursor: "pointer", userSelect: "none", position: "relative", minHeight: 56,
                }}
              >
                <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 3, borderRadius: "6px 0 0 6px", background: color?.bg ?? "#888" }} />
                <div style={{ paddingLeft: 6, paddingRight: 6 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: isSelected ? T.accent : T.text, lineHeight: 1.25, wordBreak: "break-word" }}>
                    {p.name}
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 3, paddingLeft: 6, marginTop: "auto" }}>
                  <span style={{ fontSize: 9, fontFamily: FONT, fontWeight: 700, color: p.demand >= 7 ? T.success : p.demand >= 4 ? T.warning : T.danger }}>D:{p.demand}</span>
                  <span style={{
                    fontSize: 8, padding: "1px 3px", borderRadius: 2, fontFamily: FONT, textTransform: "uppercase",
                    background: p.deepShallow === "deep" ? "#3b82f622" : "#f59e0b22",
                    color: p.deepShallow === "deep" ? "#60a5fa" : "#fbbf24",
                  }}>{p.deepShallow === "deep" ? "D" : "S"}</span>
                  <div style={{ flex: 1 }} />
                  <span
                    onTouchStart={(e) => { e.stopPropagation(); startTouchDrag(e, { type: "product", productId: p.id }, e.currentTarget.closest("[data-pool-item]")); }}
                    style={{ fontSize: 13, color: T.textDim, cursor: "grab", padding: "2px 3px", touchAction: "none", lineHeight: 1 }}
                    title="Drag to insert new pan"
                  >⠿</span>
                </div>
                {isSelected && (
                  <div style={{ position: "absolute", bottom: 3, right: 3, width: 14, height: 14, borderRadius: "50%", background: T.accent, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <span style={{ fontSize: 9, color: T.bg, fontWeight: 900, lineHeight: 1 }}>✓</span>
                  </div>
                )}
              </div>
            );
          }

          // Desktop card
          return (
            <div key={p.id} data-pool-item draggable
              onDragStart={(e) => { e.dataTransfer.setData("productId", p.id); e.dataTransfer.setData("dragType", "product"); }}
              style={{
                display: "flex", flexDirection: "column",
                padding: "7px 8px 7px", borderRadius: 6,
                background: T.surfaceAlt, border: `1px solid ${T.border}`,
                cursor: "grab", userSelect: "none", position: "relative",
                minHeight: 48, overflow: "hidden",
              }}>
              <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 3, borderRadius: "6px 0 0 6px", background: color?.bg ?? "#888" }} />
              <div style={{ paddingLeft: 6, flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: T.text, lineHeight: 1.25, wordBreak: "break-word" }}>{p.name}</div>
                <div style={{ fontSize: 9, color: T.textDim, fontFamily: FONT, marginTop: 1 }}>
                  {p.plu} · {p.fishType} · D:<span style={{ color: p.demand >= 7 ? T.success : p.demand >= 4 ? T.warning : T.danger }}>{p.demand}</span>
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
                <div style={{ marginTop: 4 }}>
                  <span style={{
                    fontSize: 8, padding: "1px 4px", borderRadius: 2, fontFamily: FONT, textTransform: "uppercase",
                    background: p.deepShallow === "deep" ? "#3b82f622" : "#f59e0b22",
                    color: p.deepShallow === "deep" ? "#60a5fa" : "#fbbf24",
                  }}>{p.deepShallow === "deep" ? "Deep" : "Shallow"}</span>
                </div>
              </div>
            </div>
          );
        })}
        {filtered.length === 0 && <div style={{ color: T.textDim, fontSize: 12, padding: 8, textAlign: "center", gridColumn: "1/-1" }}>No products match</div>}
      </div>
    </div>
  );
}
