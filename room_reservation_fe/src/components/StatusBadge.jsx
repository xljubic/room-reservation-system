import React from "react";

export default function StatusBadge({ status, className }) {
  const s = String(status || "").toUpperCase();

  let bg = "var(--bg-input)";
  let border = "var(--border-light)";

  if (s === "APPROVED") {
    bg = "rgba(0, 200, 0, 0.20)";
    border = "rgba(0, 200, 0, 0.40)";
  }
  if (s === "PENDING") {
    bg = "rgba(255, 165, 0, 0.20)";
    border = "rgba(255, 165, 0, 0.45)";
  }
  if (s === "REJECTED" || s === "DENIED") {
    bg = "rgba(255, 0, 0, 0.18)";
    border = "rgba(255, 0, 0, 0.40)";
  }
  if (s === "CANCELED" || s === "CANCELLED") {
    bg = "rgba(180,180,180,0.18)";
    border = "rgba(180,180,180,0.35)";
  }

  return (
    <span
      className={className}
      style={{
        display: "inline-block",
        padding: "6px 10px",
        borderRadius: 999,
        fontWeight: 800,
        fontSize: 12,
        letterSpacing: 0.6,
        background: bg,
        border: `1px solid ${border}`,
      }}
    >
      {s}
    </span>
  );
}