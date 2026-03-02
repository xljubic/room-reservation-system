import { overlaps, timeToMinutes } from "./time.js";

/**
 * Normalizacija schedule zapisa sa backend-a.
 * Mi u gridu očekujemo listu stavki tipa:
 * {
 *   id,
 *   roomCode or roomName,
 *   roomId,
 *   startTime, endTime (HH:mm),
 *   status,
 *   groupId,
 *   createdAt,
 *   createdByEmail
 * }
 *
 * Pošto ne znamo tačno tvoju strukturu response-a u svim detaljima,
 * funkcija pokušava da izvuče polja iz više mogućih naziva.
 */
export function normalizeSchedule(raw) {
  if (!raw) return [];
  // Ako backend već vraća listu:
  if (Array.isArray(raw)) return raw;

  // Ako vraća { items: [...] } ili { reservations: [...] }:
  const arr = raw.items || raw.reservations || raw.data || [];
  return Array.isArray(arr) ? arr : [];
}

export function getRoomLabel(item) {
  return (
    item.roomCode ||
    item.roomName ||
    item.room?.code ||
    item.room?.name ||
    item.room?.label ||
    String(item.roomId ?? "")
  );
}

export function getRoomId(item) {
  return item.roomId ?? item.room?.id ?? null;
}

export function getTimes(item) {
  const start = item.startTime || item.timeFrom || item.from || item.start || item.start_time;
  const end = item.endTime || item.timeTo || item.to || item.end || item.end_time;
  return { start, end };
}

export function getStatus(item) {
  return item.status || item.reservationStatus || item.state || "";
}

export function isBlockedStatus(status) {
  // grid blokira APPROVED i PENDING
  return status === "APPROVED" || status === "PENDING";
}

export function computeFreeRoomsForRange(allRooms, scheduleItems, fromHHmm, toHHmm) {
  if (!fromHHmm || !toHHmm) return [];

  const fromMin = timeToMinutes(fromHHmm);
  const toMin = timeToMinutes(toHHmm);

  const blockedByRoomId = new Map();
  for (const it of scheduleItems) {
    const status = getStatus(it);
    if (!isBlockedStatus(status)) continue;

    const roomId = getRoomId(it);
    if (!roomId) continue;

    const { start, end } = getTimes(it);
    if (!start || !end) continue;

    const s = timeToMinutes(start);
    const e = timeToMinutes(end);

    if (overlaps(fromMin, toMin, s, e)) {
      blockedByRoomId.set(roomId, true);
    }
  }

  return (allRooms || []).filter((r) => !blockedByRoomId.get(r.id));
}