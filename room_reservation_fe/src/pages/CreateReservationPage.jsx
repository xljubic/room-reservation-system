import React, { useEffect, useMemo, useState } from "react";
import { useAuth } from "../auth/AuthContext.jsx";
import { apiCreateGroupReservation, apiGetRooms, apiGetSchedule } from "../api/api.js";
import { toDateInputValue, timeToMinutes } from "../utils/time.js";
import ScheduleGrid from "../components/ScheduleGrid.jsx";
import { computeFreeRoomsForRange, normalizeSchedule } from "../utils/schedule.js";

export default function CreateReservationPage() {
  const { user } = useAuth();

  const [dateStr, setDateStr] = useState(toDateInputValue(new Date()));
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const [name, setName] = useState("");
  const [purpose, setPurpose] = useState("VEZBE");

  const [rooms, setRooms] = useState([]);
  const [scheduleRaw, setScheduleRaw] = useState(null);

  const [selectedRoomIds, setSelectedRoomIds] = useState(new Set());
  const [descByRoomId, setDescByRoomId] = useState({}); // opis po stavci

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [okMsg, setOkMsg] = useState("");

  const scheduleItems = useMemo(() => normalizeSchedule(scheduleRaw), [scheduleRaw]);

  const loadBase = async () => {
    setErr("");
    setOkMsg("");
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
    loadBase();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateStr]);

  // Kad se promeni vreme, resetuj selekciju (da ne ostanu stare sale).
  useEffect(() => {
    setSelectedRoomIds(new Set());
    setDescByRoomId({});
  }, [from, to]);

  const freeRooms = useMemo(() => {
    if (!from || !to) return [];
    return computeFreeRoomsForRange(rooms, scheduleItems, from, to);
  }, [from, to, rooms, scheduleItems]);

  const toggleRoom = (roomId) => {
    setSelectedRoomIds((prev) => {
      const next = new Set(prev);
      if (next.has(roomId)) next.delete(roomId);
      else next.add(roomId);
      return next;
    });
  };

  const highlightSelection = useMemo(() => {
    if (!from || !to || selectedRoomIds.size === 0) return null;
    return { roomIds: selectedRoomIds, from, to };
  }, [from, to, selectedRoomIds]);

  const canSubmit = () => {
    if (!dateStr) return false;
    if (!from || !to) return false;
    if (!name.trim()) return false;
    if (!purpose) return false;
    if (selectedRoomIds.size === 0) return false;

    // Validacija vremena: 08:00–20:00 i from < to
    const fromMin = timeToMinutes(from);
    const toMin = timeToMinutes(to);
    if (!(fromMin >= 8 * 60 && toMin <= 20 * 60 && fromMin < toMin)) return false;

    return true;
  };

  const onSubmit = async () => {
    setErr("");
    setOkMsg("");

    if (!canSubmit()) {
      setErr("Popuni datum, vreme OD/DO (08:00–20:00), naziv, svrhu i izaberi bar jednu slobodnu salu.");
      return;
    }

    /**
     * DTO sa backend-a (GitHub):
     * CreateReservationGroupRequest:
     * {
     *   createdById,
     *   date,
     *   purpose,
     *   name,
     *   items: [{ roomId, startTime, endTime, description }]
     * }
     */
    const items = Array.from(selectedRoomIds).map((roomId) => ({
      roomId,
      startTime: from, // "HH:mm"
      endTime: to,     // "HH:mm"
      description: descByRoomId[roomId] || "",
    }));

    const payload = {
      createdById: user?.id,
      date: dateStr,
      purpose,
      name: name.trim(),
      items,
    };

    setLoading(true);
    try {
      await apiCreateGroupReservation(payload);
      setOkMsg("Rezervacija je kreirana.");

      // Reload schedule da odmah vidiš blokade
      await loadBase();

      setSelectedRoomIds(new Set());
      setDescByRoomId({});
    } catch (ex) {
      setErr(ex?.response?.data?.message || ex?.message || "Greška pri kreiranju rezervacije.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: "grid", gap: 14 }}>
      <h2>Napravi rezervaciju</h2>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "end" }}>
        <div>
          <label>Datum:</label>
          <input type="date" value={dateStr} onChange={(e) => setDateStr(e.target.value)} />
        </div>

        <div>
          <label>Od:</label>
          <input type="time" value={from} onChange={(e) => setFrom(e.target.value)} step="900" />
        </div>

        <div>
          <label>Do:</label>
          <input type="time" value={to} onChange={(e) => setTo(e.target.value)} step="900" />
        </div>

        <button onClick={loadBase} disabled={loading} style={{ padding: "8px 12px", borderRadius: 10 }}>
          Osveži
        </button>
      </div>

      <div style={{ opacity: 0.85, fontSize: 13 }}>
        Radno vreme: 08:00–20:00. Grid prikazuje APPROVED i PENDING kao blokirano. Izabrane sale/termin se označavaju plavom.
      </div>

      <ScheduleGrid rooms={rooms} scheduleRaw={scheduleRaw} highlightSelection={highlightSelection} />

      <div style={{ border: "1px solid rgba(255,255,255,0.12)", borderRadius: 10, padding: 12 }}>
        <h3>Kreiranje rezervacije (grupa)</h3>

        <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
          <div style={{ minWidth: 260 }}>
            <label>Naziv:</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              style={{ width: "100%" }}
              placeholder="npr. Termin"
            />
          </div>

          <div>
            <label>Svrha:</label>
            <select value={purpose} onChange={(e) => setPurpose(e.target.value)}>
              <option value="VEZBE">VEZBE</option>
              <option value="ISPIT">ISPIT</option>
              <option value="PREDAVANJE">PREDAVANJE</option>
              <option value="OSTALO">OSTALO</option>
            </select>
          </div>
        </div>

        <div style={{ marginTop: 10 }}>
          {!from || !to ? (
            <div style={{ opacity: 0.85 }}>
              Prvo izaberi vreme <b>OD</b> i <b>DO</b>, pa će se ispod pojaviti slobodne sale.
            </div>
          ) : (
            <>
              <div style={{ marginBottom: 8, opacity: 0.9 }}>
                Slobodne sale za {dateStr} ({from}–{to}):
              </div>

              {freeRooms.length === 0 ? (
                <div style={{ opacity: 0.85 }}>Nema slobodnih sala u izabranom terminu.</div>
              ) : (
                <div style={{ display: "grid", gap: 8 }}>
                  {freeRooms.map((r) => {
                    const checked = selectedRoomIds.has(r.id);
                    return (
                      <div
                        key={r.id}
                        style={{
                          display: "grid",
                          gridTemplateColumns: "24px 120px 1fr",
                          gap: 10,
                          alignItems: "center",
                          padding: "8px 10px",
                          borderRadius: 10,
                          background: "rgba(255,255,255,0.04)",
                        }}
                      >
                        <input type="checkbox" checked={checked} onChange={() => toggleRoom(r.id)} />
                        <div style={{ fontWeight: 700 }}>{r.code || r.name || `Sala #${r.id}`}</div>
                        <input
                          disabled={!checked}
                          placeholder="Opis po stavci (opciono)"
                          value={descByRoomId[r.id] || ""}
                          onChange={(e) => setDescByRoomId((p) => ({ ...p, [r.id]: e.target.value }))}
                          style={{ width: "100%" }}
                        />
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>

        {err && <div style={{ marginTop: 10, color: "#ff6b6b" }}>{err}</div>}
        {okMsg && <div style={{ marginTop: 10, color: "#7CFC8A" }}>{okMsg}</div>}

        <div style={{ marginTop: 12 }}>
          <button onClick={onSubmit} disabled={loading} style={{ padding: "10px 14px", borderRadius: 10 }}>
            Kreiraj rezervaciju
          </button>
        </div>
      </div>
    </div>
  );
}