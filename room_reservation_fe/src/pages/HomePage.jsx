import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext.jsx";
import { apiGetRooms, apiGetSchedule } from "../api/api.js";
import { toDateInputValue } from "../utils/time.js";
import ScheduleGrid from "../components/ScheduleGrid.jsx";
import StatusBadge from "../components/StatusBadge.jsx";
import { getRoomLabel, getStatus, getTimes, normalizeSchedule } from "../utils/schedule.js";

export default function HomePage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [dateStr, setDateStr] = useState(toDateInputValue(new Date()));
  const [rooms, setRooms] = useState([]);
  const [scheduleRaw, setScheduleRaw] = useState(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const scheduleItems = useMemo(() => normalizeSchedule(scheduleRaw), [scheduleRaw]);

  const load = async () => {
    setErr("");
    setLoading(true);
    try {
      const [r, s] = await Promise.all([apiGetRooms(), apiGetSchedule(dateStr)]);
      setRooms(r || []);
      setScheduleRaw(s);
    } catch (ex) {
      setErr(ex?.response?.data?.message || ex?.message || "Greška pri učitavanju.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateStr]);

  const adminList = useMemo(() => {
    if (user?.role !== "ADMIN") return [];
    // prikaz svih rezervacija za datum (kao na skrinšotu)
    // sortiranje: po vremenu
    const items = [...scheduleItems];
    items.sort((a, b) => {
      const ta = (getTimes(a).start || "").localeCompare(getTimes(b).start || "");
      if (ta !== 0) return ta;
      return String(getRoomLabel(a)).localeCompare(String(getRoomLabel(b)));
    });
    return items;
  }, [scheduleItems, user?.role]);

  return (
    <div style={{ display: "grid", gap: 14 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div>
          <label>Datum:</label>{" "}
          <input type="date" value={dateStr} onChange={(e) => setDateStr(e.target.value)} />
        </div>
        <button onClick={load} disabled={loading} style={{ padding: "8px 12px", borderRadius: 10 }}>
          Osveži
        </button>
        {err && <div style={{ color: "#ff6b6b" }}>{err}</div>}
      </div>

      <ScheduleGrid rooms={rooms} scheduleRaw={scheduleRaw} highlightSelection={null} />

      <div>
        <button onClick={() => navigate("/create")} style={{ padding: "10px 14px", borderRadius: 10 }}>
          Napravi rezervaciju
        </button>
      </div>

      {user?.role === "ADMIN" && (
        <div style={{ border: "1px solid rgba(255,255,255,0.12)", borderRadius: 10, padding: 12 }}>
          <h3>Sve rezervacije za izabrani datum</h3>
          <div style={{ display: "grid", gap: 8 }}>
            {adminList.length === 0 && <div style={{ opacity: 0.8 }}>Nema rezervacija za ovaj datum.</div>}
            {adminList.map((it) => {
              const { start, end } = getTimes(it);
              const status = getStatus(it);
              return (
                <div
                  key={it.id ?? `${getRoomLabel(it)}_${start}_${end}_${status}`}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: 10,
                    padding: "8px 10px",
                    borderRadius: 10,
                    background: "rgba(255,255,255,0.04)",
                  }}
                >
                  <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                    <b>{getRoomLabel(it)}</b>
                    <span>
                      {start} – {end}
                    </span>
                    {it.createdByEmail && <span>by {it.createdByEmail}</span>}
                  </div>
                  <StatusBadge status={status} />
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}