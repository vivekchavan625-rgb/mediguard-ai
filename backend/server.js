require("dotenv").config();
const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 5000;

// Dynamic CORS configuration supporting environment variable
const allowedOrigins = process.env.CORS_ORIGIN
    ? process.env.CORS_ORIGIN.split(",").map((s) => s.trim())
    : ["http://localhost:5173", "http://127.0.0.1:5173"];

app.use(cors({
    origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes("*") || allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            callback(new Error(`CORS origin '${origin}' not allowed by policy`));
        }
    },
    credentials: true,
}));
app.use(express.json());

// ---------- Storage (JSON files in backend/data/) ----------
const DATA_DIR = path.join(__dirname, "data");
const FILES = {
    workers: path.join(DATA_DIR, "workers.json"),
    records: path.join(DATA_DIR, "records.json"),
    audit: path.join(DATA_DIR, "audit.json"),
};

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR);
Object.values(FILES).forEach((f) => {
    if (!fs.existsSync(f)) fs.writeFileSync(f, "[]");
});

const readJSON = (file) => JSON.parse(fs.readFileSync(file, "utf8"));
const writeJSON = (file, data) =>
    fs.writeFileSync(file, JSON.stringify(data, null, 2));

const nextId = (items) =>
    items.length ? Math.max(...items.map((i) => i.id)) + 1 : 1;

const findWorker = (id) =>
    readJSON(FILES.workers).find((w) => w.id === Number(id));

// Strip sensitive internal fields before sending worker data to clients
function sanitizeWorker(w) {
    const { emergencyToken, emergencyTokenRevoked, ...safe } = w;
    return safe;
}

// ---------- Audit log ----------
function logAudit(req, action, workerId, details = "", dedupeMs = 0) {
    const actor = req.get("x-user") || "system";
    const log = readJSON(FILES.audit);
    const last = log[log.length - 1];
    if (
        dedupeMs &&
        last &&
        last.action === action &&
        last.workerId === workerId &&
        last.actor === actor &&
        Date.now() - new Date(last.time).getTime() < dedupeMs
    ) {
        return; // skip duplicate entries made within a few seconds
    }
    log.push({
        id: nextId(log),
        time: new Date().toISOString(),
        actor,
        action,
        workerId: workerId ?? null,
        details,
    });
    writeJSON(FILES.audit, log);
}

// ---------- Validation ----------
const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];
const RECORD_TYPES = ["Checkup", "Vaccination", "Illness", "Medication", "Lab test"];

function cleanWorker(body) {
    const text = (v) => (v === undefined || v === null ? "" : String(v).trim());

    const name = text(body.name);
    if (!name) return { error: "Name is required" };

    let age = null;
    if (text(body.age) !== "") {
        age = Number(body.age);
        if (!Number.isInteger(age) || age < 0 || age > 120) {
            return { error: "Age must be a whole number between 0 and 120" };
        }
    }

    const rawPhone = text(body.phone).replace(/[\s-]/g, "");
    const phone = rawPhone.replace(/^(\+91|0)/, "");
    if (phone && !/^\d{10}$/.test(phone)) {
        return { error: "Phone number must be 10 digits" };
    }

    const rawEmergency = text(body.emergencyPhone).replace(/[\s-]/g, "");
    const emergencyPhone = rawEmergency.replace(/^(\+91|0)/, "");
    if (emergencyPhone && !/^\d{10}$/.test(emergencyPhone)) {
        return { error: "Emergency contact phone must be 10 digits" };
    }

    const bloodGroup = text(body.bloodGroup);
    if (bloodGroup && !BLOOD_GROUPS.includes(bloodGroup)) {
        return { error: "Invalid blood group" };
    }

    const abhaId = text(body.abhaId).replace(/[\s-]/g, "");
    if (abhaId && !/^\d{14}$/.test(abhaId)) {
        return { error: "ABHA ID must be 14 digits" };
    }

    return {
        value: {
            name,
            age,
            gender: text(body.gender),
            bloodGroup,
            nativeState: text(body.nativeState),
            phone,
            workLocation: text(body.workLocation),
            allergies: text(body.allergies),
            emergencyName: text(body.emergencyName),
            emergencyPhone,
            abhaId,
        },
    };
}

// ---------- Basic routes ----------
app.get("/", (req, res) => {
    res.send("MediGuard AI backend is running. Try /api/health");
});

app.get("/api/health", (req, res) => {
    res.json({ status: "ok", app: "MediGuard AI backend" });
});

app.get("/api/stats", (req, res) => {
    const workers = readJSON(FILES.workers);
    const records = readJSON(FILES.records);
    const thisMonth = new Date().toISOString().slice(0, 7);
    res.json({
        totalWorkers: workers.length,
        totalRecords: records.length,
        vaccinations: records.filter((r) => r.type === "Vaccination").length,
        recordsThisMonth: records.filter((r) => (r.date || "").startsWith(thisMonth)).length,
    });
});

// ---------- Workers ----------
app.get("/api/workers", (req, res) => {
    res.json(readJSON(FILES.workers).reverse().map(sanitizeWorker)); // newest first, tokens stripped
});

app.get("/api/workers/:id", (req, res) => {
    const worker = findWorker(req.params.id);
    if (!worker) return res.status(404).json({ error: "Worker not found" });
    logAudit(req, "worker_viewed", worker.id, "", 5000);
    res.json(sanitizeWorker(worker));
});

app.post("/api/workers", (req, res) => {
    const { error, value } = cleanWorker(req.body);
    if (error) return res.status(400).json({ error });

    const workers = readJSON(FILES.workers);
    const worker = {
        id: nextId(workers),
        ...value,
        createdAt: new Date().toISOString(),
    };
    workers.push(worker);
    writeJSON(FILES.workers, workers);
    logAudit(req, "worker_created", worker.id, worker.name);
    res.status(201).json(sanitizeWorker(worker));
});

// Disabled: unauthenticated access to emergency tokens and worker PII by predictable worker ID is not permitted
app.get("/api/workers/:id/emergency", (req, res) => {
    res.status(501).json({
        error: "Emergency card viewing is disabled until hospital authentication is implemented.",
    });
});

// Disabled: public emergency triage endpoint is disabled until authentication, consent, and secure token management are implemented
app.get("/api/emergency/:token", (req, res) => {
    res.status(501).json({
        error: "Public emergency endpoint is disabled until authentication, consent, and secure token management are implemented.",
    });
});

// QR token management endpoints (Disabled until server-side hospital authentication & RBAC are implemented)
app.post("/api/workers/:id/emergency-token/revoke", (req, res) => {
    res.status(501).json({
        error: "QR token revocation is disabled until server-side hospital authentication and role-based access control (RBAC) are implemented.",
    });
});

app.post("/api/workers/:id/emergency-token/regenerate", (req, res) => {
    res.status(501).json({
        error: "QR token regeneration is disabled until server-side hospital authentication and role-based access control (RBAC) are implemented.",
    });
});

// ---------- Health records ----------
app.get("/api/workers/:id/records", (req, res) => {
    const records = readJSON(FILES.records)
        .filter((r) => r.workerId === Number(req.params.id))
        .sort((a, b) => (b.date || "").localeCompare(a.date || ""));
    res.json(records);
});

app.post("/api/workers/:id/records", (req, res) => {
    const worker = findWorker(req.params.id);
    if (!worker) return res.status(404).json({ error: "Worker not found" });

    const { date, type, hospital, notes } = req.body;
    if (!RECORD_TYPES.includes(type)) {
        return res.status(400).json({ error: "Invalid record type" });
    }
    if (date && !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        return res.status(400).json({ error: "Date must be in YYYY-MM-DD format" });
    }

    const records = readJSON(FILES.records);
    const record = {
        id: nextId(records),
        workerId: worker.id,
        date: date || new Date().toISOString().slice(0, 10),
        type,
        hospital: (hospital || "").trim(),
        notes: (notes || "").trim(),
        createdAt: new Date().toISOString(),
    };
    records.push(record);
    writeJSON(FILES.records, records);
    logAudit(req, "record_added", worker.id, record.type);
    res.status(201).json(record);
});

// ---------- Activity log for one worker ----------
app.get("/api/workers/:id/audit", (req, res) => {
    const entries = readJSON(FILES.audit)
        .filter((a) => a.workerId === Number(req.params.id))
        .reverse()
        .slice(0, 20);
    res.json(entries);
});

// ---------- Global Error Handler ----------
// Prevents internal stack traces or filesystem paths from leaking to clients
app.use((err, req, res, next) => {
    const isCors = err.message && err.message.includes("CORS");
    const status = isCors ? 403 : (err.status || 500);
    const message = isCors
        ? "CORS request rejected: origin not permitted"
        : "Internal server error";
    res.status(status).json({ error: message });
});

app.listen(PORT, () => {
    console.log(`MediGuard AI backend running at http://localhost:${PORT}`);
});