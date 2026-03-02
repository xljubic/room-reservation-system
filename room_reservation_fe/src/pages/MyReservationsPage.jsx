import React, { useEffect, useMemo, useState } from "react";
import { useAuth } from "../auth/AuthContext.jsx";
import { apiCancelReservation, apiGetMyReservations } from "../api/api.js";
import StatusBadge from "../components/StatusBadge.jsx";

function normStatus(s) {
  return String(s || "").toUpperCase();
}

export default function MyReservationsPage() {
  const { user } = useAuth();
  const [groups, setGroups] = useState([]);
  const [filter, setFilter] = useState("ALL");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const load = async () => {
    setErr("");
    setLoading(true);
    try {
      const data = await apiGetMyReservations(user?.id);
      setGroups(Array.isArray(data) ? data : []);
    } catch (ex) {
      setErr(ex?.response?.data?.message || ex?.message || "Greška pri učitavanju mojih rezervacija.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onCancel = async (reservationId) => {
    setErr("");
    setLoading(true);
    try {
      await apiCancelReservation(reservationId);
      await load();
    } catch (ex) {
      setErr(ex?.response?.data?.message || ex?.message || "Greška pri otkazivanju.");
    } finally {
      setLoading(false);
    }
  };

  const flattened = useMemo(() => {
    // Backend kod tebe vraća “grupe” sa stavkama – ali ponekad ljudi vrate već “items”.
    // Pokušajmo oba:
    const list = [];
    for (const g of groups || []) {
      const items = g.items || g.reservations || g.reservationItems || [];
      if (Array.isArray(items) && items.length) {
        for (const it of items) list.push({ group: g, item: it });
      } else {
        // fallback: tretiraj g kao stavku
        list.push({ group: g, item: g });
      }
    }
    return list;
  }, [groups]);

  const filtered = useMemo(() => {
    let list = [...flattened];

    if (filter !== "ALL") {
      list = list.filter(({ item }) => normStatus(item.status) === filter);
    }

    // sort: najnovije -> najstarije (po createdAt ako postoji, fallback id desc)
    list.sort((a, b) => {
      const ca = a.item.createdAt || a.group.createdAt || "";
      const cb = b.item.createdAt || b.group.createdAt || "";
      if (ca && cb && ca !== cb) return String(cb).localeCompare(String(ca));
      const ia = Number(a.item.id || 0);
      const ib = Number(b.item.id || 0);
      return ib - ia;
    });

    return list;
  }, [flattened, filter]);

  return (
    <div style={{ display: "grid", gap: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
        <h2>Moje rezervacije</h2>
        <button onClick={load} disabled={loading} style={{ padding: "8px 12px", borderRadius: 10 }}>
          Osveži
        </button>
      </div>

      <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
        <label>Filter:</label>
        <select value={filter} onChange={(e) => setFilter(e.target.value)}>
          <option value="ALL">Sve</option>
          <option value="PENDING">PENDING</option>
          <option value="APPROVED">APPROVED</option>
          <option value="DENIED">DENIED</option>
          <option value="REJECTED">REJECTED</option>
          <option value="CANCELED">CANCELED</option>
          <option value="CANCELLED">CANCELLED</option>
        </select>
      </div>

      {err && <div style={{ color: "#ff6b6b" }}>{err}</div>}

      <div style={{ display: "grid", gap: 10 }}>
        {filtered.length === 0 ? (
          <div style={{ opacity: 0.85 }}>Nema rezervacija za prikaz.</div>
        ) : (
          filtered.map(({ group, item }) => {
            const status = normStatus(item.status);
            const canCancel = status === "PENDING" || status === "APPROVED";

            const label = item.roomCode || item.roomName || item.room?.code || item.room?.name || item.roomId;

            const start = item.startTime || item.timeFrom || item.from;
            const end = item.endTime || item.timeTo || item.to;
            const date = item.date || group.date || group.reservationDate || "";

            return (
              <div
                key={`${group.id || "g"}_${item.id || "i"}`}
                style={{
                  padding: "10px 12px",
                  borderRadius: 12,
                  border: "1px solid rgba(255,255,255,0.12)",
                  background: "rgba(255,255,255,0.03)",
                  display: "grid",
                  gap: 8,
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center" }}>
                  <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                    <b>{group.name || group.groupName || "Grupa"}</b>
                    <span style={{ opacity: 0.9 }}>
                      {date} {start}–{end}
                    </span>
                    <span style={{ opacity: 0.9 }}>{label}</span>
                    {group.purpose && <span style={{ opacity: 0.8 }}>({group.purpose})</span>}
                    <StatusBadge status={status} />
                  </div>

                  <button
                    onClick={() => onCancel(item.id)}
                    disabled={!canCancel || loading}
                    style={{ padding: "8px 12px", borderRadius: 10, opacity: canCancel ? 1 : 0.45 }}
                  >
                    Otkaži
                  </button>
                </div>

                {item.description && <div style={{ opacity: 0.9 }}>Opis: {item.description}</div>}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}