import React, { useMemo } from "react";
import { buildTimeSlots, timeToMinutes } from "../utils/time.js";
import { getRoomId, getStatus, getTimes, normalizeSchedule } from "../utils/schedule.js";

export default function ScheduleGrid({
  rooms,
  scheduleRaw,
  highlightSelection, // { roomIds: Set, from:"HH:mm", to:"HH:mm" } ili null
}) {
  const slots = useMemo(() => buildTimeSlots("08:00", "20:00", 15), []);
  const scheduleItems = useMemo(() => normalizeSchedule(scheduleRaw), [scheduleRaw]);

  const blocksByRoom = useMemo(() => {
    const map = new Map();
    for (const it of scheduleItems) {
      const roomId = getRoomId(it);
      if (!roomId) continue;
      const { start, end } = getTimes(it);
      if (!start || !end) continue;

      const status = String(getStatus(it) || "").toUpperCase();
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
    if (!selectionSet || selFromMin == null || selToMin == null) return false;
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
    if (selected) return { background: "rgba(0,140,255,0.35)" }; // selected = plavo

    const st = String(status || "").toUpperCase();
    if (st === "APPROVED") return { background: "rgba(255,0,0,0.25)" }; // crveno
    if (st === "PENDING") return { background: "rgba(255,215,0,0.30)" }; // zuto

    return { background: "transparent" };
  };

  return (
    <div style={{ overflowX: "auto", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12 }}>
      <table style={{ borderCollapse: "collapse", width: "100%", minWidth: 900 }}>
        <thead>
          <tr>
            <th style={{ textAlign: "left", padding: 10, borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
              Sala / vreme
            </th>
            {slots.map((s) => (
              <th
                key={s}
                style={{
                  padding: "10px 8px",
                  borderBottom: "1px solid rgba(255,255,255,0.08)",
                  fontWeight: 600,
                  whiteSpace: "nowrap",
                }}
              >
                {s}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {(rooms || []).map((r) => (
            <tr key={r.id}>
              <td style={{ padding: 10, borderBottom: "1px solid rgba(255,255,255,0.06)", fontWeight: 600 }}>
                {r.code || r.name || `#${r.id}`}
              </td>
              {slots.map((slot) => {
                const st = getCellStatus(r.id, slot);
                const sel = isSelectedCell(r.id, slot);
                const style = cellStyle(st, sel);
                return (
                  <td
                    key={`${r.id}__${slot}`}
                    style={{
                      height: 24,
                      borderBottom: "1px solid rgba(255,255,255,0.06)",
                      borderLeft: "1px solid rgba(255,255,255,0.06)",
                      ...style,
                    }}
                    title={st ? `${st}` : ""}
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