import React, { useEffect, useMemo, useState } from "react";
import { useAuth } from "../auth/AuthContext.jsx";
import { apiDecideGroup, apiGetPendingGroups } from "../api/api.js";
import { extractErrorMessage } from "../utils/errors.js";
import { formatDateDDMMYYYY, formatTimeHHMM } from "../utils/time.js";
import StatusBadge from "../components/StatusBadge.jsx";

function toUpper(s) {
  return String(s || "").toUpperCase();
}

export default function PendingReservationsPage() {
  const { user } = useAuth();

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
      setErr(extractErrorMessage(ex, "Greška pri učitavanju pending rezervacija."));
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
      return String(ca).localeCompare(String(cb));
    });
    return list;
  }, [pendingGroups]);

  const decide = async (groupId, decisionEnum) => {
    setErr("");
    setLoading(true);
    try {
      const comment = commentByGroupId[groupId] || "";
      await apiDecideGroup(groupId, { adminId: user?.id, decision: decisionEnum, comment });
      await load();
      setCommentByGroupId((p) => ({ ...p, [groupId]: "" }));
    } catch (ex) {
      setErr(extractErrorMessage(ex, "Greška pri approve/reject."));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: 24 }}>
      <h2>Pending rezervacije</h2>

      <button onClick={load} disabled={loading} style={{ padding: "10px 14px", borderRadius: 10 }}>
        Osveži
      </button>

      {err && <div style={{ color: "#ff6b6b", marginTop: 10 }}>{err}</div>}

      <div style={{ marginTop: 12, display: "grid", gap: 12 }}>
        {sorted.length === 0 ? (
          <div>Nema pending rezervacija.</div>
        ) : (
          sorted.map((g) => {
            const groupId = g.groupId || g.id; // BITNO: backend daje groupId :contentReference[oaicite:13]{index=13}
            const items = Array.isArray(g.items) ? g.items : [];
            const status = toUpper(g.status || "PENDING");

            const first = items[0];
            const dateLabel = first?.startDateTime ? formatDateDDMMYYYY(first.startDateTime) : "";
            const fromLabel = first?.startDateTime ? formatTimeHHMM(first.startDateTime) : "";
            const toLabel = first?.endDateTime ? formatTimeHHMM(first.endDateTime) : "";

            return (
              <div
                key={groupId}
                style={{
                  border: "1px solid rgba(255,255,255,0.10)",
                  borderRadius: 12,
                  padding: 12,
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                  <div style={{ fontWeight: 800 }}>
                    {g.name} {g.purpose ? `(${g.purpose})` : ""}{" "}
                    {g.createdByEmail ? <span style={{ opacity: 0.75 }}>by {g.createdByEmail}</span> : null}
                  </div>
                  <StatusBadge status={status} />
                </div>

                <div style={{ opacity: 0.8, marginTop: 6 }}>
                  Kreirano: {g.createdAt ? `${formatDateDDMMYYYY(g.createdAt)} ${formatTimeHHMM(g.createdAt)}` : "—"}
                </div>

                {dateLabel && (
                  <div style={{ marginTop: 6, opacity: 0.9 }}>
                    Datum: <b>{dateLabel}</b> | Vreme: <b>{fromLabel}–{toLabel}</b>
                  </div>
                )}

                {items.length > 0 && (
                  <div style={{ marginTop: 10, display: "grid", gap: 6 }}>
                    {items.map((it) => (
                      <div key={it.id}>
                        <b>{it.roomCode}</b> — {formatTimeHHMM(it.startDateTime)}–{formatTimeHHMM(it.endDateTime)}
                        {it.description ? ` | Opis: ${it.description}` : ""}
                      </div>
                    ))}
                  </div>
                )}

                <div style={{ marginTop: 12 }}>
                  <div style={{ marginBottom: 6 }}>Komentar (opciono) – za ovu rezervaciju:</div>
                  <input
                    value={commentByGroupId[groupId] || ""}
                    onChange={(e) => setCommentByGroupId((p) => ({ ...p, [groupId]: e.target.value }))}
                    placeholder="Upiši komentar..."
                    style={{ width: "100%" }}
                  />
                </div>

                <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 12 }}>
                  <button
                    onClick={() => decide(groupId, "APPROVED")}
                    disabled={loading}
                    style={{ padding: "8px 12px", borderRadius: 10 }}
                  >
                    Approve
                  </button>
                  <button
                    onClick={() => decide(groupId, "REJECTED")}
                    disabled={loading}
                    style={{ padding: "8px 12px", borderRadius: 10 }}
                  >
                    Reject
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