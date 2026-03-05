import React from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext.jsx";

const linkStyle = ({ isActive }) => ({
  padding: "8px 12px",
  borderRadius: "8px",
  textDecoration: "none",
  color: "var(--text-primary)",
  background: isActive ? "var(--bg-card)" : "transparent",
});

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const onLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
        padding: "12px 16px",
        background: "var(--bg-secondary)",
        borderBottom: "1px solid var(--border-medium)",
        color: "var(--text-primary)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        <div style={{ fontWeight: 700, marginRight: 10 }}>Room Reservation</div>

        <NavLink to="/" style={linkStyle}>
          Početna
        </NavLink>

        <NavLink to="/create" style={linkStyle}>
          Napravi rezervaciju
        </NavLink>

        <NavLink to="/mine" style={linkStyle}>
          Moje rezervacije
        </NavLink>

        {user?.role === "ADMIN" && (
          <NavLink to="/pending" style={linkStyle}>
            Pending rezervacije
          </NavLink>
        )}
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        <div style={{ opacity: 0.95 }}>
          Ulogovan: <b>{user?.email}</b> ({user?.role})
        </div>

        <button
          onClick={() => navigate("/profile")}
          style={{
            padding: "8px 12px",
            borderRadius: "10px",
            border: "1px solid var(--border-light)",
            background: "var(--bg-card)",
            color: "var(--text-primary)",
            cursor: "pointer",
          }}
        >
          Moj Profil
        </button>

        <button
          onClick={onLogout}
          style={{
            padding: "8px 12px",
            borderRadius: "10px",
            border: "1px solid var(--border-light)",
            background: "var(--bg-card)",
            color: "var(--text-primary)",
            cursor: "pointer",
          }}
        >
          Logout
        </button>
      </div>
    </div>
  );
}