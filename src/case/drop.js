// What a drop means. Mouse drag, touch drag and tap-to-place all describe a
// drop as (source, target) and get the Layout edit from here.
//
// Sources: { kind: "pool", productId }            a Product from the Product Pool
//          { kind: "slot", panId, slot, productId } a Product already in a Slot
//          { kind: "pan", panId }                   a Pan, dragged by its header
//          { kind: "divider" }                      a Divider from the toolbar
// Targets: { kind: "slot", panId, slot }
//          { kind: "gap", index, afterPanId }       between Pans; afterPanId is "start"
//                                                   before the first Pan, null for the
//                                                   empty space at the end
//          { kind: "empty" }                        the empty Case
//          { kind: "pan", panId, side }             "left" or "right" of a Pan

// Can a source of this kind land on this target? Cheap enough for dragover.
export function canDrop(sourceKind, target, { dividerEditMode = false } = {}) {
  if (!target) return false;
  switch (sourceKind) {
    case "pool": return target.kind === "slot" || target.kind === "gap" || target.kind === "empty";
    case "slot": return target.kind === "slot";
    case "pan": return target.kind === "pan";
    case "divider": return dividerEditMode && target.kind === "gap" && !!target.afterPanId;
    default: return false;
  }
}

// The Layout edit for a drop, or null when the drop does nothing.
export function dropToEdit(source, target, { findProduct = () => undefined, dividerEditMode = false } = {}) {
  if (!source || !canDrop(source.kind, target, { dividerEditMode })) return null;
  switch (source.kind) {
    case "pool": {
      if (!source.productId) return null;
      if (target.kind === "slot") return { type: "assignProduct", panId: target.panId, slot: target.slot, productId: source.productId };
      const product = findProduct(source.productId);
      if (!product) return null;
      return { type: "insertProductPan", product, index: target.kind === "empty" ? 0 : target.index };
    }
    case "slot":
      return { type: "moveProduct", from: { panId: source.panId, slot: source.slot }, to: { panId: target.panId, slot: target.slot } };
    case "pan":
      if (source.panId === target.panId) return null;
      return { type: "reorderPan", panId: source.panId, targetPanId: target.panId, side: target.side };
    case "divider":
      return { type: "toggleDivider", afterPanId: target.afterPanId };
    default:
      return null;
  }
}
