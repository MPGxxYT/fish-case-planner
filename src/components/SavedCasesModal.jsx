import { T, S, DFONT } from "../utils/constants.js";

export default function SavedCasesModal({ savedCases, onLoad, onDelete, onClose }) {
  return (
    <div style={S.ov} onClick={onClose}>
      <div style={{ ...S.mod, maxHeight: "70vh", overflowY: "auto" }} onClick={(e) => e.stopPropagation()}>
        <h3 style={{ margin: 0, fontFamily: DFONT, color: T.text }}>Saved Cases</h3>
        {savedCases.length === 0 ? (
          <p style={{ color: T.textDim, fontSize: 13 }}>No saved cases yet.</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 12 }}>
            {savedCases.map((c, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 10px", borderRadius: 6, background: T.surfaceAlt, border: `1px solid ${T.border}` }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, color: T.text, fontWeight: 600 }}>{c.name}</div>
                  <div style={{ fontSize: 10, color: T.textDim }}>{c.pans.length} pans · {c.caseWidth}w · {new Date(c.savedAt).toLocaleDateString()}</div>
                </div>
                <button style={{ ...S.ch, background: T.accent, color: T.bg }} onClick={() => onLoad(c)}>Load</button>
                <button style={{ ...S.ch, background: T.danger + "33", color: T.danger }} onClick={() => onDelete(i)}>×</button>
              </div>
            ))}
          </div>
        )}
        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 12 }}>
          <button style={S.bs} onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}
