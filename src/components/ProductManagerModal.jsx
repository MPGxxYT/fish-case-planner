import { useState, useMemo, useCallback } from "react";
import { T, S, FONT, DFONT, PRODUCT_COLORS, COOK_TYPES, FISH_TYPES, PAN_WIDTHS, PRODUCT_LABELS, POSITION_ZONES, PREFERRED_SPLITS } from "../utils/constants.js";
import { uid, toProperCase } from "../utils/helpers.js";
import { useIsMobile } from "../hooks/useIsMobile.js";
import ConfirmDialog from "./ConfirmDialog.jsx";

function blankProduct() {
  return { id: uid(), name: "", plu: "", color: "cool", cookType: "Unassigned", fishType: "Unassigned", maxPan: 8, minPan: 3, deepShallow: "shallow", demand: 5, preferredZone: "", preferredSplit: "", labels: [] };
}

const COMPARE_FIELDS = ["name", "plu", "color", "cookType", "fishType", "maxPan", "minPan", "deepShallow", "demand", "preferredZone", "preferredSplit"];

function Editor({ form, setForm, original, onSave, onCancel, onDelete, isNew, compact }) {
  const s = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const canSave = form.name.trim() && form.plu;
  const isDirty = useMemo(() => {
    if (isNew || !original) return false;
    return COMPARE_FIELDS.some((k) => form[k] !== original[k]) ||
      JSON.stringify([...(form.labels || [])].sort()) !== JSON.stringify([...(original.labels || [])].sort());
  }, [form, original, isNew]);

  const pad = compact ? "8px 10px" : "14px 16px";
  const gap = compact ? 7 : 11;
  const inp = compact ? { ...S.inp, fontSize: 12, padding: "4px 8px" } : S.inp;
  const sel = compact ? { ...S.inp, fontSize: 12, padding: "4px 6px" } : S.inp;
  const lbl = compact ? { ...S.fl, fontSize: 9 } : S.fl;
  const row = { display: "flex", gap: compact ? 7 : 10 };
  const half = { ...lbl, flex: 1 };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", gap: 0 }}>
      <div style={{ flex: 1, overflowY: "auto", padding: pad, display: "flex", flexDirection: "column", gap }}>

        {/* Name + PLU */}
        <div style={row}>
          <label style={{ ...lbl, flex: 2 }}>
            Name
            <input style={inp} value={form.name} onChange={(e) => s("name", e.target.value)} placeholder="e.g. Atlantic Fillet" autoFocus={isNew} />
          </label>
          <label style={{ ...lbl, flex: 1 }}>
            PLU
            <input
              style={{ ...inp, borderColor: form.plu ? T.border : T.danger + "88" }}
              value={form.plu}
              onChange={(e) => s("plu", e.target.value.replace(/\D/g, "").slice(0, 5))}
              placeholder="5 digits"
            />
          </label>
        </div>

        {/* Color */}
        <div style={lbl}>
          Color
          <div style={{ display: "flex", gap: compact ? 4 : 6, marginTop: 2 }}>
            {Object.entries(PRODUCT_COLORS).map(([k, v]) => (
              <button key={k} onClick={() => s("color", k)} style={{
                flex: 1, height: compact ? 24 : 28, borderRadius: 5, border: "none", cursor: "pointer", background: v.bg,
                outline: form.color === k ? `2px solid ${T.accent}` : "2px solid transparent", outlineOffset: 2,
                fontSize: compact ? 9 : 10, color: k === "cool" ? "#333" : "#fff", fontWeight: 600,
              }}>{v.label}</button>
            ))}
          </div>
        </div>

        {/* Cook + Fish type */}
        <div style={row}>
          <label style={half}>
            Cook
            <select style={sel} value={form.cookType} onChange={(e) => s("cookType", e.target.value)}>
              {COOK_TYPES.map((t) => <option key={t}>{t}</option>)}
            </select>
          </label>
          <label style={half}>
            Fish Type
            <select style={sel} value={form.fishType} onChange={(e) => s("fishType", e.target.value)}>
              {FISH_TYPES.map((t) => <option key={t}>{t}</option>)}
            </select>
          </label>
        </div>

        {/* Pan sizes + depth + demand — all four in one row on mobile */}
        {compact ? (
          <div style={row}>
            <label style={half}>
              Min
              <select style={sel} value={form.minPan} onChange={(e) => s("minPan", +e.target.value)}>
                {PAN_WIDTHS.map((w) => <option key={w} value={w}>{w}</option>)}
              </select>
            </label>
            <label style={half}>
              Max
              <select style={sel} value={form.maxPan} onChange={(e) => s("maxPan", +e.target.value)}>
                {PAN_WIDTHS.map((w) => <option key={w} value={w}>{w}</option>)}
              </select>
            </label>
            <label style={half}>
              Depth
              <select style={sel} value={form.deepShallow} onChange={(e) => s("deepShallow", e.target.value)}>
                <option value="shallow">Shw</option>
                <option value="deep">Deep</option>
              </select>
            </label>
            <label style={half}>
              Demand
              <select style={sel} value={form.demand} onChange={(e) => s("demand", +e.target.value)}>
                {[1,2,3,4,5,6,7,8,9,10].map((n) => <option key={n} value={n}>{n}</option>)}
              </select>
            </label>
          </div>
        ) : (
          <>
            <div style={row}>
              <label style={half}>
                Min Pan
                <select style={sel} value={form.minPan} onChange={(e) => s("minPan", +e.target.value)}>
                  {PAN_WIDTHS.map((w) => <option key={w} value={w}>{w}</option>)}
                </select>
              </label>
              <label style={half}>
                Max Pan
                <select style={sel} value={form.maxPan} onChange={(e) => s("maxPan", +e.target.value)}>
                  {PAN_WIDTHS.map((w) => <option key={w} value={w}>{w}</option>)}
                </select>
              </label>
            </div>
            <div style={row}>
              <label style={half}>
                Pan Depth
                <select style={sel} value={form.deepShallow} onChange={(e) => s("deepShallow", e.target.value)}>
                  <option value="shallow">Shallow</option>
                  <option value="deep">Deep</option>
                </select>
              </label>
              <label style={half}>
                Demand (1–10)
                <select style={sel} value={form.demand} onChange={(e) => s("demand", +e.target.value)}>
                  {[1,2,3,4,5,6,7,8,9,10].map((n) => (
                    <option key={n} value={n}>{n}{n <= 3 ? " — Low" : n <= 6 ? " — Med" : " — High"}</option>
                  ))}
                </select>
              </label>
            </div>
          </>
        )}

        {/* Labels */}
        <div style={lbl}>
          Labels
          <div style={{ display: "flex", flexWrap: "wrap", gap: compact ? 3 : 4, marginTop: 2 }}>
            {PRODUCT_LABELS.map((l) => {
              const active = (form.labels || []).includes(l.key);
              return (
                <button key={l.key} onClick={() => {
                  const cur = form.labels || [];
                  s("labels", active ? cur.filter((k) => k !== l.key) : [...cur, l.key]);
                }} style={{
                  padding: compact ? "2px 6px" : "3px 8px", borderRadius: 4,
                  border: `1px solid ${active ? l.color + "88" : T.border}`,
                  cursor: "pointer", fontSize: compact ? 9 : 10, fontFamily: FONT, fontWeight: active ? 700 : 400,
                  background: active ? l.color + "22" : T.surfaceAlt, color: active ? l.color : T.textDim,
                }}>{compact ? l.abbr : l.label}</button>
              );
            })}
          </div>
        </div>

        {/* Zone */}
        <div style={lbl}>
          Zone <span style={{ color: T.textDim, textTransform: "none", fontSize: 9 }}>(optional)</span>
          <div style={{ display: "flex", gap: compact ? 3 : 4, marginTop: 2 }}>
            {POSITION_ZONES.map(({ key, label }) => (
              <button key={key} onClick={() => s("preferredZone", form.preferredZone === key ? "" : key)} style={{
                flex: 1, padding: compact ? "3px 2px" : "4px 4px", borderRadius: 4,
                border: `1px solid ${form.preferredZone === key ? T.accent + "88" : T.border}`,
                background: form.preferredZone === key ? T.accent + "22" : T.surfaceAlt,
                color: form.preferredZone === key ? T.accent : T.textMuted,
                cursor: "pointer", fontSize: compact ? 8 : 9, fontFamily: FONT, fontWeight: form.preferredZone === key ? 700 : 400,
              }}>{label}</button>
            ))}
          </div>
          {/* Case diagram */}
          <div style={{ marginTop: 5, borderRadius: 4, overflow: "hidden", border: `1px solid ${T.border}` }}>
            {/* Zone segments */}
            <div style={{ display: "flex", height: compact ? 14 : 18 }}>
              {POSITION_ZONES.map(({ key }, i) => {
                const active = form.preferredZone === key;
                return (
                  <div
                    key={key}
                    onClick={() => s("preferredZone", form.preferredZone === key ? "" : key)}
                    style={{
                      flex: 1, cursor: "pointer",
                      background: active ? T.accent + "44" : T.surfaceAlt,
                      borderRight: i < POSITION_ZONES.length - 1 ? `1px solid ${T.border}` : "none",
                      transition: "background 0.15s",
                      display: "flex", alignItems: "center", justifyContent: "center",
                    }}
                  >
                    {active && <div style={{ width: compact ? 10 : 14, height: compact ? 4 : 6, borderRadius: 2, background: T.accent, opacity: 0.9 }} />}
                  </div>
                );
              })}
            </div>
            {/* Labels */}
            <div style={{ display: "flex", borderTop: `1px solid ${T.border}`, background: T.bg }}>
              <div style={{ flex: 1, fontSize: 7, color: T.textDim, fontFamily: FONT, textAlign: "center", padding: "1px 0" }}>◄ Left</div>
              <div style={{ flex: 1 }} />
              <div style={{ flex: 1, fontSize: 7, color: T.textDim, fontFamily: FONT, textAlign: "center", padding: "1px 0" }}>Center</div>
              <div style={{ flex: 1 }} />
              <div style={{ flex: 1, fontSize: 7, color: T.textDim, fontFamily: FONT, textAlign: "center", padding: "1px 0" }}>Right ►</div>
            </div>
          </div>
        </div>

        {/* Preferred Split */}
        <div style={lbl}>
          Preferred Split
          <div style={{ display: "flex", gap: compact ? 3 : 4, marginTop: 2 }}>
            {PREFERRED_SPLITS.map(({ key, label }) => (
              <button key={key} onClick={() => s("preferredSplit", key)} style={{
                flex: 1, padding: compact ? "3px 2px" : "4px 4px", borderRadius: 4,
                border: `1px solid ${form.preferredSplit === key ? T.accent + "88" : T.border}`,
                background: form.preferredSplit === key ? T.accent + "22" : T.surfaceAlt,
                color: form.preferredSplit === key ? T.accent : T.textMuted,
                cursor: "pointer", fontSize: compact ? 9 : 10, fontFamily: FONT, fontWeight: form.preferredSplit === key ? 700 : 400,
              }}>{label}</button>
            ))}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div style={{ padding: compact ? "7px 10px" : "10px 16px", borderTop: `1px solid ${T.border}`, display: "flex", gap: 8, flexShrink: 0, alignItems: "center" }}>
        {!isNew && (
          <button style={{ ...S.bs, fontSize: compact ? 11 : 13, padding: compact ? "4px 10px" : "7px 16px", color: T.danger, border: `1px solid ${T.danger}44` }} onClick={onDelete}>Delete</button>
        )}
        <div style={{ flex: 1 }} />
        {isNew ? (
          <button style={{ ...S.bp, fontSize: compact ? 11 : 13, padding: compact ? "4px 12px" : "7px 16px", opacity: canSave ? 1 : 0.4 }}
            disabled={!canSave} onClick={() => canSave && onSave({ ...form, name: toProperCase(form.name.trim()) })}>
            Add Product
          </button>
        ) : isDirty ? (
          <>
            <button style={{ ...S.bs, fontSize: compact ? 11 : 13, padding: compact ? "4px 10px" : "7px 16px" }} onClick={onCancel}>Cancel</button>
            <button style={{ ...S.bp, fontSize: compact ? 11 : 13, padding: compact ? "4px 12px" : "7px 16px" }}
              onClick={() => onSave({ ...form, name: toProperCase(form.name.trim()) })}>
              Save Changes
            </button>
          </>
        ) : null}
      </div>
    </div>
  );
}

export default function ProductManagerModal({ products, onSave, onDelete, onClose }) {
  const { isMobile, isPortrait } = useIsMobile();
  const portrait = isMobile && isPortrait;

  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("name");
  const [filterColor, setFilterColor] = useState("");
  const [filterFishType, setFilterFishType] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [showSort, setShowSort] = useState(false);
  const [selectedId, setSelectedId] = useState(null);
  const [form, setForm] = useState(null);
  const [original, setOriginal] = useState(null);
  const [isNew, setIsNew] = useState(false);
  const [confirmDel, setConfirmDel] = useState(false);

  const activeFilters = [filterColor, filterFishType].filter(Boolean).length;

  const filtered = useMemo(() => {
    let l = [...products];
    if (search) {
      const sq = search.toLowerCase();
      l = l.filter((p) => p.name.toLowerCase().includes(sq) || (p.plu || "").includes(search));
      l.sort((a, b) => {
        const as_ = a.name.toLowerCase() === sq ? 0 : a.name.toLowerCase().startsWith(sq) ? 1 : 2;
        const bs_ = b.name.toLowerCase() === sq ? 0 : b.name.toLowerCase().startsWith(sq) ? 1 : 2;
        return as_ - bs_;
      });
    }
    if (filterColor) l = l.filter((p) => p.color === filterColor);
    if (filterFishType) l = l.filter((p) => p.fishType === filterFishType);
    if (!search) {
      l.sort((a, b) =>
        sort === "name" ? a.name.localeCompare(b.name)
        : sort === "demand" ? b.demand - a.demand
        : sort === "color" ? a.color.localeCompare(b.color)
        : a.fishType.localeCompare(b.fishType)
      );
    }
    return l;
  }, [products, search, sort, filterColor, filterFishType]);

  const selectProduct = useCallback((p) => {
    setSelectedId(p.id);
    setForm({ ...p });
    setOriginal({ ...p });
    setIsNew(false);
  }, []);

  const startNew = useCallback(() => {
    const blank = blankProduct();
    setSelectedId(blank.id);
    setForm(blank);
    setOriginal(null);
    setIsNew(true);
  }, []);

  const handleSave = (prod) => {
    onSave(prod);
    if (isNew) {
      startNew();
    } else {
      setOriginal({ ...prod });
      setForm({ ...prod });
    }
  };

  const handleCancel = () => { if (original) setForm({ ...original }); };
  const handleDelete = () => { if (!selectedId || isNew) return; setConfirmDel(true); };
  const confirmDeleteAction = () => {
    onDelete(selectedId);
    setSelectedId(null); setForm(null); setIsNew(false); setConfirmDel(false);
  };

  // ── Shared: search + filter/sort controls ──────────────────────────────────
  const searchBar = (
    <div style={{ display: "flex", flexDirection: "column", gap: 4, flexShrink: 0 }}>
      <div style={{ display: "flex", gap: 4 }}>
        <input
          style={{ ...S.inp, flex: 1, fontSize: 12 }}
          value={search} onChange={(e) => setSearch(e.target.value)}
          placeholder="Search name / PLU..."
        />
        <button
          style={{ ...S.sel, flexShrink: 0, padding: "4px 8px", cursor: "pointer", color: activeFilters > 0 ? T.accent : T.text, border: `1px solid ${activeFilters > 0 ? T.accent + "55" : T.borderLight}`, background: activeFilters > 0 ? T.accentDim + "44" : T.surfaceAlt }}
          onClick={() => { setShowFilters((v) => !v); setShowSort(false); }}
        >F{activeFilters > 0 ? `(${activeFilters})` : ""} {showFilters ? "▲" : "▼"}</button>
        <button
          style={{ ...S.sel, flexShrink: 0, padding: "4px 8px", cursor: "pointer", border: `1px solid ${T.borderLight}` }}
          onClick={() => { setShowSort((v) => !v); setShowFilters(false); }}
        >S {showSort ? "▲" : "▼"}</button>
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
            <button onClick={() => { setFilterColor(""); setFilterFishType(""); }} style={{ ...S.sel, cursor: "pointer", color: T.danger, border: `1px solid ${T.danger}44` }}>✕</button>
          )}
        </div>
      )}
      {showSort && (
        <div style={{ display: "flex", gap: 3 }}>
          {[["name", "Name"], ["demand", "Demand"], ["color", "Color"], ["type", "Type"]].map(([k, l]) => (
            <button key={k} onClick={() => { setSort(k); setShowSort(false); }} style={{
              flex: 1, padding: "3px 2px", borderRadius: 4, fontSize: 9, fontFamily: FONT, cursor: "pointer",
              border: `1px solid ${sort === k ? T.accent + "66" : T.border}`,
              background: sort === k ? T.accent + "22" : T.surfaceAlt,
              color: sort === k ? T.accent : T.textMuted, fontWeight: sort === k ? 700 : 400,
            }}>{l}</button>
          ))}
        </div>
      )}
    </div>
  );

  const editorOrEmpty = form ? (
    <Editor
      form={form} setForm={setForm} original={original}
      onSave={handleSave} onCancel={handleCancel} onDelete={handleDelete}
      isNew={isNew} compact={isMobile}
    />
  ) : (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8, color: T.textDim }}>
      <span style={{ fontSize: portrait ? 22 : 32, opacity: 0.3 }}>✎</span>
      <span style={{ fontSize: portrait ? 12 : 13, fontFamily: DFONT }}>Select a product to edit</span>
      {!portrait && <span style={{ fontSize: 11, fontFamily: FONT }}>or create a new one</span>}
    </div>
  );

  return (
    <div
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 1000, display: "flex", alignItems: portrait ? "stretch" : "center", justifyContent: portrait ? "stretch" : "center", padding: portrait ? 0 : 16 }}
      onClick={onClose}
    >
      <div
        style={{ background: T.surface, borderRadius: portrait ? 0 : 12, border: portrait ? "none" : `1px solid ${T.borderLight}`, width: "100%", maxWidth: portrait ? "100%" : 820, height: portrait ? "100dvh" : "88vh", display: "flex", flexDirection: "column", boxShadow: "0 20px 60px rgba(0,0,0,0.5)", overflow: "hidden" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ padding: portrait ? "8px 12px" : "12px 16px", borderBottom: `1px solid ${T.border}`, display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
          <h2 style={{ margin: 0, fontSize: portrait ? 14 : 16, fontWeight: 800, fontFamily: DFONT, color: T.text }}>Product Manager</h2>
          <span style={{ fontSize: 10, color: T.textDim, fontFamily: FONT }}>{products.length}</span>
          <div style={{ flex: 1 }} />
          <button style={{ ...S.bp, fontSize: portrait ? 10 : 13, padding: portrait ? "4px 10px" : "7px 16px" }} onClick={startNew}>+ New</button>
          <button onClick={onClose} style={{ background: "none", border: "none", color: T.textDim, fontSize: 20, cursor: "pointer", lineHeight: 1, padding: "0 4px" }}>×</button>
        </div>

        {portrait ? (
          /* ── Portrait layout: search + horizontal strip on top, editor below ── */
          <>
            {/* Search */}
            <div style={{ padding: "8px 10px", borderBottom: `1px solid ${T.border}`, flexShrink: 0 }}>
              {searchBar}
            </div>

            {/* Horizontal scrolling product strip */}
            <div style={{ flexShrink: 0, borderBottom: `1px solid ${T.border}`, overflowX: "auto", overflowY: "hidden" }}>
              <div style={{ display: "flex", gap: 6, padding: "8px 10px", alignItems: "stretch" }}>
                {filtered.map((p) => {
                  const col = PRODUCT_COLORS[p.color];
                  const isSel = selectedId === p.id;
                  return (
                    <div
                      key={p.id}
                      onClick={() => selectProduct(p)}
                      style={{
                        flexShrink: 0, width: 110, borderRadius: 7, padding: "7px 8px",
                        background: isSel ? T.accentDim + "44" : T.surfaceAlt,
                        border: `1.5px solid ${isSel ? T.accent : T.border}`,
                        cursor: "pointer", userSelect: "none", position: "relative", overflow: "hidden",
                        display: "flex", flexDirection: "column", gap: 3,
                      }}
                    >
                      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: col?.bg ?? "#888" }} />
                      <div style={{ fontSize: 11, fontWeight: 700, color: isSel ? T.accent : T.text, fontFamily: DFONT, lineHeight: 1.2, marginTop: 4, wordBreak: "break-word" }}>{p.name}</div>
                      <div style={{ fontSize: 9, color: T.textDim, fontFamily: FONT }}>{p.plu}</div>
                      <div style={{ display: "flex", alignItems: "center", gap: 3, marginTop: "auto" }}>
                        <span style={{ fontSize: 9, fontFamily: FONT, color: p.demand >= 7 ? T.success : p.demand >= 4 ? T.warning : T.danger, fontWeight: 700 }}>D:{p.demand}</span>
                        <span style={{ fontSize: 8, padding: "1px 3px", borderRadius: 2, fontFamily: FONT, background: p.deepShallow === "deep" ? "#3b82f622" : "#f59e0b22", color: p.deepShallow === "deep" ? "#60a5fa" : "#fbbf24" }}>
                          {p.deepShallow === "deep" ? "D" : "S"}
                        </span>
                      </div>
                    </div>
                  );
                })}
                {filtered.length === 0 && (
                  <div style={{ padding: "10px 4px", color: T.textDim, fontSize: 11, fontFamily: DFONT }}>No products match</div>
                )}
              </div>
            </div>

            {/* Editor fills remaining space */}
            <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}>
              {editorOrEmpty}
            </div>
          </>
        ) : (
          /* ── Desktop layout: two side-by-side panes ── */
          <div style={{ flex: 1, display: "flex", minHeight: 0 }}>
            {/* Left pane */}
            <div style={{ width: 280, flexShrink: 0, borderRight: `1px solid ${T.border}`, display: "flex", flexDirection: "column" }}>
              <div style={{ padding: "8px 10px", borderBottom: `1px solid ${T.border}`, flexShrink: 0 }}>
                {searchBar}
              </div>
              <div style={{ flex: 1, overflowY: "auto" }}>
                {filtered.map((p) => {
                  const col = PRODUCT_COLORS[p.color];
                  const isSel = selectedId === p.id;
                  return (
                    <div key={p.id} onClick={() => selectProduct(p)} style={{
                      display: "flex", alignItems: "center", gap: 8, padding: "9px 12px",
                      borderBottom: `1px solid ${T.border}`,
                      background: isSel ? T.accentDim + "33" : "transparent",
                      borderLeft: `3px solid ${isSel ? T.accent : "transparent"}`,
                      cursor: "pointer", userSelect: "none", transition: "background 0.1s",
                    }}>
                      <div style={{ width: 8, height: 8, borderRadius: "50%", background: col?.bg ?? "#888", flexShrink: 0 }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 12, fontWeight: isSel ? 700 : 500, color: isSel ? T.accent : T.text, fontFamily: DFONT, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{p.name}</div>
                        <div style={{ fontSize: 9, color: T.textDim, fontFamily: FONT }}>{p.plu} · D:{p.demand}</div>
                      </div>
                      <span style={{
                        fontSize: 8, padding: "1px 4px", borderRadius: 2, fontFamily: FONT, flexShrink: 0,
                        background: p.deepShallow === "deep" ? "#3b82f622" : "#f59e0b22",
                        color: p.deepShallow === "deep" ? "#60a5fa" : "#fbbf24",
                      }}>{p.deepShallow === "deep" ? "D" : "S"}</span>
                    </div>
                  );
                })}
                {filtered.length === 0 && (
                  <div style={{ padding: 20, textAlign: "center", color: T.textDim, fontSize: 12, fontFamily: DFONT }}>No products match</div>
                )}
              </div>
            </div>

            {/* Right pane */}
            <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
              {editorOrEmpty}
            </div>
          </div>
        )}
      </div>

      {confirmDel && (
        <ConfirmDialog
          message={`Delete "${products.find((p) => p.id === selectedId)?.name}"? This removes it from all pans.`}
          onConfirm={confirmDeleteAction}
          onCancel={() => setConfirmDel(false)}
          confirmLabel="Delete"
        />
      )}
    </div>
  );
}
