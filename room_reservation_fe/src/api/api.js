import axios from "axios";

const API_BASE = "/api";

const client = axios.create({
  baseURL: API_BASE,
  timeout: 20000,
});

function safeData(res) {
  return res?.data;
}

export function extractApiErrorMessage(err, fallback = "Greška") {
  return (
    err?.response?.data?.message ||
    err?.response?.data?.error ||
    (typeof err?.response?.data === "string" ? err.response.data : null) ||
    err?.message ||
    fallback
  );
}

/**
 * LOGIN
 * POST /api/auth/login { email, password }
 */
export async function apiLogin(email, password) {
  const res = await client.post("/auth/login", { email, password });
  return safeData(res);
}

/**
 * Rooms list
 * GET /api/rooms
 */
export async function apiGetRooms() {
  const res = await client.get("/rooms");
  return safeData(res) || [];
}

/**
 * Schedule za datum (Approved + Pending)
 * GET /api/reservations/schedule?date=YYYY-MM-DD
 */
export async function apiGetSchedule(dateStr) {
  const res = await client.get(`/reservations/schedule`, { params: { date: dateStr } });
  return safeData(res);
}

/**
 * My reservations
 * GET /api/reservations/my?userId=...
 */
export async function apiGetMyReservations(userId) {
  const res = await client.get(`/reservations/my`, { params: { userId } });
  return safeData(res) || [];
}

/**
 * Cancel reservation item
 * POST /api/reservations/{id}/cancel
 * Body: { userId }
 */
export async function apiCancelReservation(reservationId, userId) {
  const res = await client.post(`/reservations/${reservationId}/cancel`, { userId });
  return safeData(res);
}

/**
 * Pending groups (admin)
 * GET /api/reservations/pending-groups
 */
export async function apiGetPendingGroups() {
  const res = await client.get(`/reservations/pending-groups`);
  return safeData(res) || [];
}

/**
 * Approve/Reject pending group (admin)
 * POST /api/reservations/group/{groupId}/decide
 * Body: { adminId, decision: "APPROVED"|"REJECTED", comment }
 */
export async function apiDecideGroup(groupId, adminId, decision, comment) {
  const res = await client.post(`/reservations/group/${groupId}/decide`, {
    adminId,
    decision,
    comment: comment || "",
  });
  return safeData(res);
}

/**
 * Create group reservation
 * POST /api/reservations
 */
export async function apiCreateGroupReservation(payload) {
  const res = await client.post(`/reservations`, payload);
  return safeData(res);
}

/**
 * CHANGE PASSWORD (novo)
 * Najčešće: PUT /api/auth/change-password
 * Body: { userId, oldPassword, newPassword }
 *
 * Ako ti backend ruta nije ova – promeni samo string "/auth/change-password".
 */
export async function apiChangePassword({ userId, oldPassword, newPassword }) {
  const res = await client.put(`/auth/change-password`, {
    userId,
    oldPassword,
    newPassword,
  });
  return safeData(res);
}