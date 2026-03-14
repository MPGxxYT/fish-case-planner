import { useState, useMemo, useRef, useEffect } from "react";
import { T, S, FONT, DFONT, PRODUCT_COLORS, COOK_TYPES, FISH_TYPES } from "../utils/constants.js";
import { useIsMobile } from "../hooks/useIsMobile.js";

const isWarmGroup = (c) => c === "warm" || c === "red";

function relevanceScore(name, sq) {
  const n = name.toLowerCase();
  if (n === sq) return 0;
  if (n.startsWith(sq)) return 1;
  return 2;
}

export default function SlotPickerModal({ pan, slotIdx, pans, products, onAssign, onClose }) {
  const { isMobile, isPortrait } = useIsMobile();
  const landscape = isMobile && !isPortrait;

  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("smart");
  const [showFilters, setShowFilters] = useState(false);
  const [filterColor, setFilterColor] = useState("");
  const [filterFishType, setFilterFishType] = useState("");
  const searchRef = useRef();

  useEffect(() => { searchRef.current?.focus(); }, []);

  // Products already placed anywhere in the case (excluding the current slot)
  const inTheCase = useMemo(() => {
    const ids = new Set();
    for (const p of pans) {
      Object.entries(p.slots).forEach(([k, v]) => {
        if (v && !(p.id === pan.id && +k === slotIdx)) ids.add(v);
      });
    }
    return ids;
  }, [pans, pan, slotIdx]);

  // Colors of products in adjacent pans
  const adjacentWarmColors = useMemo(() => {
    const panIdx = pans.findIndex((p) => p.id === pan.id);
    const colorSet = new Set();
    [-1, 1].forEach((offset) => {
      const adj = pans[panIdx + offset];
      if (!adj) return;
      Object.values(adj.slots).forEach((pid) => {
        const p = products.find((x) => x.id === pid);
        if (p && isWarmGroup(p.color)) colorSet.add(p.color);
      });
    });
    return colorSet;
  }, [pan, pans, products]);

  const filtered = useMemo(() => {
    const sq = search.toLowerCase().trim();
    let l = [...products];
    if (sq) l = l.filter((p) => p.name.toLowerCase().includes(sq) || (p.plu || "").includes(sq));
    if (filterColor) l = l.filter((p) => p.color === filterColor);
    if (filterFishType) l = l.filter((p) => p.fishType === filterFishType);

    if (sort === "smart") {
      l.sort((a, b) => {
        // 1. Doesn't fit this pan → bottom tier
        const af = a.minPan <= pan.width ? 0 : 1;
        const bf = b.minPan <= pan.width ? 0 : 1;
        if (af !== bf) return af - bf;
        // 2. Already used elsewhere in the case → near bottom
        const ap = inTheCase.has(a.id) ? 1 : 0;
        const bp = inTheCase.has(b.id) ? 1 : 0;
        if (ap !== bp) return ap - bp;
        // 3. Color conflict with adjacent pan → mild downrank
        const ac = isWarmGroup(a.color) && adjacentWarmColors.size > 0 && adjacentWarmColors.has(a.color) ? 1 : 0;
        const bc = isWarmGroup(b.color) && adjacentWarmColors.size > 0 && adjacentWarmColors.has(b.color) ? 1 : 0;
        if (ac !== bc) return ac - bc;
        // 4. Higher demand first
        return b.demand - a.demand;
      });
    } else if (sort === "demand") {
      l.sort((a, b) => b.demand - a.demand);
    } else {
      l.sort((a, b) => a.name.localeCompare(b.name));
    }

    if (sq) {
      l.sort((a, b) => relevanceScore(a.name, sq) - relevanceScore(b.name, sq));
    }

    return l;
  }, [products, search, sort, filterColor, filterFishType, inTheCase, adjacentWarmColors, pan]);

  const activeFilters = [filterColor, filterFishType].filter(Boolean).length;

  // Shared product list used in both layouts
  const productList = (
    <div style={{ flex: 1, minHeight: 0, overflowY: "auto", padding: "6px 8px", display: "flex", flexDirection: "column", gap: 3 }}>
      {filtered.map((p) => {
        const col = PRODUCT_COLORS[p.color];
        const isInCase = inTheCase.has(p.id);
        const hasConflict = isWarmGroup(p.color) && adjacentWarmColors.has(p.color);
        const doesntFit = p.minPan > pan.width;
        return (
          <button
            key={p.id}
            onClick={() => { onAssign(p.id); onClose(); }}
            style={{
              display: "flex", alignItems: "center", gap: 8,
              padding: "7px 10px", borderRadius: 6,
              border: `1px solid ${T.border}`, background: T.surfaceAlt,
              cursor: "pointer", textAlign: "left",
              position: "relative", overflow: "hidden",
              opacity: isInCase || doesntFit ? 0.5 : 1,
              flexShrink: 0,
            }}
          >
            <div style={{ width: 3, alignSelf: "stretch", borderRadius: 2, background: col?.bg ?? "#888", flexShrink: 0 }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: T.text, fontFamily: DFONT, lineHeight: 1.2 }}>{p.name}</div>
              <div style={{ fontSize: 9, color: T.textDim, fontFamily: FONT, marginTop: 1 }}>
                {p.plu || "—"} · D:{p.demand} · {p.fishType}
              </div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 2, flexShrink: 0 }}>
              {doesntFit && <span style={{ fontSize: 9, color: T.textDim, fontFamily: FONT }}>min {p.minPan}u</span>}
              {isInCase && !doesntFit && <span style={{ fontSize: 9, color: T.textDim, fontFamily: FONT }}>In use</span>}
              {hasConflict && !isInCase && !doesntFit && <span style={{ fontSize: 9, color: T.warning, fontFamily: FONT }}>⚠ Color</span>}
              <span style={{
                fontSize: 8, padding: "1px 4px", borderRadius: 2, fontFamily: FONT,
                background: p.deepShallow === "deep" ? "#3b82f622" : "#f59e0b22",
                color: p.deepShallow === "deep" ? "#60a5fa" : "#fbbf24",
              }}>{p.deepShallow === "deep" ? "Deep" : "Shw"}</span>
            </div>
          </button>
        );
      })}
      {filtered.length === 0 && (
        <div style={{ color: T.textDim, fontSize: 12, textAlign: "center", padding: "20px 0", fontFamily: DFONT }}>No products match</div>
      )}
    </div>
  );

  // Shared controls panel (search, filters, sort)
  const controlsPanel = (
    <>
      {/* Search + filter toggle */}
      <div style={{ padding: landscape ? "6px 10px" : "8px 12px", borderBottom: `1px solid ${T.border}`, display: "flex", gap: 6, flexShrink: 0 }}>
        <input
          ref={searchRef}
          style={{ ...S.inp, flex: 1, fontSize: landscape ? 12 : 13 }}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search name or PLU..."
        />
        <button
          onClick={() => setShowFilters((v) => !v)}
          style={{ ...S.sel, flexShrink: 0, padding: "5px 8px", cursor: "pointer", color: activeFilters > 0 ? T.accent : T.text, border: `1px solid ${activeFilters > 0 ? T.accent + "55" : T.borderLight}`, background: activeFilters > 0 ? T.accentDim + "44" : T.surfaceAlt, fontSize: 11 }}
        >
          {activeFilters > 0 ? `F(${activeFilters})` : "Filter"} {showFilters ? "▲" : "▼"}
        </button>
      </div>

      {/* Filter panel */}
      {showFilters && (
        <div style={{ padding: "6px 10px", borderBottom: `1px solid ${T.border}`, display: "flex", gap: 5, flexShrink: 0 }}>
          <select style={{ ...S.sel, fontSize: 11 }} value={filterColor} onChange={(e) => setFilterColor(e.target.value)}>
            <option value="">All Colors</option>
            {Object.entries(PRODUCT_COLORS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
          <select style={{ ...S.sel, fontSize: 11 }} value={filterFishType} onChange={(e) => setFilterFishType(e.target.value)}>
            <option value="">All Types</option>
            {FISH_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
          {activeFilters > 0 && (
            <button onClick={() => { setFilterColor(""); setFilterFishType(""); }} style={{ ...S.sel, flexShrink: 0, cursor: "pointer", color: T.danger, border: `1px solid ${T.danger}44`, fontSize: 11 }}>✕</button>
          )}
        </div>
      )}

      {/* Sort tabs */}
      <div style={{ padding: landscape ? "4px 10px" : "5px 12px", borderBottom: landscape ? "none" : `1px solid ${T.border}`, display: "flex", gap: 4, flexShrink: 0 }}>
        {[["smart", "Smart"], ["demand", "Demand"], ["name", "A–Z"]].map(([k, l]) => (
          <button
            key={k}
            onClick={() => setSort(k)}
            style={{
              flex: 1, padding: "3px 4px", borderRadius: 4, fontSize: 10, fontFamily: FONT, cursor: "pointer",
              border: `1px solid ${sort === k ? T.accent + "66" : T.border}`,
              background: sort === k ? T.accent + "22" : T.surfaceAlt,
              color: sort === k ? T.accent : T.textMuted,
              fontWeight: sort === k ? 700 : 400,
            }}
          >{l}</button>
        ))}
      </div>
    </>
  );

  return (
    <div
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.65)", zIndex: 2000, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}
      onClick={onClose}
    >
      <div
        style={{ background: T.surface, borderRadius: 10, border: `1px solid ${T.borderLight}`, width: "100%", maxWidth: landscape ? 580 : 380, maxHeight: landscape ? "90dvh" : "82vh", display: "flex", flexDirection: "column", boxShadow: "0 20px 60px rgba(0,0,0,0.5)", overflow: "hidden" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ padding: landscape ? "7px 12px" : "11px 14px 9px", borderBottom: `1px solid ${T.border}`, display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: landscape ? 12 : 13, fontWeight: 700, color: T.text, fontFamily: DFONT }}>Pick a Product</div>
            <div style={{ fontSize: 10, color: T.textDim, fontFamily: FONT }}>
              {pan.width}u · {pan.depth}{pan.depth !== "full" ? ` · slot ${slotIdx + 1}` : ""}
            </div>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: T.textDim, fontSize: 20, cursor: "pointer", lineHeight: 1, padding: "0 2px" }}>×</button>
        </div>

        {landscape ? (
          /* ── Landscape: controls left, list right ── */
          <div style={{ flex: 1, minHeight: 0, display: "flex" }}>
            <div style={{ width: 220, flexShrink: 0, borderRight: `1px solid ${T.border}`, display: "flex", flexDirection: "column", overflowY: "auto" }}>
              {controlsPanel}
            </div>
            <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
              {productList}
            </div>
          </div>
        ) : (
          /* ── Portrait / desktop: stacked, wrapper ensures product list scrolls ── */
          <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column", overflow: "hidden" }}>
            {controlsPanel}
            {productList}
          </div>
        )}
      </div>
    </div>
  );
}
