import { T, FONT, DFONT, PAN_WIDTHS } from "../utils/constants.js";
import { getDepthSlots, getSlotLabel } from "../utils/helpers.js";
import { canSplitDepth } from "../case/layout.js";
import { useIsMobile } from "../hooks/useIsMobile.js";

const DEPTH_OPTIONS = [
  { key: "full", label: "Full" },
  { key: "half", label: "Half" },
  { key: "third", label: "Third" },
];

const TYPE_COLORS = { deep: "#3b82f6", shallow: "#f59e0b" };

// Every setting for one Pan, behind a tap on its header. Each choice applies at
// once (and can be undone); the sheet stays open until closed or the Pan is removed.
export default function PanSheet({ pan, position, remainingWidth, onSetWidth, onSetDepth, onSetPanType, onSetSlotType, onRemove, onClose }) {
  const { isMobile } = useIsMobile();
  const maxAllowed = remainingWidth + pan.width;
  const isSplit = pan.depth !== "full";

  return (
    <div
      onClick={onClose}
      style={{ position: "fixed", inset: 0, zIndex: 900, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: isMobile ? "flex-end" : "center", justifyContent: "center", padding: isMobile ? 0 : 16 }}
    >
      <div
        role="dialog"
        aria-label={`Pan ${position}`}
        onClick={(e) => e.stopPropagation()}
        style={{
          background: T.surface, border: `1px solid ${T.borderLight}`, width: "100%", maxWidth: 420,
          borderRadius: isMobile ? "14px 14px 0 0" : 12, boxShadow: "0 -8px 40px rgba(0,0,0,0.5)",
          padding: "8px 16px", paddingBottom: isMobile ? "max(16px, env(safe-area-inset-bottom))" : 16,
          display: "flex", flexDirection: "column", gap: 14, fontFamily: DFONT,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ flex: 1, fontSize: 15, fontWeight: 700, color: T.text }}>
            Pan {position} <span style={{ color: T.textMuted, fontWeight: 500 }}>· {pan.width} wide · {DEPTH_OPTIONS.find((d) => d.key === pan.depth)?.label}</span>
          </div>
          <button onClick={onClose} aria-label="Close" style={{ minWidth: 44, minHeight: 44, background: "none", border: "none", color: T.textMuted, fontSize: 22, cursor: "pointer" }}>×</button>
        </div>

        <Group label="Width">
          {PAN_WIDTHS.map((w) => {
            const grows = w > maxAllowed;
            return (
              <Choice key={w} active={w === pan.width} onClick={() => onSetWidth(w)} mono>
                {w}{grows && <span style={{ fontSize: 11, color: w === pan.width ? T.bg : T.warning, marginLeft: 3 }}>+{w - maxAllowed}</span>}
              </Choice>
            );
          })}
        </Group>
        {PAN_WIDTHS.some((w) => w > maxAllowed) && (
          <div style={{ fontSize: 12, color: T.textMuted, marginTop: -8 }}>+N grows the case by that many units.</div>
        )}

        {canSplitDepth(pan.width) ? (
          <Group label="Split">
            {DEPTH_OPTIONS.map((d) => (
              <Choice key={d.key} active={pan.depth === d.key} onClick={() => onSetDepth(d.key)}>{d.label}</Choice>
            ))}
          </Group>
        ) : (
          <div style={{ fontSize: 12, color: T.textMuted }}>{pan.width}-wide pans are always full depth.</div>
        )}

        {isSplit ? (
          getDepthSlots(pan.depth).map((slot) => {
            const type = pan.slotTypes?.[slot] ?? pan.panType;
            return (
              <Group key={slot} label={getSlotLabel(pan.depth, slot)}>
                <TypeChoices value={type} onChange={(t) => onSetSlotType(slot, t)} />
              </Group>
            );
          })
        ) : (
          <Group label="Pan type">
            <TypeChoices value={pan.panType} onChange={onSetPanType} />
          </Group>
        )}

        <button
          onClick={onRemove}
          style={{ minHeight: 48, borderRadius: 8, background: "none", border: `1px solid ${T.danger}66`, color: T.danger, fontSize: 14, fontWeight: 700, fontFamily: DFONT, cursor: "pointer", marginTop: 4 }}
        >Remove pan</button>
      </div>
    </div>
  );
}

function Group({ label, children }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <div style={{ fontSize: 12, color: T.textMuted, fontWeight: 600 }}>{label}</div>
      <div style={{ display: "flex", gap: 6 }}>{children}</div>
    </div>
  );
}

function Choice({ active, onClick, children, mono, activeColor = T.accent }) {
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      style={{
        flex: 1, minHeight: 48, borderRadius: 8, cursor: "pointer",
        fontSize: mono ? 17 : 14, fontWeight: 700, fontFamily: mono ? FONT : DFONT,
        background: active ? activeColor : T.surfaceAlt,
        color: active ? T.bg : T.text,
        border: `1px solid ${active ? activeColor : T.border}`,
      }}
    >{children}</button>
  );
}

function TypeChoices({ value, onChange }) {
  return ["shallow", "deep"].map((t) => (
    <Choice key={t} active={value === t} activeColor={TYPE_COLORS[t]} onClick={() => onChange(t)}>
      {t === "shallow" ? "Shallow" : "Deep"}
    </Choice>
  ));
}
