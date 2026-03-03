import React, { useEffect, useMemo, useState } from "react";
import { useAuth } from "../auth/AuthContext.jsx";
import { apiCreateGroupReservation, apiGetRooms, apiGetSchedule } from "../api/api.js";
import { toDateInputValue, timeToMinutes } from "../utils/time.js";
import { extractErrorMessage } from "../utils/errors.js";
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
  const [descByRoomId, setDescByRoomId] = useState({});

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
      setErr(extractErrorMessage(ex, "Greška pri učitavanju."));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBase();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateStr]);

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

    const items = Array.from(selectedRoomIds).map((roomId) => ({
      roomId,
      startTime: from,
      endTime: to,
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
      await loadBase();
      setSelectedRoomIds(new Set());
      setDescByRoomId({});
    } catch (ex) {
      setErr(extractErrorMessage(ex, "Greška pri kreiranju rezervacije."));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: 24 }}>
      <h2>Napravi rezervaciju</h2>

      <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
        <label>
          Datum:{" "}
          <input value={dateStr} type="date" onChange={(e) => setDateStr(e.target.value)} />
        </label>

        <label>
          Od:{" "}
          <input
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            type="time"
            min="08:00"
            max="20:00"
            step="900"
          />
        </label>

        <label>
          Do:{" "}
          <input
            value={to}
            onChange={(e) => setTo(e.target.value)}
            type="time"
            min="08:00"
            max="20:00"
            step="900"
          />
        </label>

        <button onClick={loadBase} disabled={loading} style={{ padding: "10px 14px", borderRadius: 10 }}>
          Osveži
        </button>
      </div>

      <div style={{ opacity: 0.75, marginTop: 8 }}>
        Radno vreme: 08:00–20:00. Grid prikazuje APPROVED (crveno) i PENDING (žuto) kao blokirano. Izabrane sale/termin
        se označavaju plavom.
      </div>

      {err && <div style={{ color: "#ff6b6b", marginTop: 10 }}>{err}</div>}
      {okMsg && <div style={{ color: "#7CFC90", marginTop: 10 }}>{okMsg}</div>}

      <div style={{ marginTop: 12 }}>
        <ScheduleGrid rooms={rooms} scheduleRaw={scheduleRaw} highlightSelection={highlightSelection} />
      </div>

      <div style={{ marginTop: 16 }}>
        <h3>Kreiranje rezervacije (grupa)</h3>

        <div style={{ display: "grid", gap: 10, maxWidth: 700 }}>
          <label>
            Naziv:
            <input value={name} onChange={(e) => setName(e.target.value)} style={{ width: "100%" }} placeholder="npr. Termin" />
          </label>

          <label>
            Svrha:
            <select value={purpose} onChange={(e) => setPurpose(e.target.value)}>
              <option value="VEZBE">VEZBE</option>
              <option value="ISPIT">ISPIT</option>
              <option value="PREDAVANJE">PREDAVANJE</option>
              <option value="OSTALO">OSTALO</option>
            </select>
          </label>

          {!from || !to ? (
            <div>Prvo izaberi vreme OD i DO, pa će se ispod pojaviti slobodne sale.</div>
          ) : (
            <>
              <div style={{ fontWeight: 700 }}>
                Slobodne sale za {dateStr} ({from}–{to}):
              </div>

              {freeRooms.length === 0 ? (
                <div>Nema slobodnih sala u izabranom terminu.</div>
              ) : (
                <div style={{ display: "grid", gap: 10 }}>
                  {freeRooms.map((r) => {
                    const checked = selectedRoomIds.has(r.id);
                    return (
                      <div
                        key={r.id}
                        style={{
                          border: "1px solid rgba(255,255,255,0.10)",
                          borderRadius: 12,
                          padding: 10,
                        }}
                      >
                        <label style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <input type="checkbox" checked={checked} onChange={() => toggleRoom(r.id)} />
                          <b>{r.code || r.name || `Sala #${r.id}`}</b>
                        </label>

                        <div style={{ marginTop: 8 }}>
                          Opis (opciono):
                          <input
                            value={descByRoomId[r.id] || ""}
                            onChange={(e) => setDescByRoomId((p) => ({ ...p, [r.id]: e.target.value }))}
                            style={{ width: "100%" }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}

          <button onClick={onSubmit} disabled={loading} style={{ padding: "10px 14px", borderRadius: 10 }}>
            Kreiraj rezervaciju
          </button>
        </div>
      </div>
    </div>
  );
}