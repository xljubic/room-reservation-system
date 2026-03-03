export function pad2(n) {
  return String(n).padStart(2, "0");
}

export function toDateInputValue(dateObj) {
  const y = dateObj.getFullYear();
  const m = pad2(dateObj.getMonth() + 1);
  const d = pad2(dateObj.getDate());
  return `${y}-${m}-${d}`;
}

export function timeToMinutes(hhmm) {
  const [h, m] = String(hhmm || "").split(":").map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return NaN;
  return h * 60 + m;
}

export function minutesToTime(min) {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${pad2(h)}:${pad2(m)}`;
}

export function buildTimeSlots(startHH = "08:00", endHH = "20:00", stepMin = 15) {
  const start = timeToMinutes(startHH);
  const end = timeToMinutes(endHH);
  const slots = [];
  for (let t = start; t <= end; t += stepMin) slots.push(minutesToTime(t));
  return slots;
}

export function overlaps(startA, endA, startB, endB) {
  // [start, end) overlap
  return startA < endB && startB < endA;
}

/**
 * ISO date ("2026-03-02" or "2026-03-02T08:30:41") -> "02.03.2026."
 */
export function formatDateDDMMYYYY(value) {
  if (!value) return "";
  const s = String(value);
  const datePart = s.includes("T") ? s.split("T")[0] : s;
  const [y, m, d] = datePart.split("-");
  if (!y || !m || !d) return datePart;
  return `${d}.${m}.${y}.`;
}

/**
 * ISO time ("08:30:41" or "2026-03-02T08:30:41") -> "08:30"
 */
export function formatTimeHHMM(value) {
  if (!value) return "";
  const s = String(value);
  const timePart = s.includes("T") ? s.split("T")[1] : s;
  return timePart.slice(0, 5);
}

/**
 * Convenience: from LocalDateTime -> { date:"dd.mm.yyyy.", time:"hh:mm" }
 */
export function splitDateTime(value) {
  return { date: formatDateDDMMYYYY(value), time: formatTimeHHMM(value) };
}