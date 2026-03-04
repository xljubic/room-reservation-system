import React from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "./auth/AuthContext.jsx";

import LoginPage from "./pages/LoginPage.jsx";
import HomePage from "./pages/HomePage.jsx";
import CreateReservationPage from "./pages/CreateReservationPage.jsx";
import MyReservationsPage from "./pages/MyReservationsPage.jsx";
import PendingReservationsPage from "./pages/PendingReservationsPage.jsx";
import ProfilePage from "./pages/ProfilePage.jsx";
import Navbar from "./components/Navbar.jsx";

function ProtectedLayout() {
  const { user } = useAuth();

  if (!user) return <Navigate to="/login" replace />;

  return (
    <div style={{ minHeight: "100vh", background: "#1f1f1f" }}>
      <Navbar />

      {/* ✅ JEDNA širina za sve stranice (kao Create/Pending) */}
      <div style={{ width: "min(1100px, 100%)", margin: "0 auto", padding: "0 16px" }}>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/create" element={<CreateReservationPage />} />
          <Route path="/mine" element={<MyReservationsPage />} />
          <Route path="/pending" element={<PendingReservationsPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </div>
  );
}

export default function App() {
  const { user } = useAuth();

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" replace /> : <LoginPage />} />
      <Route path="/*" element={<ProtectedLayout />} />
    </Routes>
  );
}