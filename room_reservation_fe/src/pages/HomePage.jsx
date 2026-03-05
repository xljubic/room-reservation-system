import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext.jsx";
import {
  apiGetRooms,
  apiGetSchedule,
  apiGetDayGroups,
  apiDecideGroup,
  apiGetGroupApprovals,
} from "../api/api.js";
import { toDateInputValue, formatDateDDMMYYYY, formatTimeHHMM } from "../utils/time.js";
import { extractErrorMessage } from "../utils/errors.js";
import ScheduleGrid from "../components/ScheduleGrid.jsx";
import { normalizeSchedule } from "../utils/schedule.js";
import StatusBadge from "../components/StatusBadge.jsx";

function fmtDateTime(dt) {
  const d = formatDateDDMMYYYY(dt);
  const t = formatTimeHHMM(dt);
  return `${d}. ${t}`;
}

function adminFullName(a) {
  const fn = a?.adminFirstName || "";
  const ln = a?.adminLastName || "";
  const full = `${fn} ${ln}`.trim();
  return full || "Admin";
}

function dedupeApprovals(list) {
  const map = new Map();
  for (const a of list || []) {
    const decidedAt = a?.decidedAt ? String(a.decidedAt) : "";
    const minuteKey = decidedAt ? decidedAt.slice(0, 16) : "";
    const key = [
      String(a?.decision || "").toUpperCase(),
      a?.adminFirstName || "",
      a?.adminLastName || "",
      a?.comment || "",
      minuteKey,
    ].join("|");
    if (!map.has(key)) map.set(key, a);
  }
  return Array.from(map.values()).sort((x, y) => {
    const dx = Date.parse(x?.decidedAt || 0) || 0;
    const dy = Date.parse(y?.decidedAt || 0) || 0;
    return dx - dy;
  });
}



export default function HomePage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [dateStr, setDateStr] = useState(toDateInputValue(new Date()));
  const [rooms, setRooms] = useState([]);
  const [scheduleRaw, setScheduleRaw] = useState(null);

  const [dayGroups, setDayGroups] = useState([]); // ADMIN: approved/pending/rejected za datum (grupisano)
  const [approvalsByGroupId, setApprovalsByGroupId] = useState({});
  const [commentByGroupId, setCommentByGroupId] = useState({});

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

      if (user?.role === "ADMIN") {
        const dg = await apiGetDayGroups(dateStr);
        const list = Array.isArray(dg) ? dg : [];
        setDayGroups(list);

        // approvals za sve grupe
        const groupIds = list.map((g) => g.groupId || g.id).filter(Boolean);
        const pairs = await Promise.all(
          groupIds.map(async (gid) => {
            try {
              const a = await apiGetGroupApprovals(gid);
              return [gid, Array.isArray(a) ? a : []];
            } catch {
              return [gid, []];
            }
          })
        );
        const next = {};
        for (const [gid, a] of pairs) next[gid] = a;
        setApprovalsByGroupId(next);
      } else {
        setDayGroups([]);
        setApprovalsByGroupId({});
      }
    } catch (ex) {
      setErr(extractErrorMessage(ex, "Greška pri učitavanju."));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateStr, user?.role]);

  const decide = async (groupId, decisionEnum) => {
    setErr("");
    setLoading(true);
    try {
      const comment = commentByGroupId[groupId] || "";
      await apiDecideGroup(groupId, {
        adminId: user?.id,
        decision: decisionEnum,
        comment,
      });

      // refresh
      await load();
      setCommentByGroupId((p) => ({ ...p, [groupId]: "" }));
    } catch (ex) {
      setErr(extractErrorMessage(ex, "Greška pri approve/reject."));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-content-wrap">
      <h2 className="page-title">Početna</h2>

      <div style={{ display: "flex", gap: 10, alignItems: "flex-end", flexWrap: "wrap", marginBottom: 16 }}>
        <div className="label-col">
          <label style={{ fontWeight: 700 }}>Datum:</label>
          <input type="date" value={dateStr} onChange={(e) => setDateStr(e.target.value)} className="input" />
        </div>

        <button onClick={load} disabled={loading} className="btn">
          Osveži
        </button>
      </div>

      {err ? (
        <div style={{ marginTop: 16, padding: 10, borderRadius: 12, border: "1px solid rgba(255,0,0,0.35)" }}>
          {err}
        </div>
      ) : null}

      <div style={{ marginTop: 24 }}>
        <ScheduleGrid rooms={rooms} scheduleRaw={scheduleRaw} highlightSelection={null} />
      </div>

      <div style={{ marginTop: 16, display: "flex", justifyContent: "flex-start" }}>
        <button onClick={() => navigate("/create")} className="btn">
          Napravi rezervaciju
        </button>
      </div>

      {user?.role === "ADMIN" ? (
        <div style={{ marginTop: 32 }}>
          <h3 style={{ margin: "0 0 16px 0" }}>Sve rezervacije za izabrani datum</h3>

          {dayGroups.length === 0 ? (
            <div>Nema rezervacija za ovaj datum.</div>
          ) : (
            dayGroups.map((g) => {
              const groupId = g.groupId || g.id;
              const items = Array.isArray(g.items) ? g.items : [];
              const first = items[0];

              const createdByEmail = g.createdByEmail || "";
              const createdByRole = String(g.createdByRole || "").toUpperCase(); // ADMIN/USER
              const status = String(g.status || "").toUpperCase(); // APPROVED/PENDING/REJECTED

              const name = g.name || "";
              const purpose = g.purpose || "";

              const dateLabel = first?.startDateTime ? formatDateDDMMYYYY(first.startDateTime) : "";
              const fromLabel = first?.startDateTime ? formatTimeHHMM(first.startDateTime) : "";
              const toLabel = first?.endDateTime ? formatTimeHHMM(first.endDateTime) : "";

              const approvals = dedupeApprovals(approvalsByGroupId[groupId] || []);

              // pravilo: admin rezervacije (auto-approved) ne smeju da se rejectuju sa home
              const canRejectApproved = status === "APPROVED" && createdByRole !== "ADMIN";
              const canApproveRejected = status === "REJECTED";
              const canDecidePending = status === "PENDING";

              return (
                <div
                  key={groupId}
                  style={{
                    border: "1px solid var(--border-medium)",
                    background: "var(--bg-card)",
                    borderRadius: 14,
                    padding: 14,
                    marginBottom: 12,
                    position: "relative",
                  }}
                >
                  <StatusBadge status={status} className="badge-top-right" />

                  <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
                    <div style={{ fontWeight: 800 }}>
                      {name} {purpose ? `(${purpose})` : ""}{" "}
                      {createdByEmail ? <span style={{ fontWeight: 500 }}>by {createdByEmail}</span> : null}
                    <div style={{ marginTop: 4, fontWeight: 600, opacity: 0.9, display: "flex", gap: 10, alignItems: "center" }}>
                      <span>
                        {dateLabel} {fromLabel}–{toLabel}
                      </span>
                    </div>
                    </div>
                  </div>

                  <div style={{ marginTop: 10 }}>
                    {items.map((it) => (
                      <div key={it.id} style={{ padding: "6px 0", borderTop: "1px solid var(--border-dark)" }}>
                        {it.roomCode} — {formatTimeHHMM(it.startDateTime)}–{formatTimeHHMM(it.endDateTime)}
                        {it.description ? ` | Opis: ${it.description}` : ""}
                      </div>
                    ))}
                  </div>

                  {/* approvals (manji font) */}
                  {approvals.length > 0 ? (
                    <div style={{ marginTop: 10, fontSize: 12, opacity: 0.85 }}>
                      {approvals.map((a) => (
                      <div key={`${a.id}-${a.decidedAt}`} style={{ marginTop: 6 }}>
                        • {fmtDateTime(a.decidedAt)} {String(a.decision || "").toUpperCase()} by Admin {adminFullName(a)}
                        {"  "}• Komentar: {a.comment ? a.comment : "—"}
                      </div>
                      ))}
                    </div>
                  ) : null}

                  {/* akcije */}
                  <div style={{ marginTop: 12 }}>
                    {(canDecidePending || canRejectApproved || canApproveRejected) ? (
                      <>
                        <div style={{ marginBottom: 8, fontWeight: 700 }}>Komentar (opciono):</div>
                        <input
                          value={commentByGroupId[groupId] || ""}
                          onChange={(e) => setCommentByGroupId((p) => ({ ...p, [groupId]: e.target.value }))}
                          placeholder="Upiši komentar..."
                          className="input"
                          style={{ width: "100%" }}
                        />

                        <div style={{ display: "flex", gap: 10, marginTop: 10, flexWrap: "wrap" }}>
                          {canDecidePending ? (
                            <>
                              <button
                                onClick={() => decide(groupId, "APPROVED")}
                                disabled={loading}
                                className="btn"
                              >
                                Approve
                              </button>
                              <button
                                onClick={() => decide(groupId, "REJECTED")}
                                disabled={loading}
                                className="btn"
                              >
                                Reject
                              </button>
                            </>
                          ) : null}

                          {canRejectApproved ? (
                            <button
                              onClick={() => decide(groupId, "REJECTED")}
                              disabled={loading}
                              className="btn"
                            >
                              Reject
                            </button>
                          ) : null}

                          {canApproveRejected ? (
                            <button
                              onClick={() => decide(groupId, "APPROVED")}
                              disabled={loading}
                              className="btn"
                            >
                              Approve
                            </button>
                          ) : null}

                          {/* Ako je APPROVED i creator ADMIN => nema reject (po pravilu) */}
                        </div>
                      </>
                    ) : (
                      <div style={{ marginTop: 8, fontSize: 12, opacity: 0.8 }}>
                        {status === "APPROVED" && createdByRole === "ADMIN"
                          ? "Admin rezervacije ne mogu biti rejectovane sa početne. Otkazivanje samo na 'Moje rezervacije'."
                          : null}
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      ) : null}
    </div>
  );
}