import axios from "axios";

const client = axios.create({
  baseURL: "/api",
  headers: { "Content-Type": "application/json" },
});

export function extractApiErrorMessage(err, fallback = "Greška") {
  return (
    err?.response?.data?.message ||
    err?.response?.data?.error ||
    (typeof err?.response?.data === "string" ? err.response.data : null) ||
    err?.message ||
    fallback
  );
}

// ===== AUTH =====
export async function apiLogin(email, password) {
  const res = await client.post("/auth/login", { email, password });
  return res.data;
}

export async function apiChangePassword({ userId, oldPassword, newPassword }) {
  const res = await client.post("/auth/change-password", {
    userId,
    oldPassword,
    newPassword,
  });
  return res.data;
}

// ===== ROOMS =====
export async function apiGetRooms() {
  const res = await client.get("/rooms");
  return res.data;
}

// ===== SCHEDULE =====
export async function apiGetSchedule(dateStr) {
  const res = await client.get("/reservations/schedule", {
    params: { date: dateStr },
  });
  return res.data;
}

// ===== RESERVATIONS =====
export async function apiGetMyReservations(userId) {
  const res = await client.get("/reservations/my", { params: { userId } });
  return res.data;
}

export async function apiCancelReservation(reservationId, userId) {
  const res = await client.post(`/reservations/${reservationId}/cancel`, { userId });
  return res.data;
}

export async function apiCreateGroupReservation(payload) {
  const res = await client.post("/reservations", payload);
  return res.data;
}

export async function apiGetPendingGroups() {
  const res = await client.get("/reservations/pending-groups");
  return res.data;
}

export async function apiDecideGroup(groupId, { adminId, decision, comment }) {
  const res = await client.post(`/reservations/group/${groupId}/decide`, {
    adminId,
    decision,
    comment: comment ?? "",
  });
  return res.data;
}

export async function apiGetGroupApprovals(groupId) {
  const res = await client.get(`/reservations/group/${groupId}/approvals`);
  return res.data;
}

// NOVO: decide po jednoj rezervaciji (za APPROVED->REJECT / REJECTED->APPROVE)
export async function apiDecideReservation(reservationId, { adminId, decision, comment }) {
  const res = await client.post(`/reservations/${reservationId}/decide`, {
    adminId,
    decision,
    comment: comment ?? "",
  });
  return res.data;
}

// GET /api/reservations/day-groups?date=YYYY-MM-DD
export async function apiGetDayGroups(dateStr) {
  const res = await client.get("/reservations/day-groups", { params: { date: dateStr } });
  return res.data;
}