import React, { useMemo, useState } from "react";
import { useAuth } from "../auth/AuthContext.jsx";
import { apiChangePassword, extractApiErrorMessage } from "../api/api.js";

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
          width: "min(560px, 100%)",
          background: "#0b1220",
          border: "1px solid rgba(255,255,255,0.12)",
          borderRadius: 14,
          padding: 16,
          color: "white",
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

  const fullName = useMemo(() => {
    return (
      user?.fullName ||
      [user?.firstName, user?.lastName].filter(Boolean).join(" ").trim() ||
      user?.email ||
      "-"
    );
  }, [user]);

  const [open, setOpen] = useState(false);
  const [oldPass, setOldPass] = useState("");
  const [newPass1, setNewPass1] = useState("");
  const [newPass2, setNewPass2] = useState("");
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");
  const [loading, setLoading] = useState(false);

  const resetModal = () => {
    setOldPass("");
    setNewPass1("");
    setNewPass2("");
    setErr("");
    setLoading(false);
  };

  const closeModal = () => {
    setOpen(false);
    resetModal();
  };

  const submit = async () => {
    setErr("");
    setOk("");

    if (!oldPass || !newPass1 || !newPass2) {
      setErr("Popuni sva polja.");
      return;
    }
    if (newPass1 !== newPass2) {
      setErr("Nova šifra se ne poklapa (unesi isto 2 puta).");
      return;
    }
    if ((newPass1 || "").length < 4) {
      setErr("Nova šifra je prekratka.");
      return;
    }

    setLoading(true);
    try {
      const res = await apiChangePassword({
        userId: user?.id,
        oldPassword: oldPass,
        newPassword: newPass1,
      });

      setOk(typeof res === "string" ? res : "Šifra je uspešno promenjena.");
      setOldPass("");
      setNewPass1("");
      setNewPass2("");

      setTimeout(() => {
        closeModal();
        setOk("");
      }, 600);
    } catch (ex) {
      setErr(extractApiErrorMessage(ex, "Neuspešna promena šifre."));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 900, margin: "30px auto", padding: 16 }}>
      <h1 style={{ marginTop: 0 }}>Moj Profil</h1>

      <div
        style={{
          border: "1px solid rgba(0,0,0,0.12)",
          borderRadius: 14,
          padding: 16,
          background: "white",
        }}
      >
        <div style={{ display: "grid", gap: 8 }}>
          <div>
            <b>Ime i prezime:</b> {fullName}
          </div>
          <div>
            <b>Email:</b> {user?.email || "-"}
          </div>
          <div>
            <b>Uloga:</b> {user?.role || "USER"}
          </div>
          <div>
            <b>User ID:</b> {user?.id ?? "-"}
          </div>
        </div>

        <div style={{ marginTop: 16 }}>
          <button
            onClick={() => {
              setOk("");
              setErr("");
              setOpen(true);
            }}
            style={{
              padding: "10px 12px",
              borderRadius: 10,
              border: "1px solid rgba(0,0,0,0.15)",
              background: "#0f172a",
              color: "white",
              cursor: "pointer",
            }}
          >
            Promeni šifru
          </button>
        </div>
      </div>

      <Modal open={open} title="Promena šifre" onClose={closeModal}>
        <div style={{ display: "grid", gap: 10 }}>
          <div style={{ display: "grid", gap: 6 }}>
            <label>Stara šifra</label>
            <input
              type="password"
              value={oldPass}
              onChange={(e) => setOldPass(e.target.value)}
              style={{ padding: 10, borderRadius: 10, border: "1px solid rgba(255,255,255,0.15)" }}
            />
          </div>

          <div style={{ display: "grid", gap: 6 }}>
            <label>Nova šifra</label>
            <input
              type="password"
              value={newPass1}
              onChange={(e) => setNewPass1(e.target.value)}
              style={{ padding: 10, borderRadius: 10, border: "1px solid rgba(255,255,255,0.15)" }}
            />
          </div>

          <div style={{ display: "grid", gap: 6 }}>
            <label>Nova šifra (ponovo)</label>
            <input
              type="password"
              value={newPass2}
              onChange={(e) => setNewPass2(e.target.value)}
              style={{ padding: 10, borderRadius: 10, border: "1px solid rgba(255,255,255,0.15)" }}
            />
          </div>

          {err ? <div style={{ color: "#ff6b6b" }}>{err}</div> : null}
          {ok ? <div style={{ color: "#7CFF7C" }}>{ok}</div> : null}

          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 6 }}>
            <button
              onClick={closeModal}
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
              }}
            >
              {loading ? "..." : "Sačuvaj"}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}