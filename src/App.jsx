import { useState, useMemo, useEffect, useRef } from "react";
import { T, S, FONT, DFONT, PRODUCT_COLORS } from "./utils/constants.js";
import { checkFit, clampCaseWidth, usedWidth as sumWidth } from "./case/layout.js";
import { exportCaseToFile, readCaseFile } from "./utils/caseFile.js";
import { toSavedCase, readSavedCase } from "./case/savedCase.js";
import { autoGenerateCase } from "./utils/autoGenerate.js";
import { dropToEdit } from "./case/drop.js";
import { colorClashes, indexProducts, productsInCase as placedIds } from "./case/queries.js";
import { useLocalStorage } from "./hooks/useLocalStorage.js";
import { useLayout } from "./hooks/useLayout.js";
import { useProductCatalog } from "./hooks/useProductCatalog.js";
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
import PanSheet from "./components/PanSheet.jsx";

export default function App() {
  const catalog = useProductCatalog();
  const { products } = catalog;
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
  const [confirmExpand, setConfirmExpand] = useState(null); // { edit, requiredWidth, product? }
  const [slotPicker, setSlotPicker] = useState(null); // { panId, slotIdx }
  const [panSheetId, setPanSheetId] = useState(null);
  const [toast, setToast] = useState(null); // { msg, undoable }
  const showToast = (msg, { undoable = false } = {}) => {
    const t = { msg, undoable };
    setToast(t);
    setTimeout(() => setToast((cur) => cur === t ? null : cur), undoable ? 5000 : 2000);
  };

  // Routine removals happen at once and offer Undo in a toast instead of asking first.
  // The toast's Undo only applies while the removal is still the latest edit.
  const undoToastLayout = useRef(null);
  const editWithUndo = (edit, msg) => {
    undoToastLayout.current = "pending";
    dispatch(edit);
    showToast(msg, { undoable: true });
  };
  useEffect(() => {
    if (undoToastLayout.current === "pending") { undoToastLayout.current = layout; return; }
    if (undoToastLayout.current && undoToastLayout.current !== layout) {
      undoToastLayout.current = null;
      setToast((t) => t?.undoable ? null : t);
    }
  }, [layout]);
  const undoFromToast = () => { undo(); setToast(null); };

  const refreshProducts = () => {
    if (catalog.refreshing) return;
    catalog.refresh()
      .then((ps) => showToast(`Products updated (${ps.length})`))
      .catch((err) => showToast(`Couldn't refresh products: ${err.message}`));
  };

  const [selectedProductId, setSelectedProductId] = useState(null);
  const selectedProduct = selectedProductId ? products.find((p) => p.id === selectedProductId) : null;

  const { isMobile, isPortrait } = useIsMobile();
  const tap = isMobile ? { minHeight: 44, minWidth: 44, fontSize: 13 } : {};
  const barHeight = isMobile ? 56 : 48;
  const drag = useCaseDrag(handleDrop);

  const usedWidth = sumWidth(pans);
  const remainingWidth = caseWidth - usedWidth;
  // Pans are numbered from the left, as they stand in the case.
  const colorWarnings = useMemo(() => {
    const position = new Map(pans.map((p, i) => [p.id, i + 1]));
    return colorClashes(pans, indexProducts(products)).map(({ a, b }) => {
      const color = PRODUCT_COLORS[a.product.color]?.label || a.product.color;
      return `Pans ${position.get(a.panId)} and ${position.get(b.panId)}: ${a.product.name} and ${b.product.name} are both ${color} and blend together.`;
    });
  }, [pans, products]);

  const productsInCase = useMemo(() => placedIds(pans), [pans]);

  const dividers = useMemo(() => new Set(layout.dividers), [layout.dividers]);

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
  const handleRemovePanClick = (id) => {
    const pan = pans.find((p) => p.id === id);
    editWithUndo({ type: "removePan", panId: id }, pan ? `Removed ${pan.width}-wide pan` : "Removed pan");
  };
  const setPanType = (panId, panType) => dispatch({ type: "setPanType", panId, panType });
  const setSlotType = (panId, slot, panType) => dispatch({ type: "setSlotType", panId, slot, panType });
  const setPanWidth = (panId, width) => dispatchOrConfirmExpand({ type: "resizePan", panId, width });
  const setPanDepth = (panId, depth) => dispatch({ type: "setPanDepth", panId, depth });
  const assignProduct = (panId, slot, productId) => dispatch({ type: "assignProduct", panId, slot, productId });
  const clearSlot = (panId, slotIdx) => {
    const id = pans.find((p) => p.id === panId)?.slots[slotIdx];
    const name = products.find((p) => p.id === id)?.name;
    editWithUndo({ type: "clearSlot", panId, slot: slotIdx }, name ? `Removed ${name}` : "Removed product");
  };
  const replaceLayout = (newPans, newCaseWidth, dividers = []) => dispatch({ type: "replaceLayout", pans: newPans, caseWidth: newCaseWidth, dividers });

  // Every drop (mouse, touch, or tap-to-place on mobile) lands here. A function
  // declaration so useCaseDrag above can take it before this line runs.
  function handleDrop(source, target) {
    const edit = dropToEdit(source, target, { findProduct: (id) => products.find((p) => p.id === id), dividerEditMode });
    if (edit) dispatchOrConfirmExpand(edit, edit.product);
    if (source.kind === "pool" && source.productId === selectedProductId) setSelectedProductId(null);
  }

  const { startTouchDrag } = useTouchDrag({
    setInsertTarget: drag.setInsertTarget, setPanDragId: drag.setPanDragId, insertTargetRef: drag.insertTargetRef,
    onDrop: handleDrop,
  });

  // Both reject when the server refuses, so the Product Manager keeps the form open.
  const handleProductSave = (prod) => catalog.save(prod).catch((err) => {
    showToast(`Couldn't save ${prod.name}: ${err.message}`);
    throw err;
  });
  const deleteProduct = (id) => {
    const name = products.find((p) => p.id === id)?.name || "product";
    return catalog.remove(id)
      .then(() => dispatch({ type: "removeProductEverywhere", productId: id }))
      .catch((err) => {
        showToast(`Couldn't delete ${name}: ${err.message}`);
        throw err;
      });
  };
  const handleGenerate = (items, w) => { replaceLayout(autoGenerateCase(items, w), w); setShowAutoGen(false); };
  const saveCase = () => {
    if (!saveName.trim()) return;
    setSavedCases((sc) => [...sc, toSavedCase(layout, saveName.trim())]);
    setSaveName("");
    setShowSaveInput(false);
  };
  // Local and Published Cases load the same way.
  const loadCase = (c) => {
    const { case: saved, error } = readSavedCase(c);
    if (error) { showToast(`Couldn't load "${c.name}": ${error}`); return; }
    replaceLayout(saved.pans, saved.caseWidth, saved.dividers);
    setShowSaved(false);
    showToast(`Loaded "${saved.name}"`);
  };
  const deleteCase = (idx) => setSavedCases((sc) => sc.filter((_, i) => i !== idx));
  const updateLocalCase = (idx) => {
    setSavedCases((sc) => sc.map((c, i) => i === idx ? toSavedCase(layout, c.name) : c));
    showToast("Save updated");
  };
  const exportCase = (c) => exportCaseToFile(c, products);
  const importCaseFile = async (file) => {
    try {
      const data = await readCaseFile(file);
      // Products live in the shared catalog, so only the case is kept
      setSavedCases((sc) => [...sc, data.case]);
    } catch (err) {
      alert(err.message);
    }
  };
  const savePublicToLocal = (c) => {
    const { case: saved, error } = readSavedCase(c);
    if (error) { showToast(`Couldn't save "${c.name}": ${error}`); return; }
    setSavedCases((sc) => [...sc, { ...saved, savedAt: new Date().toISOString() }]);
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

  // Close drawer immediately at touchstart — safe because ProductPool stays mounted (CSS-only hide)
  const poolStartTouchDrag = (e, dragInfo, sourceEl, opts) => { setDrawerOpen(false); startTouchDrag(e, dragInfo, sourceEl, opts); };
  const poolProps = { products, filters, setFilters, startTouchDrag: poolStartTouchDrag, isMobile, selectedProductId, onSelectProduct: handleSelectProduct, productsInCase };

  return (
    <div style={{ minHeight: "100vh", background: T.bg, color: T.text, fontFamily: DFONT }}>
      <header style={{ padding: "10px 16px", background: T.surface, borderBottom: `1px solid ${T.border}`, display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ fontSize: 20 }}>🐟</span>
          <h1 style={{ margin: 0, fontSize: 16, fontWeight: 800, fontFamily: DFONT, background: `linear-gradient(135deg,${T.accent},#818cf8)`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>Case Planner</h1>
        </div>
        <div style={{ flex: 1 }} />
        <button style={{ ...S.hb, ...tap }} onClick={() => setShowAutoGen(true)}>⚡ Auto</button>
        <button style={{ ...S.hb, ...tap }} onClick={() => setShowSaved(true)}>📁 Saved</button>
        <button style={{ ...S.hb, ...tap }} onClick={() => setShowPrint(true)}>🖨 Print</button>
      </header>

      <main style={{ padding: 14, display: "flex", flexDirection: "column", gap: 10, paddingBottom: isMobile ? (drawerOpen ? "calc(58vh + 14px)" : barHeight + 18) : (drawerOpen ? "calc(45vh + 14px)" : barHeight + 14) }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <label style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, color: T.textMuted }}>
            Case:<input
              type="number"
              value={caseWidthDraft}
              onFocus={() => { caseWidthFocused.current = true; }}
              onChange={(e) => setCaseWidthDraft(e.target.value)}
              onBlur={(e) => { caseWidthFocused.current = false; commitCaseWidth(e.target.value); }}
              onKeyDown={(e) => { if (e.key === "Enter") e.target.blur(); }}
              style={{ ...S.inp, width: 60, textAlign: "center", padding: "4px 6px", ...(isMobile && { minHeight: 44, fontSize: 16 }) }}
            />
          </label>
          <span style={{ fontSize: 11, fontFamily: FONT, padding: "3px 8px", borderRadius: 4, background: remainingWidth < 0 ? T.danger + "33" : T.accentDim + "33", color: remainingWidth < 0 ? T.danger : T.accent }}>
            {usedWidth}/{caseWidth} · {remainingWidth} left
          </span>
          {showSaveInput ? (
            <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
              <input style={{ ...S.inp, width: 130, fontSize: 11, padding: "4px 8px", ...(isMobile && { minHeight: 44, fontSize: 16 }) }} value={saveName} onChange={(e) => setSaveName(e.target.value)} placeholder="Case name..." onKeyDown={(e) => e.key === "Enter" && saveCase()} autoFocus />
              <button style={{ ...S.ch, ...tap, background: T.accent, color: T.bg }} onClick={saveCase}>Save</button>
              <button style={{ ...S.ch, ...tap }} aria-label="Cancel" onClick={() => setShowSaveInput(false)}>×</button>
            </div>
          ) : (
            <button style={{ ...S.ch, ...tap }} onClick={() => setShowSaveInput(true)}>💾 Save</button>
          )}
          <button style={{ ...S.ch, ...tap, color: T.danger }} onClick={() => setConfirmClear(true)}>🗑 Clear</button>
          {/* On phones Undo/Redo live in the bottom bar, within thumb reach */}
          {!isMobile && <button style={{ ...S.ch, opacity: canUndo ? 1 : 0.35 }} disabled={!canUndo} onClick={undo}>↩ Undo</button>}
          {!isMobile && <button style={{ ...S.ch, opacity: canRedo ? 1 : 0.35 }} disabled={!canRedo} onClick={redo}>↪ Redo</button>}
        </div>

        <AddPanControls onAddPan={addPan} remainingWidth={remainingWidth} dividerEditMode={dividerEditMode} />

        <CaseGrid
          pans={pans} products={products} caseWidth={caseWidth}
          onDrop={handleDrop} drag={drag}
          onOpenPanSheet={setPanSheetId}
          isMobile={isMobile} isPortrait={isPortrait} startTouchDrag={startTouchDrag}
          selectedProductId={selectedProductId} onPickProduct={handlePickProduct}
          dividers={dividers}
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
          position: "fixed", bottom: barHeight, left: 0, right: 0, zIndex: 299,
          background: T.accent, padding: "8px 14px",
          display: "flex", alignItems: "center", gap: 8,
        }}>
          <span style={{ flex: 1, fontSize: 12, fontWeight: 700, color: T.bg, fontFamily: DFONT }}>
            {selectedProduct.name} — tap a slot to place
          </span>
          <button
            onClick={() => setSelectedProductId(null)}
            aria-label="Stop placing"
            style={{ background: "none", border: "none", color: T.bg, fontSize: 20, cursor: "pointer", minWidth: 44, minHeight: 36, lineHeight: 1, opacity: 0.8 }}
          >×</button>
        </div>
      )}
      <div style={{
        position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 300,
        background: T.surface, borderTop: `1px solid ${T.borderLight}`,
        borderRadius: "12px 12px 0 0",
        height: drawerOpen ? (isMobile ? "58vh" : "45vh") : barHeight,
        transition: "height 0.25s ease",
        display: "flex", flexDirection: "column", overflow: "hidden",
      }}>
        {/* Handle bar */}
        <div
          onClick={() => setDrawerOpen((o) => !o)}
          style={{ height: barHeight, flexShrink: 0, display: "flex", alignItems: "center", gap: 6, padding: isMobile ? "0 8px" : "0 16px", cursor: "pointer", touchAction: "manipulation" }}
        >
          <div style={{ flex: 1, display: "flex", gap: 4 }}>
            {isMobile && (
              <>
                <button style={{ ...S.hb, ...tap, fontSize: 18, opacity: canUndo ? 1 : 0.35 }} disabled={!canUndo} aria-label="Undo" onClick={(e) => { e.stopPropagation(); undo(); }}>↩</button>
                <button style={{ ...S.hb, ...tap, fontSize: 18, opacity: canRedo ? 1 : 0.35 }} disabled={!canRedo} aria-label="Redo" onClick={(e) => { e.stopPropagation(); redo(); }}>↪</button>
              </>
            )}
          </div>
          <span style={{
            flexShrink: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
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
          <div style={{ flex: 1, display: "flex", gap: 4, alignItems: "center", justifyContent: "flex-end" }}>
            <button
              style={{ ...S.hb, fontSize: 12, padding: "5px 10px", ...tap, opacity: catalog.refreshing ? 0.5 : 1 }}
              onClick={(e) => { e.stopPropagation(); refreshProducts(); }}
              title="Refresh product list from database"
              aria-label="Refresh products"
              disabled={catalog.refreshing}
            >⟳ {!isMobile && "Refresh"}</button>
            <button style={{ ...S.hb, fontSize: 12, padding: isMobile ? "5px 10px" : "5px 14px", ...tap }} onClick={(e) => { e.stopPropagation(); setShowProductManager(true); }}>Manage</button>
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
            onRemove={() => { clearSlot(pan.id, slotPicker.slotIdx); setSlotPicker(null); }}
            onClose={() => setSlotPicker(null)}
          />
        ) : null;
      })()}
      {panSheetId && (() => {
        const i = pans.findIndex((p) => p.id === panSheetId);
        if (i === -1) return null;
        const pan = pans[i];
        return (
          <PanSheet
            pan={pan} position={i + 1} remainingWidth={remainingWidth}
            onSetWidth={(w) => setPanWidth(pan.id, w)}
            onSetDepth={(d) => setPanDepth(pan.id, d)}
            onSetPanType={(t) => setPanType(pan.id, t)}
            onSetSlotType={(slot, t) => setSlotType(pan.id, slot, t)}
            onRemove={() => { handleRemovePanClick(pan.id); setPanSheetId(null); }}
            onClose={() => setPanSheetId(null)}
          />
        );
      })()}
      {showProductManager && <ProductManagerModal products={products} onSave={handleProductSave} onDelete={deleteProduct} onClose={() => setShowProductManager(false)} />}
      {showAutoGen && <AutoGenModal products={products} savedCases={savedCases} onGenerate={handleGenerate} onClose={() => setShowAutoGen(false)} />}
      {showPrint && <PrintView pans={pans} products={products} caseWidth={caseWidth} onClose={() => setShowPrint(false)} />}
      {showSaved && <SavedCasesModal savedCases={savedCases} products={products} onLoad={loadCase} onDelete={deleteCase} onExport={exportCase} onImport={importCaseFile} onLoadPublic={loadCase} onUpdateLocal={updateLocalCase} onSavePublicToLocal={savePublicToLocal} currentLayout={layout} onClose={() => setShowSaved(false)} />}
      {confirmClear && <ConfirmDialog message={pans.length === 1 ? "Clear the only pan from the case? Undo brings it back." : `Clear all ${pans.length} pans from the case? Undo brings them back.`} onConfirm={() => { replaceLayout([], caseWidth); setConfirmClear(false); }} onCancel={() => setConfirmClear(false)} confirmLabel="Clear case" />}
      {confirmExpand && <ConfirmDialog
        message={confirmExpand.edit.type === "resizePan"
          ? `${confirmExpand.edit.width === 8 ? "An" : "A"} ${confirmExpand.edit.width}-wide pan won't fit. Grow the case from ${caseWidth} to ${confirmExpand.requiredWidth} units?`
          : `${confirmExpand.product.name} needs ${confirmExpand.product.minPan} units and only ${remainingWidth} are left. Add it and grow the case from ${caseWidth} to ${confirmExpand.requiredWidth} units?`}
        onConfirm={confirmExpandAction}
        onCancel={() => setConfirmExpand(null)}
        confirmLabel="Grow case"
      />}
      {toast && (
        <div role="status" style={{
          position: "fixed", bottom: barHeight + 8, left: "50%", transform: "translateX(-50%)",
          background: T.surface, color: T.text, border: `1px solid ${T.borderLight}`,
          padding: toast.undoable ? "0 0 0 16px" : "8px 20px", borderRadius: 8, fontSize: 13, fontFamily: DFONT, fontWeight: 600,
          boxShadow: "0 4px 16px rgba(0,0,0,0.4)", zIndex: 9999,
          animation: "fadeIn 0.15s ease",
          display: "flex", alignItems: "center", gap: 4, maxWidth: "calc(100vw - 32px)", whiteSpace: "nowrap",
        }}>
          <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>{toast.msg}</span>
          {toast.undoable && (
            <button
              onClick={undoFromToast}
              style={{ minHeight: 44, minWidth: 64, padding: "0 16px", background: "none", border: "none", color: T.accent, fontSize: 13, fontWeight: 700, fontFamily: DFONT, cursor: "pointer" }}
            >Undo</button>
          )}
        </div>
      )}
    </div>
  );
}
