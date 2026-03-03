import React from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../auth/AuthContext.jsx";

export default function Navbar() {
  const { user, logout } = useAuth();
  const loc = useLocation();

  const btnStyle = (path) => ({
    padding: "8px 12px",
    borderRadius: 10,
    border: "1px solid rgba(255,255,255,0.15)",
    background: loc.pathname === path ? "rgba(255,255,255,0.18)" : "rgba(0,0,0,0.0)",
    color: "white",
    textDecoration: "none",
    display: "inline-block",
  });

  const rightBtn = {
    padding: "8px 12px",
    borderRadius: 10,
    border: "1px solid rgba(255,255,255,0.15)",
    background: "rgba(255,255,255,0.10)",
    color: "white",
    cursor: "pointer",
  };

  const fullName = user?.fullName || [user?.firstName, user?.lastName].filter(Boolean).join(" ") || user?.email;

  return (
    <div
      style={{
        padding: "12px 16px",
        display: "flex",
        gap: 10,
        alignItems: "center",
        justifyContent: "space-between",
        background: "#0f172a",
        position: "sticky",
        top: 0,
        zIndex: 50,
      }}
    >
      <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
        <Link to="/" style={btnStyle("/")}>Početna</Link>
        <Link to="/create" style={btnStyle("/create")}>Napravi rezervaciju</Link>
        <Link to="/mine" style={btnStyle("/mine")}>Moje rezervacije</Link>
        {user?.role === "ADMIN" && <Link to="/pending" style={btnStyle("/pending")}>Pending rezervacije</Link>}
      </div>

      <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
        <div style={{ color: "white", opacity: 0.95, fontSize: 14 }}>
          Ulogovan: <b>{fullName}</b> ({user?.role || "USER"})
        </div>

        <Link to="/profile" style={rightBtn}>Moj Profil</Link>

        <button onClick={logout} style={rightBtn}>Logout</button>
      </div>
    </div>
  );
}