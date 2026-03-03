import React, { useEffect, useMemo, useState } from "react";
import { useAuth } from "../auth/AuthContext.jsx";
import { apiCancelReservation, apiGetMyReservations } from "../api/api.js";
import { extractErrorMessage } from "../utils/errors.js";
import { formatDateDDMMYYYY, formatTimeHHMM } from "../utils/time.js";
import StatusBadge from "../components/StatusBadge.jsx";

function normStatus(s) {
  return String(s || "").toUpperCase();
}

function groupByGroupId(items) {
  const map = new Map();
  for (const it of items || []) {
    const gid = it.groupId || `__single__${it.id}`;
    if (!map.has(gid)) map.set(gid, []);
    map.get(gid).push(it);
  }
  for (const [k, arr] of map.entries()) {
    arr.sort((a, b) => String(a.startDateTime || "").localeCompare(String(b.startDateTime || "")));
    map.set(k, arr);
  }
  return Array.from(map.entries()).map(([groupId, reservations]) => ({ groupId, reservations }));
}

export default function MyReservationsPage() {
  const { user } = useAuth();

  const [reservations, setReservations] = useState([]);
  const [filter, setFilter] = useState("ALL");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const load = async () => {
    setErr("");
    setLoading(true);
    try {
      const data = await apiGetMyReservations(user?.id);
      setReservations(Array.isArray(data) ? data : []);
    } catch (ex) {
      setErr(extractErrorMessage(ex, "Greška pri učitavanju mojih rezervacija."));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const grouped = useMemo(() => groupByGroupId(reservations), [reservations]);

  const filtered = useMemo(() => {
    let list = [...grouped];
    if (filter !== "ALL") {
      list = list.filter((g) => g.reservations.some((it) => normStatus(it.status) === filter));
    }
    // najnovije prvo (po createdAt max u grupi)
    list.sort((a, b) => {
      const ca = Math.max(...a.reservations.map((x) => Date.parse(x.createdAt || x.startDateTime || 0)));
      const cb = Math.max(...b.reservations.map((x) => Date.parse(x.createdAt || x.startDateTime || 0)));
      return cb - ca;
    });
    return list;
  }, [grouped, filter]);

  const cancelGroup = async (group) => {
    setErr("");
    setLoading(true);
    try {
      // otkazi sve stavke koje nisu već CANCELED
      const toCancel = group.reservations.filter((it) => normStatus(it.status) !== "CANCELED");
      for (const it of toCancel) {
        await apiCancelReservation(it.id, user?.id);
      }
      await load();
    } catch (ex) {
      setErr(extractErrorMessage(ex, "Greška pri otkazivanju."));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
        <h2>Moje rezervacije</h2>
        <button onClick={load} disabled={loading} style={{ padding: "10px 14px", borderRadius: 10 }}>
          Osveži
        </button>
      </div>

      <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 10 }}>
        <label>
          Filter:{" "}
          <select value={filter} onChange={(e) => setFilter(e.target.value)}>
            <option value="ALL">Sve</option>
            <option value="PENDING">PENDING</option>
            <option value="APPROVED">APPROVED</option>
            <option value="REJECTED">REJECTED</option>
            <option value="CANCELED">CANCELED</option>
          </select>
        </label>
      </div>

      {err && <div style={{ color: "#ff6b6b", marginBottom: 10 }}>{err}</div>}

      <div style={{ display: "grid", gap: 12 }}>
        {filtered.length === 0 ? (
          <div>Nema rezervacija.</div>
        ) : (
          filtered.map((g) => {
            const first = g.reservations[0];
            const status = first?.status || "";
            const canCancel = g.reservations.some((it) => normStatus(it.status) === "PENDING" || normStatus(it.status) === "APPROVED");

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
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                  <div style={{ fontWeight: 800 }}>
                    {first?.name} — {dateLabel} {fromLabel}–{toLabel}{" "}
                    {first?.purpose ? <span style={{ opacity: 0.75 }}>({first.purpose})</span> : null}
                  </div>
                  <StatusBadge status={status} />
                </div>

                <div style={{ marginTop: 8, display: "grid", gap: 6 }}>
                  {g.reservations.map((it) => (
                    <div key={it.id}>
                      <b>{it.room?.code || it.roomCode}</b> — {formatTimeHHMM(it.startDateTime)}–{formatTimeHHMM(it.endDateTime)}
                      {it.description ? ` | Opis: ${it.description}` : ""}
                    </div>
                  ))}
                </div>

                <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 12 }}>
                  <button
                    onClick={() => cancelGroup(g)}
                    disabled={loading || !canCancel}
                    style={{ padding: "10px 14px", borderRadius: 10 }}
                  >
                    Otkaži
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}