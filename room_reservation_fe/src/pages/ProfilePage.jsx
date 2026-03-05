import React, { useState } from "react";
import { useAuth } from "../auth/AuthContext.jsx";
import { apiChangePassword, extractApiErrorMessage } from "../api/api.js";

const COLORS = {
  page: "var(--bg-primary)",        // Main background
  card: "var(--bg-card)",           // Card background
  border: "var(--border-medium)",   // Border color
  text: "var(--text-primary)",      // Primary text
  muted: "var(--text-secondary)",   // Secondary text
  inputBg: "var(--bg-input)",       // Input background
};

function Modal({ open, title, children, onClose }) {
  if (!open) return null;

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.55)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 999,
        padding: 16,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "min(720px, 100%)",
          background: COLORS.card,
          border: `1px solid ${COLORS.border}`,
          borderRadius: 14,
          padding: 16,
          color: COLORS.text,
          boxShadow: "0 10px 30px rgba(0,0,0,0.45)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
          <h3 style={{ margin: 0 }}>{title}</h3>
          <button
            onClick={onClose}
            style={{
              padding: "6px 10px",
              borderRadius: 10,
              border: `1px solid ${COLORS.border}`,
              background: "var(--bg-input)",
              color: COLORS.text,
              cursor: "pointer",
            }}
          >
            X
          </button>
        </div>

        <div style={{ marginTop: 12 }}>{children}</div>
      </div>
    </div>
  );
}

export default function ProfilePage() {
  const { user } = useAuth();

  const firstName = user?.firstName || "-";
  const lastName = user?.lastName || "-";
  const email = user?.email || "-";
  const role = user?.role || "-";

  const [open, setOpen] = useState(false);
  const [oldPass, setOldPass] = useState("");
  const [newPass1, setNewPass1] = useState("");
  const [newPass2, setNewPass2] = useState("");
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");
  const [loading, setLoading] = useState(false);

  const close = () => {
    setOpen(false);
    setOldPass("");
    setNewPass1("");
    setNewPass2("");
    setErr("");
    setOk("");
    setLoading(false);
  };

  const submit = async () => {
    setErr("");
    setOk("");

    if (!oldPass || !newPass1 || !newPass2) return setErr("Popuni sva polja.");
    if (newPass1 !== newPass2) return setErr("Nova šifra se ne poklapa (unesi isto 2 puta).");
    if (newPass1.length < 4) return setErr("Nova šifra je prekratka.");

    setLoading(true);
    try {
      // Backend očekuje userId, oldPassword, newPassword :contentReference[oaicite:5]{index=5}
      await apiChangePassword({
        userId: user?.id,
        oldPassword: oldPass,
        newPassword: newPass1,
      });
      setOk("Šifra je uspešno promenjena.");
      setTimeout(close, 700);
    } catch (e) {
      setErr(extractApiErrorMessage(e, "Neuspešna promena šifre."));
    } finally {
      setLoading(false);
    }
  };

  const labelStyle = { color: COLORS.muted, width: 90, display: "inline-block" };
  const valueStyle = { color: COLORS.text, fontWeight: 700 };

  return (
    <div style={{ color: COLORS.text }} className="page-content-wrap">
      <h1 style={{ margin: "0 0 24px 0", fontSize: 56, lineHeight: 1.05 }}>Moj profil</h1>

      <div
        style={{
          background: COLORS.card,
          border: `1px solid ${COLORS.border}`,
          borderRadius: 16,
          padding: 20,
        }}
      >
        <div style={{ display: "grid", gap: 12, fontSize: 18 }}>
          <div>
            <span style={labelStyle}>Ime:</span> <span style={valueStyle}>{firstName}</span>
          </div>
          <div>
            <span style={labelStyle}>Prezime:</span> <span style={valueStyle}>{lastName}</span>
          </div>
          <div>
            <span style={labelStyle}>Email:</span> <span style={valueStyle}>{email}</span>
          </div>
          <div>
            <span style={labelStyle}>Role:</span> <span style={valueStyle}>{role}</span>
          </div>
        </div>

        <div style={{ marginTop: 24 }}>
          <button
            onClick={() => setOpen(true)}
            style={{
              padding: "10px 14px",
              borderRadius: 10,
              border: `1px solid ${COLORS.border}`,
              background: "var(--bg-input)",
              color: COLORS.text,
              cursor: "pointer",
              fontWeight: 800,
            }}
          >
            Promeni šifru
          </button>
        </div>
      </div>

      <Modal open={open} title="Promena šifre" onClose={close}>
        <div style={{ display: "grid", gap: 12 }}>
          <div style={{ display: "grid", gap: 6 }}>
            <label>Stara šifra</label>
            <input
              type="password"
              value={oldPass}
              onChange={(e) => setOldPass(e.target.value)}
              style={{
                padding: 10,
                borderRadius: 10,
                border: `1px solid ${COLORS.border}`,
                background: COLORS.inputBg,
                color: COLORS.text,
                outline: "none",
              }}
            />
          </div>

          <div style={{ display: "grid", gap: 6 }}>
            <label>Nova šifra</label>
            <input
              type="password"
              value={newPass1}
              onChange={(e) => setNewPass1(e.target.value)}
              style={{
                padding: 10,
                borderRadius: 10,
                border: `1px solid ${COLORS.border}`,
                background: COLORS.inputBg,
                color: COLORS.text,
                outline: "none",
              }}
            />
          </div>

          <div style={{ display: "grid", gap: 6 }}>
            <label>Nova šifra (ponovo)</label>
            <input
              type="password"
              value={newPass2}
              onChange={(e) => setNewPass2(e.target.value)}
              style={{
                padding: 10,
                borderRadius: 10,
                border: `1px solid ${COLORS.border}`,
                background: COLORS.inputBg,
                color: COLORS.text,
                outline: "none",
              }}
            />
          </div>

          {err ? <div style={{ color: "#ff6b6b" }}>{err}</div> : null}
          {ok ? <div style={{ color: "#7CFF7C" }}>{ok}</div> : null}

          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 16 }}>
            <button
              onClick={close}
              disabled={loading}
              style={{
                padding: "10px 12px",
                borderRadius: 10,
                border: `1px solid ${COLORS.border}`,
                background: "var(--bg-input)",
                color: COLORS.text,
                cursor: "pointer",
              }}
            >
              Otkaži
            </button>

            <button
              onClick={submit}
              disabled={loading}
              style={{
                padding: "10px 12px",
                borderRadius: 10,
                border: `1px solid ${COLORS.border}`,
                background: "#2563eb",
                color: "white",
                cursor: "pointer",
                fontWeight: 800,
              }}
            >
              {loading ? "..." : "Promeni"}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}