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
    <div className="app-shell">
      <div className="navbar">
        <Navbar />
      </div>

      <main className="app-main">
        <div className="container">
          <div className="page">
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
      </main>
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