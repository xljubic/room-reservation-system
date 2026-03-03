import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

import { useAuth } from "../auth/AuthContext.jsx";
import { extractApiErrorMessage } from "../api/api.js";

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState("admin@fon.rs");
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
      setErr(extractApiErrorMessage(ex, "Login nije uspeo."));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 720, margin: "70px auto", padding: 16 }}>
      <h1>Room Reservation – Login</h1>

      <form onSubmit={onSubmit} style={{ display: "grid", gap: 12 }}>
        <div>
          <label>Email:</label>
          <input value={email} onChange={(e) => setEmail(e.target.value)} style={{ width: "100%" }} />
        </div>

        <div>
          <label>Šifra:</label>
          <input
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            type="password"
            style={{ width: "100%" }}
            placeholder="npr. admin"
          />
        </div>

        {err && <div style={{ color: "#ff6b6b" }}>{err}</div>}

        <button disabled={loading} style={{ padding: "10px 12px", borderRadius: 10 }}>
          {loading ? "..." : "Login"}
        </button>

        <div style={{ opacity: 0.8, fontSize: 13 }}>
          (Za seed) admin@fon.rs / admin123, marko@fon.rs / marko123, jelena@fon.rs / jelena123
        </div>
      </form>
    </div>
  );
}