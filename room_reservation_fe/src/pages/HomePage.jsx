import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext.jsx";
import { apiGetRooms, apiGetSchedule } from "../api/api.js";
import { toDateInputValue, formatDateDDMMYYYY, formatTimeHHMM } from "../utils/time.js";
import { extractErrorMessage } from "../utils/errors.js";
import ScheduleGrid from "../components/ScheduleGrid.jsx";
import StatusBadge from "../components/StatusBadge.jsx";
import { normalizeSchedule } from "../utils/schedule.js";

function groupByGroupId(items) {
  const map = new Map();
  for (const it of items) {
    const gid = it.groupId || `__single__${it.id}`;
    if (!map.has(gid)) map.set(gid, []);
    map.get(gid).push(it);
  }
  // sort items within group
  for (const [k, arr] of map.entries()) {
    arr.sort((a, b) => String(a.startDateTime || "").localeCompare(String(b.startDateTime || "")));
    map.set(k, arr);
  }
  return Array.from(map.entries()).map(([groupId, reservations]) => ({ groupId, reservations }));
}

export default function HomePage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [dateStr, setDateStr] = useState(toDateInputValue(new Date()));
  const [rooms, setRooms] = useState([]);
  const [scheduleRaw, setScheduleRaw] = useState(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const scheduleItems = useMemo(() => normalizeSchedule(scheduleRaw), [scheduleRaw]);
  const grouped = useMemo(() => groupByGroupId(scheduleItems), [scheduleItems]);

  const load = async () => {
    setErr("");
    setLoading(true);
    try {
      const [r, s] = await Promise.all([apiGetRooms(), apiGetSchedule(dateStr)]);
      setRooms(r || []);
      setScheduleRaw(s);
    } catch (ex) {
      setErr(extractErrorMessage(ex, "Greška pri učitavanju."));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateStr]);

  // Admin: lista svih rezervacija za datum (grupisano)
  const adminGroups = useMemo(() => {
    if (user?.role !== "ADMIN") return [];
    // sort by first reservation start time
    const list = [...grouped];
    list.sort((a, b) => {
      const sa = a.reservations?.[0]?.startDateTime || "";
      const sb = b.reservations?.[0]?.startDateTime || "";
      return String(sa).localeCompare(String(sb));
    });
    return list;
  }, [grouped, user?.role]);

  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 12 }}>
        <div>
          Datum:{" "}
          <input value={dateStr} type="date" onChange={(e) => setDateStr(e.target.value)} />
        </div>
        <button onClick={load} disabled={loading} style={{ padding: "10px 14px", borderRadius: 10 }}>
          Osveži
        </button>
      </div>

      {err && <div style={{ color: "#ff6b6b", marginBottom: 12 }}>{err}</div>}

      <ScheduleGrid rooms={rooms} scheduleRaw={scheduleRaw} />

      <div style={{ marginTop: 12 }}>
        <button
          onClick={() => navigate("/create")}
          style={{ padding: "10px 14px", borderRadius: 10 }}
        >
          Napravi rezervaciju
        </button>
      </div>

      {user?.role === "ADMIN" && (
        <div style={{ marginTop: 18 }}>
          <h3>Sve rezervacije za izabrani datum</h3>

          {adminGroups.length === 0 && <div>Nema rezervacija za ovaj datum.</div>}

          {adminGroups.map((g) => {
            const first = g.reservations?.[0];
            const createdByEmail = first?.createdByEmail || "";
            const purpose = first?.purpose || "";
            const name = first?.name || "";
            const status = first?.status || "";

            const dateLabel = formatDateDDMMYYYY(first?.startDateTime);
            const fromLabel = formatTimeHHMM(first?.startDateTime);
            const toLabel = formatTimeHHMM(first?.endDateTime);

            return (
              <div
                key={g.groupId}
                style={{
                  border: "1px solid rgba(255,255,255,0.10)",
                  borderRadius: 12,
                  padding: 12,
                  marginTop: 10,
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                  <div style={{ fontWeight: 700 }}>
                    {name} {purpose ? `(${purpose})` : ""}{" "}
                    {createdByEmail ? <span style={{ opacity: 0.75 }}>by {createdByEmail}</span> : null}
                  </div>
                  <StatusBadge status={status} />
                </div>

                <div style={{ opacity: 0.85, marginTop: 6 }}>
                  {dateLabel} {fromLabel}–{toLabel}
                </div>

                <div style={{ marginTop: 8, display: "grid", gap: 6 }}>
                  {g.reservations.map((it) => (
                    <div key={it.id} style={{ opacity: 0.95 }}>
                      <b>{it.roomCode}</b> — {formatTimeHHMM(it.startDateTime)}–{formatTimeHHMM(it.endDateTime)}
                      {it.description ? ` | Opis: ${it.description}` : ""}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}