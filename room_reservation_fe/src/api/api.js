import axios from "axios";

// Ako koristiš proxy u vite.config.js, ostavi "/api".
// Ako ne koristiš proxy, stavi "http://localhost:8080/api".
// Ja ostavljam /api da radi sa proxy-jem.
const API_BASE = "/api";

const http = axios.create({
  baseURL: API_BASE,
  headers: { "Content-Type": "application/json" },
  withCredentials: true,
});

// ---------- helpers ----------
export function extractApiErrorMessage(err, fallback = "Greška") {
  return (
    err?.response?.data?.message ||
    err?.response?.data?.error ||
    (typeof err?.response?.data === "string" ? err.response.data : null) ||
    err?.message ||
    fallback
  );
}

async function tryPost(urls, body, config) {
  let lastErr = null;
  for (const u of urls) {
    try {
      const res = await http.post(u, body, config);
      return res.data;
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr;
}

async function tryGet(urls, config) {
  let lastErr = null;
  for (const u of urls) {
    try {
      const res = await http.get(u, config);
      return res.data;
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr;
}

async function tryPut(urls, body, config) {
  let lastErr = null;
  for (const u of urls) {
    try {
      const res = await http.put(u, body, config);
      return res.data;
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr;
}

// ---------- AUTH ----------
export async function apiLogin(email, password) {
  // tvoje ranije rute su bile tipa /auth/login
  return tryPost(
    ["/auth/login", "/login", "/api/auth/login"], // fallback
    { email, password }
  );
}

export async function apiChangePassword({ userId, oldPassword, newPassword }) {
  // ti si dodao hash/change-pass funkcionalnost - evo fallback ruta
  return tryPut(
    [
      `/users/${userId}/password`,
      `/users/${userId}/change-password`,
      `/auth/change-password`,
      `/users/change-password`,
    ],
    { oldPassword, newPassword }
  );
}

// ---------- ROOMS / SCHEDULE ----------
export async function apiGetRooms() {
  return tryGet(["/rooms", "/room", "/rooms/all"]);
}

/**
 * Očekujem da tvoj UI šalje roomId + datum ili opseg.
 * Ako ti stranice već šalju objekat, ostavi ovako.
 */
export async function apiGetSchedule(params) {
  // najčešće: GET /reservations/schedule?roomId=...&date=...
  // ili POST /reservations/schedule
  if (!params) return tryGet(["/reservations/schedule", "/schedule"]);

  // ako je objekt, probaj GET sa query
  if (typeof params === "object") {
    return tryGet(
      [
        { url: "/reservations/schedule", params },
        { url: "/schedule", params },
      ].map((x) => x),
      null
    );
  }

  // fallback
  return tryGet(["/reservations/schedule", "/schedule"]);
}

// malo pametniji tryGet za axios config objekat
async function tryGet(urls, config) {
  let lastErr = null;
  for (const entry of urls) {
    try {
      if (typeof entry === "string") {
        const res = await http.get(entry, config || undefined);
        return res.data;
      } else {
        const res = await http.get(entry.url, { params: entry.params });
        return res.data;
      }
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr;
}

// ---------- RESERVATIONS ----------
export async function apiGetMyReservations() {
  return tryGet([
    "/reservations/my",
    "/reservations/mine",
    "/reservation/my",
    "/reservation/mine",
  ]);
}

export async function apiCancelReservation(reservationId) {
  // nekad je DELETE, nekad PUT /cancel
  // probam PUT cancel, pa DELETE
  try {
    return await tryPut(
      [
        `/reservations/${reservationId}/cancel`,
        `/reservation/${reservationId}/cancel`,
      ],
      {}
    );
  } catch (e) {
    // fallback DELETE
    const res = await http.delete(`/reservations/${reservationId}`);
    return res.data;
  }
}

// ---------- GROUP RESERVATIONS / APPROVAL ----------
export async function apiCreateGroupReservation(payload) {
  // payload: šta već šalješ iz CreateReservationPage
  return tryPost(
    ["/reservations/group", "/group-reservations", "/reservations/create-group"],
    payload
  );
}

export async function apiGetPendingGroups() {
  return tryGet([
    "/reservations/group/pending",
    "/group-reservations/pending",
    "/reservations/pending-groups",
  ]);
}

export async function apiDecideGroup(groupId, decisionPayload) {
  // decisionPayload npr { approved: true/false } ili { decision: "APPROVE" }
  return tryPut(
    [
      `/reservations/group/${groupId}/decision`,
      `/group-reservations/${groupId}/decision`,
      `/reservations/group/${groupId}`,
    ],
    decisionPayload || {}
  );
}