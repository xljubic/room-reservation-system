import React from "react";

export default function StatusBadge({ status }) {
  const s = String(status || "").toUpperCase();

  let bg = "rgba(255,255,255,0.12)";
  if (s === "APPROVED") bg = "rgba(0,200,0,0.18)";
  if (s === "PENDING") bg = "rgba(255,165,0,0.18)";
  if (s === "DENIED" || s === "REJECTED") bg = "rgba(255,0,0,0.18)";
  if (s === "CANCELED" || s === "CANCELLED") bg = "rgba(180,180,180,0.18)";

  return (
    <span style={{ padding: "2px 8px", borderRadius: 999, background: bg, fontSize: 12 }}>
      {s}
    </span>
  );
}