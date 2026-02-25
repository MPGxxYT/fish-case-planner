import { useRef, useState, useEffect, useCallback } from "react";
import { T, S, FONT, DFONT } from "../utils/constants.js";
import { isSupabaseConfigured, fetchPublicCases, fetchCaseByCode, publishCase, deletePublicCase } from "../lib/supabase.js";
import CasePreview from "./CasePreview.jsx";

const TAB_STYLE = (active) => ({
  background: active ? T.accent : "transparent",
  color: active ? T.bg : T.textMuted,
  border: active ? "none" : `1px solid ${T.border}`,
  borderRadius: 6,
  padding: "6px 16px",
  fontSize: 12,
  fontWeight: 700,
  cursor: "pointer",
  fontFamily: DFONT,
});

/* ── Local tab ── */

function LocalTab({ savedCases, products, onLoad, onDelete, onExport, onImport, onPublish, onClose }) {
  const fileRef = useRef(null);
  const [previewIdx, setPreviewIdx] = useState(null);
  const [publishIdx, setPublishIdx] = useState(null);
  const [publishAuthor, setPublishAuthor] = useState("");
  const [publishResult, setPublishResult] = useState(null); // { idx, shortCode } or { idx, error }
  const [publishing, setPublishing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [search, setSearch] = useState("");
  const [deleteIdx, setDeleteIdx] = useState(null);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");

  const filtered = search.trim()
    ? savedCases.filter((c) => c.name.toLowerCase().includes(search.trim().toLowerCase()))
    : savedCases;

  const togglePreview = (i) => setPreviewIdx(previewIdx === i ? null : i);

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) onImport(file);
    e.target.value = "";
  };

  const handlePublish = async (c, i) => {
    setPublishing(true);
    setPublishResult(null);
    try {
      const { shortCode } = await publishCase(c.name, publishAuthor, c.pans, products, c.caseWidth);
      setPublishResult({ idx: i, shortCode });
      setPublishIdx(null);
    } catch (err) {
      setPublishResult({ idx: i, error: err.message });
    } finally {
      setPublishing(false);
    }
  };

  return (
    <>
      {savedCases.length > 0 && (
        <input
          style={{ ...S.inp, fontSize: 12, padding: "5px 8px", marginBottom: 8 }}
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPreviewIdx(null); }}
          placeholder="Search saved cases..."
        />
      )}
      {savedCases.length === 0 ? (
        <p style={{ color: T.textDim, fontSize: 13 }}>No saved cases yet.</p>
      ) : filtered.length === 0 ? (
        <p style={{ color: T.textDim, fontSize: 13 }}>No cases match "{search}".</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {filtered.map((c, i) => (
            <div key={i}>
              <div
                style={{
                  display: "flex", alignItems: "center", gap: 8,
                  padding: "8px 10px", borderRadius: previewIdx === i ? "6px 6px 0 0" : 6,
                  background: T.surfaceAlt,
                  border: `1px solid ${previewIdx === i ? T.borderLight : T.border}`,
                  cursor: "pointer",
                }}
                onClick={() => togglePreview(i)}
              >
                <span style={{ fontSize: 12, color: previewIdx === i ? T.accent : T.textDim, transition: "transform 0.15s", display: "inline-block", transform: previewIdx === i ? "rotate(90deg)" : "rotate(0deg)" }}>▶</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, color: T.text, fontWeight: 600 }}>{c.name}</div>
                  <div style={{ fontSize: 10, color: T.textDim }}>{c.pans.length} pans · {c.caseWidth}w · {new Date(c.savedAt).toLocaleDateString()}</div>
                </div>
                <button style={{ ...S.ch, background: T.accent, color: T.bg }} onClick={(e) => { e.stopPropagation(); onLoad(c); }}>Load</button>
                {isSupabaseConfigured && (
                  <button style={S.ch} onClick={(e) => { e.stopPropagation(); setPublishIdx(publishIdx === i ? null : i); setPublishResult(null); }} title="Publish publicly">☁↑</button>
                )}
                <button style={S.ch} onClick={(e) => { e.stopPropagation(); onExport(c); }} title="Export to file">↓</button>
                <button style={{ ...S.ch, background: T.danger + "33", color: T.danger }} onClick={(e) => { e.stopPropagation(); setDeleteIdx(deleteIdx === i ? null : i); setDeleteConfirmText(""); }}>×</button>
              </div>

              {/* Delete confirmation */}
              {deleteIdx === i && (
                <div style={{ padding: "8px 12px", background: T.bg, border: `1px solid ${T.danger}44`, borderTop: "none", borderRadius: previewIdx === i ? 0 : "0 0 6px 6px", display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 10, color: T.danger }}>Type "yes" to delete:</span>
                  <input
                    style={{ ...S.inp, width: 60, fontSize: 11, padding: "4px 8px", borderColor: T.danger + "44" }}
                    value={deleteConfirmText}
                    onChange={(e) => setDeleteConfirmText(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter" && deleteConfirmText.toLowerCase() === "yes") { onDelete(savedCases.indexOf(c)); setDeleteIdx(null); setDeleteConfirmText(""); setPreviewIdx(null); } }}
                    placeholder="yes"
                    autoFocus
                  />
                  <button
                    style={{ ...S.ch, background: deleteConfirmText.toLowerCase() === "yes" ? T.danger : T.danger + "33", color: deleteConfirmText.toLowerCase() === "yes" ? "#fff" : T.danger, opacity: deleteConfirmText.toLowerCase() === "yes" ? 1 : 0.5 }}
                    onClick={() => { onDelete(savedCases.indexOf(c)); setDeleteIdx(null); setDeleteConfirmText(""); setPreviewIdx(null); }}
                    disabled={deleteConfirmText.toLowerCase() !== "yes"}
                  >Delete</button>
                  <button style={S.ch} onClick={() => { setDeleteIdx(null); setDeleteConfirmText(""); }}>×</button>
                </div>
              )}

              {/* Publish inline form */}
              {publishIdx === i && (
                <div style={{ padding: "8px 12px", background: T.bg, border: `1px solid ${T.borderLight}`, borderTop: "none", borderRadius: previewIdx === i ? 0 : "0 0 6px 6px", display: "flex", alignItems: "center", gap: 8 }}>
                  <input
                    style={{ ...S.inp, width: 140, fontSize: 11, padding: "4px 8px" }}
                    value={publishAuthor}
                    onChange={(e) => setPublishAuthor(e.target.value)}
                    placeholder="Your name (optional)"
                    onKeyDown={(e) => e.key === "Enter" && handlePublish(c, i)}
                    autoFocus
                  />
                  <button style={{ ...S.ch, background: T.accent, color: T.bg }} onClick={() => handlePublish(c, i)} disabled={publishing}>
                    {publishing ? "..." : "Publish"}
                  </button>
                  <button style={S.ch} onClick={() => setPublishIdx(null)}>×</button>
                </div>
              )}

              {/* Publish result */}
              {publishResult?.idx === i && (
                <div style={{ padding: "6px 12px", background: T.bg, border: `1px solid ${T.borderLight}`, borderTop: "none", borderRadius: "0 0 6px 6px", fontSize: 11 }}>
                  {publishResult.shortCode ? (
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ color: T.success }}>Published!</span>
                      <code style={{ background: T.surfaceAlt, padding: "2px 8px", borderRadius: 4, fontSize: 13, fontWeight: 700, color: T.accent, fontFamily: FONT, letterSpacing: 1 }}>{publishResult.shortCode}</code>
                      <button style={{ ...S.ch, fontSize: 10, color: copied ? T.success : S.ch.color }} onClick={() => { navigator.clipboard.writeText(publishResult.shortCode); setCopied(true); setTimeout(() => setCopied(false), 1500); }}>{copied ? "Copied!" : "Copy"}</button>
                    </div>
                  ) : (
                    <span style={{ color: T.danger }}>{publishResult.error}</span>
                  )}
                </div>
              )}

              {/* Preview */}
              {previewIdx === i && (
                <div style={{ padding: 12, background: T.bg, border: `1px solid ${T.borderLight}`, borderTop: "none", borderRadius: "0 0 6px 6px" }}>
                  <CasePreview pans={c.pans} products={products} caseWidth={c.caseWidth} height={180} />
                </div>
              )}
            </div>
          ))}
        </div>
      )}
      <input ref={fileRef} type="file" accept=".fishcase,.json" style={{ display: "none" }} onChange={handleFileChange} />
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 12, gap: 8 }}>
        <button style={{ ...S.ch, fontSize: 12 }} onClick={() => fileRef.current?.click()}>↑ Import File</button>
        <button style={S.bs} onClick={onClose}>Close</button>
      </div>
    </>
  );
}

/* ── Public tab ── */

function PublicTab({ products: localProducts, onLoadPublic, onClose }) {
  const [cases, setCases] = useState([]);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [previewIdx, setPreviewIdx] = useState(null);

  // Search
  const [searchInput, setSearchInput] = useState("");
  const [activeSearch, setActiveSearch] = useState("");

  // Import by code
  const [codeInput, setCodeInput] = useState("");
  const [codeLooking, setCodeLooking] = useState(false);
  const [codeResult, setCodeResult] = useState(null); // fetched case or null
  const [codeError, setCodeError] = useState(null);

  // Copy feedback
  const [copiedCode, setCopiedCode] = useState(null);
  const handleCopyId = (code) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode((c) => c === code ? null : c), 1500);
  };

  // Delete confirmation
  const [deleteCode, setDeleteCode] = useState(null); // shortCode of case being deleted
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);

  const loadPage = useCallback(async (p, search) => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchPublicCases(p, search);
      setCases((prev) => p === 0 ? result.cases : [...prev, ...result.cases]);
      setHasMore(result.hasMore);
      setPage(p);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadPage(0, ""); }, [loadPage]);

  const handleSearch = () => {
    setActiveSearch(searchInput);
    setPreviewIdx(null);
    loadPage(0, searchInput);
  };

  const clearSearch = () => {
    setSearchInput("");
    setActiveSearch("");
    setPreviewIdx(null);
    loadPage(0, "");
  };

  const handleCodeLookup = async () => {
    if (!codeInput.trim()) return;
    setCodeLooking(true);
    setCodeError(null);
    setCodeResult(null);
    try {
      const result = await fetchCaseByCode(codeInput);
      setCodeResult(result);
    } catch (err) {
      setCodeError(err.message);
    } finally {
      setCodeLooking(false);
    }
  };

  const handleDeletePublic = async (shortCode) => {
    setDeleting(true);
    try {
      await deletePublicCase(shortCode);
      setCases((prev) => prev.filter((c) => c.shortCode !== shortCode));
      setDeleteCode(null);
      setDeleteConfirmText("");
    } catch (err) {
      setError(err.message);
    } finally {
      setDeleting(false);
    }
  };

  const togglePreview = (i) => setPreviewIdx(previewIdx === i ? null : i);

  if (!isSupabaseConfigured) {
    return (
      <div style={{ padding: "40px 20px", textAlign: "center" }}>
        <span style={{ fontSize: 28, opacity: 0.3 }}>🌐</span>
        <p style={{ color: T.textMuted, fontSize: 13, marginTop: 8, fontFamily: DFONT }}>Public Case Browser</p>
        <p style={{ color: T.textDim, fontSize: 11, maxWidth: 340, margin: "8px auto 0", lineHeight: 1.5 }}>
          Not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to your .env file to enable public case sharing.
        </p>
        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 24 }}>
          <button style={S.bs} onClick={onClose}>Close</button>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Search + Import by code */}
      <div style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 12, flexWrap: "wrap" }}>
        <input
          style={{ ...S.inp, flex: 1, minWidth: 140, fontSize: 12, padding: "5px 8px" }}
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          placeholder="Search by name or author..."
          onKeyDown={(e) => e.key === "Enter" && handleSearch()}
        />
        <button style={{ ...S.ch, background: T.accent, color: T.bg }} onClick={handleSearch}>Search</button>
        {activeSearch && <button style={S.ch} onClick={clearSearch}>Clear</button>}
        <span style={{ width: 1, height: 18, background: T.border, margin: "0 2px" }} />
        <input
          style={{ ...S.inp, width: 90, fontSize: 12, padding: "5px 8px", letterSpacing: 1, fontFamily: FONT, textTransform: "uppercase" }}
          value={codeInput}
          onChange={(e) => setCodeInput(e.target.value)}
          placeholder="Code..."
          maxLength={6}
          onKeyDown={(e) => e.key === "Enter" && handleCodeLookup()}
        />
        <button style={{ ...S.ch, background: T.accent, color: T.bg }} onClick={handleCodeLookup} disabled={codeLooking}>
          {codeLooking ? "..." : "Lookup"}
        </button>
        {codeError && <span style={{ fontSize: 10, color: T.danger }}>{codeError}</span>}
      </div>

      {/* Code lookup result */}
      {codeResult && (
        <div style={{ marginBottom: 12, padding: 10, borderRadius: 6, background: T.surfaceAlt, border: `1px solid ${T.borderLight}` }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, color: T.text, fontWeight: 600 }}>{codeResult.name}</div>
              <div style={{ fontSize: 10, color: T.textDim }}>
                {codeResult.pans.length} pans · {codeResult.caseWidth}w
                {codeResult.author && ` · by ${codeResult.author}`}
                {" · "}<code style={{ fontFamily: FONT, color: T.accent }}>{codeResult.shortCode}</code>
              </div>
            </div>
            <button style={{ ...S.ch, background: T.accent, color: T.bg }} onClick={() => onLoadPublic(codeResult)}>Load</button>
            <button style={S.ch} onClick={() => setCodeResult(null)}>×</button>
          </div>
          <CasePreview pans={codeResult.pans} products={codeResult.products} caseWidth={codeResult.caseWidth} height={160} />
        </div>
      )}

      {/* Browse list */}
      {error && <p style={{ color: T.danger, fontSize: 11 }}>{error}</p>}
      {cases.length === 0 && !loading && !error && (
        <p style={{ color: T.textDim, fontSize: 13 }}>No published cases yet.</p>
      )}
      {cases.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {cases.map((c, i) => (
            <div key={c.shortCode}>
              <div
                style={{
                  display: "flex", alignItems: "center", gap: 8,
                  padding: "8px 10px", borderRadius: previewIdx === i ? "6px 6px 0 0" : 6,
                  background: T.surfaceAlt,
                  border: `1px solid ${previewIdx === i ? T.borderLight : T.border}`,
                  cursor: "pointer",
                }}
                onClick={() => togglePreview(i)}
              >
                <span style={{ fontSize: 12, color: previewIdx === i ? T.accent : T.textDim, transition: "transform 0.15s", display: "inline-block", transform: previewIdx === i ? "rotate(90deg)" : "rotate(0deg)" }}>▶</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, color: T.text, fontWeight: 600 }}>{c.name}</div>
                  <div style={{ fontSize: 10, color: T.textDim }}>
                    {c.pans.length} pans · {c.caseWidth}w
                    {c.author && ` · by ${c.author}`}
                    {" · "}{new Date(c.createdAt).toLocaleDateString()}
                    {" · "}<code style={{ fontFamily: FONT, color: T.accent, fontSize: 9 }}>{c.shortCode}</code>
                  </div>
                </div>
                <button style={{ ...S.ch, background: T.accent, color: T.bg }} onClick={(e) => { e.stopPropagation(); onLoadPublic(c); }}>Load</button>
                <button style={{ ...S.ch, color: copiedCode === c.shortCode ? T.success : S.ch.color }} onClick={(e) => { e.stopPropagation(); handleCopyId(c.shortCode); }}>{copiedCode === c.shortCode ? "Copied!" : "Copy ID"}</button>
                <button style={{ ...S.ch, background: T.danger + "33", color: T.danger }} onClick={(e) => { e.stopPropagation(); setDeleteCode(deleteCode === c.shortCode ? null : c.shortCode); setDeleteConfirmText(""); }}>×</button>
              </div>
              {/* Delete confirmation */}
              {deleteCode === c.shortCode && (
                <div style={{ padding: "8px 12px", background: T.bg, border: `1px solid ${T.danger}44`, borderTop: "none", borderRadius: previewIdx === i ? 0 : "0 0 6px 6px", display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 10, color: T.danger }}>Type "yes" to delete:</span>
                  <input
                    style={{ ...S.inp, width: 60, fontSize: 11, padding: "4px 8px", borderColor: T.danger + "44" }}
                    value={deleteConfirmText}
                    onChange={(e) => setDeleteConfirmText(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && deleteConfirmText.toLowerCase() === "yes" && handleDeletePublic(c.shortCode)}
                    placeholder="yes"
                    autoFocus
                  />
                  <button
                    style={{ ...S.ch, background: deleteConfirmText.toLowerCase() === "yes" ? T.danger : T.danger + "33", color: deleteConfirmText.toLowerCase() === "yes" ? "#fff" : T.danger, opacity: deleteConfirmText.toLowerCase() === "yes" ? 1 : 0.5 }}
                    onClick={() => handleDeletePublic(c.shortCode)}
                    disabled={deleteConfirmText.toLowerCase() !== "yes" || deleting}
                  >
                    {deleting ? "..." : "Delete"}
                  </button>
                  <button style={S.ch} onClick={() => { setDeleteCode(null); setDeleteConfirmText(""); }}>×</button>
                </div>
              )}
              {previewIdx === i && (
                <div style={{ padding: 12, background: T.bg, border: `1px solid ${T.borderLight}`, borderTop: "none", borderRadius: "0 0 6px 6px" }}>
                  <CasePreview pans={c.pans} products={c.products} caseWidth={c.caseWidth} height={180} />
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Load more / loading */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 12, gap: 8 }}>
        <div>
          {loading && <span style={{ fontSize: 11, color: T.textDim }}>Loading...</span>}
          {hasMore && !loading && (
            <button style={{ ...S.ch, fontSize: 12 }} onClick={() => loadPage(page + 1, activeSearch)}>Load More</button>
          )}
        </div>
        <button style={S.bs} onClick={onClose}>Close</button>
      </div>
    </>
  );
}

/* ── Main modal ── */

export default function SavedCasesModal({ savedCases, products, onLoad, onDelete, onExport, onImport, onLoadPublic, onClose }) {
  const [tab, setTab] = useState("local");

  return (
    <div style={S.ov} onClick={onClose}>
      <div style={{ ...S.mod, maxWidth: "95vw", width: 800, maxHeight: "85vh", overflowY: "auto" }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
          <h3 style={{ margin: 0, fontFamily: DFONT, color: T.text }}>Case Browser</h3>
          <div style={{ display: "flex", gap: 4 }}>
            <button style={TAB_STYLE(tab === "local")} onClick={() => setTab("local")}>Local</button>
            <button style={TAB_STYLE(tab === "public")} onClick={() => setTab("public")}>Public</button>
          </div>
        </div>

        {tab === "local" && (
          <LocalTab
            savedCases={savedCases} products={products}
            onLoad={onLoad} onDelete={onDelete} onExport={onExport} onImport={onImport}
            onClose={onClose}
          />
        )}
        {tab === "public" && (
          <PublicTab products={products} onLoadPublic={onLoadPublic} onClose={onClose} />
        )}
      </div>
    </div>
  );
}
