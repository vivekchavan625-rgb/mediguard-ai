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
const today = () => new Date().toISOString().slice(0, 10);
const initials = (name) =>
  name.trim().split(/\s+/).map((p) => p[0]).slice(0, 2).join("").toUpperCase();
const BACKEND_ERROR = "Cannot reach the backend. Is it running on port 5000?";

function Header() {
  return (
    <header className="topbar">
      <div className="brand">
        <span className="logo">+</span> MediGuard AI
      </div>
      <span className="tag">SIH25083 · Digital Health Records for Migrant Workers</span>
    </header>
  );
}

function WorkerDetail({ worker, onBack }) {
  const [records, setRecords] = useState([]);
  const [form, setForm] = useState({ date: today(), type: "Checkup", hospital: "", notes: "" });
  const [error, setError] = useState("");

  const cardLink = `${window.location.origin}/?worker=${worker.id}`;

  const loadRecords = async () => {
    try {
      const res = await fetch(`${API}/workers/${worker.id}/records`);
      setRecords(await res.json());
    } catch {
      setError(BACKEND_ERROR);
    }
  };

  useEffect(() => {
    loadRecords();
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
      loadRecords();
    } catch {
      setError(BACKEND_ERROR);
    }
  };

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
            <h1>{worker.name}</h1>
            <p>ID #{worker.id} · Age {worker.age || "-"} · {worker.nativeState || "-"}</p>
            <p>Phone: {worker.phone || "-"}</p>
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
  const [form, setForm] = useState({ name: "", age: "", nativeState: "", phone: "" });
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
    if (!id) return;
    fetch(`${API}/workers/${id}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((w) => w && setSelected(w))
      .catch(() => { });
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
      setForm({ name: "", age: "", nativeState: "", phone: "" });
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
          loadStats();
        }}
      />
    );
  }

  const q = query.trim().toLowerCase();
  const filtered = workers.filter((w) =>
    [w.name, w.nativeState, w.phone].some((v) => (v || "").toLowerCase().includes(q))
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
              <input name="name" placeholder="Full name" value={form.name} onChange={handleChange} />
              <input name="age" type="number" placeholder="Age" value={form.age} onChange={handleChange} />
              <input name="nativeState" placeholder="Native state" value={form.nativeState} onChange={handleChange} />
              <input name="phone" placeholder="Phone number" value={form.phone} onChange={handleChange} />
              <button className="btn" type="submit">Register</button>
            </form>
            {error && <p className="error">{error}</p>}
          </div>

          <div className="panel">
            <h2>Workers ({filtered.length})</h2>
            <input className="search" placeholder="Search by name, state or phone..." value={query} onChange={(e) => setQuery(e.target.value)} />
            {filtered.length === 0 && <p className="empty">No workers found.</p>}
            {filtered.map((w) => (
              <div className="worker" key={w.id} onClick={() => setSelected(w)}>
                <div className="avatar">{initials(w.name)}</div>
                <div>
                  <strong>{w.name}</strong>
                  <div className="meta">#{w.id} · Age {w.age || "-"} · {w.nativeState || "-"} · {w.phone || "-"}</div>
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

