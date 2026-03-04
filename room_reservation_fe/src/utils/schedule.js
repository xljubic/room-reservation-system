import { overlaps, timeToMinutes } from "./time.js";

function pickTimeFromDateTime(dt) {
  if (!dt) return "";
  const s = String(dt);
  if (s.includes("T")) return s.split("T")[1].slice(0, 5);
  return s.slice(0, 5);
}

function pickDateFromDateTime(dt) {
  if (!dt) return "";
  const s = String(dt);
  return s.includes("T") ? s.split("T")[0] : s;
}

function normalizeReservation(r, statusOverride) {
  if (!r) return null;

  const startDT = r.startDateTime || r.start_date_time || r.start || r.from;
  const endDT = r.endDateTime || r.end_date_time || r.end || r.to;

  const roomId = r.roomId ?? r.room?.id ?? null;
  const roomCode = r.roomCode || r.room?.code || r.room?.name || "";

  const createdByEmail = r.createdByEmail || r.createdBy?.email || "";
  const createdByRole = r.createdByRole || r.createdBy?.role || "";

  return {
    ...r,
    id: r.id,
    roomId,
    roomCode,
    startDateTime: startDT,
    endDateTime: endDT,
    startTime: pickTimeFromDateTime(startDT),
    endTime: pickTimeFromDateTime(endDT),
    date: r.date || pickDateFromDateTime(startDT),
    createdByEmail,
    createdByRole,
    status: statusOverride || r.status || r.reservationStatus || r.state || "",
    groupId: r.groupId || r.group_id || null,
    purpose: r.purpose,
    name: r.name,
    description: r.description || "",
    createdAt: r.createdAt || r.created_at || "",
  };
}

export function normalizeSchedule(raw) {
  if (!raw) return [];

  if (Array.isArray(raw)) {
    return raw.map((x) => normalizeReservation(x) || x).filter(Boolean);
  }

  const approved = Array.isArray(raw.approvedReservations) ? raw.approvedReservations : [];
  const pending = Array.isArray(raw.pendingReservations) ? raw.pendingReservations : [];

  // NOVO
  const rejected = Array.isArray(raw.rejectedReservations) ? raw.rejectedReservations : [];

  if (approved.length || pending.length || rejected.length) {
    return [
      ...approved.map((r) => normalizeReservation(r, "APPROVED")).filter(Boolean),
      ...pending.map((r) => normalizeReservation(r, "PENDING")).filter(Boolean),
      ...rejected.map((r) => normalizeReservation(r, "REJECTED")).filter(Boolean),
    ];
  }

  const arr = raw.items || raw.reservations || raw.data || [];
  return Array.isArray(arr) ? arr.map((x) => normalizeReservation(x) || x).filter(Boolean) : [];
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
  const start =
    item.startTime ||
    item.timeFrom ||
    item.from ||
    (item.startDateTime ? String(item.startDateTime).split("T")[1]?.slice(0, 5) : "") ||
    item.start;
  const end =
    item.endTime ||
    item.timeTo ||
    item.to ||
    (item.endDateTime ? String(item.endDateTime).split("T")[1]?.slice(0, 5) : "") ||
    item.end;

  return { start, end };
}

export function getStatus(item) {
  return item.status || item.reservationStatus || item.state || "";
}

export function isBlockedStatus(status) {
  const st = String(status || "").toUpperCase();
  return st === "APPROVED" || st === "PENDING";
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
    if (overlaps(fromMin, toMin, s, e)) blockedByRoomId.set(roomId, true);
  }

  return (allRooms || []).filter((r) => !blockedByRoomId.get(r.id));
}