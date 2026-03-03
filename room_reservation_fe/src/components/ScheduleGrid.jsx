import React, { useMemo, useState } from "react";
import { buildTimeSlots, timeToMinutes } from "../utils/time.js";
import {
  getRoomId,
  getStatus,
  getTimes,
  normalizeSchedule,
} from "../utils/schedule.js";

function formatRoomType(type) {
  const t = String(type || "").toUpperCase();
  const map = {
    UCIONICA: "Učionica",
    RACUNARSKA_SALA: "Računarska sala",
    AMFITEATAR: "Amfiteatar",
    CITAONICA: "Čitaonica",
    KONFERENCIJSKA_SALA: "Konferencijska sala",
  };
  return map[t] || (type ? String(type) : "—");
}

function formatBuilding(building) {
  const b = String(building || "").toUpperCase();
  const map = {
    STARA_ZGRADA: "Stara zgrada",
    NOVA_ZGRADA: "Nova zgrada",
    OLD: "Stara zgrada",
    NEW: "Nova zgrada",
  };
  return map[b] || (building ? String(building) : "—");
}

export default function ScheduleGrid({
  rooms,
  scheduleRaw,
  highlightSelection, // { roomIds: Set, from:"HH:mm", to:"HH:mm" } ili null
}) {
  const [roomPopup, setRoomPopup] = useState(null);

  const slots = useMemo(() => buildTimeSlots("08:00", "20:00", 15), []);

  const scheduleItems = useMemo(
    () => normalizeSchedule(scheduleRaw),
    [scheduleRaw]
  );

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
    if (selected) return { background: "rgba(0,140,255,0.35)" }; // plavo
    const st = String(status || "").toUpperCase();
    if (st === "APPROVED") return { background: "rgba(255,0,0,0.25)" }; // crveno
    if (st === "PENDING") return { background: "rgba(255,215,0,0.30)" }; // zuto
    return { background: "transparent" };
  };

  const roomLabel = (r) => r?.code || r?.name || `#${r?.id ?? ""}`;

  const getRoomType = (r) => r?.type || r?.roomType || r?.room_type;
  const getCapacity = (r) => r?.capacity ?? r?.roomCapacity ?? r?.seats ?? r?.maxPeople;
  const getComputers = (r) =>
    r?.numberOfComputers ?? r?.number_of_computers ?? r?.computers;
  const getFloor = (r) => r?.floorLevel ?? r?.floor_level ?? r?.floor;
  const getBuilding = (r) => r?.building || r?.buildingType || r?.building_type;

  return (
    <>
      {/* Grid wrapper: horizontal + vertical scroll */}
      <div
        style={{
          border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: 12,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            overflowX: "auto",
            overflowY: "auto",
            maxHeight: 420, // fiksirana visina grida (podesi po želji)
          }}
        >
          <table
            style={{
              borderCollapse: "collapse",
              width: "100%",
              minWidth: 900,
            }}
          >
            <thead>
              <tr>
                <th
                  style={{
                    textAlign: "left",
                    padding: 10,
                    borderBottom: "1px solid rgba(255,255,255,0.08)",
                    position: "sticky",
                    top: 0,
                    background: "rgba(20,20,20,0.95)",
                    zIndex: 3,
                    minWidth: 220,
                  }}
                >
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
                      position: "sticky",
                      top: 0,
                      background: "rgba(20,20,20,0.95)",
                      zIndex: 2,
                    }}
                  >
                    {s}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {(rooms || []).map((r) => {
                const type = formatRoomType(getRoomType(r));
                const cap = getCapacity(r);

                return (
                  <tr key={r.id}>
                    {/* Room name cell clickable */}
                    <td
                      onClick={() => setRoomPopup(r)}
                      style={{
                        padding: 10,
                        borderBottom: "1px solid rgba(255,255,255,0.06)",
                        fontWeight: 700,
                        cursor: "pointer",
                        userSelect: "none",
                        position: "sticky",
                        left: 0,
                        background: "rgba(20,20,20,0.95)",
                        zIndex: 1,
                      }}
                      title="Klikni za detalje o sali"
                    >
                      <div style={{ lineHeight: 1.1 }}>{roomLabel(r)}</div>

                      <div
                        style={{
                          marginTop: 6,
                          fontSize: 12,
                          fontWeight: 500,
                          opacity: 0.85,
                        }}
                      >
                        {type}
                        {cap != null && cap !== "" ? (
                          <>
                            {" "}
                            • {cap}👥
                          </>
                        ) : null}
                      </div>
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
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Popup / mini prozorčić */}
      {roomPopup ? (
        <div
          onClick={() => setRoomPopup(null)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.55)",
            zIndex: 9999,
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "center",
            paddingTop: 90,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "min(520px, calc(100% - 24px))",
              borderRadius: 14,
              border: "1px solid rgba(255,255,255,0.10)",
              background: "rgba(25,25,25,0.98)",
              boxShadow: "0 12px 40px rgba(0,0,0,0.55)",
              padding: 16,
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "flex-start",
                justifyContent: "space-between",
                gap: 12,
              }}
            >
              <div>
                <div style={{ fontSize: 18, fontWeight: 800 }}>
                  {roomLabel(roomPopup)}
                </div>
                <div style={{ marginTop: 6, fontSize: 13, opacity: 0.9 }}>
                  {formatRoomType(getRoomType(roomPopup))} •{" "}
                  {getCapacity(roomPopup) != null ? `${getCapacity(roomPopup)}👥` : "—"}
                </div>
              </div>

              <button
                onClick={() => setRoomPopup(null)}
                style={{ padding: "8px 10px", fontWeight: 700 }}
              >
                X
              </button>
            </div>

            <div
              style={{
                marginTop: 14,
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 10,
                fontSize: 13,
              }}
            >
              <div>
                <div style={{ opacity: 0.75, marginBottom: 3 }}>Zgrada</div>
                <div style={{ fontWeight: 700 }}>
                  {formatBuilding(getBuilding(roomPopup))}
                </div>
              </div>

              <div>
                <div style={{ opacity: 0.75, marginBottom: 3 }}>Sprat</div>
                <div style={{ fontWeight: 700 }}>
                  {getFloor(roomPopup) != null ? String(getFloor(roomPopup)) : "—"}
                </div>
              </div>

              <div>
                <div style={{ opacity: 0.75, marginBottom: 3 }}>Kapacitet</div>
                <div style={{ fontWeight: 700 }}>
                  {getCapacity(roomPopup) != null ? String(getCapacity(roomPopup)) : "—"}
                </div>
              </div>

              <div>
                <div style={{ opacity: 0.75, marginBottom: 3 }}>
                  Broj računara
                </div>
                <div style={{ fontWeight: 700 }}>
                  {getComputers(roomPopup) != null ? String(getComputers(roomPopup)) : "—"}
                </div>
              </div>

              {/* Ako imaš još polja u room objektu, dodaj ovde */}
            </div>

            <div style={{ marginTop: 14, opacity: 0.75, fontSize: 12 }}>
              Klikni van prozora da zatvoriš.
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}