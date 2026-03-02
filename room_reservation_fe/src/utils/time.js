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
  const [h, m] = hhmm.split(":").map(Number);
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
  for (let t = start; t <= end; t += stepMin) {
    slots.push(minutesToTime(t));
  }
  return slots;
}

export function overlaps(startA, endA, startB, endB) {
  // [start, end) overlap
  return startA < endB && startB < endA;
}