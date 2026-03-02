import React, { useEffect, useMemo, useState } from "react";
import { apiDecideGroup, apiGetPendingGroups } from "../api/api.js";
import StatusBadge from "../components/StatusBadge.jsx";

function toUpper(s) {
  return String(s || "").toUpperCase();
}

export default function PendingReservationsPage() {
  const [pendingGroups, setPendingGroups] = useState([]);
  const [commentByGroupId, setCommentByGroupId] = useState({});
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const load = async () => {
    setErr("");
    setLoading(true);
    try {
      const data = await apiGetPendingGroups();
      setPendingGroups(Array.isArray(data) ? data : []);
    } catch (ex) {
      setErr(ex?.response?.data?.message || ex?.message || "Greška pri učitavanju pending rezervacija.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const sorted = useMemo(() => {
    const list = [...(pendingGroups || [])];
    // Sort: najstarije kreirane prvo
    list.sort((a, b) => {
      const ca = a.createdAt || a.created_at || "";
      const cb = b.createdAt || b.created_at || "";
      if (ca && cb && ca !== cb) return String(ca).localeCompare(String(cb));
      const ia = Number(a.id || 0);
      const ib = Number(b.id || 0);
      return ia - ib;
    });
    return list;
  }, [pendingGroups]);

  const decide = async (groupId, decision) => {
    setErr("");
    setLoading(true);
    try {
      const comment = commentByGroupId[groupId] || "";
      await apiDecideGroup(groupId, decision, comment);
      await load();
      setCommentByGroupId((p) => ({ ...p, [groupId]: "" }));
    } catch (ex) {
      setErr(ex?.response?.data?.message || ex?.message || "Greška pri approve/reject.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: "grid", gap: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
        <h2>Pending rezervacije</h2>
        <button onClick={load} disabled={loading} style={{ padding: "8px 12px", borderRadius: 10 }}>
          Osveži
        </button>
      </div>

      {err && <div style={{ color: "#ff6b6b" }}>{err}</div>}

      <div style={{ display: "grid", gap: 12 }}>
        {sorted.length === 0 ? (
          <div style={{ opacity: 0.85 }}>Nema pending rezervacija.</div>
        ) : (
          sorted.map((g) => {
            const items = g.items || g.reservations || g.reservationItems || [];
            const status = toUpper(g.status || "PENDING");

            return (
              <div
                key={g.id}
                style={{
                  border: "1px solid rgba(255,255,255,0.12)",
                  borderRadius: 12,
                  padding: 12,
                  background: "rgba(255,255,255,0.03)",
                  display: "grid",
                  gap: 10,
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
                  <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                    <b>{g.name || g.groupName || `Grupa ${g.id}`}</b>
                    {g.purpose && <span style={{ opacity: 0.9 }}>{g.purpose}</span>}
                    {g.createdByEmail && <span style={{ opacity: 0.85 }}>by {g.createdByEmail}</span>}
                    <StatusBadge status={status} />
                  </div>
                  <div style={{ opacity: 0.85, fontSize: 13 }}>
                    Kreirano: {g.createdAt || g.created_at || "—"}
                  </div>
                </div>

                <div style={{ opacity: 0.95 }}>
                  {g.date && (
                    <div>
                      <b>Datum:</b> {g.date}{" "}
                      {g.timeFrom && g.timeTo ? (
                        <>
                          <b>Vreme:</b> {g.timeFrom}–{g.timeTo}
                        </>
                      ) : null}
                    </div>
                  )}
                </div>

                {Array.isArray(items) && items.length > 0 && (
                  <div style={{ display: "grid", gap: 6 }}>
                    {items.map((it) => {
                      const label = it.roomCode || it.roomName || it.room?.code || it.room?.name || it.roomId;
                      const start = it.startTime || it.timeFrom || it.from || g.timeFrom;
                      const end = it.endTime || it.timeTo || it.to || g.timeTo;
                      return (
                        <div
                          key={it.id || `${label}_${start}_${end}`}
                          style={{ padding: "6px 10px", borderRadius: 10, background: "rgba(0,0,0,0.20)" }}
                        >
                          <b>{label}</b> — {start}–{end} {it.description ? ` | ${it.description}` : ""}
                        </div>
                      );
                    })}
                  </div>
                )}

                <div style={{ display: "grid", gap: 8 }}>
                  <label>Komentar (opciono) – za ovu rezervaciju:</label>
                  <input
                    value={commentByGroupId[g.id] || ""}
                    onChange={(e) => setCommentByGroupId((p) => ({ ...p, [g.id]: e.target.value }))}
                    placeholder="Upiši komentar..."
                    style={{ width: "100%" }}
                  />

                  <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
                    <button
                      onClick={() => decide(g.id, "APPROVE")}
                      disabled={loading}
                      style={{ padding: "8px 12px", borderRadius: 10 }}
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => decide(g.id, "REJECT")}
                      disabled={loading}
                      style={{ padding: "8px 12px", borderRadius: 10 }}
                    >
                      Reject
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}