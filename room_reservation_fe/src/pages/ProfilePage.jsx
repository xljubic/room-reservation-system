import React, { useMemo, useState } from "react";
import { useAuth } from "../auth/AuthContext.jsx";
import { apiChangePassword, extractApiErrorMessage } from "../api/api.js";

function BannerModal({ open, title, children, onClose }) {
  if (!open) return null;

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.65)",
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "center",
        zIndex: 999,
        padding: 16,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "min(720px, 100%)",
          marginTop: 24,
          background: "#0b0b0b",
          border: "1px solid rgba(255,255,255,0.14)",
          borderRadius: 14,
          padding: 16,
          color: "white",
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
              border: "1px solid rgba(255,255,255,0.15)",
              background: "rgba(255,255,255,0.10)",
              color: "white",
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

  const firstName = user?.firstName ?? "";
  const lastName = user?.lastName ?? "";
  const email = user?.email ?? "";
  const role = user?.role ?? "";

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

  const row = useMemo(
    () => ({
      label: {
        color: "rgba(255,255,255,0.75)",
        width: 90,
        display: "inline-block",
      },
      value: { color: "white", fontWeight: 600 },
    }),
    []
  );

  return (
    <div style={{ maxWidth: 900, margin: "24px auto", padding: 16 }}>
      <h1 style={{ marginTop: 0, color: "white", fontSize: 56, lineHeight: 1.05 }}>Moj profil</h1>

      <div
        style={{
          background: "#0b0b0b",
          border: "1px solid rgba(255,255,255,0.12)",
          borderRadius: 16,
          padding: 20,
          color: "white",
        }}
      >
        <div style={{ display: "grid", gap: 12, fontSize: 18 }}>
          <div>
            <span style={row.label}>Ime:</span> <span style={row.value}>{firstName || "-"}</span>
          </div>
          <div>
            <span style={row.label}>Prezime:</span> <span style={row.value}>{lastName || "-"}</span>
          </div>
          <div>
            <span style={row.label}>Email:</span> <span style={row.value}>{email || "-"}</span>
          </div>
          <div>
            <span style={row.label}>Role:</span> <span style={row.value}>{role || "-"}</span>
          </div>
        </div>

        <div style={{ marginTop: 18 }}>
          <button
            onClick={() => setOpen(true)}
            style={{
              padding: "10px 14px",
              borderRadius: 10,
              border: "1px solid rgba(255,255,255,0.18)",
              background: "rgba(255,255,255,0.08)",
              color: "white",
              cursor: "pointer",
              fontWeight: 700,
            }}
          >
            Promeni šifru
          </button>
        </div>
      </div>

      <BannerModal open={open} title="Promena šifre" onClose={close}>
        <div style={{ display: "grid", gap: 10 }}>
          <div style={{ display: "grid", gap: 6 }}>
            <label>Stara šifra</label>
            <input
              type="password"
              value={oldPass}
              onChange={(e) => setOldPass(e.target.value)}
              style={{
                padding: 10,
                borderRadius: 10,
                border: "1px solid rgba(255,255,255,0.15)",
                background: "rgba(255,255,255,0.06)",
                color: "white",
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
                border: "1px solid rgba(255,255,255,0.15)",
                background: "rgba(255,255,255,0.06)",
                color: "white",
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
                border: "1px solid rgba(255,255,255,0.15)",
                background: "rgba(255,255,255,0.06)",
                color: "white",
              }}
            />
          </div>

          {err ? <div style={{ color: "#ff6b6b" }}>{err}</div> : null}
          {ok ? <div style={{ color: "#7CFF7C" }}>{ok}</div> : null}

          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 6 }}>
            <button
              onClick={close}
              disabled={loading}
              style={{
                padding: "10px 12px",
                borderRadius: 10,
                border: "1px solid rgba(255,255,255,0.15)",
                background: "rgba(255,255,255,0.10)",
                color: "white",
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
                border: "1px solid rgba(255,255,255,0.15)",
                background: "#2563eb",
                color: "white",
                cursor: "pointer",
                fontWeight: 700,
              }}
            >
              {loading ? "..." : "Promeni"}
            </button>
          </div>
        </div>
      </BannerModal>
    </div>
  );
}