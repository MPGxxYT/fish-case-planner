import { useState, useMemo } from "react";
import { T, S, DFONT, FONT, DEFAULT_CASE_WIDTH, PRODUCT_COLORS, FISH_TYPES } from "../utils/constants.js";
import { useIsMobile } from "../hooks/useIsMobile.js";
import { isSupabaseConfigured, fetchCaseByCode } from "../lib/supabase.js";
import { estimateTotalWidth } from "../utils/autoGenerate.js";

// ── Available product row ─────────────────────────────────────────────────────

function AvailableRow({ p, onAdd }) {
  const col = PRODUCT_COLORS[p.color];
  return (
    <button
      onClick={() => onAdd(p.id)}
      style={{
        display: "flex", alignItems: "center", gap: 8, padding: "7px 10px",
        borderRadius: 6, border: `1px solid ${T.border}`, background: T.surfaceAlt,
        cursor: "pointer", textAlign: "left", width: "100%", flexShrink: 0,
      }}
    >
      <div style={{ width: 3, alignSelf: "stretch", borderRadius: 2, background: col?.bg ?? "#888", flexShrink: 0 }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: T.text, fontFamily: DFONT, lineHeight: 1.2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{p.name}</div>
        <div style={{ fontSize: 9, color: T.textDim, fontFamily: FONT, marginTop: 1 }}>{p.plu} · D:{p.demand} · {p.fishType}</div>
      </div>
      <span style={{ fontSize: 16, color: T.accent, fontWeight: 700, flexShrink: 0, lineHeight: 1 }}>+</span>
    </button>
  );
}

// ── Selected product row ──────────────────────────────────────────────────────

function SelectedRow({ p, onSale, onToggleSale, onRemove, compact }) {
  const col = PRODUCT_COLORS[p.color];
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 6, padding: compact ? "5px 8px" : "7px 10px",
      borderRadius: 6, border: `1px solid ${onSale ? T.warning + "55" : T.border}`,
      background: onSale ? T.warning + "0a" : T.surfaceAlt, flexShrink: 0,
    }}>
      <div style={{ width: 3, alignSelf: "stretch", borderRadius: 2, background: col?.bg ?? "#888", flexShrink: 0 }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: T.text, fontFamily: DFONT, lineHeight: 1.2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{p.name}</div>
        {!compact && <div style={{ fontSize: 9, color: T.textDim, fontFamily: FONT, marginTop: 1 }}>D:{p.demand}{p.preferredSplit ? ` · ${p.preferredSplit}` : ""}{p.preferredZone ? ` · ${p.preferredZone}` : ""}</div>}
      </div>
      <button
        onClick={onToggleSale}
        title="Toggle on sale"
        style={{
          background: onSale ? T.warning + "22" : T.surfaceAlt, border: `1px solid ${onSale ? T.warning + "55" : T.border}`,
          borderRadius: 4, padding: "2px 6px", cursor: "pointer", fontSize: 9,
          color: onSale ? T.warning : T.textDim, fontFamily: FONT, fontWeight: onSale ? 700 : 400, flexShrink: 0,
        }}
      >⭐ SALE</button>
      <button onClick={onRemove} style={{ background: "none", border: "none", color: T.textDim, fontSize: 16, cursor: "pointer", lineHeight: 1, padding: "0 2px", flexShrink: 0 }}>×</button>
    </div>
  );
}

// ── Width bar ─────────────────────────────────────────────────────────────────

function WidthBar({ estimated, target }) {
  const pct = Math.min((estimated / target) * 100, 100);
  const over = estimated > target;
  const close = !over && estimated > target * 0.88;
  const color = over ? T.danger : close ? T.warning : T.success;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <div style={{ flex: 1, height: 6, borderRadius: 3, background: T.border, overflow: "hidden" }}>
        <div style={{ width: `${pct}%`, height: "100%", background: color, borderRadius: 3, transition: "width 0.2s, background 0.2s" }} />
      </div>
      <span style={{ fontSize: 10, fontFamily: FONT, color, flexShrink: 0, minWidth: 70, textAlign: "right" }}>
        ~{estimated}u / {target}u{over ? " !" : ""}
      </span>
    </div>
  );
}

// ── Main modal ────────────────────────────────────────────────────────────────

export default function AutoGenModal({ products, savedCases = [], onGenerate, onClose }) {
  const { isMobile, isPortrait } = useIsMobile();
  const portrait = isMobile && isPortrait;

  const [sel, setSel] = useState({});
  const [cw, setCw] = useState(DEFAULT_CASE_WIDTH);

  // Available panel filters
  const [search, setSearch] = useState("");
  const [filterColor, setFilterColor] = useState("");
  const [filterFishType, setFilterFishType] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  // Import
  const [showImport, setShowImport] = useState(false);
  const [importCaseIdx, setImportCaseIdx] = useState("");
  const [codeInput, setCodeInput] = useState("");
  const [codeLoading, setCodeLoading] = useState(false);
  const [codeError, setCodeError] = useState(null);

  const selectedIds = useMemo(() => new Set(Object.keys(sel)), [sel]);
  const selected = useMemo(() => products.filter((p) => selectedIds.has(p.id)), [products, selectedIds]);
  const available = useMemo(() => {
    let l = products.filter((p) => !selectedIds.has(p.id));
    const q = search.toLowerCase().trim();
    if (q) l = l.filter((p) => p.name.toLowerCase().includes(q) || (p.plu || "").includes(q));
    if (filterColor) l = l.filter((p) => p.color === filterColor);
    if (filterFishType) l = l.filter((p) => p.fishType === filterFishType);
    return l.sort((a, b) => b.demand - a.demand);
  }, [products, selectedIds, search, filterColor, filterFishType]);

  const estimatedWidth = useMemo(() => estimateTotalWidth(selected, sel), [selected, sel]);
  const activeFilters = [filterColor, filterFishType].filter(Boolean).length;

  const add = (id) => setSel((s) => ({ ...s, [id]: { onSale: false } }));
  const remove = (id) => setSel((s) => { const c = { ...s }; delete c[id]; return c; });
  const toggleSale = (id) => setSel((s) => ({ ...s, [id]: { ...s[id], onSale: !s[id]?.onSale } }));

  const importFromCase = (caseObj) => {
    const ids = new Set();
    for (const pan of caseObj.pans)
      for (const pid of Object.values(pan.slots))
        if (pid) ids.add(pid);
    const newSel = {};
    for (const p of products) if (ids.has(p.id)) newSel[p.id] = { onSale: false };
    setSel(newSel);
    setShowImport(false);
  };

  const handleSavedImport = () => {
    const idx = parseInt(importCaseIdx, 10);
    if (isNaN(idx) || !savedCases[idx]) return;
    importFromCase(savedCases[idx]);
  };

  const handleCodeImport = async () => {
    if (!codeInput.trim()) return;
    setCodeLoading(true);
    setCodeError(null);
    try {
      const result = await fetchCaseByCode(codeInput);
      importFromCase(result);
      setCodeInput("");
    } catch (err) {
      setCodeError(err.message);
    } finally {
      setCodeLoading(false);
    }
  };

  const handleGenerate = () => {
    const items = selected.map((p) => ({ product: p, onSale: sel[p.id]?.onSale ?? false }));
    onGenerate(items, cw);
  };

  // ── Search + filter controls (used in both layouts) ────────────────────────
  const searchControls = (
    <div style={{ display: "flex", flexDirection: "column", gap: 4, flexShrink: 0 }}>
      <div style={{ display: "flex", gap: 4 }}>
        <input
          style={{ ...S.inp, flex: 1, fontSize: 12 }}
          value={search} onChange={(e) => setSearch(e.target.value)}
          placeholder="Search name / PLU..."
        />
        <button
          onClick={() => setShowFilters((v) => !v)}
          style={{ ...S.sel, flexShrink: 0, padding: "4px 8px", cursor: "pointer", fontSize: 11, color: activeFilters > 0 ? T.accent : T.text, border: `1px solid ${activeFilters > 0 ? T.accent + "55" : T.borderLight}`, background: activeFilters > 0 ? T.accentDim + "44" : T.surfaceAlt }}
        >F{activeFilters > 0 ? `(${activeFilters})` : ""} {showFilters ? "▲" : "▼"}</button>
      </div>
      {showFilters && (
        <div style={{ display: "flex", gap: 4 }}>
          <select style={S.sel} value={filterColor} onChange={(e) => setFilterColor(e.target.value)}>
            <option value="">All Colors</option>
            {Object.entries(PRODUCT_COLORS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
          <select style={S.sel} value={filterFishType} onChange={(e) => setFilterFishType(e.target.value)}>
            <option value="">All Types</option>
            {FISH_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
          {activeFilters > 0 && (
            <button onClick={() => { setFilterColor(""); setFilterFishType(""); }} style={{ ...S.sel, flexShrink: 0, cursor: "pointer", color: T.danger, border: `1px solid ${T.danger}44` }}>✕</button>
          )}
        </div>
      )}
    </div>
  );

  // ── Available list ─────────────────────────────────────────────────────────
  const availableList = (
    <div style={{ flex: 1, minHeight: 0, overflowY: "auto", display: "flex", flexDirection: "column", gap: 3, padding: "6px 8px" }}>
      {available.map((p) => <AvailableRow key={p.id} p={p} onAdd={add} />)}
      {available.length === 0 && (
        <div style={{ color: T.textDim, fontSize: 12, textAlign: "center", padding: "20px 0", fontFamily: DFONT }}>
          {selectedIds.size === products.length ? "All products selected" : "No products match"}
        </div>
      )}
    </div>
  );

  // ── Selected list ──────────────────────────────────────────────────────────
  const selectedList = (
    <div style={{ flex: 1, minHeight: 0, overflowY: "auto", display: "flex", flexDirection: "column", gap: 3, padding: "6px 8px" }}>
      {selected.length === 0 && (
        <div style={{ color: T.textDim, fontSize: 12, textAlign: "center", padding: "20px 0", fontFamily: DFONT }}>
          Add products from the left
        </div>
      )}
      {selected.map((p) => (
        <SelectedRow key={p.id} p={p} onSale={sel[p.id]?.onSale ?? false} onToggleSale={() => toggleSale(p.id)} onRemove={() => remove(p.id)} compact={false} />
      ))}
    </div>
  );

  // ── Portrait selected strip (horizontal scroll) ────────────────────────────
  const portraitSelectedStrip = (
    <div style={{ flexShrink: 0, borderBottom: `1px solid ${T.border}`, overflowX: "auto", overflowY: "hidden" }}>
      <div style={{ display: "flex", gap: 5, padding: "6px 10px", minHeight: 58, alignItems: "stretch" }}>
        {selected.length === 0 && (
          <div style={{ display: "flex", alignItems: "center", color: T.textDim, fontSize: 11, fontFamily: DFONT, padding: "0 4px" }}>Select products below</div>
        )}
        {selected.map((p) => {
          const col = PRODUCT_COLORS[p.color];
          const onSale = sel[p.id]?.onSale ?? false;
          return (
            <div
              key={p.id}
              style={{
                flexShrink: 0, width: 90, borderRadius: 7, padding: "5px 7px",
                background: onSale ? T.warning + "12" : T.surfaceAlt,
                border: `1.5px solid ${onSale ? T.warning + "55" : T.border}`,
                display: "flex", flexDirection: "column", gap: 3, position: "relative", overflow: "hidden",
              }}
            >
              <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: col?.bg ?? "#888" }} />
              <div style={{ fontSize: 10, fontWeight: 700, color: T.text, fontFamily: DFONT, lineHeight: 1.2, marginTop: 4, wordBreak: "break-word" }}>{p.name}</div>
              <div style={{ display: "flex", gap: 3, marginTop: "auto" }}>
                <button
                  onClick={() => toggleSale(p.id)}
                  style={{ flex: 1, background: onSale ? T.warning + "22" : T.surfaceAlt, border: `1px solid ${onSale ? T.warning + "55" : T.border}`, borderRadius: 3, padding: "1px 0", cursor: "pointer", fontSize: 8, color: onSale ? T.warning : T.textDim, fontFamily: FONT }}
                >⭐</button>
                <button
                  onClick={() => remove(p.id)}
                  style={{ background: "none", border: `1px solid ${T.border}`, borderRadius: 3, padding: "1px 4px", cursor: "pointer", fontSize: 10, color: T.textDim, lineHeight: 1 }}
                >×</button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );

  // ── Import panel ───────────────────────────────────────────────────────────
  const importPanel = showImport && (
    <div style={{ padding: "8px 12px", borderBottom: `1px solid ${T.border}`, display: "flex", flexDirection: "column", gap: 6, flexShrink: 0, background: T.bg }}>
      {savedCases.length > 0 && (
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          <select
            style={{ ...S.sel, flex: 1, fontSize: 12 }}
            value={importCaseIdx}
            onChange={(e) => setImportCaseIdx(e.target.value)}
          >
            <option value="">From saved case…</option>
            {savedCases.map((c, i) => <option key={i} value={i}>{c.name}</option>)}
          </select>
          <button
            onClick={handleSavedImport}
            disabled={importCaseIdx === ""}
            style={{ ...S.bp, fontSize: 11, padding: "4px 12px", opacity: importCaseIdx === "" ? 0.4 : 1 }}
          >Import</button>
        </div>
      )}
      {isSupabaseConfigured && (
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          <input
            style={{ ...S.inp, flex: 1, fontSize: 12, letterSpacing: 1, textTransform: "uppercase" }}
            value={codeInput}
            onChange={(e) => setCodeInput(e.target.value.toUpperCase().slice(0, 6))}
            placeholder="Share code…"
            onKeyDown={(e) => e.key === "Enter" && handleCodeImport()}
          />
          <button onClick={handleCodeImport} disabled={!codeInput.trim() || codeLoading} style={{ ...S.bp, fontSize: 11, padding: "4px 12px", opacity: !codeInput.trim() ? 0.4 : 1 }}>
            {codeLoading ? "…" : "Load"}
          </button>
          {codeError && <span style={{ fontSize: 10, color: T.danger }}>{codeError}</span>}
        </div>
      )}
    </div>
  );

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 1000, display: "flex", alignItems: portrait ? "stretch" : "center", justifyContent: "center", padding: portrait ? 0 : 16 }} onClick={onClose}>
      <div
        style={{ background: T.surface, borderRadius: portrait ? 0 : 12, border: portrait ? "none" : `1px solid ${T.borderLight}`, width: "100%", maxWidth: portrait ? "100%" : 860, height: portrait ? "100dvh" : "88vh", display: "flex", flexDirection: "column", boxShadow: "0 20px 60px rgba(0,0,0,0.5)", overflow: "hidden" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ padding: portrait ? "8px 12px" : "12px 16px", borderBottom: `1px solid ${T.border}`, display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
          <h2 style={{ margin: 0, fontSize: portrait ? 14 : 16, fontWeight: 800, fontFamily: DFONT, color: T.text }}>Auto Generate</h2>
          <div style={{ flex: 1 }} />
          <label style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: T.textMuted, fontFamily: FONT }}>
            Width
            <input
              type="number" min={1} max={208}
              style={{ ...S.inp, width: 52, fontSize: 12, padding: "4px 6px", textAlign: "center" }}
              value={cw} onChange={(e) => setCw(Math.max(1, +e.target.value))}
            />
            u
          </label>
          <button
            onClick={() => setShowImport((v) => !v)}
            style={{ ...S.bs, fontSize: portrait ? 10 : 12, padding: portrait ? "4px 8px" : "5px 12px", color: showImport ? T.accent : T.textMuted, border: `1px solid ${showImport ? T.accent + "55" : T.border}` }}
          >Import</button>
          <button
            onClick={handleGenerate}
            disabled={selected.length === 0}
            style={{ ...S.bp, fontSize: portrait ? 11 : 13, padding: portrait ? "5px 12px" : "7px 18px", opacity: selected.length === 0 ? 0.4 : 1 }}
          >Generate →</button>
          <button onClick={onClose} style={{ background: "none", border: "none", color: T.textDim, fontSize: 20, cursor: "pointer", lineHeight: 1, padding: "0 4px" }}>×</button>
        </div>

        {/* Width bar */}
        <div style={{ padding: "6px 16px", borderBottom: `1px solid ${T.border}`, flexShrink: 0 }}>
          <WidthBar estimated={estimatedWidth} target={cw} />
        </div>

        {/* Import panel */}
        {importPanel}

        {portrait ? (
          /* ── Portrait: selected strip + available list stacked ── */
          <>
            {portraitSelectedStrip}
            <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column", overflow: "hidden" }}>
              <div style={{ padding: "6px 8px 4px", flexShrink: 0 }}>{searchControls}</div>
              {availableList}
            </div>
          </>
        ) : (
          /* ── Desktop: two panes side by side ── */
          <div style={{ flex: 1, minHeight: 0, display: "flex" }}>
            {/* Left — Available */}
            <div style={{ flex: 1, minWidth: 0, borderRight: `1px solid ${T.border}`, display: "flex", flexDirection: "column" }}>
              <div style={{ padding: "8px 10px", borderBottom: `1px solid ${T.border}`, flexShrink: 0 }}>
                <div style={{ fontSize: 10, color: T.textDim, fontFamily: FONT, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 5 }}>
                  Available ({available.length})
                </div>
                {searchControls}
              </div>
              {availableList}
            </div>

            {/* Right — Selected */}
            <div style={{ width: 300, flexShrink: 0, display: "flex", flexDirection: "column" }}>
              <div style={{ padding: "8px 10px", borderBottom: `1px solid ${T.border}`, flexShrink: 0 }}>
                <div style={{ fontSize: 10, color: T.textDim, fontFamily: FONT, textTransform: "uppercase", letterSpacing: 0.5 }}>
                  Selected ({selected.length})
                </div>
              </div>
              {selectedList}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
