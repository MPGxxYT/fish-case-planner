import { T, S } from "../utils/constants.js";

export default function ConfirmDialog({ message, onConfirm, onCancel, confirmLabel = "Delete" }) {
  return (
    <div style={S.ov} onClick={onCancel}>
      <div style={{ ...S.mod, maxWidth: 360 }} onClick={(e) => e.stopPropagation()}>
        <p style={{ margin: 0, fontSize: 14, color: T.text, lineHeight: 1.5 }}>{message}</p>
        <div style={{ display: "flex", gap: 8, marginTop: 16, justifyContent: "flex-end" }}>
          <button style={S.bs} onClick={onCancel}>Cancel</button>
          <button style={{ ...S.bp, background: T.danger }} onClick={onConfirm}>{confirmLabel}</button>
        </div>
      </div>
    </div>
  );
}
