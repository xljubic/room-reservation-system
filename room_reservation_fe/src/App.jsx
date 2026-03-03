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
    <div style={{ minHeight: "100vh" }}>
      <Navbar />
      <div style={{ padding: 16 }}>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/create" element={<CreateReservationPage />} />
          <Route path="/mine" element={<MyReservationsPage />} />
          <Route
            path="/pending"
            element={user?.role === "ADMIN" ? <PendingReservationsPage /> : <Navigate to="/" replace />}
          />
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