import { useEffect, useMemo, useState } from "react";
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

// za input type=time: max start mora biti 19:45 (da kraj bude 20:00)
const MAX_START = "19:45";
const MIN_END = "08:15";
const MAX_END = "20:00";


//DODATOOO

// opcioni: dropdown sa 15-minutnim intervalima (umesto free text input)
const MINUTES = [0, 15, 30, 45];
const HOURS_FROM = [8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19];
const HOURS_TO   = [8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20];

const pad2 = (n) => String(n).padStart(2, "0");

function parseHHMM(hhmm) {
  const [h, m] = hhmm.split(":").map(Number);
  return { h, m };
}
function buildHHMM(h, m) {
  return `${pad2(h)}:${pad2(m)}`;
}

// opcioni component za odabir vremena sa dropdownima (umesto free text input type=time)
function TimeSelect({ value, onChange, hours, minutes = MINUTES }) {
  const { h, m } = parseHHMM(value);

  // ako je value nekako van liste, “snapuj” na prvi dozvoljeni
  const safeH = hours.includes(h) ? h : hours[0];
  const safeM = minutes.includes(m) ? m : minutes[0];

  // ako smo morali da ispravimo, javi parent-u
  useEffect(() => {
    const fixed = buildHHMM(safeH, safeM);
    if (fixed !== value) onChange(fixed);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <span style={{ display: "inline-flex", gap: 6, alignItems: "center" }}>
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
    </span>
  );
}

function clampToAllowedStart(hhmm) {
  // OD: 08:00–19:45
  if (hhmm < "08:00") return "08:00";
  if (hhmm > "19:45") return "19:45";
  return hhmm;
}
function clampToAllowedEnd(hhmm) {
  // DO: 08:00–20:00 (ti želiš da 20 postoji)
  if (hhmm < "08:00") return "08:00";
  if (hhmm > "20:00") return "20:00";
  return hhmm;
}

//DODATOOO-




export default function App() {
  // logged user (persist)
  const [user, setUser] = useState(() => {
    const raw = localStorage.getItem("rr_user");
    return raw ? JSON.parse(raw) : null;
  });

  // Login UI (email/password) - MVP seed auth
  const [users, setUsers] = useState([]);
  const [loginEmail, setLoginEmail] = useState(() => localStorage.getItem("rr_last_email") || "");
  const [loginPassword, setLoginPassword] = useState("");

  // schedule
  const [date, setDate] = useState(() => toISODate(new Date()));
  const [schedule, setSchedule] = useState(null);
  const [loading, setLoading] = useState(false);

  // create form
  const [selectedRoomId, setSelectedRoomId] = useState(null);
  const [startHHMM, setStartHHMM] = useState("10:15");
  const [endHHMM, setEndHHMM] = useState("10:30");
  const [purpose, setPurpose] = useState("VEZBE");
  const [name, setName] = useState("Termin");
  const [description, setDescription] = useState("");

  // my reservations
  const [myReservations, setMyReservations] = useState([]);
  const [myLoading, setMyLoading] = useState(false);

  // admin pending
  const [pending, setPending] = useState([]);
  const [pendingLoading, setPendingLoading] = useState(false);
  const [adminComment, setAdminComment] = useState("");

  // admin tabs
  const [adminTab, setAdminTab] = useState("PENDING"); // "PENDING" | "MY"

  async function loadUsers() {
    // MVP: seed korisnici (dok ne uvedemo pravi /api/auth/login)
    setUsers([
      { id: 1, email: "admin@fon.rs", role: "ADMIN", firstName: "Admin", lastName: "User", password: "admin" },
      { id: 2, email: "marko@fon.rs", role: "USER", firstName: "Marko", lastName: "Markovic", password: "user" },
      { id: 3, email: "jelena@fon.rs", role: "USER", firstName: "Jelena", lastName: "Jovanovic", password: "user" },
    ]);
  }

  async function loadSchedule(d) {
    setLoading(true);
    try {
      const res = await axios.get(`/api/reservations/schedule`, {
        params: { date: d, _ts: Date.now() },
        headers: { "Cache-Control": "no-cache" },
      });
      setSchedule(res.data);
      setSelectedRoomId(res.data.rooms?.[0]?.id ?? null);
    } finally {
      setLoading(false);
    }
  }

  async function loadMyReservations() {
    if (!user) return;
    setMyLoading(true);
    try {
      const res = await axios.get(`/api/reservations/my`, {
        params: { userId: user.id, _ts: Date.now() },
        headers: { "Cache-Control": "no-cache" },
      });
      setMyReservations(res.data);
    } finally {
      setMyLoading(false);
    }
  }

  async function loadPending() {
    setPendingLoading(true);
    try {
      const res = await axios.get(`/api/reservations/pending`, {
        params: { _ts: Date.now() },
        headers: { "Cache-Control": "no-cache" },
      });
      setPending(res.data);
    } finally {
      setPendingLoading(false);
    }
  }

  useEffect(() => {
    loadUsers();
  }, []);

  // kada se user promeni (login/logout)
  useEffect(() => {
    if (!user) return;
    loadSchedule(date);
    loadMyReservations();
    if (isAdmin(user)) loadPending();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // kad se promeni datum — odmah učitaj novi schedule
  useEffect(() => {
    if (!user) return;
    loadSchedule(date);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date]);

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

  function slotBlocked(roomId, slotStartMin) {
    if (!schedule) return false;
    const step = SLOT_MINUTES;
    const slotEndMin = slotStartMin + step;

    for (const r of schedule.approvedReservations) {
      if (r.room.id !== roomId) continue;

      const start = new Date(r.startDateTime);
      const end = new Date(r.endDateTime);

      const rs = start.getHours() * 60 + start.getMinutes();
      const re = end.getHours() * 60 + end.getMinutes();

      if (slotStartMin < re && slotEndMin > rs) return true;
    }
    return false;
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
    if (slotBlocked(roomId, slotStartMin)) return;

    setSelectedRoomId(roomId);
    //DODATOOOO
    setStartHHMM(clampToAllowedStart(start));
    setEndHHMM(clampToAllowedEnd(end));
    //DODATOOOO-
  }

  async function createReservation() {
    if (!user) return alert("Nisi ulogovan.");
    if (!selectedRoomId) return alert("Nema izabrane sale.");

    if (!withinWorkingHours(startHHMM, endHHMM)) {
      return alert("Radno vreme je 08:00–20:00. Proveri OD/DO.");
    }
    if (endHHMM <= startHHMM) {
      alert("Vreme 'Do' mora biti posle vremena 'Od'.");
      return;
    }

    const start = `${date}T${startHHMM}:00`;
    const end = `${date}T${endHHMM}:00`;

    try {
      const res = await axios.post("/api/reservations", {
        roomId: selectedRoomId,
        createdById: user.id,
        startDateTime: start,
        endDateTime: end,
        purpose,
        name,
        description,
      });

      const created = res.data;
      const status = created?.status ?? (isAdmin(user) ? "APPROVED" : "PENDING");
      alert(`Rezervacija kreirana (${status}).`);

      // reset inputs (opciono)
      setDescription("");
      setName("Termin");

      await loadSchedule(date);
      await loadMyReservations();
      if (isAdmin(user)) await loadPending();
    } catch (e) {
      const msg = e?.response?.data ?? "Greška";
      alert(typeof msg === "string" ? msg : JSON.stringify(msg));
    }
  }

  async function cancelReservation(reservationId) {
    if (!user) return;
    try {
      await axios.post(`/api/reservations/${reservationId}/cancel`, { userId: user.id });
      await loadMyReservations();
      await loadSchedule(date);
      if (isAdmin(user)) await loadPending();
    } catch (e) {
      const msg = e?.response?.data ?? "Greška";
      alert(typeof msg === "string" ? msg : JSON.stringify(msg));
    }
  }

  async function decideReservation(reservationId, decision) {
    if (!user) return;
    try {
      await axios.post(`/api/reservations/${reservationId}/decide`, {
        adminId: user.id,
        decision,
        comment: adminComment || null,
      });
      setAdminComment("");
      await loadPending();
      await loadSchedule(date);
    } catch (e) {
      const msg = e?.response?.data ?? "Greška";
      alert(typeof msg === "string" ? msg : JSON.stringify(msg));
    }
  }

  // MVP login (seed) - UI je email/password kao pravi login
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
    setSchedule(null);
    setPending([]);
    setMyReservations([]);
    setAdminComment("");
    setAdminTab("PENDING");
  }

  // ===== LOGIN SCREEN =====
  if (!user) {
    return (
      <div style={{ padding: 20, fontFamily: "Arial, sans-serif", overflowX: "hidden", maxWidth: 520 }}>
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
              placeholder="(MVP) admin ili user"
              style={{ width: "100%", marginTop: 4, padding: 8 }}
            />
          </label>

          <button onClick={loginMvp} style={{ padding: "10px 12px" }}>
            Login
          </button>

          <div style={{ fontSize: 12, opacity: 0.85, marginTop: 6 }}>
            MVP seed kredencijali (dok ne prebacimo na pravi backend login):
            <div><b>admin@fon.rs</b> / <b>admin</b></div>
            <div><b>marko@fon.rs</b> / <b>user</b></div>
            <div><b>jelena@fon.rs</b> / <b>user</b></div>
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
            Approved za dan: <b>{schedule.approvedReservations.length}</b>
          </div>
        )}
      </div>

      {/* ADMIN TABS */}
      {isAdmin(user) ? (
        <div style={{ marginTop: 14, border: "1px solid #ddd", borderRadius: 10, padding: 12 }}>
          <h3 style={{ marginTop: 0 }}>Admin</h3>

          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <button
              onClick={() => setAdminTab("PENDING")}
              style={{ fontWeight: adminTab === "PENDING" ? "bold" : "normal" }}
            >
              Pending approvals
            </button>
            <button
              onClick={() => setAdminTab("MY")}
              style={{ fontWeight: adminTab === "MY" ? "bold" : "normal" }}
            >
              My reservations
            </button>
          </div>

          {adminTab === "PENDING" ? (
            <div style={{ marginTop: 12 }}>
              <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                <button onClick={loadPending} disabled={pendingLoading}>
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
                  <div style={{ opacity: 0.8 }}>Nema PENDING rezervacija.</div>
                ) : (
                  <div style={{ display: "grid", gap: 8 }}>
                    {pending.map((r) => (
                      <div
                        key={r.id}
                        style={{
                          border: "1px solid #eee",
                          borderRadius: 8,
                          padding: 10,
                          display: "flex",
                          justifyContent: "space-between",
                          gap: 12,
                          alignItems: "center",
                        }}
                      >
                        <div style={{ fontSize: 13 }}>
                          <b>#{r.id}</b> • {r.room?.code} • {r.startDateTime} → {r.endDateTime}
                          <div style={{ opacity: 0.85 }}>
                            {r.purpose} • {r.name} • by {r.createdBy?.email}
                          </div>
                        </div>

                        <div style={{ display: "flex", gap: 8 }}>
                          <button onClick={() => decideReservation(r.id, "APPROVED")}>Approve</button>
                          <button onClick={() => decideReservation(r.id, "REJECTED")}>Reject</button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div style={{ marginTop: 12, fontSize: 13, opacity: 0.9 }}>
              Ovde admin vidi svoje rezervacije u listi (dole u “Moje rezervacije” sekciji) i može da ih otkaže.
            </div>
          )}
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

                {schedule.rooms.map((room) => (
                  <div key={room.id} style={{ display: "contents" }}>
                    <div style={{ padding: 8, borderTop: "1px solid #eee", borderRight: "1px solid #eee" }}>
                      <div style={{ fontWeight: "bold" }}>{room.code}</div>
                      <div style={{ fontSize: 12, opacity: 0.8 }}>
                        {room.roomType} • {room.building} • {room.capacity}
                      </div>
                    </div>

                    {timeSlots.map((t) => {
                      const blocked = slotBlocked(room.id, t);
                      const step = SLOT_MINUTES;
                      const selected =
                        selectedRoomId === room.id &&
                        startHHMM === minutesToHHMM(t) &&
                        endHHMM === minutesToHHMM(t + step);

                      return (
                        <div
                          key={t}
                          onClick={() => onCellClick(room.id, t)}
                          title={blocked ? "Zauzeto (APPROVED)" : "Klikni da izabereš slot"}
                          style={{
                            borderTop: "1px solid #eee",
                            borderLeft: "1px solid #eee",
                            height: 34,
                            background: blocked ? "#ffb3b3" : selected ? "#dff5ff" : "white",
                            cursor: blocked ? "not-allowed" : "pointer",
                            boxShadow: blocked
                              ? "inset 0 0 0 2px #cc0000"
                              : selected
                              ? "inset 0 0 0 2px #0099cc"
                              : "none",
                          }}
                        />
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* CREATE */}
          <div style={{ marginTop: 16, padding: 12, border: "1px solid #ddd", borderRadius: 10 }}>
            <h3 style={{ marginTop: 0 }}>
              Napravi rezervaciju ({isAdmin(user) ? "APPROVED odmah (ADMIN)" : "PENDING (USER)"})
            </h3>

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
                <TimeSelect
                  value={startHHMM}
                  onChange={setStartHHMM}
                  hours={HOURS_FROM}
                />
              </label>

              <label>
                Do:&nbsp;
                <TimeSelect
                  value={endHHMM}
                  onChange={setEndHHMM}
                  hours={HOURS_TO}
                />
              </label>
              

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
            </div>

            <div style={{ marginTop: 10, display: "grid", gap: 8, maxWidth: 520 }}>
              <label>
                Naziv:&nbsp;
                <input value={name} onChange={(e) => setName(e.target.value)} style={{ width: "100%" }} />
              </label>

              <label>
                Opis:&nbsp;
                <input
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  style={{ width: "100%" }}
                />
              </label>
            </div>

            <button onClick={createReservation} style={{ marginTop: 12 }}>
              Sačuvaj rezervaciju
            </button>

            <div style={{ marginTop: 8, fontSize: 12, opacity: 0.8 }}>
              Radno vreme: <b>08:00–20:00</b>. Grid prikazuje samo <b>APPROVED</b>.
            </div>
          </div>

          {/* MY RESERVATIONS (i admin i user) */}
          <div style={{ marginTop: 16, padding: 12, border: "1px solid #ddd", borderRadius: 10 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
              <h3 style={{ margin: 0 }}>Moje rezervacije</h3>
              <button onClick={loadMyReservations} disabled={myLoading}>
                {myLoading ? "Učitavam..." : "Osveži"}
              </button>
            </div>

            {myReservations.length === 0 ? (
              <div style={{ marginTop: 10, opacity: 0.8 }}>Nema rezervacija.</div>
            ) : (
              <div style={{ marginTop: 10, display: "grid", gap: 8 }}>
                {myReservations.map((r) => (
                  <div
                    key={r.id}
                    style={{
                      border: "1px solid #eee",
                      borderRadius: 8,
                      padding: 10,
                      display: "flex",
                      justifyContent: "space-between",
                      gap: 12,
                      alignItems: "center",
                    }}
                  >
                    <div style={{ fontSize: 13 }}>
                      <b>#{r.id}</b> • {r.room?.code} • {r.startDateTime} → {r.endDateTime}
                      <div style={{ opacity: 0.85 }}>
                        {r.status} • {r.purpose} • {r.name}
                      </div>
                    </div>

                    <button onClick={() => cancelReservation(r.id)} disabled={r.status === "CANCELED"}>
                      Otkaži
                    </button>
                  </div>
                ))}
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
