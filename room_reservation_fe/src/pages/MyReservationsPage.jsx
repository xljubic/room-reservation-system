import React, { useEffect, useMemo, useState } from "react";
import { useAuth } from "../auth/AuthContext.jsx";
import { apiCancelReservation, apiGetMyReservations, apiGetGroupApprovals } from "../api/api.js";
import { extractErrorMessage } from "../utils/errors.js";
import { formatDateDDMMYYYY, formatTimeHHMM } from "../utils/time.js";

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

/**
 * DEDUPE approvals za grupu:
 * backend upisuje approval po SVAKOJ rezervaciji u grupi (n puta),
 * pa ovde spajamo duplikate tako da dobiješ 1 approval po odluci.
 *
 * Ključ: decision + admin + comment + (decidedAt do MINUTA)
 */
function dedupeApprovals(list) {
  const map = new Map();
  for (const a of list || []) {
    const decidedAt = a?.decidedAt ? String(a.decidedAt) : "";
    const minuteKey = decidedAt ? decidedAt.slice(0, 16) : ""; // "YYYY-MM-DDTHH:mm"
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

// ISTA ŠIRINA kao Create/Pending (jedno mesto, ne diraj više)
const PAGE_WRAP_STYLE = {
  width: "min(1100px, 100%)",
  margin: "0 auto",
  padding: "20px 16px",
};

export default function MyReservationsPage() {
  const { user } = useAuth();

  const [reservations, setReservations] = useState([]);
  const [approvalsByGroupId, setApprovalsByGroupId] = useState({}); // { [groupId]: Approval[] }
  const [filter, setFilter] = useState("ALL");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const load = async () => {
    setErr("");
    setLoading(true);
    try {
      const data = await apiGetMyReservations(user?.id);
      const list = Array.isArray(data) ? data : [];
      setReservations(list);

      // approvals samo za REAL groupId (ne __single__)
      const grouped = groupByGroupId(list);
      const realGroupIds = grouped
        .map((g) => g.groupId)
        .filter((gid) => gid && !String(gid).startsWith("__single__"));

      if (realGroupIds.length === 0) {
        setApprovalsByGroupId({});
      } else {
        const pairs = await Promise.all(
          realGroupIds.map(async (gid) => {
            try {
              const approvals = await apiGetGroupApprovals(gid);
              return [gid, Array.isArray(approvals) ? approvals : []];
            } catch {
              return [gid, []];
            }
          })
        );

        const next = {};
        for (const [gid, approvals] of pairs) next[gid] = approvals;
        setApprovalsByGroupId(next);
      }
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
    <div style={PAGE_WRAP_STYLE}>
      <h2>Moje rezervacije</h2>

      <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", marginBottom: 12 }}>
        <button onClick={load} disabled={loading} style={{ padding: "10px 14px", borderRadius: 10 }}>
          Osveži
        </button>

        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <span style={{ fontWeight: 700 }}>Filter:</span>
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            style={{ padding: "10px 12px", borderRadius: 10 }}
          >
            <option value="ALL">Sve</option>
            <option value="PENDING">PENDING</option>
            <option value="APPROVED">APPROVED</option>
            <option value="REJECTED">REJECTED</option>
            <option value="CANCELED">CANCELED</option>
          </select>
        </div>
      </div>

      {err ? (
        <div style={{ marginBottom: 12, padding: 10, borderRadius: 12, border: "1px solid rgba(255,0,0,0.35)" }}>
          {err}
        </div>
      ) : null}

      {filtered.length === 0 ? (
        <div>Nema rezervacija.</div>
      ) : (
        filtered.map((g) => {
          const first = g.reservations[0];
          const canCancel = g.reservations.some(
            (it) => normStatus(it.status) === "PENDING" || normStatus(it.status) === "APPROVED"
          );

          const dateLabel = formatDateDDMMYYYY(first?.startDateTime);
          const fromLabel = formatTimeHHMM(first?.startDateTime);
          const toLabel = formatTimeHHMM(first?.endDateTime);

          const approvalsRaw = approvalsByGroupId[g.groupId] || [];
          const approvals = dedupeApprovals(approvalsRaw);

          return (
            <div
              key={g.groupId}
              style={{
                border: "1px solid rgba(255,255,255,0.12)",
                borderRadius: 14,
                padding: 14,
                marginBottom: 12,
              }}
            >
              <div style={{ display: "flex", gap: 10, alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ fontWeight: 800 }}>
                  {first?.name} — {dateLabel} {fromLabel}–{toLabel} {first?.purpose ? `(${first.purpose})` : null}
                </div>

                <button
                  onClick={() => cancelGroup(g)}
                  disabled={loading || !canCancel}
                  style={{ padding: "10px 14px", borderRadius: 10 }}
                >
                  Otkaži
                </button>
              </div>

              <div style={{ marginTop: 10 }}>
                {g.reservations.map((it) => (
                  <div key={it.id} style={{ padding: "6px 0", borderTop: "1px solid rgba(255,255,255,0.08)" }}>
                    {it.room?.code || it.roomCode} — {formatTimeHHMM(it.startDateTime)}–{formatTimeHHMM(it.endDateTime)}
                    {it.description ? ` | Opis: ${it.description}` : ""}
                  </div>
                ))}
              </div>

              {/* Approval history (manji font) */}
              {approvals.length > 0 ? (
                <div style={{ marginTop: 10, fontSize: 12, opacity: 0.85 }}>
                  {approvals.map((a) => (
                    <div key={`${a.id}-${a.decidedAt}`} style={{ marginTop: 6 }}>
                      • {fmtDateTime(a.decidedAt)} {String(a.decision || "").toUpperCase()} by Admin {adminFullName(a)}
                      <div style={{ marginLeft: 14 }}>• Komentar: {a.comment ? a.comment : "—"}</div>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          );
        })
      )}
    </div>
  );
}