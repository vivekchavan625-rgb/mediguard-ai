import { useEffect, useState } from "react";
import "./App.css";
import { QRCodeSVG } from "qrcode.react";

const API = "http://localhost:5000/api";
const RECORD_TYPES = ["Checkup", "Vaccination", "Illness", "Medication", "Lab test"];
const today = () => new Date().toISOString().slice(0, 10);

function WorkerDetail({ worker, onBack }) {
  const [records, setRecords] = useState([]);
  const [form, setForm] = useState({
    date: today(),
    type: "Checkup",
    hospital: "",
    notes: "",
  });
  const [error, setError] = useState("");

  const cardLink = `${window.location.origin}/?worker=${worker.id}`;

  const loadRecords = async () => {
    try {
      const res = await fetch(`${API}/workers/${worker.id}/records`);
      setRecords(await res.json());
    } catch {
      setError("Cannot reach the backend. Is it running on port 5000?");
    }
  };

  useEffect(() => {
    loadRecords();
  }, [worker.id]);

  const handleChange = (e) =>
    setForm({ ...form, [e.target.name]: e.target.value });

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
      setError("Cannot reach the backend. Is it running on port 5000?");
    }
  };

  return (
    <div className="container">
      <button className="back" onClick={onBack}>← Back to workers</button>
      <h1>{worker.name}</h1>
      <p className="subtitle">
        ID #{worker.id} | Age: {worker.age || "-"} | State: {worker.nativeState || "-"} | Phone: {worker.phone || "-"}
      </p>

      <div className="card">
        <QRCodeSVG value={cardLink} size={140} />
        <div>
          <strong>MediGuard Health Card</strong>
          <p>Scan to open this worker's health record.</p>
          <small>{cardLink}</small>
        </div>
      </div>

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
        <button type="submit">Save Record</button>
      </form>

      {error && <p className="error">{error}</p>}

      <h2>Health History ({records.length})</h2>
      <ul className="list">
        {records.map((r) => (
          <li key={r.id}>
            <strong>{r.type} <span className="date">{r.date}</span></strong>
            <span>{r.hospital || "-"}</span>
            <span>{r.notes || "No notes"}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function App() {
  const [workers, setWorkers] = useState([]);
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState({
    name: "",
    age: "",
    nativeState: "",
    phone: "",
  });
  const [error, setError] = useState("");

  const loadWorkers = async () => {
    try {
      const res = await fetch(`${API}/workers`);
      setWorkers(await res.json());
    } catch {
      setError("Cannot reach the backend. Is it running on port 5000?");
    }
  };

  useEffect(() => {
    loadWorkers();
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

  const handleChange = (e) =>
    setForm({ ...form, [e.target.name]: e.target.value });

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
    } catch {
      setError("Cannot reach the backend. Is it running on port 5000?");
    }
  };

  if (selected) {
    return (
      <WorkerDetail
        worker={selected}
        onBack={() => {
          setSelected(null);
          window.history.replaceState({}, "", "/");
        }}
      />
    );
  }

  return (
    <div className="container">
      <h1>MediGuard AI</h1>
      <p className="subtitle">Digital Health Records for Migrant Workers</p>

      <h2>Register a Worker</h2>
      <form onSubmit={handleSubmit} className="form">
        <input name="name" placeholder="Full name" value={form.name} onChange={handleChange} />
        <input name="age" type="number" placeholder="Age" value={form.age} onChange={handleChange} />
        <input name="nativeState" placeholder="Native state" value={form.nativeState} onChange={handleChange} />
        <input name="phone" placeholder="Phone number" value={form.phone} onChange={handleChange} />
        <button type="submit">Register</button>
      </form>

      {error && <p className="error">{error}</p>}

      <h2>Registered Workers ({workers.length})</h2>
      <ul className="list">
        {workers.map((w) => (
          <li key={w.id} className="clickable" onClick={() => setSelected(w)}>
            <strong>#{w.id} {w.name}</strong>
            <span>Age: {w.age || "-"} | State: {w.nativeState || "-"} | Phone: {w.phone || "-"}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default App;

