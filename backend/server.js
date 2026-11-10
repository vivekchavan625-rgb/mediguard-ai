const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = 5000;

app.use(cors());
app.use(express.json());

// Data is saved in backend/data/ (created automatically)
const DATA_DIR = path.join(__dirname, "data");
const WORKERS_FILE = path.join(DATA_DIR, "workers.json");
const RECORDS_FILE = path.join(DATA_DIR, "records.json");

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR);
if (!fs.existsSync(WORKERS_FILE)) fs.writeFileSync(WORKERS_FILE, "[]");
if (!fs.existsSync(RECORDS_FILE)) fs.writeFileSync(RECORDS_FILE, "[]");

const readJSON = (file) => JSON.parse(fs.readFileSync(file, "utf8"));
const writeJSON = (file, data) =>
    fs.writeFileSync(file, JSON.stringify(data, null, 2));

app.get("/", (req, res) => {
    res.send("MediGuard AI backend is running. Try /api/health");
});

app.get("/api/health", (req, res) => {
    res.json({ status: "ok", app: "MediGuard AI backend" });
});

// ---------- Workers ----------
app.get("/api/workers", (req, res) => {
    res.json(readJSON(WORKERS_FILE).reverse()); // newest first
});

app.get("/api/workers/:id", (req, res) => {
    const worker = readJSON(WORKERS_FILE).find((w) => w.id === Number(req.params.id));
    if (!worker) return res.status(404).json({ error: "Worker not found" });
    res.json(worker);
});

app.post("/api/workers", (req, res) => {
    const { name, age, nativeState, phone } = req.body;
    if (!name) {
        return res.status(400).json({ error: "Name is required" });
    }
    const workers = readJSON(WORKERS_FILE);
    const nextId = workers.length ? Math.max(...workers.map((w) => w.id)) + 1 : 1;
    const worker = {
        id: nextId,
        name,
        age: age ? Number(age) : null,
        nativeState,
        phone,
        createdAt: new Date().toISOString(),
    };
    workers.push(worker);
    writeJSON(WORKERS_FILE, workers);
    res.status(201).json(worker);
});

// ---------- Health records ----------
app.get("/api/workers/:id/records", (req, res) => {
    const records = readJSON(RECORDS_FILE)
        .filter((r) => r.workerId === Number(req.params.id))
        .sort((a, b) => (b.date || "").localeCompare(a.date || ""));
    res.json(records);
});

app.post("/api/workers/:id/records", (req, res) => {
    const workerId = Number(req.params.id);
    const worker = readJSON(WORKERS_FILE).find((w) => w.id === workerId);
    if (!worker) return res.status(404).json({ error: "Worker not found" });

    const { date, type, hospital, notes } = req.body;
    if (!type) return res.status(400).json({ error: "Record type is required" });

    const records = readJSON(RECORDS_FILE);
    const nextId = records.length ? Math.max(...records.map((r) => r.id)) + 1 : 1;
    const record = {
        id: nextId,
        workerId,
        date: date || new Date().toISOString().slice(0, 10),
        type,
        hospital,
        notes,
        createdAt: new Date().toISOString(),
    };
    records.push(record);
    writeJSON(RECORDS_FILE, records);
    res.status(201).json(record);
});

app.get("/api/stats", (req, res) => {
    const workers = readJSON(WORKERS_FILE);
    const records = readJSON(RECORDS_FILE);
    const thisMonth = new Date().toISOString().slice(0, 7);
    res.json({
        totalWorkers: workers.length,
        totalRecords: records.length,
        vaccinations: records.filter((r) => r.type === "Vaccination").length,
        recordsThisMonth: records.filter((r) => (r.date || "").startsWith(thisMonth)).length,
    });
});

app.listen(PORT, () => {
    console.log(`MediGuard AI backend running at http://localhost:${PORT}`);
});