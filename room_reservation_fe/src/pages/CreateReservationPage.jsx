import React, { useEffect, useMemo, useState } from "react";
import { useAuth } from "../auth/AuthContext.jsx";
import {
  apiCreateGroupReservation,
  apiGetRooms,
  apiGetSchedule,
} from "../api/api.js";
import ScheduleGrid from "../components/ScheduleGrid.jsx";

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

  const [formErr, setFormErr] = useState("");
  const [formOk, setFormOk] = useState("");

  // normalizacija za util (da ne puca kad menjaš OD/DO)
  const scheduleItems = useMemo(
    () => normalizeSchedule(scheduleRaw),
    [scheduleRaw]
  );

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

  // kad se promeni vreme, resetuj selekciju
  useEffect(() => {
    setSelectedRoomIds(new Set());
    setDescByRoomId({});
    setFormErr("");
    setFormOk("");
  }, [from, to]);

  // FREE ROOMS (sa try/catch da nikad ne sruši ekran)
  const freeRooms = useMemo(() => {
    if (!from || !to) return [];
    try {
      return computeFreeRoomsForRange(rooms, scheduleItems, from, to);
    } catch (e) {
      console.error("computeFreeRoomsForRange failed:", e);
      return [];
    }
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
    if (!(fromMin >= 8 * 60 && toMin <= 20 * 60 && fromMin < toMin))
      return false;

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

  // širina polja za Naziv/Svrha (manje nego full width)
  const formWidth = "min(520px, 100%)";

  return (
    <div className="page-content-wrap">
      <h2 className="page-title">Napravi rezervaciju</h2>

      {/* Gornje kontrole */}
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center", marginBottom: 16 }}>
        <div>
          Datum:{" "}
          <input
            value={dateStr}
            onChange={(e) => setDateStr(e.target.value)}
            type="date"
            className="input"
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
            className="input"
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
            className="input"
          />
        </div>

        <button onClick={loadBase} className="btn" disabled={loading}>
          Osveži
        </button>
      </div>

      <div style={{ opacity: 0.9 }}>
        Radno vreme: 08:00–20:00. Grid prikazuje APPROVED i PENDING kao blokirano.
      </div>

      {/* Grid - ista širina kao content */}
      <div
        style={{
          borderRadius: 12,
          border: "1px solid var(--border-medium)",
          overflowX: "auto",
          maxWidth: "100%",
        }}
      >
        <ScheduleGrid
          rooms={rooms}
          scheduleRaw={scheduleRaw}
          highlightSelection={highlightSelection}
        />
      </div>

      <div style={{ display: "grid", gap: 12, marginTop: 24 }}>
        <h3 style={{ margin: "0 0 8px 0" }}>Kreiranje rezervacije (grupa)</h3>

        {/* Naziv */}
        <div style={{ width: formWidth, display: "grid", gap: 6 }}>
          <label>Naziv</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="input"
            style={{ width: "100%", boxSizing: "border-box" }}
            placeholder="npr. Termin"
          />
        </div>

        {/* Svrha */}
        <div style={{ width: formWidth, display: "grid", gap: 6 }}>
          <label>Svrha</label>
          <select
            value={purpose}
            onChange={(e) => setPurpose(e.target.value)}
            className="input"
            style={{ width: "100%", boxSizing: "border-box" }}
          >
            <option value="VEZBE">VEZBE</option>
            <option value="ISPIT">ISPIT</option>
            <option value="PREDAVANJE">PREDAVANJE</option>
            <option value="OSTALO">OSTALO</option>
          </select>
        </div>

        {/* Slobodne sale */}
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
              <div style={{ opacity: 0.9 }}>Nema slobodnih sala u izabranom terminu.</div>
            ) : (
              <div
                style={{
                  maxHeight: 260,
                  overflowY: "auto",
                  border: "1px solid var(--border-medium)",
                  borderRadius: 12,
                  padding: 10,
                  width: "100%",
                  maxWidth: "100%",
                  boxSizing: "border-box",
                  background: "var(--bg-card)",
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
                          padding: 10,
                          borderRadius: 12,
                          border: "1px solid var(--border-light)",
                          background: "var(--bg-input)",
                        }}
                      >
                        <label style={{ display: "flex", gap: 10, alignItems: "center" }}>
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleRoom(r.id)}
                          />
                          <span style={{ fontWeight: 700 }}>
                            {r.code || r.name || `Sala #${r.id}`}
                          </span>
                        </label>

                        <div style={{ width: formWidth, display: "grid", gap: 6 }}>
                          <label style={{ opacity: 0.9 }}>Opis (opciono)</label>
                          <input
                            value={descByRoomId[r.id] || ""}
                            onChange={(e) =>
                              setDescByRoomId((p) => ({ ...p, [r.id]: e.target.value }))
                            }
                            className="input"
                            style={{ width: "100%", boxSizing: "border-box" }}
                            placeholder="npr. grupa 1"
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

        {/* Poruke */}
        {formErr ? <div style={{ color: "#ff6b6b", marginTop: 6 }}>{formErr}</div> : null}
        {formOk ? <div style={{ color: "#7CFF7C", marginTop: 6 }}>{formOk}</div> : null}

        {/* Submit dugme */}
        <button
          onClick={onSubmit}
          disabled={loading}
          className="btn"
          style={{ width: "fit-content", minWidth: 220 }}
        >
          {loading ? "..." : "Kreiraj rezervaciju"}
        </button>
      </div>
    </div>
  );
}