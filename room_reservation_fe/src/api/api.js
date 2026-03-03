import axios from "axios";

const api = axios.create({
  baseURL: "/api",
});

export function extractApiErrorMessage(ex, fallback = "Došlo je do greške.") {
  const data = ex?.response?.data;

  if (!data) return ex?.message || fallback;

  // backend često vraća plain string
  if (typeof data === "string") return data;

  // ako je JSON objekat
  if (typeof data === "object") {
    return data?.message || data?.error || ex?.message || fallback;
  }

  return fallback;
}

export async function apiLogin(email, password) {
  const res = await api.post("/auth/login", { email, password });
  return res.data;
}

export async function apiChangePassword({ userId, oldPassword, newPassword }) {
  const res = await api.post("/auth/change-password", { userId, oldPassword, newPassword });
  return res.data;
}

// ostale postojeće funkcije ostaju kako jesu…
export default api;