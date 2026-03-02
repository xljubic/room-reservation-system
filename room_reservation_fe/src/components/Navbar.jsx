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
        position: "sticky",
        top: 0,
        zIndex: 10,
        background: "#1f1f1f",
        borderBottom: "1px solid rgba(255,255,255,0.08)",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "10px 16px",
          gap: "12px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <div style={{ fontWeight: 700, color: "white" }}>Room Reservation</div>

          <nav style={{ display: "flex", gap: "8px" }}>
            <NavLink to="/" style={linkStyle} end>
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
          </nav>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "10px", color: "white" }}>
          <div style={{ opacity: 0.9, fontSize: 13 }}>
            Ulogovan: <b>{user?.email}</b> ({user?.role})
          </div>
          <button onClick={onLogout} style={{ padding: "8px 12px", borderRadius: 8 }}>
            Logout
          </button>
        </div>
      </div>
    </div>
  );
}