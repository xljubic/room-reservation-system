import React from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext.jsx";

const linkStyle = ({ isActive }) => ({
  padding: "8px 12px",
  borderRadius: "8px",
  textDecoration: "none",
  color: "white",
  background: isActive ? "rgba(255,255,255,0.12)" : "transparent",
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
        background: "#000",
        borderBottom: "1px solid rgba(255,255,255,0.12)",
        color: "white",
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
            border: "1px solid rgba(255,255,255,0.18)",
            background: "rgba(255,255,255,0.08)",
            color: "white",
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
            border: "1px solid rgba(255,255,255,0.18)",
            background: "rgba(255,255,255,0.08)",
            color: "white",
            cursor: "pointer",
          }}
        >
          Logout
        </button>
      </div>
    </div>
  );
}