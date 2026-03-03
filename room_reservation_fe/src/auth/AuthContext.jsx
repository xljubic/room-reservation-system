import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { apiLogin } from "../api/api.js";

const AuthContext = createContext(null);
const LS_KEY = "rrs_user";

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (raw) setUser(JSON.parse(raw));
    } catch {
      // ignore
    }
  }, []);

  const login = async (email, password) => {
    const u = await apiLogin(email, password);

    // backend vraća: id, email, role, firstName, lastName :contentReference[oaicite:6]{index=6}
    const normalized = {
      id: u?.id ?? null,
      email: u?.email ?? email,
      role: u?.role ?? "USER",
      firstName: u?.firstName ?? "",
      lastName: u?.lastName ?? "",
    };

    setUser(normalized);
    localStorage.setItem(LS_KEY, JSON.stringify(normalized));
    return normalized;
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem(LS_KEY);
  };

  const value = useMemo(() => ({ user, login, logout }), [user]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}