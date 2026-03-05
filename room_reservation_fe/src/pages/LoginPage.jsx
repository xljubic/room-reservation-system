import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext.jsx";

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState("savic.dusan@fon.bg.ac.rs");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e) => {
    e.preventDefault();
    setErr("");
    setLoading(true);
    try {
      await login(email.trim(), password);
      navigate("/");
    } catch (ex) {
      setErr(ex?.response?.data?.message || ex?.message || "Login nije uspeo.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "var(--page-pad-y) 16px"
    }}>
      <div style={{ maxWidth: 720, width: "100%" }}>
        <h1 style={{ margin: "0 0 var(--gap-3) 0", textAlign: "center" }}>Room Reservation – Login</h1>

        <form onSubmit={onSubmit} style={{ display: "grid", gap: 12 }}>
          <div>
            <label style={{ color: "var(--text-secondary)" }}>Email:</label>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={{
                width: "100%",
                padding: 10,
                borderRadius: 10,
                border: "1px solid var(--border-light)",
                background: "var(--bg-input)",
                color: "var(--text-primary)",
                outline: "none"
              }}
              placeholder="Unesite email..."
            />
          </div>

          <div>
            <label style={{ color: "var(--text-secondary)" }}>Šifra:</label>
            <input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              type="password"
              style={{
                width: "100%",
                padding: 10,
                borderRadius: 10,
                border: "1px solid var(--border-light)",
                background: "var(--bg-input)",
                color: "var(--text-primary)",
                outline: "none"
              }}
              placeholder="Unesite šifru..."
            />
          </div>

        {err && <div style={{ color: "#ff6b6b" }}>{err}</div>}

        <button disabled={loading} className="btn">
          {loading ? "..." : "Login"}
        </button>

        <div style={{ opacity: 0.8, fontSize: 13 }}>
          (Za laksi login) savic.dusan@fon.bg.ac.rs / dusan, ilija.antovic@fon.bg.ac.rs / ilija, lazarevic.sasa@fon.bg.ac.rs / sasa,
                           tatjana.stojanovic@fon.bg.ac.rs / tatjana, milos.milic@fon.bg.ac.rs / milos
        </div>
      </form>
      </div>
    </div>
  );
}