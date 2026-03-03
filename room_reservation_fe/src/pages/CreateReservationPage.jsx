import React, { useEffect, useMemo, useState } from "react";
import { useAuth } from "../auth/AuthContext.jsx";
import { apiCreateGroupReservation, apiGetRooms, apiGetSchedule } from "../api/api.js";
import ScheduleGrid from "../components/ScheduleGrid.jsx";

// Ako ti već imaš ove util fajlove u projektu, zadrži import kao što ti je bilo pre.
// Ako nemaš, ostavi kako ti trenutno radi. (Ovaj fajl neće menjati tvoje util-e.)
import { toDateInputValue, timeToMinutes } from "../utils/time.js";
import { extractErrorMessage } from "../utils/errors.js";
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

  // ✅ poruke za submit (hoćeš da stoje kod dugmeta)
  const [formErr, setFormErr] = useState("");
  const [formOk, setFormOk] = useState("");

  const scheduleItems = useMemo(() => normalizeSchedule(scheduleRaw), [scheduleRaw]);

  const loadBase = async () => {
    setLoading(true);
    try {
      const [r, s] = await Promise.all([apiGetRooms(), apiGetSchedule(dateStr)]);
      setRooms(r || []);
      setScheduleRaw(s);
    } catch (ex) {
      console.error(ex);
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
    setFormErr("");
    setFormOk("");
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
    setFormErr("");
    setFormOk("");

    if (!canSubmit()) {
      setFormErr(
        "Popuni datum, vreme OD/DO (08:00–20:00), naziv, svrhu i izaberi bar jednu slobodnu salu."
      );
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
      setFormOk("Rezervacija je uspešno kreirana.");

      await loadBase();

      setSelectedRoomIds(new Set());
      setDescByRoomId({});
    } catch (ex) {
      setFormErr(extractErrorMessage(ex, "Greška pri kreiranju rezervacije."));
    } finally {
      setLoading(false);
    }
  };

  // ✅ bitno: boxSizing da inputi nikad ne “pobegnu” iz ekrana
  const inputStyle = {
    width: "100%",
    maxWidth: "100%",
    boxSizing: "border-box",
    padding: "10px 12px",
    borderRadius: 10,
  };

  return (
    <div style={{ display: "grid", gap: 14, maxWidth: "100%" }}>
      <h2 style={{ margin: 0 }}>Napravi rezervaciju</h2>

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
        <div>
          Datum:{" "}
          <input
            value={dateStr}
            onChange={(e) => setDateStr(e.target.value)}
            type="date"
            style={{ padding: "8px 10px", borderRadius: 10 }}
          />
        </div>

        <div>
          Od:{" "}
          <input
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            type="time"
            min="08:00"
            max="20:00"
            step="900"
            style={{ padding: "8px 10px", borderRadius: 10 }}
          />
        </div>

        <div>
          Do:{" "}
          <input
            value={to}
            onChange={(e) => setTo(e.target.value)}
            type="time"
            min="08:00"
            max="20:00"
            step="900"
            style={{ padding: "8px 10px", borderRadius: 10 }}
          />
        </div>

        <button
          onClick={loadBase}
          style={{ padding: "10px 14px", borderRadius: 10, cursor: "pointer" }}
          disabled={loading}
        >
          Osveži
        </button>
      </div>

      <div style={{ opacity: 0.9 }}>
        Radno vreme: 08:00–20:00. Grid prikazuje APPROVED (crveno) i PENDING (žuto) kao blokirano.
      </div>

      {/* ✅ KLJUČNA IZMENA: grid u svom wrapper-u (kao na početnoj) da NE širi stranicu */}
      <div
        style={{
          maxWidth: "100%",
          overflowX: "auto",
          borderRadius: 12,
          border: "1px solid rgba(255,255,255,0.10)",
        }}
      >
        <ScheduleGrid
          rooms={rooms}
          scheduleItems={scheduleItems}
          highlightSelection={highlightSelection}
        />
      </div>

      <div style={{ display: "grid", gap: 10, maxWidth: "100%" }}>
        <h3 style={{ margin: "6px 0 0 0" }}>Kreiranje rezervacije (grupa)</h3>

        <div style={{ display: "grid", gap: 6, maxWidth: "100%" }}>
          <label>Naziv</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            style={inputStyle}
            placeholder="npr. Termin"
          />
        </div>

        <div style={{ display: "grid", gap: 6, maxWidth: "100%" }}>
          <label>Svrha</label>
          <select
            value={purpose}
            onChange={(e) => setPurpose(e.target.value)}
            style={{ ...inputStyle, padding: "10px 12px" }}
          >
            <option value="VEZBE">VEZBE</option>
            <option value="ISPIT">ISPIT</option>
            <option value="PREDAVANJE">PREDAVANJE</option>
            <option value="OSTALO">OSTALO</option>
          </select>
        </div>

        {!from || !to ? (
          <div style={{ opacity: 0.9 }}>
            Prvo izaberi vreme OD i DO, pa će se ispod pojaviti slobodne sale.
          </div>
        ) : (
          <div style={{ display: "grid", gap: 8 }}>
            <div style={{ fontWeight: 700 }}>
              Slobodne sale za {dateStr} ({from}–{to}):
            </div>

            {freeRooms.length === 0 ? (
              <div>Nema slobodnih sala u izabranom terminu.</div>
            ) : (
              <div
                style={{
                  maxHeight: 260,
                  overflowY: "auto",
                  border: "1px solid rgba(255,255,255,0.10)",
                  borderRadius: 12,
                  padding: 10,
                  maxWidth: "100%",
                  boxSizing: "border-box",
                }}
              >
                <div style={{ display: "grid", gap: 10 }}>
                  {freeRooms.map((r) => {
                    const checked = selectedRoomIds.has(r.id);
                    return (
                      <div
                        key={r.id}
                        style={{
                          display: "grid",
                          gap: 6,
                          padding: "10px 10px",
                          borderRadius: 12,
                          border: "1px solid rgba(255,255,255,0.08)",
                          maxWidth: "100%",
                          boxSizing: "border-box",
                        }}
                      >
                        <label style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleRoom(r.id)}
                          />
                          <span style={{ fontWeight: 700 }}>
                            {r.code || r.name || `Sala #${r.id}`}
                          </span>
                        </label>

                        <div style={{ display: "grid", gap: 6 }}>
                          <label style={{ opacity: 0.85 }}>Opis (opciono)</label>
                          <input
                            value={descByRoomId[r.id] || ""}
                            onChange={(e) =>
                              setDescByRoomId((p) => ({ ...p, [r.id]: e.target.value }))
                            }
                            style={inputStyle}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ✅ poruka IDE IZNAD dugmeta (kako si tražio) */}
        {formErr ? <div style={{ color: "#ff6b6b" }}>{formErr}</div> : null}
        {formOk ? <div style={{ color: "#7CFF7C" }}>{formOk}</div> : null}

        <button
          onClick={onSubmit}
          disabled={loading}
          style={{
            padding: "12px 16px",
            borderRadius: 12,
            cursor: "pointer",
            fontWeight: 800,
          }}
        >
          {loading ? "..." : "Kreiraj rezervaciju"}
        </button>
      </div>
    </div>
  );
}