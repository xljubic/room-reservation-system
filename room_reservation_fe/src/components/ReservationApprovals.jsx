import React, { useMemo } from "react";
import { formatDateDDMMYYYY, formatTimeHHMM } from "../utils/time.js";

function keyOf(a) {
  const decidedAt = a?.decidedAt || "";
  const decision = String(a?.decision || "").toUpperCase();
  const comment = a?.comment || "";
  const fn = a?.decidedByFirstName || "";
  const ln = a?.decidedByLastName || "";
  return `${decidedAt}__${decision}__${comment}__${fn}__${ln}`;
}

function uniqueApprovals(list) {
  const seen = new Set();
  const out = [];
  for (const a of Array.isArray(list) ? list : []) {
    const k = keyOf(a);
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(a);
  }
  // backend već sortira asc, ali za svaki slučaj:
  out.sort((x, y) => String(x?.decidedAt || "").localeCompare(String(y?.decidedAt || "")));
  return out;
}

export default function ReservationApprovals({ approvals }) {
  const uniq = useMemo(() => uniqueApprovals(approvals), [approvals]);

  if (!uniq.length) return null;

  const boxStyle = {
    marginTop: 10,
    paddingTop: 10,
    borderTop: "1px solid var(--border-dark)",
    fontSize: 13,
    opacity: 0.9,
    textAlign: "left",
  };

  return (
    <div style={boxStyle}>
      <div style={{ fontWeight: 700, marginBottom: 6, opacity: 0.95 }}>
        Approval history
      </div>

      {uniq.map((a) => {
        const dt = a?.decidedAt;
        const d = dt ? formatDateDDMMYYYY(dt) : "";
        const t = dt ? formatTimeHHMM(dt) : "";
        const decision = String(a?.decision || "").toUpperCase();
        const by = `Admin ${a?.decidedByFirstName || ""} ${a?.decidedByLastName || ""}`.trim();
        const comment = a?.comment || "";

        return (
          <div key={keyOf(a)} style={{ marginBottom: 8 }}>
            <div>
              • {d}. {t} {decision} by {by}
            </div>
            {comment ? <div style={{ marginLeft: 14 }}>• Komentar: {comment}</div> : null}
          </div>
        );
      })}
    </div>
  );
}