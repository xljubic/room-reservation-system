import React, { useMemo } from "react";
import { buildTimeSlots, timeToMinutes } from "../utils/time.js";
import { getRoomId, getRoomLabel, getStatus, getTimes, normalizeSchedule } from "../utils/schedule.js";

function cellKey(roomId, slot) {
  return `${roomId}__${slot}`;
}

export default function ScheduleGrid({
  rooms,
  scheduleRaw,
  highlightSelection, // { roomIds: Set<number>, from:"HH:mm", to:"HH:mm" } ili null
}) {
  const slots = useMemo(() => buildTimeSlots("08:00", "20:00", 15), []);
  const scheduleItems = useMemo(() => normalizeSchedule(scheduleRaw), [scheduleRaw]);

  // Map: roomId -> list of blocks
  const blocksByRoom = useMemo(() => {
    const map = new Map();
    for (const it of scheduleItems) {
      const roomId = getRoomId(it);
      if (!roomId) continue;

      const { start, end } = getTimes(it);
      if (!start || !end) continue;

      const status = getStatus(it);
      if (!map.has(roomId)) map.set(roomId, []);
      map.get(roomId).push({ start, end, status });
    }
    return map;
  }, [scheduleItems]);

  const selectionSet = highlightSelection?.roomIds || null;
  const selFrom = highlightSelection?.from || null;
  const selTo = highlightSelection?.to || null;
  const selFromMin = selFrom ? timeToMinutes(selFrom) : null;
  const selToMin = selTo ? timeToMinutes(selTo) : null;

  const isSelectedCell = (roomId, slot) => {
    if (!selectionSet || !selFromMin || !selToMin) return false;
    if (!selectionSet.has(roomId)) return false;
    const t = timeToMinutes(slot);
    return t >= selFromMin && t < selToMin;
  };

  const getCellStatus = (roomId, slot) => {
    const list = blocksByRoom.get(roomId) || [];
    const t = timeToMinutes(slot);
    for (const b of list) {
      const s = timeToMinutes(b.start);
      const e = timeToMinutes(b.end);
      if (t >= s && t < e) return b.status;
    }
    return null;
  };

  const cellStyle = (status, selected) => {
    // existing colors: APPROVED/PENDING = crveno u tvom UI; selected = plavo
    if (selected) return { background: "rgba(0,140,255,0.35)" };

    const st = String(status || "").toUpperCase();
    if (st === "APPROVED" || st === "PENDING") {
      return { background: "rgba(255,0,0,0.25)" };
    }
    return { background: "transparent" };
  };

  return (
    <div style={{ overflowX: "auto", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 10 }}>
      <table style={{ borderCollapse: "collapse", minWidth: 1100, width: "100%" }}>
        <thead>
          <tr>
            <th style={{ textAlign: "left", padding: 8, position: "sticky", left: 0, background: "#222" }}>
              Sala / vreme
            </th>
            {slots.map((s) => (
              <th key={s} style={{ padding: "6px 8px", fontSize: 12, whiteSpace: "nowrap" }}>
                {s}
              </th>
            ))}
          </tr>
        </thead>

        <tbody>
          {(rooms || []).map((r) => (
            <tr key={r.id}>
              <td
                style={{
                  padding: 8,
                  position: "sticky",
                  left: 0,
                  background: "#222",
                  borderTop: "1px solid rgba(255,255,255,0.06)",
                  whiteSpace: "nowrap",
                }}
              >
                {r.code || r.name || r.label || `#${r.id}`}
              </td>

              {slots.map((slot) => {
                const st = getCellStatus(r.id, slot);
                const sel = isSelectedCell(r.id, slot);
                const style = cellStyle(st, sel);

                return (
                  <td
                    key={cellKey(r.id, slot)}
                    style={{
                      ...style,
                      height: 22,
                      borderTop: "1px solid rgba(255,255,255,0.06)",
                      borderLeft: "1px solid rgba(255,255,255,0.06)",
                    }}
                    title={st ? `${getRoomLabel({ roomId: r.id, roomCode: r.code })} - ${st}` : ""}
                  />
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}