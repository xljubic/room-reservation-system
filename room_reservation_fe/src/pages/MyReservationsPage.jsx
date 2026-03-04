import React, { useEffect, useMemo, useState } from "react";
import { useAuth } from "../auth/AuthContext.jsx";
import {
  apiCancelReservation,
  apiGetMyReservations,
  apiGetGroupApprovals,
} from "../api/api.js";
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
    arr.sort((a, b) =>
      String(a.startDateTime || "").localeCompare(String(b.startDateTime || ""))
    );
    map.set(k, arr);
  }
  return Array.from(map.entries()).map(([groupId, reservations]) => ({
    groupId,
    reservations,
  }));
}

function fmtDateTime(dt) {
  const d = formatDateDDMMYYYY(dt);
  const t = formatTimeHHMM(dt);
  // format: dd.mm.yyyy. hh:mm
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
    const key = [
      String(a?.decision || "").toUpperCase(),
      a?.decidedAt || "",
      a?.adminFirstName || "",
      a?.adminLastName || "",
      a?.comment || ""
    ].join("|");

    if (!map.has(key)) {
      map.set(key, a);
    }
  }

  return Array.from(map.values()).sort((x, y) => {
    const dx = Date.parse(x?.decidedAt || 0) || 0;
    const dy = Date.parse(y?.decidedAt || 0) || 0;
    return dx - dy;
  });
}

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

      // učitaj approvals za sve REAL groupId (ne za __single__)
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
      list = list.filter((g) =>
        g.reservations.some((it) => normStatus(it.status) === filter)
      );
    }

    // najnovije prvo (po createdAt max u grupi)
    list.sort((a, b) => {
      const ca = Math.max(
        ...a.reservations.map((x) => Date.parse(x.createdAt || x.startDateTime || 0))
      );
      const cb = Math.max(
        ...b.reservations.map((x) => Date.parse(x.createdAt || x.startDateTime || 0))
      );
      return cb - ca;
    });

    return list;
  }, [grouped, filter]);

  const cancelGroup = async (group) => {
    setErr("");
    setLoading(true);
    try {
      const toCancel = group.reservations.filter(
        (it) => normStatus(it.status) !== "CANCELED"
      );
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
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: "24px 16px" }}>
      <h2 style={{ marginBottom: 14 }}>Moje rezervacije</h2>

      <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 14 }}>
        <button
          onClick={load}
          disabled={loading}
          style={{ padding: "10px 14px", borderRadius: 10 }}
        >
          Osveži
        </button>

        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <span>Filter:</span>
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

      {err && <div style={{ color: "#ff6b6b", marginBottom: 12 }}>{err}</div>}

      {filtered.length === 0 ? (
        <div>Nema rezervacija.</div>
      ) : (
        filtered.map((g) => {
          const first = g.reservations[0];
          const status = first?.status || "";

          const canCancel = g.reservations.some(
            (it) =>
              normStatus(it.status) === "PENDING" || normStatus(it.status) === "APPROVED"
          );

          const dateLabel = formatDateDDMMYYYY(first?.startDateTime);
          const fromLabel = formatTimeHHMM(first?.startDateTime);
          const toLabel = formatTimeHHMM(first?.endDateTime);

          // ✅ OVDE dedupe
          const approvalsRaw = approvalsByGroupId[g.groupId] || [];
          const approvals = dedupeApprovals(approvalsRaw);

          return (
            <div
              key={g.groupId}
              style={{
                border: "1px solid rgba(255,255,255,0.10)",
                borderRadius: 14,
                padding: 16,
                marginBottom: 12,
                background: "rgba(255,255,255,0.03)",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 18 }}>
                    {first?.name} — {dateLabel} {fromLabel}–{toLabel}{" "}
                    {first?.purpose ? `(${first.purpose})` : null}
                  </div>
                </div>

                <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                  <StatusBadge status={status} />
                  <button
                    onClick={() => cancelGroup(g)}
                    disabled={loading || !canCancel}
                    style={{ padding: "10px 14px", borderRadius: 10 }}
                  >
                    Otkaži
                  </button>
                </div>
              </div>

              <div style={{ marginTop: 12 }}>
                {g.reservations.map((it) => (
                  <div key={it.id} style={{ marginTop: 6 }}>
                    <b>{it.room?.code || it.roomCode}</b> —{" "}
                    {formatTimeHHMM(it.startDateTime)}–{formatTimeHHMM(it.endDateTime)}
                    {it.description ? ` | Opis: ${it.description}` : ""}
                  </div>
                ))}
              </div>

              {/* Approval history (manji font) */}
              {approvals.length > 0 && (
                <div style={{ marginTop: 12, fontSize: 13, opacity: 0.85 }}>
                  {approvals.map((a, idx) => (
                    <div key={a.id ?? `${g.groupId}__appr__${idx}`} style={{ marginTop: 6 }}>
                      • {fmtDateTime(a.decidedAt)}{" "}
                      <b>{String(a.decision || "").toUpperCase()}</b> by Admin{" "}
                      {adminFullName(a)} • Komentar: {a.comment ? a.comment : "—"}
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })
      )}
    </div>
  );
}