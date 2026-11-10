import { useEffect, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import "./App.css";

const API = "http://localhost:5000/api";
const RECORD_TYPES = ["Checkup", "Vaccination", "Illness", "Medication", "Lab test"];
const BADGE = {
  Checkup: "blue",
  Vaccination: "green",
  Illness: "red",
  Medication: "purple",
  "Lab test": "amber",
};
const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];
const EMPTY_WORKER = {
  name: "",
  age: "",
  gender: "",
  bloodGroup: "",
  nativeState: "",
  phone: "",
  workLocation: "",
  allergies: "",
  emergencyName: "",
  emergencyPhone: "",
  abhaId: "",
};
const ACTION_LABELS = {
  worker_created: "Worker registered",
  worker_viewed: "Profile viewed",
  record_added: "Health record added",
  emergency_viewed: "Emergency card viewed",
};
const BACKEND_ERROR = "Cannot reach the backend. Is it running on port 5000?";

const today = () => new Date().toISOString().slice(0, 10);
const initials = (name) =>
  name.trim().split(/\s+/).map((p) => p[0]).slice(0, 2).join("").toUpperCase();

function Logo() {
  return (
    <svg className="logo-svg" viewBox="0 0 48 48" aria-hidden="true">
      <defs>
        <linearGradient id="shieldGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="1" stopColor="#bdeedd" />
        </linearGradient>
      </defs>
      <path
        d="M24 3 L41 9 V23 C41 33 34 41 24 45 C14 41 7 33 7 23 V9 Z"
        fill="url(#shieldGrad)"
      />
      <polyline
        points="12,25 19,25 22,16 26,33 29,22 31,25 36,25"
        fill="none"
        stroke="#0a7d5a"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function Header() {
  return (
    <header className="topbar">
      <div className="brand">
        <Logo />
        <span className="brand-name">
          MediGuard<em>AI</em>
        </span>
      </div>
    </header>
  );
}

function WorkerDetail({ worker, onBack }) {
  const [w, setW] = useState(worker.name ? worker : null);
  const [notFound, setNotFound] = useState(false);
  const [records, setRecords] = useState([]);
  const [activity, setActivity] = useState([]);
  const [form, setForm] = useState({ date: today(), type: "Checkup", hospital: "", notes: "" });
  const [error, setError] = useState("");

  const cardLink = `${window.location.origin}/?worker=${worker.id}`;

  const loadRecords = async () => {
    const res = await fetch(`${API}/workers/${worker.id}/records`);
    setRecords(await res.json());
  };

  const loadActivity = async () => {
    const res = await fetch(`${API}/workers/${worker.id}/audit`);
    setActivity(await res.json());
  };

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch(`${API}/workers/${worker.id}`);
        if (!res.ok) {
          setNotFound(true);
          return;
        }
        setW(await res.json());
        await loadRecords();
        await loadActivity();
      } catch {
        setError(BACKEND_ERROR);
      }
    };
    load();
  }, [worker.id]);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    try {
      const res = await fetch(`${API}/workers/${worker.id}/records`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Something went wrong");
        return;
      }
      setForm({ date: today(), type: "Checkup", hospital: "", notes: "" });
      await loadRecords();
      await loadActivity();
    } catch {
      setError(BACKEND_ERROR);
    }
  };

  if (notFound) {
    return (
      <>
        <Header />
        <div className="page">
          <button className="back" onClick={onBack}>← Back to dashboard</button>
          <p className="empty">Worker not found.</p>
        </div>
      </>
    );
  }

  if (!w) {
    return (
      <>
        <Header />
        <div className="page">
          <p className="empty">{error || "Loading..."}</p>
        </div>
      </>
    );
  }

  return (
    <>
      <Header />
      <div className="page">
        <button className="back" onClick={onBack}>← Back to dashboard</button>

        <div className="idcard">
          <div className="qr">
            <QRCodeSVG value={cardLink} size={120} />
          </div>
          <div>
            <small>MEDIGUARD HEALTH CARD</small>
            <h1>{w.name}</h1>
            <p>
              ID #{w.id} · Age {w.age || "-"} · {w.gender || "-"} · {w.nativeState || "-"}
            </p>
            <p>Phone: {w.phone || "-"}</p>
            <p>
              {w.bloodGroup && <span className="chip">Blood: {w.bloodGroup}</span>}
              {w.allergies && <span className="chip warn">Allergy: {w.allergies}</span>}
            </p>
            <p>
              Emergency: {w.emergencyName || "-"}
              {w.emergencyPhone ? ` (${w.emergencyPhone})` : ""}
            </p>
            {w.abhaId && <p>ABHA ID: {w.abhaId}</p>}
            {w.workLocation && <p>Works at: {w.workLocation}</p>}
            <p className="link">{cardLink}</p>
          </div>
        </div>

        <div className="grid">
          <div className="panel">
            <h2>Add Health Record</h2>
            <form onSubmit={handleSubmit} className="form">
              <input name="date" type="date" value={form.date} onChange={handleChange} />
              <select name="type" value={form.type} onChange={handleChange}>
                {RECORD_TYPES.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
              <input name="hospital" placeholder="Hospital / clinic" value={form.hospital} onChange={handleChange} />
              <textarea name="notes" placeholder="Notes (diagnosis, medicine, advice...)" value={form.notes} onChange={handleChange} rows={3} />
              <button className="btn" type="submit">Save Record</button>
            </form>
            {error && <p className="error">{error}</p>}
          </div>

          <div>
            <div className="panel">
              <h2>Health History ({records.length})</h2>
              {records.length === 0 && <p className="empty">No records yet.</p>}
              {records.map((r) => (
                <div className="record" key={r.id}>
                  <div className="row">
                    <span className={`badge ${BADGE[r.type] || "blue"}`}>{r.type}</span>
                    <span className="date">{r.date}</span>
                  </div>
                  <p><strong>{r.hospital || "-"}</strong></p>
                  <p>{r.notes || "No notes"}</p>
                </div>
              ))}
            </div>

            <div className="panel activity">
              <h2>Activity Log</h2>
              {activity.length === 0 && <p className="empty">No activity yet.</p>}
              {activity.map((a) => (
                <div className="act" key={a.id}>
                  <span>
                    {ACTION_LABELS[a.action] || a.action}
                    {a.details ? ` · ${a.details}` : ""}
                  </span>
                  <span className="date">
                    {a.actor} · {new Date(a.time).toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

function App() {
  const [workers, setWorkers] = useState([]);
  const [stats, setStats] = useState({ totalWorkers: 0, totalRecords: 0, vaccinations: 0, recordsThisMonth: 0 });
  const [selected, setSelected] = useState(null);
  const [query, setQuery] = useState("");
  const [form, setForm] = useState(EMPTY_WORKER);
  const [error, setError] = useState("");

  const loadWorkers = async () => {
    try {
      const res = await fetch(`${API}/workers`);
      setWorkers(await res.json());
    } catch {
      setError(BACKEND_ERROR);
    }
  };

  const loadStats = async () => {
    try {
      const res = await fetch(`${API}/stats`);
      setStats(await res.json());
    } catch {
      setError(BACKEND_ERROR);
    }
  };

  useEffect(() => {
    loadWorkers();
    loadStats();
  }, []);

  // Opens a worker directly when the page is opened from a QR link (?worker=ID)
  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get("worker");
    if (id) setSelected({ id: Number(id) });
  }, []);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    try {
      const res = await fetch(`${API}/workers`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Something went wrong");
        return;
      }
      setForm(EMPTY_WORKER);
      loadWorkers();
      loadStats();
    } catch {
      setError(BACKEND_ERROR);
    }
  };

  if (selected) {
    return (
      <WorkerDetail
        worker={selected}
        onBack={() => {
          setSelected(null);
          window.history.replaceState({}, "", "/");
          loadWorkers();
          loadStats();
        }}
      />
    );
  }

  const q = query.trim().toLowerCase();
  const filtered = workers.filter((w) =>
    [w.name, w.nativeState, w.phone, w.bloodGroup].some((v) =>
      (v || "").toLowerCase().includes(q)
    )
  );

  return (
    <>
      <Header />
      <div className="page">
        <div className="stats">
          <div className="stat"><b>{stats.totalWorkers}</b><span>Registered workers</span></div>
          <div className="stat"><b>{stats.totalRecords}</b><span>Health records</span></div>
          <div className="stat"><b>{stats.vaccinations}</b><span>Vaccinations</span></div>
          <div className="stat"><b>{stats.recordsThisMonth}</b><span>Records this month</span></div>
        </div>

        <div className="grid">
          <div className="panel">
            <h2>Register a Worker</h2>
            <form onSubmit={handleSubmit} className="form">
              <input name="name" placeholder="Full name *" value={form.name} onChange={handleChange} />
              <div className="two">
                <input name="age" type="number" placeholder="Age" value={form.age} onChange={handleChange} />
                <select name="gender" value={form.gender} onChange={handleChange}>
                  <option value="">Gender</option>
                  <option>Male</option>
                  <option>Female</option>
                  <option>Other</option>
                </select>
              </div>
              <div className="two">
                <select name="bloodGroup" value={form.bloodGroup} onChange={handleChange}>
                  <option value="">Blood group</option>
                  {BLOOD_GROUPS.map((b) => (
                    <option key={b}>{b}</option>
                  ))}
                </select>
                <input name="nativeState" placeholder="Native state" value={form.nativeState} onChange={handleChange} />
              </div>
              <input name="phone" placeholder="Phone (10 digits)" value={form.phone} onChange={handleChange} />
              <input name="workLocation" placeholder="Work location (site / city)" value={form.workLocation} onChange={handleChange} />
              <input name="allergies" placeholder="Allergies (if any)" value={form.allergies} onChange={handleChange} />
              <input name="emergencyName" placeholder="Emergency contact name" value={form.emergencyName} onChange={handleChange} />
              <input name="emergencyPhone" placeholder="Emergency contact phone (10 digits)" value={form.emergencyPhone} onChange={handleChange} />
              <input name="abhaId" placeholder="ABHA ID (14 digits, optional)" value={form.abhaId} onChange={handleChange} />
              <button className="btn" type="submit">Register</button>
            </form>
            {error && <p className="error">{error}</p>}
          </div>

          <div className="panel">
            <h2>Workers ({filtered.length})</h2>
            <input className="search" placeholder="Search by name, state, phone or blood group..." value={query} onChange={(e) => setQuery(e.target.value)} />
            {filtered.length === 0 && <p className="empty">No workers found.</p>}
            {filtered.map((w) => (
              <div className="worker" key={w.id} onClick={() => setSelected(w)}>
                <div className="avatar">{initials(w.name)}</div>
                <div>
                  <strong>{w.name}</strong>
                  {w.bloodGroup && <span className="chip small">{w.bloodGroup}</span>}
                  <div className="meta">
                    #{w.id} · Age {w.age || "-"} · {w.nativeState || "-"} · {w.phone || "-"}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}

export default App;

