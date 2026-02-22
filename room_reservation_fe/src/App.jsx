import { useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";

axios.defaults.headers.common["Cache-Control"] = "no-cache";
axios.defaults.headers.common["Pragma"] = "no-cache";

function toISODate(d) {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function parseTimeToMinutes(hhmm) {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

function minutesToHHMM(min) {
  const h = String(Math.floor(min / 60)).padStart(2, "0");
  const m = String(min % 60).padStart(2, "0");
  return `${h}:${m}`;
}

function isAdmin(user) {
  return user?.role === "ADMIN";
}

const DAY_START = "08:00";
const DAY_END = "20:00";
const SLOT_MINUTES = 15;

// dropdown sa 15-minutnim intervalima
const MINUTES = [0, 15, 30, 45];
const HOURS_FROM = [8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19];
const HOURS_TO = [8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20];

const pad2 = (n) => String(n).padStart(2, "0");

function parseHHMM(hhmm) {
  const [h, m] = hhmm.split(":").map(Number);
  return { h, m };
}
function buildHHMM(h, m) {
  return `${pad2(h)}:${pad2(m)}`;
}

function TimeSelect({ value, onChange, hours, minutes = MINUTES }) {
  const { h, m } = parseHHMM(value);

  const safeH = hours.includes(h) ? h : hours[0];
  const safeM = minutes.includes(m) ? m : minutes[0];

  useEffect(() => {
    const fixed = buildHHMM(safeH, safeM);
    if (fixed !== value) onChange(fixed);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
      <select
        value={safeH}
        onChange={(e) => onChange(buildHHMM(Number(e.target.value), safeM))}
      >
        {hours.map((hh) => (
          <option key={hh} value={hh}>
            {pad2(hh)}
          </option>
        ))}
      </select>

      <span>:</span>

      <select
        value={safeM}
        onChange={(e) => onChange(buildHHMM(safeH, Number(e.target.value)))}
      >
        {minutes.map((mm) => (
          <option key={mm} value={mm}>
            {pad2(mm)}
          </option>
        ))}
      </select>
    </div>
  );
}

function clampToAllowedStart(hhmm) {
  if (hhmm < "08:00") return "08:00";
  if (hhmm > "19:45") return "19:45";
  return hhmm;
}
function clampToAllowedEnd(hhmm) {
  if (hhmm < "08:00") return "08:00";
  if (hhmm > "20:00") return "20:00";
  return hhmm;
}

// format: dd.mm.yyyy HH:mm
function formatDateTime(isoString) {
  if (!isoString) return "";
  const d = new Date(isoString);
  if (Number.isNaN(d.getTime())) return String(isoString);

  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  const hh = String(d.getHours()).padStart(2, "0");
  const mi = String(d.getMinutes()).padStart(2, "0");
  return `${dd}.${mm}.${yyyy} ${hh}:${mi}`;
}

// grupisanje po groupId (client-side)
function groupByGroupId(resList) {
  const map = new Map();
  for (const r of resList || []) {
    const gid = r.groupId || `single-${r.id}`;
    if (!map.has(gid)) map.set(gid, []);
    map.get(gid).push(r);
  }
  const groups = Array.from(map.entries()).map(([groupId, items]) => {
    items.sort((a, b) => new Date(a.startDateTime) - new Date(b.startDateTime));
    return { groupId, items };
  });
  // sort groups: newest first
  groups.sort((a, b) => {
    const aKey = a.items?.[0]?.createdAt
      ? new Date(a.items[0].createdAt)
      : new Date(a.items?.[0]?.startDateTime);
    const bKey = b.items?.[0]?.createdAt
      ? new Date(b.items[0].createdAt)
      : new Date(b.items?.[0]?.startDateTime);
    return bKey - aKey;
  });
  return groups;
}

export default function App() {
  // logged user (persist)
  const [user, setUser] = useState(() => {
    const raw = localStorage.getItem("rr_user");
    try {
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  });

  // Login UI
  const [loginEmail, setLoginEmail] = useState(
    () => localStorage.getItem("rr_last_email") || ""
  );
  const [loginPassword, setLoginPassword] = useState("");

  // schedule
  const [date, setDate] = useState(() => toISODate(new Date()));
  const [schedule, setSchedule] = useState(null);
  const [loading, setLoading] = useState(false);

  // create form (za dodavanje stavke)
  const [selectedRoomId, setSelectedRoomId] = useState(null);
  const [startHHMM, setStartHHMM] = useState("10:15");
  const [endHHMM, setEndHHMM] = useState("10:30");

  // group common fields
  const [purpose, setPurpose] = useState("VEZBE");
  const [name, setName] = useState("Termin");

  // per-item description input
  const [description, setDescription] = useState("");

  // stavke grupe
  const [groupItems, setGroupItems] = useState([]);

  // my reservations
  const [myReservations, setMyReservations] = useState([]);
  const [myLoading, setMyLoading] = useState(false);

  // admin pending-groups
  const [pending, setPending] = useState([]);
  const [pendingLoading, setPendingLoading] = useState(false);
  const [adminComment, setAdminComment] = useState("");

  // stable group labels (G1/G2...) per section
  const labelMapsRef = useRef({
    pending: new Map(),
    my: new Map(),
    day: new Map(),
  });
  const countersRef = useRef({
    pending: 1,
    my: 1,
    day: 1,
  });

  function getGroupLabel(section, groupId) {
    const m = labelMapsRef.current[section];
    if (!m.has(groupId)) {
      const n = countersRef.current[section];
      m.set(groupId, `G${n}`);
      countersRef.current[section] = n + 1;
    }
    return m.get(groupId);
  }

  function resetGroupLabelsForSection(section) {
    labelMapsRef.current[section] = new Map();
    countersRef.current[section] = 1;
  }

  async function loadSchedule(d) {
    setLoading(true);
    try {
      const res = await axios.get(`/api/reservations/schedule`, {
        params: { date: d, _ts: Date.now() },
        headers: { "Cache-Control": "no-cache" },
      });
      setSchedule(res.data);

      const firstRoomId = res.data?.rooms?.[0]?.id ?? null;
      setSelectedRoomId(firstRoomId);

      // kad se promeni datum, resetuj grupu i label-e za "day"
      setGroupItems([]);
      resetGroupLabelsForSection("day");
    } catch (e) {
      setSchedule(null);
      const msg = e?.response?.data ?? "Greska pri ucitavanju schedule.";
      alert(typeof msg === "string" ? msg : JSON.stringify(msg));
    } finally {
      setLoading(false);
    }
  }

  async function loadMyReservationsSafe(currentUser) {
    if (!currentUser) return;
    setMyLoading(true);
    try {
      const res = await axios.get(`/api/reservations/my`, {
        params: { userId: currentUser.id, _ts: Date.now() },
        headers: { "Cache-Control": "no-cache" },
      });
      setMyReservations(res.data || []);
      resetGroupLabelsForSection("my");
    } catch (e) {
      setMyReservations([]);
      const msg = e?.response?.data ?? "Greska pri ucitavanju mojih rezervacija.";
      alert(typeof msg === "string" ? msg : JSON.stringify(msg));
    } finally {
      setMyLoading(false);
    }
  }

  async function loadPendingSafe(currentUser) {
    if (!currentUser || !isAdmin(currentUser)) return;
    setPendingLoading(true);
    try {
      const res = await axios.get(`/api/reservations/pending-groups`, {
        params: { _ts: Date.now() },
        headers: { "Cache-Control": "no-cache" },
      });
      setPending(res.data || []);
      resetGroupLabelsForSection("pending");
    } catch (e) {
      setPending([]);
      const msg = e?.response?.data ?? "Greska pri ucitavanju pending grupa.";
      alert(typeof msg === "string" ? msg : JSON.stringify(msg));
    } finally {
      setPendingLoading(false);
    }
  }

  // kada se user promeni (login/logout) - NEMA early return na kraju
  useEffect(() => {
    // reset UI
    setSchedule(null);
    setPending([]);
    setMyReservations([]);
    setAdminComment("");
    setGroupItems([]);

    if (!user) return;

    loadSchedule(date);
    loadMyReservationsSafe(user);
    loadPendingSafe(user);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // kad se promeni datum
  useEffect(() => {
    if (!user) return;
    loadSchedule(date);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date]);

  // ✅ useMemo HOOKOVI MORAJU BITI PRE return-a i UVEK pozvani
  const myGroups = useMemo(() => groupByGroupId(myReservations), [myReservations]);

  const dayGroups = useMemo(() => {
    const all = [
      ...(schedule?.approvedReservations || []),
      ...(schedule?.pendingReservations || []),
    ];
    return groupByGroupId(all);
  }, [schedule]);

  const timeSlots = useMemo(() => {
    const dayStart = schedule?.dayStart ?? DAY_START;
    const dayEnd = schedule?.dayEnd ?? DAY_END;
    const step = SLOT_MINUTES;

    const start = parseTimeToMinutes(dayStart);
    const end = parseTimeToMinutes(dayEnd);

    const slots = [];
    for (let t = start; t < end; t += step) slots.push(t);
    return slots;
  }, [schedule]);

  // helper: roomId -> code
  const roomCodeById = useMemo(() => {
    const map = new Map();
    (schedule?.rooms || []).forEach((r) => map.set(r.id, r.code));
    return map;
  }, [schedule]);

  function slotStatus(roomId, slotStartMin) {
    if (!schedule) return null;
    const step = SLOT_MINUTES;
    const slotEndMin = slotStartMin + step;

    const overlaps = (r) => {
      if (r.room?.id !== roomId) return false;
      const start = new Date(r.startDateTime);
      const end = new Date(r.endDateTime);
      const rs = start.getHours() * 60 + start.getMinutes();
      const re = end.getHours() * 60 + end.getMinutes();
      return slotStartMin < re && slotEndMin > rs;
    };

    for (const r of schedule.approvedReservations || []) {
      if (overlaps(r)) return "APPROVED";
    }
    for (const r of schedule.pendingReservations || []) {
      if (overlaps(r)) return "PENDING";
    }
    return null;
  }

  function withinWorkingHours(hhmmStart, hhmmEnd) {
    const s = parseTimeToMinutes(hhmmStart);
    const e = parseTimeToMinutes(hhmmEnd);
    const ws = parseTimeToMinutes(DAY_START);
    const we = parseTimeToMinutes(DAY_END);
    return s >= ws && e <= we && e > s;
  }

  function onCellClick(roomId, slotStartMin) {
    if (!schedule) return;
    const step = SLOT_MINUTES;

    const start = minutesToHHMM(slotStartMin);
    const end = minutesToHHMM(slotStartMin + step);

    if (!withinWorkingHours(start, end)) return;
    if (slotStatus(roomId, slotStartMin)) return;

    setSelectedRoomId(roomId);
    setStartHHMM(clampToAllowedStart(start));
    setEndHHMM(clampToAllowedEnd(end));
  }

  // dodaj stavku u grupu
  function addItemToGroup() {
    if (!user) return alert("Nisi ulogovan.");
    if (!selectedRoomId) return alert("Izaberi salu.");
    if (!withinWorkingHours(startHHMM, endHHMM))
      return alert("Radno vreme je 08:00–20:00. Proveri OD/DO.");
    if (endHHMM <= startHHMM) return alert("Vreme 'Do' mora biti posle vremena 'Od'.");

    const overlapInGroup = groupItems.some((it) => {
      if (it.roomId !== selectedRoomId) return false;
      return it.startTime < endHHMM && it.endTime > startHHMM;
    });
    if (overlapInGroup) {
      return alert("Konflikt unutar grupe: ista sala ima preklapajuci termin.");
    }

    setGroupItems((prev) => [
      ...prev,
      {
        roomId: selectedRoomId,
        startTime: startHHMM,
        endTime: endHHMM,
        description: description?.trim() ? description.trim() : null,
      },
    ]);

    setDescription("");
  }

  function removeItemFromGroup(idx) {
    setGroupItems((prev) => prev.filter((_, i) => i !== idx));
  }

  function clearGroup() {
    setGroupItems([]);
  }

  async function submitGroupReservation() {
    if (!user) return alert("Nisi ulogovan.");
    if (!purpose || !name) return alert("Popuni svrhu i naziv.");
    if (groupItems.length === 0) return alert("Dodaj bar jednu stavku u grupu.");

    try {
      await axios.post("/api/reservations", {
        createdById: user.id,
        date,
        purpose,
        name,
        items: groupItems,
      });

      alert(`Grupa poslata (${isAdmin(user) ? "APPROVED" : "PENDING"}).`);

      setGroupItems([]);
      setName("Termin");
      setDescription("");

      await loadSchedule(date);
      await loadMyReservationsSafe(user);
      await loadPendingSafe(user);
    } catch (e) {
      const msg = e?.response?.data ?? "Greška";
      alert(typeof msg === "string" ? msg : JSON.stringify(msg));
    }
  }

  async function cancelReservation(reservationId) {
    if (!user) return;
    try {
      await axios.post(`/api/reservations/${reservationId}/cancel`, {
        userId: user.id,
      });
      await loadMyReservationsSafe(user);
      await loadSchedule(date);
      await loadPendingSafe(user);
    } catch (e) {
      const msg = e?.response?.data ?? "Greška";
      alert(typeof msg === "string" ? msg : JSON.stringify(msg));
    }
  }

  async function decideGroup(groupId, decision) {
    if (!user) return;
    try {
      await axios.post(`/api/reservations/group/${groupId}/decide`, {
        adminId: user.id,
        decision,
        comment: adminComment || null,
      });
      setAdminComment("");
      await loadPendingSafe(user);
      await loadSchedule(date);
      await loadMyReservationsSafe(user);
    } catch (e) {
      const msg = e?.response?.data ?? "Greška";
      alert(typeof msg === "string" ? msg : JSON.stringify(msg));
    }
  }

  async function loginMvp() {
    try {
      const email = loginEmail?.trim();
      const password = loginPassword;

      if (!email || !password) {
        alert("Unesi email i šifru.");
        return;
      }

      const res = await axios.post("/api/auth/login", { email, password });

      setUser(res.data);
      localStorage.setItem("rr_user", JSON.stringify(res.data));
      localStorage.setItem("rr_last_email", email);
      setLoginPassword("");
    } catch (e) {
      const msg = e?.response?.data ?? "Greška pri login-u";
      alert(typeof msg === "string" ? msg : JSON.stringify(msg));
    }
  }

  function logout() {
    localStorage.removeItem("rr_user");
    setUser(null);

    // reset UI odmah (bez refresh)
    setSchedule(null);
    setPending([]);
    setMyReservations([]);
    setAdminComment("");
    setGroupItems([]);
    setLoginPassword("");
  }

  // ===== LOGIN SCREEN (NAKON SVIH HOOK-OVA!) =====
  if (!user) {
    return (
      <div
        style={{
          padding: 20,
          fontFamily: "Arial, sans-serif",
          overflowX: "hidden",
          maxWidth: 520,
        }}
      >
        <h2 style={{ marginTop: 0 }}>Room Reservation – Login</h2>

        <div style={{ display: "grid", gap: 10 }}>
          <label>
            Email:
            <input
              value={loginEmail}
              onChange={(e) => setLoginEmail(e.target.value)}
              placeholder="npr. admin@fon.rs"
              style={{ width: "100%", marginTop: 4, padding: 8 }}
            />
          </label>

          <label>
            Šifra:
            <input
              type="password"
              value={loginPassword}
              onChange={(e) => setLoginPassword(e.target.value)}
              placeholder="npr. admin"
              style={{ width: "100%", marginTop: 4, padding: 8 }}
            />
          </label>

          <button onClick={loginMvp} style={{ padding: "10px 12px" }}>
            Login
          </button>

          <div style={{ fontSize: 12, opacity: 0.85, marginTop: 6 }}>
            (Za seed) admin@fon.rs / admin123, marko@fon.rs / marko123, jelena@fon.rs / jelena123
          </div>
        </div>
      </div>
    );
  }

  // ===== APP SCREEN =====
  return (
    <div style={{ padding: 16, fontFamily: "Arial, sans-serif", overflowX: "hidden" }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
        <h2 style={{ margin: 0 }}>Room Reservation</h2>

        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <div style={{ fontSize: 12, opacity: 0.9 }}>
            Ulogovan: <b>{user.email}</b> ({user.role})
          </div>
          <button onClick={logout}>Logout</button>
        </div>
      </div>

      <div style={{ marginTop: 10, display: "flex", gap: 16, alignItems: "center", flexWrap: "wrap" }}>
        <label>
          Datum:&nbsp;
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            min={toISODate(new Date())}
          />
        </label>

        <button onClick={() => loadSchedule(date)} disabled={loading}>
          {loading ? "Učitavam..." : "Osveži"}
        </button>

        {schedule && (
          <div style={{ fontSize: 12, opacity: 0.85 }}>
            Approved za dan: <b>{schedule.approvedReservations?.length ?? 0}</b>
          </div>
        )}
      </div>

      {/* ADMIN */}
      {isAdmin(user) ? (
        <div style={{ marginTop: 14, border: "1px solid #ddd", borderRadius: 10, padding: 12 }}>
          <h3 style={{ marginTop: 0 }}>Admin – Pending grupe</h3>

          <div style={{ marginTop: 12 }}>
            <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
              <button onClick={() => loadPendingSafe(user)} disabled={pendingLoading}>
                {pendingLoading ? "Učitavam..." : "Osveži pending"}
              </button>

              <label>
                Komentar:&nbsp;
                <input
                  value={adminComment}
                  onChange={(e) => setAdminComment(e.target.value)}
                  style={{ width: 320 }}
                />
              </label>
            </div>

            <div style={{ marginTop: 10 }}>
              {pending.length === 0 ? (
                <div style={{ opacity: 0.8 }}>Nema PENDING grupa.</div>
              ) : (
                <div style={{ display: "grid", gap: 10 }}>
                  {pending.map((g) => {
                    const label = getGroupLabel("pending", g.groupId);
                    const createdByEmail = g.createdByEmail || g.createdBy?.email || "-";
                    const items = g.items || g.reservations || [];
                    return (
                      <div key={g.groupId} style={{ border: "1px solid #ddd", borderRadius: 10, padding: 12 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
                          <div>
                            <div style={{ fontWeight: 700 }}>Grupa {label}</div>
                            <div style={{ fontSize: 13, opacity: 0.9, marginTop: 3 }}>
                              {g.purpose} • {g.name} • by {createdByEmail} • {g.status}
                            </div>
                          </div>

                          <div style={{ display: "flex", gap: 8 }}>
                            <button onClick={() => decideGroup(g.groupId, "APPROVED")}>Approve</button>
                            <button onClick={() => decideGroup(g.groupId, "REJECTED")}>Reject</button>
                          </div>
                        </div>

                        <div style={{ marginTop: 10, paddingLeft: 10 }}>
                          {items.map((it) => {
                            const roomCode = it.roomCode || it.room?.code || "-";
                            return (
                              <div key={it.id} style={{ fontSize: 13, marginBottom: 4 }}>
                                <b>#{it.id}</b> • {roomCode} • {formatDateTime(it.startDateTime)} →{" "}
                                {formatDateTime(it.endDateTime)}
                                {it.description ? ` • ${it.description}` : ""}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* sve rezervacije za datum */}
          <div style={{ marginTop: 16, borderTop: "1px solid #eee", paddingTop: 12 }}>
            <h3 style={{ margin: 0 }}>Sve rezervacije za izabrani datum</h3>
            <div style={{ fontSize: 12, opacity: 0.85, marginTop: 4 }}>
              Prikaz iz schedule: APPROVED + PENDING (grupisano po groupId)
            </div>

            <div style={{ marginTop: 10 }}>
              {dayGroups.length === 0 ? (
                <div style={{ opacity: 0.8 }}>Nema rezervacija za ovaj datum.</div>
              ) : (
                <div style={{ display: "grid", gap: 10 }}>
                  {dayGroups.map((grp) => {
                    const label = getGroupLabel("day", grp.groupId);
                    const first = grp.items?.[0];
                    const headerStatus = first?.status || "-";
                    const headerPurpose = first?.purpose || "-";
                    const headerName = first?.name || "-";
                    const headerEmail = first?.createdBy?.email || "-";

                    return (
                      <div key={grp.groupId} style={{ border: "1px solid #ddd", borderRadius: 10, padding: 12 }}>
                        <div style={{ fontWeight: 700 }}>Grupa {label}</div>
                        <div style={{ fontSize: 13, opacity: 0.9, marginTop: 3 }}>
                          {headerStatus} • {headerPurpose} • {headerName} • by {headerEmail}
                        </div>

                        <div style={{ marginTop: 10, paddingLeft: 10 }}>
                          {grp.items.map((r) => (
                            <div key={r.id} style={{ fontSize: 13, marginBottom: 4 }}>
                              <b>#{r.id}</b> • {r.room?.code} • {formatDateTime(r.startDateTime)} →{" "}
                              {formatDateTime(r.endDateTime)}
                              {r.description ? ` • ${r.description}` : ""} • <b>{r.status}</b>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}

      {/* GRID */}
      {schedule ? (
        <>
          <div style={{ marginTop: 14 }}>
            <div
              style={{
                border: "1px solid #ddd",
                borderRadius: 10,
                overflowX: "auto",
                width: "100%",
                maxWidth: "100%",
              }}
            >
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: `220px repeat(${timeSlots.length}, 80px)`,
                  minWidth: 220 + timeSlots.length * 80,
                  width: "fit-content",
                }}
              >
                <div style={{ padding: 8, fontWeight: "bold", borderRight: "1px solid #eee" }}>
                  Sala / vreme
                </div>

                {timeSlots.map((t) => (
                  <div
                    key={t}
                    style={{
                      padding: 8,
                      fontWeight: "bold",
                      borderLeft: "1px solid #eee",
                      whiteSpace: "nowrap",
                      textAlign: "center",
                    }}
                  >
                    {minutesToHHMM(t)}
                  </div>
                ))}

                {schedule?.rooms?.map((room) => (
                  <div key={room.id} style={{ display: "contents" }}>
                    <div style={{ padding: 8, borderRight: "1px solid #eee" }}>
                      <b>{room.code}</b>
                    </div>

                    {timeSlots.map((t) => {
                      const status = slotStatus(room.id, t);
                      const step = SLOT_MINUTES;

                      const selected =
                        selectedRoomId === room.id &&
                        startHHMM === minutesToHHMM(t) &&
                        endHHMM === minutesToHHMM(t + step);

                      const isApproved = status === "APPROVED";
                      const isPending = status === "PENDING";
                      const blocked = isApproved || isPending;

                      const handleClick = () => {
                        if (blocked) return;
                        onCellClick(room.id, t);
                      };

                      const background = isApproved
                        ? "#ffb3b3"
                        : isPending
                        ? "#fff3b3"
                        : selected
                        ? "#dff5ff"
                        : "white";

                      const borderColor = isApproved
                        ? "#cc0000"
                        : isPending
                        ? "#cc9900"
                        : selected
                        ? "#0099cc"
                        : null;

                      const title = isApproved
                        ? "Zauzeto (APPROVED)"
                        : isPending
                        ? "Na cekanju (PENDING) – nije dostupno"
                        : "Klikni da izaberes slot";

                      return (
                        <div
                          key={`${room.id}-${t}`}
                          onClick={handleClick}
                          title={title}
                          aria-disabled={blocked}
                          style={{
                            borderTop: "1px solid #eee",
                            borderLeft: "1px solid #eee",
                            height: 34,
                            background,
                            cursor: blocked ? "not-allowed" : "pointer",
                            opacity: blocked ? 0.85 : 1,
                            outline: borderColor ? `2px solid ${borderColor}` : "none",
                            outlineOffset: "-2px",
                            pointerEvents: blocked ? "none" : "auto",
                          }}
                        />
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* CREATE GROUP */}
          <div style={{ marginTop: 16, padding: 12, border: "1px solid #ddd", borderRadius: 10 }}>
            <h3 style={{ marginTop: 0 }}>
              Grupna rezervacija ({isAdmin(user) ? "APPROVED odmah (ADMIN)" : "PENDING (USER)"})
            </h3>

            <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
              <label>
                Svrha:&nbsp;
                <select value={purpose} onChange={(e) => setPurpose(e.target.value)}>
                  <option value="VEZBE">VEZBE</option>
                  <option value="PREDAVANJE">PREDAVANJE</option>
                  <option value="SEMINAR">SEMINAR</option>
                  <option value="PROJEKAT">PROJEKAT</option>
                  <option value="ISPIT">ISPIT</option>
                  <option value="KOLOKVIJUM">KOLOKVIJUM</option>
                  <option value="KONSULTACIJE">KONSULTACIJE</option>
                  <option value="UVID">UVID</option>
                </select>
              </label>

              <label style={{ minWidth: 260 }}>
                Naziv:&nbsp;
                <input value={name} onChange={(e) => setName(e.target.value)} style={{ width: "100%" }} />
              </label>

              <button type="button" onClick={clearGroup} disabled={groupItems.length === 0}>
                Očisti grupu
              </button>
            </div>

            <hr style={{ margin: "12px 0", opacity: 0.4 }} />

            <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
              <label>
                Sala:&nbsp;
                <select
                  value={selectedRoomId ?? ""}
                  onChange={(e) => setSelectedRoomId(Number(e.target.value))}
                >
                  {schedule?.rooms?.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.code}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                Od:&nbsp;
                <TimeSelect value={startHHMM} onChange={setStartHHMM} hours={HOURS_FROM} />
              </label>

              <label>
                Do:&nbsp;
                <TimeSelect value={endHHMM} onChange={setEndHHMM} hours={HOURS_TO} />
              </label>

              <label style={{ minWidth: 260 }}>
                Opis (po stavci):&nbsp;
                <input
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  style={{ width: "100%" }}
                />
              </label>

              <button type="button" onClick={addItemToGroup}>
                Dodaj stavku
              </button>
            </div>

            <div style={{ marginTop: 12 }}>
              <div style={{ fontWeight: 700 }}>Stavke u grupi:</div>

              {groupItems.length === 0 ? (
                <div style={{ fontSize: 13, opacity: 0.7 }}>Nema dodatih stavki.</div>
              ) : (
                <div style={{ marginTop: 8, display: "grid", gap: 6 }}>
                  {groupItems.map((it, idx) => {
                    const code = roomCodeById.get(it.roomId) || `roomId=${it.roomId}`;
                    return (
                      <div
                        key={idx}
                        style={{
                          border: "1px solid #eee",
                          borderRadius: 8,
                          padding: 8,
                          display: "flex",
                          justifyContent: "space-between",
                          gap: 10,
                          alignItems: "center",
                        }}
                      >
                        <div style={{ fontSize: 13 }}>
                          <b>{code}</b> • {it.startTime}-{it.endTime}
                          {it.description ? ` • ${it.description}` : ""}
                        </div>
                        <button type="button" onClick={() => removeItemFromGroup(idx)}>
                          X
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <button onClick={submitGroupReservation} style={{ marginTop: 12 }}>
              Pošalji grupu
            </button>

            <div style={{ marginTop: 8, fontSize: 12, opacity: 0.8 }}>
              Radno vreme: <b>08:00–20:00</b>. Grid prikazuje <b>APPROVED</b> i <b>PENDING</b> kao blokirano.
            </div>
          </div>

          {/* MY RESERVATIONS grouped */}
          <div style={{ marginTop: 16, padding: 12, border: "1px solid #ddd", borderRadius: 10 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
              <h3 style={{ margin: 0 }}>Moje rezervacije (grupe)</h3>
              <button onClick={() => loadMyReservationsSafe(user)} disabled={myLoading}>
                {myLoading ? "Učitavam..." : "Osveži"}
              </button>
            </div>

            {myGroups.length === 0 ? (
              <div style={{ marginTop: 10, opacity: 0.8 }}>Nema rezervacija.</div>
            ) : (
              <div style={{ marginTop: 10, display: "grid", gap: 10 }}>
                {myGroups.map((g) => {
                  const label = getGroupLabel("my", g.groupId);
                  const first = g.items?.[0];
                  const headerPurpose = first?.purpose || "-";
                  const headerName = first?.name || "-";
                  const headerCreatedAt = first?.createdAt ? formatDateTime(first.createdAt) : "";

                  return (
                    <div key={g.groupId} style={{ border: "1px solid #eee", borderRadius: 10, padding: 12 }}>
                      <div style={{ fontWeight: 700 }}>Grupa {label}</div>
                      <div style={{ fontSize: 13, opacity: 0.85, marginTop: 4 }}>
                        {headerPurpose} • {headerName} {headerCreatedAt ? `• ${headerCreatedAt}` : ""}
                      </div>

                      <div style={{ marginTop: 10, paddingLeft: 10 }}>
                        {g.items.map((r) => (
                          <div
                            key={r.id}
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              gap: 12,
                              alignItems: "center",
                              padding: "6px 0",
                              borderTop: "1px dashed #eee",
                            }}
                          >
                            <div style={{ fontSize: 13 }}>
                              <b>#{r.id}</b> • {r.room?.code} • {formatDateTime(r.startDateTime)} →{" "}
                              {formatDateTime(r.endDateTime)}
                              {r.description ? ` • ${r.description}` : ""} • <b>{r.status}</b>
                            </div>

                            <button onClick={() => cancelReservation(r.id)} disabled={r.status === "CANCELED"}>
                              Otkaži
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      ) : (
        <div style={{ marginTop: 14, opacity: 0.8 }}>{loading ? "Učitavam..." : "Nema schedule."}</div>
      )}
    </div>
  );
}