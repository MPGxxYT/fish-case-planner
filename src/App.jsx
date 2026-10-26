import { useState, useMemo, useEffect, useRef } from "react";
import { T, S, FONT, DFONT, PRODUCT_COLORS } from "./utils/constants.js";
import { checkFit, clampCaseWidth, usedWidth as sumWidth } from "./case/layout.js";
import { exportCaseToFile, readCaseFile } from "./utils/caseFile.js";
import { fetchPublicProducts, upsertPublicProduct, deletePublicProduct } from "./lib/api.js";
import { autoGenerateCase } from "./utils/autoGenerate.js";
import { colorClashes, indexProducts, productsInCase as placedIds } from "./case/queries.js";
import { useLocalStorage } from "./hooks/useLocalStorage.js";
import { useLayout } from "./hooks/useLayout.js";
import { useCaseDrag } from "./hooks/useCaseDrag.js";
import { useIsMobile } from "./hooks/useIsMobile.js";
import { useTouchDrag } from "./hooks/useTouchDrag.js";
import ConfirmDialog from "./components/ConfirmDialog.jsx";
import ProductPool from "./components/ProductPool.jsx";
import AddPanControls from "./components/AddPanControls.jsx";
import AutoGenModal from "./components/AutoGenModal.jsx";
import PrintView from "./components/PrintView.jsx";
import SavedCasesModal from "./components/SavedCasesModal.jsx";
import CaseGrid from "./components/CaseGrid.jsx";
import SlotPickerModal from "./components/SlotPickerModal.jsx";
import ProductManagerModal from "./components/ProductManagerModal.jsx";

const migrateColor = (c) => (c === "orange") ? "warm" : (c === "white" || c === "blue") ? "cool" : c;
const migrateProducts = (ps) => ps.map((p) => ({ preferredZone: "", preferredSplit: "", ...p, color: migrateColor(p.color), preferredPosition: p.preferredPosition || "", labels: p.labels || [] }));

export default function App() {
  // localStorage acts as a stale-while-revalidate cache for the shared product catalog.
  // On mount, cached products are shown immediately, then the fresh fetch overwrites them.
  const [products, setProducts] = useLocalStorage("fcp3_products", [], migrateProducts);
  const { layout, dispatch, undo, redo, canUndo, canRedo } = useLayout();
  const { pans, caseWidth } = layout;
  const [caseWidthDraft, setCaseWidthDraft] = useState(String(caseWidth));
  const caseWidthFocused = useRef(false);
  const [dividerEditMode, setDividerEditMode] = useState(false);
  const [savedCases, setSavedCases] = useLocalStorage("fcp3_sc", []);
  const [filters, setFilters] = useState({ color: "", cookType: "", fishType: "", deepShallow: "", sort: "name", hideInCase: false });
  const [showProductManager, setShowProductManager] = useState(false);
  const [showAutoGen, setShowAutoGen] = useState(false);
  const [showPrint, setShowPrint] = useState(false);
  const [showSaved, setShowSaved] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [saveName, setSaveName] = useState("");
  const [showSaveInput, setShowSaveInput] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);
  const [clearSlotConfirm, setClearSlotConfirm] = useState(null);
  const [confirmExpand, setConfirmExpand] = useState(null); // { edit, requiredWidth, product? }
  const [confirmRemovePan, setConfirmRemovePan] = useState(null);
  const [slotPicker, setSlotPicker] = useState(null); // { panId, slotIdx }
  const [productsRefreshing, setProductsRefreshing] = useState(false);
  const [toast, setToast] = useState(null);
  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast((t) => t === msg ? null : t), 2000); };

  // On mount, load products from the shared catalog (overrides local cache)
  useEffect(() => {
    fetchPublicProducts()
      .then((ps) => { if (ps.length > 0) setProducts(ps); })
      .catch(() => {}); // Silently fall back to localStorage on error
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const refreshProducts = () => {
    if (productsRefreshing) return;
    setProductsRefreshing(true);
    fetchPublicProducts()
      .then((ps) => { setProducts(ps); showToast(`Products updated (${ps.length})`); })
      .catch(() => showToast("Failed to refresh products"))
      .finally(() => setProductsRefreshing(false));
  };

  const [selectedProductId, setSelectedProductId] = useState(null);
  const selectedProduct = selectedProductId ? products.find((p) => p.id === selectedProductId) : null;

  const { isMobile, isPortrait } = useIsMobile();
  const [portraitDismissed, setPortraitDismissed] = useState(false);
  const reorderPan = (panId, targetPanId, side) => dispatch({ type: "reorderPan", panId, targetPanId, side });
  const { panDragId, insertTarget, insertTargetRef, setInsertTarget, setPanDragId, onPanDragStart, onPanDragOver, onPanDrop, onPanDragEnd } = useCaseDrag(reorderPan);

  const usedWidth = sumWidth(pans);
  const remainingWidth = caseWidth - usedWidth;
  const colorWarnings = useMemo(() => colorClashes(pans, indexProducts(products)).map(({ a, b }) =>
    `"${a.product.name}" and "${b.product.name}" are side by side, both ${PRODUCT_COLORS[a.product.color]?.label || a.product.color}`
  ), [pans, products]);

  const productsInCase = useMemo(() => placedIds(pans), [pans]);

  const dividers = useMemo(() => new Set(layout.dividers), [layout.dividers]);
  const toggleDivider = (afterPanId) => dispatch({ type: "toggleDivider", afterPanId });

  // Case-width input: keep the raw text decoupled from the committed/clamped
  // value so clamping mid-typing (e.g. to the width already used by pans)
  // can't stomp on keystrokes before the user finishes typing.
  useEffect(() => {
    if (!caseWidthFocused.current) setCaseWidthDraft(String(caseWidth));
  }, [caseWidth]);
  const commitCaseWidth = (raw) => {
    const clamped = clampCaseWidth(layout, raw);
    dispatch({ type: "setCaseWidth", width: clamped });
    setCaseWidthDraft(String(clamped));
  };

  // Edits that can grow the case ask before expanding it.
  const dispatchOrConfirmExpand = (edit, product) => {
    const { fits, requiredWidth } = checkFit(layout, edit);
    if (fits) dispatch(edit);
    else setConfirmExpand({ edit, requiredWidth, product });
  };
  const confirmExpandAction = () => {
    if (!confirmExpand) return;
    dispatch({ ...confirmExpand.edit, expandCase: true });
    setConfirmExpand(null);
  };

  const addPan = (width, depth, panType) => dispatch({ type: "addPan", width, depth, panType });
  const handleRemovePanClick = (id) => setConfirmRemovePan(id);
  const confirmRemovePanAction = () => { dispatch({ type: "removePan", panId: confirmRemovePan }); setConfirmRemovePan(null); };
  const setPanType = (panId, panType) => dispatch({ type: "setPanType", panId, panType });
  const setSlotType = (panId, slot, panType) => dispatch({ type: "setSlotType", panId, slot, panType });
  const setPanWidth = (panId, width) => dispatchOrConfirmExpand({ type: "resizePan", panId, width });
  const setPanDepth = (panId, depth) => dispatch({ type: "setPanDepth", panId, depth });
  const createPanFromProduct = (productId, index) => {
    const product = products.find((p) => p.id === productId);
    if (product) dispatchOrConfirmExpand({ type: "insertProductPan", product, index }, product);
  };
  const assignProduct = (panId, slot, productId) => dispatch({ type: "assignProduct", panId, slot, productId });
  const moveProduct = (from, to) => dispatch({ type: "moveProduct", from, to });
  const clearSlot = (panId, slotIdx) => setClearSlotConfirm({ panId, slotIdx });
  const confirmClearSlotAction = () => {
    if (!clearSlotConfirm) return;
    dispatch({ type: "clearSlot", panId: clearSlotConfirm.panId, slot: clearSlotConfirm.slotIdx });
    setClearSlotConfirm(null);
  };
  const replaceLayout = (newPans, newCaseWidth) => dispatch({ type: "replaceLayout", pans: newPans, caseWidth: newCaseWidth });

  const { startTouchDrag } = useTouchDrag({
    setInsertTarget, setPanDragId, insertTargetRef,
    onAssignProduct: assignProduct,
    onCreatePanFromProduct: createPanFromProduct,
    onMoveProduct: moveProduct,
    onReorderPan: reorderPan,
  });

  const handleProductSave = (prod) => {
    setProducts((ps) => {
      const idx = ps.findIndex((p) => p.id === prod.id);
      if (idx >= 0) { const c = [...ps]; c[idx] = prod; return c; }
      return [...ps, prod];
    });
    upsertPublicProduct(prod).catch(() => {});
  };
  const deleteProduct = (id) => {
    setProducts((ps) => ps.filter((p) => p.id !== id));
    dispatch({ type: "removeProductEverywhere", productId: id });
    deletePublicProduct(id).catch(() => {});
  };
  const handleGenerate = (items, w) => { replaceLayout(autoGenerateCase(items, w), w); setShowAutoGen(false); };
  const saveCase = () => {
    if (!saveName.trim()) return;
    setSavedCases((sc) => [...sc, { name: saveName.trim(), pans: JSON.parse(JSON.stringify(pans)), caseWidth, savedAt: new Date().toISOString() }]);
    setSaveName("");
    setShowSaveInput(false);
  };
  const loadCase = (c) => { replaceLayout(c.pans, c.caseWidth); setShowSaved(false); showToast(`Loaded "${c.name}"`); };
  const deleteCase = (idx) => setSavedCases((sc) => sc.filter((_, i) => i !== idx));
  const updateLocalCase = (idx) => {
    setSavedCases((sc) => sc.map((c, i) => i === idx ? { ...c, pans: JSON.parse(JSON.stringify(pans)), caseWidth, savedAt: new Date().toISOString() } : c));
    showToast("Save updated");
  };
  const exportCase = (c) => exportCaseToFile(c, products);
  const importCaseFile = async (file) => {
    try {
      const data = await readCaseFile(file);
      // Products live in the shared DB — no merging needed, just load the layout
      setSavedCases((sc) => [...sc, {
        name: data.case.name,
        pans: data.case.pans,
        caseWidth: data.case.caseWidth,
        savedAt: data.case.savedAt || new Date().toISOString(),
      }]);
    } catch (err) {
      alert(err.message);
    }
  };
  const loadPublicCase = (c) => {
    replaceLayout(c.pans, c.caseWidth);
    setShowSaved(false);
    showToast(`Loaded "${c.name}"`);
  };
  const savePublicToLocal = (c) => {
    setSavedCases((sc) => [...sc, { name: c.name, pans: c.pans, caseWidth: c.caseWidth, savedAt: new Date().toISOString() }]);
    showToast(`Saved "${c.name}" to local`);
  };

  const handleSelectProduct = (id) => {
    if (selectedProductId === id) { setSelectedProductId(null); return; }
    setSelectedProductId(id);
    setDrawerOpen(false);
  };
  const handlePickProduct = (panId, slotIdx) => setSlotPicker({ panId, slotIdx });
  const handleSlotPickerAssign = (productId) => {
    if (!slotPicker) return;
    assignProduct(slotPicker.panId, slotPicker.slotIdx, productId);
  };

  const handleMobilePlaceProduct = (panId, slotIdx) => {
    assignProduct(panId, slotIdx, selectedProductId);
    setSelectedProductId(null);
  };

  // Close drawer immediately at touchstart — safe because ProductPool stays mounted (CSS-only hide)
  const poolStartTouchDrag = (e, dragInfo, sourceEl) => { setDrawerOpen(false); startTouchDrag(e, dragInfo, sourceEl); };
  const poolProps = { products, filters, setFilters, startTouchDrag: poolStartTouchDrag, isMobile, selectedProductId, onSelectProduct: handleSelectProduct, productsInCase };

  return (
    <div style={{ minHeight: "100vh", background: T.bg, color: T.text, fontFamily: DFONT }}>
      <header style={{ padding: "10px 16px", background: T.surface, borderBottom: `1px solid ${T.border}`, display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ fontSize: 20 }}>🐟</span>
          <h1 style={{ margin: 0, fontSize: 16, fontWeight: 800, fontFamily: DFONT, background: `linear-gradient(135deg,${T.accent},#818cf8)`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>Case Planner</h1>
        </div>
        <div style={{ flex: 1 }} />
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
      <main style={{ padding: 14, overflowX: "auto", display: "flex", flexDirection: "column", gap: 10, paddingBottom: isMobile ? (drawerOpen ? "calc(58vh + 14px)" : 66) : (drawerOpen ? "calc(45vh + 14px)" : 62) }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <label style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, color: T.textMuted }}>
            Case:<input
              type="number"
              value={caseWidthDraft}
              onFocus={() => { caseWidthFocused.current = true; }}
              onChange={(e) => setCaseWidthDraft(e.target.value)}
              onBlur={(e) => { caseWidthFocused.current = false; commitCaseWidth(e.target.value); }}
              onKeyDown={(e) => { if (e.key === "Enter") e.target.blur(); }}
              style={{ ...S.inp, width: 55, textAlign: "center", padding: "4px 6px" }}
            />
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
          <button style={{ ...S.ch, opacity: canUndo ? 1 : 0.35 }} disabled={!canUndo} onClick={undo}>↩ Undo</button>
          <button style={{ ...S.ch, opacity: canRedo ? 1 : 0.35 }} disabled={!canRedo} onClick={redo}>↪ Redo</button>
        </div>

        <AddPanControls onAddPan={addPan} remainingWidth={remainingWidth} dividerEditMode={dividerEditMode} />

        <CaseGrid
          pans={pans} products={products} caseWidth={caseWidth}
          onAssignProduct={assignProduct} onClearSlot={clearSlot} onMoveProduct={moveProduct}
          onRemovePan={handleRemovePanClick} onSetPanType={setPanType} onSetSlotType={setSlotType}
          onSetPanWidth={setPanWidth} onSetPanDepth={setPanDepth} onCreatePanFromProduct={createPanFromProduct}
          insertTarget={insertTarget} onPanDragStart={onPanDragStart}
          onPanDragOver={onPanDragOver} onPanDrop={onPanDrop} onPanDragEnd={onPanDragEnd}
          setInsertTarget={setInsertTarget} setPanDragId={setPanDragId} panDragId={panDragId}
          isMobile={isMobile} isPortrait={isPortrait} startTouchDrag={startTouchDrag}
          selectedProductId={selectedProductId} onMobilePlaceProduct={handleMobilePlaceProduct}
          onPickProduct={handlePickProduct}
          dividers={dividers} onToggleDivider={toggleDivider}
          dividerEditMode={dividerEditMode} onToggleDividerEditMode={() => setDividerEditMode((v) => !v)}
        />

        {colorWarnings.length > 0 && (
          <div style={{ padding: "6px 10px", borderRadius: 6, background: T.warning + "12", border: `1px solid ${T.warning}22` }}>
            {colorWarnings.map((w, i) => <div key={i} style={{ fontSize: 10, color: T.warning }}>⚠ {w}</div>)}
          </div>
        )}

      </main>

      {/* Product pool — fixed bottom bar for both desktop and mobile */}
      {isMobile && selectedProduct && !drawerOpen && (
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
        height: drawerOpen ? (isMobile ? "58vh" : "45vh") : 48,
        transition: "height 0.25s ease",
        display: "flex", flexDirection: "column", overflow: "hidden",
      }}>
        {/* Handle bar */}
        <div
          onClick={() => setDrawerOpen((o) => !o)}
          style={{ height: 48, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", padding: "0 16px", cursor: "pointer", touchAction: "manipulation", position: "relative" }}
        >
          <span style={{
            fontSize: isMobile ? 12 : 14,
            color: isMobile && selectedProductId ? T.accent : T.textMuted,
            fontFamily: isMobile ? FONT : DFONT,
            userSelect: "none",
            fontWeight: isMobile && selectedProductId ? 700 : 700,
            textTransform: isMobile ? "uppercase" : "none",
            letterSpacing: isMobile ? 0.5 : 0,
          }}>
            {isMobile && selectedProductId ? `${selectedProduct?.name} selected` : "Products"} {drawerOpen ? "▼" : "▲"}
          </span>
          <div style={{ position: "absolute", right: 16, display: "flex", gap: 6, alignItems: "center" }}>
            <button
              style={{ ...S.hb, fontSize: isMobile ? 10 : 12, padding: isMobile ? "3px 8px" : "5px 10px", opacity: productsRefreshing ? 0.5 : 1 }}
              onClick={(e) => { e.stopPropagation(); refreshProducts(); }}
              title="Refresh product list from database"
              disabled={productsRefreshing}
            >{productsRefreshing ? "⟳" : "⟳"} {!isMobile && "Refresh"}</button>
            <button style={{ ...S.hb, fontSize: isMobile ? 10 : 12, padding: isMobile ? "3px 10px" : "5px 14px" }} onClick={(e) => { e.stopPropagation(); setShowProductManager(true); }}>Manage</button>
          </div>
        </div>
        {/* Pool content — always mounted so drag source elements stay in DOM */}
        <div style={{ flex: 1, overflowY: "auto", padding: "0 10px 10px", display: "flex", flexDirection: "column", gap: 6, visibility: drawerOpen ? "visible" : "hidden", pointerEvents: drawerOpen ? "auto" : "none" }}>
          <ProductPool {...poolProps} />
        </div>
      </div>

      {slotPicker && (() => {
        const pan = pans.find((p) => p.id === slotPicker.panId);
        return pan ? (
          <SlotPickerModal
            pan={pan} slotIdx={slotPicker.slotIdx}
            pans={pans} products={products}
            onAssign={handleSlotPickerAssign}
            onClose={() => setSlotPicker(null)}
          />
        ) : null;
      })()}
      {showProductManager && <ProductManagerModal products={products} onSave={handleProductSave} onDelete={deleteProduct} onClose={() => setShowProductManager(false)} />}
      {showAutoGen && <AutoGenModal products={products} savedCases={savedCases} onGenerate={handleGenerate} onClose={() => setShowAutoGen(false)} />}
      {showPrint && <PrintView pans={pans} products={products} caseWidth={caseWidth} onClose={() => setShowPrint(false)} />}
      {showSaved && <SavedCasesModal savedCases={savedCases} products={products} onLoad={loadCase} onDelete={deleteCase} onExport={exportCase} onImport={importCaseFile} onLoadPublic={loadPublicCase} onUpdateLocal={updateLocalCase} onSavePublicToLocal={savePublicToLocal} currentPans={pans} currentCaseWidth={caseWidth} onClose={() => setShowSaved(false)} />}
      {confirmClear && <ConfirmDialog message="Clear all pans from the case?" onConfirm={() => { replaceLayout([], caseWidth); setConfirmClear(false); }} onCancel={() => setConfirmClear(false)} confirmLabel="Clear" />}
      {confirmRemovePan && <ConfirmDialog message="Remove this pan? Any products in its slots will be unassigned." onConfirm={confirmRemovePanAction} onCancel={() => setConfirmRemovePan(null)} confirmLabel="Remove" />}
      {clearSlotConfirm && <ConfirmDialog message="Remove product from this slot? Consider editing instead if this was a mistake." onConfirm={confirmClearSlotAction} onCancel={() => setClearSlotConfirm(null)} confirmLabel="Remove" />}
      {confirmExpand && <ConfirmDialog
        message={confirmExpand.edit.type === "resizePan"
          ? `Resizing this pan to ${confirmExpand.edit.width} won't fit — the case would need to expand to ${confirmExpand.requiredWidth} units. Expand the case?`
          : `No room for ${confirmExpand.product.name} — needs ${confirmExpand.product.minPan} units but only ${remainingWidth} left. Add anyway and expand the case to ${confirmExpand.requiredWidth}?`}
        onConfirm={confirmExpandAction}
        onCancel={() => setConfirmExpand(null)}
        confirmLabel="Expand & Apply"
      />}
      {toast && (
        <div style={{
          position: "fixed", bottom: isMobile ? 56 : 20, left: "50%", transform: "translateX(-50%)",
          background: T.surface, color: T.text, border: `1px solid ${T.borderLight}`,
          padding: "8px 20px", borderRadius: 8, fontSize: 12, fontFamily: DFONT, fontWeight: 600,
          boxShadow: "0 4px 16px rgba(0,0,0,0.4)", zIndex: 9999,
          animation: "fadeIn 0.15s ease",
        }}>{toast}</div>
      )}
    </div>
  );
}
