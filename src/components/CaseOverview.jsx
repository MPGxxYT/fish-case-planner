import { T, PRODUCT_COLORS } from "../utils/constants.js";
import { getDepthSlots } from "../utils/helpers.js";

// The whole case at a glance: every Pan as a block in proportion, colored by
// the Products in its Slots (front on top), with a frame over the part the case
// view is scrolled to. Tapping a spot scrolls the case there.
export default function CaseOverview({ pans, products, caseWidth, view, onJump }) {
  const total = Math.max(caseWidth, pans.reduce((s, p) => s + p.width, 0));
  const productById = new Map(products.map((p) => [p.id, p]));
  const frameLeft = view.scrollWidth ? (view.scrollLeft / view.scrollWidth) * 100 : 0;
  const frameWidth = view.scrollWidth ? (view.clientWidth / view.scrollWidth) * 100 : 100;

  const jump = (e) => {
    const r = e.currentTarget.getBoundingClientRect();
    onJump((e.clientX - r.left) / r.width);
  };

  return (
    <button
      type="button"
      onClick={jump}
      aria-label="Case overview. Tap to scroll the case to that spot."
      style={{ display: "block", width: "100%", minHeight: 44, padding: "8px 0", background: "none", border: "none", cursor: "pointer" }}
    >
      <div style={{ position: "relative", display: "flex", height: 28, borderRadius: 4, overflow: "hidden", background: T.surface, border: `1px solid ${T.border}` }}>
        {pans.map((pan) => (
          <div key={pan.id} style={{ width: `${(pan.width / total) * 100}%`, display: "flex", flexDirection: "column", gap: 1, borderRight: `1px solid ${T.bg}` }}>
            {getDepthSlots(pan.depth).map((slot) => {
              const product = productById.get(pan.slots[slot]);
              return <div key={slot} style={{ flex: 1, background: product ? (PRODUCT_COLORS[product.color]?.bg ?? T.textDim) : T.surfaceAlt }} />;
            })}
          </div>
        ))}
        <div aria-hidden="true" style={{
          position: "absolute", top: 0, bottom: 0, left: `${frameLeft}%`, width: `${frameWidth}%`,
          border: `2px solid ${T.text}`, borderRadius: 3, boxShadow: "0 0 0 999px rgba(10,14,23,0.45)",
        }} />
      </div>
    </button>
  );
}
