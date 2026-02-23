import { useState, useMemo } from "react";
import { T, S, FONT, DFONT, DEFAULT_CASE_WIDTH } from "./utils/constants.js";
import { uid, canSplitDepth } from "./utils/helpers.js";
import { autoGenerateCase } from "./utils/autoGenerate.js";
import { checkColorConflicts } from "./utils/colorConflicts.js";
import { DEFAULT_PRODUCTS } from "./data/defaultProducts.js";
import { useLocalStorage } from "./hooks/useLocalStorage.js";
import { useCaseDrag } from "./hooks/useCaseDrag.js";
import { useIsMobile } from "./hooks/useIsMobile.js";
import { useTouchDrag } from "./hooks/useTouchDrag.js";
import ConfirmDialog from "./components/ConfirmDialog.jsx";
import ProductFormModal from "./components/ProductFormModal.jsx";
import ProductPool from "./components/ProductPool.jsx";
import AddPanControls from "./components/AddPanControls.jsx";
import AutoGenModal from "./components/AutoGenModal.jsx";
import PrintView from "./components/PrintView.jsx";
import SavedCasesModal from "./components/SavedCasesModal.jsx";
import CaseGrid from "./components/CaseGrid.jsx";

const migrateColor = (c) => (c === "orange") ? "warm" : (c === "white" || c === "blue") ? "cool" : c;
const migrateProducts = (ps) => ps.map((p) => ({ ...p, color: migrateColor(p.color), preferredPosition: p.preferredPosition || "", labels: p.labels || [] }));

export default function App() {
  const [products, setProducts] = useLocalStorage("fcp3_products", DEFAULT_PRODUCTS, migrateProducts);
  const [pans, setPans] = useLocalStorage("fcp3_pans", []);
  const [caseWidth, setCaseWidth] = useLocalStorage("fcp3_cw", DEFAULT_CASE_WIDTH);
  const [savedCases, setSavedCases] = useLocalStorage("fcp3_sc", []);
  const [filters, setFilters] = useState({ color: "", cookType: "", fishType: "", deepShallow: "", sort: "name" });
  const [showProductForm, setShowProductForm] = useState(null);
  const [showAutoGen, setShowAutoGen] = useState(false);
  const [showPrint, setShowPrint] = useState(false);
  const [showSaved, setShowSaved] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [saveName, setSaveName] = useState("");
  const [showSaveInput, setShowSaveInput] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);
  const [clearSlotConfirm, setClearSlotConfirm] = useState(null);
  const [confirmExpand, setConfirmExpand] = useState(null);
  const [pansHistory, setPansHistory] = useState([]);
  const [pansRedo, setPansRedo] = useState([]);
  const [confirmRemovePan, setConfirmRemovePan] = useState(null);

  const [selectedProductId, setSelectedProductId] = useState(null);
  const selectedProduct = selectedProductId ? products.find((p) => p.id === selectedProductId) : null;

  const { isMobile, isPortrait } = useIsMobile();
  const [portraitDismissed, setPortraitDismissed] = useState(false);
  const { panDragId, insertTarget, insertTargetRef, setInsertTarget, setPanDragId, onPanDragStart, onPanDragOver, onPanDrop, onPanDragEnd } = useCaseDrag(setPans);

  const usedWidth = pans.reduce((s, p) => s + p.width, 0);
  const remainingWidth = caseWidth - usedWidth;
  const colorWarnings = useMemo(() => checkColorConflicts(pans, products), [pans, products]);

  const MAX_HISTORY = 20;
  const snapshotPans = () => {
    setPansHistory((h) => [...h.slice(-(MAX_HISTORY - 1)), pans]);
    setPansRedo([]);
  };
  const handleUndo = () => {
    if (pansHistory.length === 0) return;
    setPansRedo((r) => [...r, pans]);
    setPans(pansHistory[pansHistory.length - 1]);
    setPansHistory((h) => h.slice(0, -1));
  };
  const handleRedo = () => {
    if (pansRedo.length === 0) return;
    setPansHistory((h) => [...h.slice(-(MAX_HISTORY - 1)), pans]);
    setPans(pansRedo[pansRedo.length - 1]);
    setPansRedo((r) => r.slice(0, -1));
  };

  const addPan = (w, d, pt) => {
    if (w > remainingWidth) return;
    snapshotPans();
    const sc = d === "half" ? 2 : d === "third" ? 3 : 1;
    const slots = {};
    for (let i = 0; i < sc; i++) slots[i] = null;
    setPans((p) => [...p, { id: uid(), width: w, depth: d, panType: pt, slots }]);
  };
  const removePan = (id) => { snapshotPans(); setPans((p) => p.filter((x) => x.id !== id)); };
  const handleRemovePanClick = (id) => setConfirmRemovePan(id);
  const confirmRemovePanAction = () => { removePan(confirmRemovePan); setConfirmRemovePan(null); };
  const setPanType = (id, t) => setPans((p) => p.map((pan) => (pan.id === id ? { ...pan, panType: t } : pan)));
  const setSlotType = (panId, slotIdx, type) => setPans((p) => p.map((pan) => {
    if (pan.id !== panId) return pan;
    return { ...pan, slotTypes: { ...pan.slotTypes, [slotIdx]: type } };
  }));
  const setPanWidth = (panId, newWidth) => {
    snapshotPans();
    setPans((p) => p.map((pan) => {
      if (pan.id !== panId) return pan;
      const updated = { ...pan, width: newWidth };
      if (!canSplitDepth(newWidth) && pan.depth !== "full") {
        updated.depth = "full";
        updated.slots = { 0: pan.slots[0] || null };
        updated.slotTypes = undefined;
      }
      return updated;
    }));
  };
  const setPanDepth = (panId, newDepth) => {
    snapshotPans();
    setPans((p) => p.map((pan) => {
      if (pan.id !== panId) return pan;
      const oldSlotCount = pan.depth === "half" ? 2 : pan.depth === "third" ? 3 : 1;
      const newSlotCount = newDepth === "half" ? 2 : newDepth === "third" ? 3 : 1;
      const updated = { ...pan, depth: newDepth };
      if (newSlotCount !== oldSlotCount) {
        const newSlots = {};
        for (let i = 0; i < newSlotCount; i++) newSlots[i] = pan.slots[i] || null;
        updated.slots = newSlots;
        if (pan.slotTypes) {
          const newSlotTypes = {};
          for (let i = 0; i < newSlotCount; i++) {
            if (pan.slotTypes[i] !== undefined) newSlotTypes[i] = pan.slotTypes[i];
          }
          updated.slotTypes = Object.keys(newSlotTypes).length > 0 ? newSlotTypes : undefined;
        }
      }
      return updated;
    }));
  };
  const createPanFromProduct = (productId, insertIdx) => {
    const prod = products.find((p) => p.id === productId);
    if (!prod) return;
    if (prod.minPan > remainingWidth) {
      setConfirmExpand({ productId, insertIdx, product: prod });
      return;
    }
    const newPan = { id: uid(), width: prod.minPan, depth: "full", panType: prod.deepShallow, slots: { 0: productId } };
    snapshotPans();
    setPans((p) => { const a = [...p]; a.splice(insertIdx, 0, newPan); return a; });
  };
  const confirmExpandAction = () => {
    if (!confirmExpand) return;
    const { productId, insertIdx, product } = confirmExpand;
    const newPan = { id: uid(), width: product.minPan, depth: "full", panType: product.deepShallow, slots: { 0: productId } };
    const currentUsed = pans.reduce((s, p) => s + p.width, 0);
    snapshotPans();
    setCaseWidth(currentUsed + product.minPan);
    setPans((p) => { const a = [...p]; a.splice(insertIdx, 0, newPan); return a; });
    setConfirmExpand(null);
  };
  const assignProduct = (panId, slotIdx, productId) => setPans((p) => p.map((pan) => (pan.id === panId ? { ...pan, slots: { ...pan.slots, [slotIdx]: productId } } : pan)));
  const directClearSlot = (panId, slotIdx) => setPans((p) => p.map((pan) => (pan.id === panId ? { ...pan, slots: { ...pan.slots, [slotIdx]: null } } : pan)));
  const clearSlot = (panId, slotIdx) => setClearSlotConfirm({ panId, slotIdx });
  const confirmClearSlotAction = () => {
    if (!clearSlotConfirm) return;
    snapshotPans();
    directClearSlot(clearSlotConfirm.panId, clearSlotConfirm.slotIdx);
    setClearSlotConfirm(null);
  };

  const { startTouchDrag } = useTouchDrag({
    setInsertTarget, setPanDragId, insertTargetRef,
    onAssignProduct: assignProduct,
    onCreatePanFromProduct: createPanFromProduct,
    onDirectClearSlot: directClearSlot,
    pans, setPans,
  });

  const handleProductSave = (prod) => {
    setProducts((ps) => {
      const idx = ps.findIndex((p) => p.id === prod.id);
      if (idx >= 0) { const c = [...ps]; c[idx] = prod; return c; }
      return [...ps, prod];
    });
    setShowProductForm(null);
  };
  const deleteProduct = (id) => {
    setProducts((ps) => ps.filter((p) => p.id !== id));
    setPans((ps) => ps.map((pan) => {
      const ns = { ...pan.slots };
      Object.keys(ns).forEach((k) => { if (ns[k] === id) ns[k] = null; });
      return { ...pan, slots: ns };
    }));
  };
  const handleGenerate = (items, w) => { snapshotPans(); setCaseWidth(w); setPans(autoGenerateCase(items, w)); setShowAutoGen(false); };
  const saveCase = () => {
    if (!saveName.trim()) return;
    setSavedCases((sc) => [...sc, { name: saveName.trim(), pans: JSON.parse(JSON.stringify(pans)), caseWidth, savedAt: new Date().toISOString() }]);
    setSaveName("");
    setShowSaveInput(false);
  };
  const loadCase = (c) => { snapshotPans(); setPans(c.pans); setCaseWidth(c.caseWidth); setShowSaved(false); };
  const deleteCase = (idx) => setSavedCases((sc) => sc.filter((_, i) => i !== idx));

  const handleSelectProduct = (id) => {
    if (selectedProductId === id) { setSelectedProductId(null); return; }
    setSelectedProductId(id);
    setDrawerOpen(false);
  };
  const handleMobilePlaceProduct = (panId, slotIdx) => {
    assignProduct(panId, slotIdx, selectedProductId);
    setSelectedProductId(null);
  };

  // Close drawer immediately at touchstart — safe because ProductPool stays mounted (CSS-only hide)
  const poolStartTouchDrag = (e, dragInfo, sourceEl) => { setDrawerOpen(false); startTouchDrag(e, dragInfo, sourceEl); };
  const poolProps = { products, filters, setFilters, onEdit: (p) => setShowProductForm(p), onDelete: deleteProduct, startTouchDrag: poolStartTouchDrag, isMobile, selectedProductId, onSelectProduct: handleSelectProduct };

  return (
    <div style={{ minHeight: "100vh", background: T.bg, color: T.text, fontFamily: DFONT }}>
      <header style={{ padding: "10px 16px", background: T.surface, borderBottom: `1px solid ${T.border}`, display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ fontSize: 20 }}>🐟</span>
          <h1 style={{ margin: 0, fontSize: 16, fontWeight: 800, fontFamily: DFONT, background: `linear-gradient(135deg,${T.accent},#818cf8)`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>Case Planner</h1>
        </div>
        <div style={{ flex: 1 }} />
        {!isMobile && <button style={S.hb} onClick={() => setSidebarOpen(!sidebarOpen)}>{sidebarOpen ? "◀ Hide" : "📦 Products"}</button>}
        <button style={S.hb} onClick={() => setShowAutoGen(true)}>⚡ Auto</button>
        <button style={S.hb} onClick={() => setShowSaved(true)}>📁 Saved</button>
        <button style={S.hb} onClick={() => setShowPrint(true)}>🖨 Print</button>
      </header>

      {isMobile && isPortrait && !portraitDismissed && (
        <div style={{ padding: "7px 14px", background: T.warning + "18", borderBottom: `1px solid ${T.warning}28`, display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 15 }}>⟳</span>
          <span style={{ flex: 1, fontSize: 11, color: T.warning, fontFamily: FONT }}>Rotate to landscape for the best experience</span>
          <button onClick={() => setPortraitDismissed(true)} style={{ background: "none", border: "none", color: T.textDim, cursor: "pointer", fontSize: 16, padding: "0 2px", lineHeight: 1 }}>×</button>
        </div>
      )}
      <div style={{ display: "flex", minHeight: "calc(100vh - 50px)" }}>
        {/* Desktop sidebar */}
        {!isMobile && sidebarOpen && (
          <aside style={{ width: 280, minWidth: 280, padding: 10, background: T.surface, borderRight: `1px solid ${T.border}`, display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <h3 style={{ margin: 0, fontSize: 13, color: T.textMuted, fontFamily: FONT }}>PRODUCT POOL</h3>
              <button style={{ ...S.bp, fontSize: 10, padding: "3px 10px" }} onClick={() => setShowProductForm("new")}>+ New</button>
            </div>
            <p style={{ fontSize: 10, color: T.textDim, margin: "0 0 8px", lineHeight: 1.4 }}>Drag products into pan slots</p>
            <ProductPool {...poolProps} />
          </aside>
        )}

        <main style={{ flex: 1, padding: 14, overflowX: "auto", display: "flex", flexDirection: "column", gap: 10, paddingBottom: isMobile ? 52 + 14 : 14 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <label style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, color: T.textMuted }}>
              Case:<input type="number" value={caseWidth} onChange={(e) => setCaseWidth(Math.max(usedWidth, Math.max(1, +e.target.value)))} style={{ ...S.inp, width: 55, textAlign: "center", padding: "4px 6px" }} />
            </label>
            <span style={{ fontSize: 11, fontFamily: FONT, padding: "3px 8px", borderRadius: 4, background: remainingWidth < 0 ? T.danger + "33" : T.accentDim + "33", color: remainingWidth < 0 ? T.danger : T.accent }}>
              {usedWidth}/{caseWidth} · {remainingWidth} left
            </span>
            {showSaveInput ? (
              <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                <input style={{ ...S.inp, width: 130, fontSize: 11, padding: "4px 8px" }} value={saveName} onChange={(e) => setSaveName(e.target.value)} placeholder="Case name..." onKeyDown={(e) => e.key === "Enter" && saveCase()} autoFocus />
                <button style={{ ...S.ch, background: T.accent, color: T.bg }} onClick={saveCase}>Save</button>
                <button style={S.ch} onClick={() => setShowSaveInput(false)}>×</button>
              </div>
            ) : (
              <button style={S.ch} onClick={() => setShowSaveInput(true)}>💾 Save</button>
            )}
            <button style={{ ...S.ch, color: T.danger }} onClick={() => setConfirmClear(true)}>🗑 Clear</button>
            <button style={{ ...S.ch, opacity: pansHistory.length === 0 ? 0.35 : 1 }} disabled={pansHistory.length === 0} onClick={handleUndo}>↩ Undo</button>
            <button style={{ ...S.ch, opacity: pansRedo.length === 0 ? 0.35 : 1 }} disabled={pansRedo.length === 0} onClick={handleRedo}>↪ Redo</button>
          </div>

          <AddPanControls onAddPan={addPan} remainingWidth={remainingWidth} />

          <CaseGrid
            pans={pans} products={products} caseWidth={caseWidth}
            onAssignProduct={assignProduct} onClearSlot={clearSlot} onDirectClearSlot={directClearSlot}
            onRemovePan={handleRemovePanClick} onSetPanType={setPanType} onSetSlotType={setSlotType}
            onSetPanWidth={setPanWidth} onSetPanDepth={setPanDepth} onCreatePanFromProduct={createPanFromProduct}
            insertTarget={insertTarget} onPanDragStart={onPanDragStart}
            onPanDragOver={onPanDragOver} onPanDrop={onPanDrop} onPanDragEnd={onPanDragEnd}
            setInsertTarget={setInsertTarget} setPanDragId={setPanDragId} panDragId={panDragId}
            isMobile={isMobile} isPortrait={isPortrait} startTouchDrag={startTouchDrag}
            selectedProductId={selectedProductId} onMobilePlaceProduct={handleMobilePlaceProduct}
          />

          {colorWarnings.length > 0 && (
            <div style={{ padding: "6px 10px", borderRadius: 6, background: T.warning + "12", border: `1px solid ${T.warning}22` }}>
              {colorWarnings.map((w, i) => <div key={i} style={{ fontSize: 10, color: T.warning }}>⚠ {w}</div>)}
            </div>
          )}
        </main>
      </div>

      {/* Mobile bottom drawer */}
      {isMobile && (
        <>
          {drawerOpen && (
            <div onClick={() => setDrawerOpen(false)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 200 }} />
          )}
          {/* Selected product banner — shown above the drawer when a product is selected */}
          {selectedProduct && !drawerOpen && (
            <div style={{
              position: "fixed", bottom: 44, left: 0, right: 0, zIndex: 299,
              background: T.accent, padding: "8px 14px",
              display: "flex", alignItems: "center", gap: 8,
            }}>
              <span style={{ flex: 1, fontSize: 12, fontWeight: 700, color: T.bg, fontFamily: DFONT }}>
                {selectedProduct.name} — tap a slot to place
              </span>
              <button
                onClick={() => setSelectedProductId(null)}
                style={{ background: "none", border: "none", color: T.bg, fontSize: 18, cursor: "pointer", padding: "0 2px", lineHeight: 1, opacity: 0.8 }}
              >×</button>
            </div>
          )}
          <div style={{
            position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 300,
            background: T.surface, borderTop: `1px solid ${T.borderLight}`,
            borderRadius: "12px 12px 0 0",
            height: drawerOpen ? "58vh" : 44,
            transition: "height 0.25s ease",
            display: "flex", flexDirection: "column", overflow: "hidden",
          }}>
            {/* Handle bar */}
            <div
              onClick={() => setDrawerOpen((o) => !o)}
              style={{ height: 44, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 16px", cursor: "pointer", touchAction: "manipulation" }}
            >
              <span style={{ fontSize: 12, color: selectedProductId ? T.accent : T.textMuted, fontFamily: FONT, userSelect: "none", textTransform: "uppercase", letterSpacing: 0.5, fontWeight: selectedProductId ? 700 : 400 }}>
                {selectedProductId ? `${selectedProduct?.name} selected ▲` : `Products ${drawerOpen ? "▼" : "▲"}`}
              </span>
              <button style={{ ...S.bp, fontSize: 10, padding: "3px 10px" }} onClick={(e) => { e.stopPropagation(); setShowProductForm("new"); }}>+ New</button>
            </div>
            {/* Drawer content — always mounted so source elements stay in the DOM during drag */}
            <div style={{ flex: 1, overflowY: "auto", padding: "0 10px 10px", display: "flex", flexDirection: "column", gap: 6, visibility: drawerOpen ? "visible" : "hidden", pointerEvents: drawerOpen ? "auto" : "none" }}>
              <ProductPool {...poolProps} />
            </div>
          </div>
        </>
      )}

      {showProductForm && <ProductFormModal product={showProductForm === "new" ? null : showProductForm} onSave={handleProductSave} onClose={() => setShowProductForm(null)} />}
      {showAutoGen && <AutoGenModal products={products} onGenerate={handleGenerate} onClose={() => setShowAutoGen(false)} />}
      {showPrint && <PrintView pans={pans} products={products} caseWidth={caseWidth} onClose={() => setShowPrint(false)} />}
      {showSaved && <SavedCasesModal savedCases={savedCases} onLoad={loadCase} onDelete={deleteCase} onClose={() => setShowSaved(false)} />}
      {confirmClear && <ConfirmDialog message="Clear all pans from the case?" onConfirm={() => { snapshotPans(); setPans([]); setConfirmClear(false); }} onCancel={() => setConfirmClear(false)} confirmLabel="Clear" />}
      {confirmRemovePan && <ConfirmDialog message="Remove this pan? Any products in its slots will be unassigned." onConfirm={confirmRemovePanAction} onCancel={() => setConfirmRemovePan(null)} confirmLabel="Remove" />}
      {clearSlotConfirm && <ConfirmDialog message="Remove product from this slot? Consider editing instead if this was a mistake." onConfirm={confirmClearSlotAction} onCancel={() => setClearSlotConfirm(null)} confirmLabel="Remove" />}
      {confirmExpand && <ConfirmDialog message={`No room for ${confirmExpand.product.name} — needs ${confirmExpand.product.minPan} units but only ${remainingWidth} left. Add anyway and expand the case to ${pans.reduce((s, p) => s + p.width, 0) + confirmExpand.product.minPan}?`} onConfirm={confirmExpandAction} onCancel={() => setConfirmExpand(null)} confirmLabel="Add & Expand" />}
    </div>
  );
}
