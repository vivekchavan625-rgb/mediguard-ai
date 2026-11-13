# MediGuard AI — Security Status & Vulnerability Assessment

> **CRITICAL NOTICE: NOT SAFE FOR PUBLIC OR PRODUCTION DEPLOYMENT**
> MediGuard AI is currently an early-stage hackathon prototype. While immediate hardening (Approach 1C) has been applied to neutralize predictable token-harvesting vectors and completely disable QR emergency endpoints, the core worker directory, clinical records, registration, and dashboard APIs **completely lack authentication and authorization**.
> **MANDATORY POLICY:** ONLY FICTIONAL DEMO DATA MAY BE USED. Real patient health information (PHI) or personally identifiable information (PII) MUST NOT be loaded into this system until robust server-side authentication, role-based access control (RBAC), and encryption are fully implemented.

---

## 1. Endpoint Security & Access Matrix

| Endpoint | Method | Status | Authentication Required | Risk Level & Notes |
|---|---|---|---|---|
| `/api/workers` | `GET` | **Active** | **NONE** (Unauthenticated) | **Critical:** Anyone can scrape all registered migrant workers and personal PII. |
| `/api/workers/:id` | `GET` | **Active** | **NONE** (Unauthenticated) | **Critical:** Individual worker profile and PII accessible via predictable sequential ID. |
| `/api/workers` | `POST` | **Active** | **NONE** (Unauthenticated) | **High:** Unrestricted creation of worker profiles. Sanitized response returns zero tokens. |
| `/api/workers/:id/records` | `GET` | **Active** | **NONE** (Unauthenticated) | **Severe:** Full clinical history (diagnoses, visits, doctor notes) exposed to any caller. |
| `/api/workers/:id/records` | `POST` | **Active** | **NONE** (Unauthenticated) | **Severe:** Anyone can append fabricated medical records to any worker's file. |
| `/api/workers/:id/audit` | `GET` | **Active** | **NONE** (Unauthenticated) | **Medium:** System access actions and timestamps viewable without credentials. |
| `/api/stats` | `GET` | **Active** | **NONE** (Unauthenticated) | **Low:** Aggregate worker and record counts. |
| `/api/emergency/:token` | `GET` | **DISABLED (501)** | — | **Neutralized:** Disabled with HTTP 501 until authentication, consent, and secure token management are implemented. Zero worker lookup, zero PII returned. |
| `/api/workers/:id/emergency` | `GET` | **DISABLED (501)** | — | **Neutralized:** Disabled with HTTP 501. Zero worker lookup, zero PII, zero tokens. |
| `/api/workers/:id/emergency-token/revoke` | `POST` | **DISABLED (501)** | — | **Neutralized:** Disabled with HTTP 501 until authenticated staff RBAC is built. |
| `/api/workers/:id/emergency-token/regenerate` | `POST` | **DISABLED (501)** | — | **Neutralized:** Disabled with HTTP 501 until authenticated staff RBAC is built. |

---

## 2. Public Emergency Endpoint (`GET /api/emergency/:token`): Current Status & Architecture Risks

### Current Status
- **Disabled with HTTP 501:** To ensure strict defense-in-depth during the prototype stage, the public emergency triage endpoint is disabled.
- **Zero Data Leakage:** The endpoint immediately responds with HTTP 501 and does not inspect the token, read worker files, or return any personal or clinical information.

### Architecture Risks of Bearer-Token Triage (When Re-enabled in Phase 2)
1. **Bearer Token Possession Risk:** Any party in physical possession of a printed QR pass (or a photo of it) can scan the token. In Phase 2, this endpoint must remain strictly limited to life-saving triage fields (`bloodGroup`, `allergies`, emergency contact) and must never link to full clinical records or ABHA IDs.
2. **Revocation Dependency on RBAC:** Emergency tokens cannot be safely revoked or reissued without server-side authentication and role-based access control (RBAC). Both the triage route and management routes must remain synchronized with hospital administrative authorization.
3. **Need for Rate Limiting:** Even with a 128-bit unguessable random token space, production deployment requires IP-based rate limiting (`express-rate-limit`) to prevent denial-of-service and brute-force probing.

---

## 3. Approach 1C Security Controls in Effect

1. **All Emergency & QR Endpoints Disabled (HTTP 501):**
   - `GET /api/workers/:id/emergency`, `GET /api/emergency/:token`, `POST /api/workers/:id/emergency-token/revoke`, and `POST /api/workers/:id/emergency-token/regenerate` all return HTTP 501 with generic error messages.
   - None of these endpoints queries worker data or inspects IDs.
2. **Zero Token Generation or Issuance:**
   - Removed automatic token generation and `ensureWorkerTokens()`.
   - `POST /api/workers` does not generate or return tokens.
   - Existing worker JSON records are preserved without modification.
3. **Frontend QR Preview Neutralized:**
   - All QR-specific logic, `EmergencyView`, and token URL parsing have been purged from `frontend/src/App.jsx`.
   - All worker profiles in the dashboard display the explicit message:
     ```
     🔒 QR card viewing is temporarily unavailable. Hospital authentication is required.
     ```
4. **Token Sanitization Across All Active Endpoints:**
   - `GET /api/workers`, `GET /api/workers/:id`, and `POST /api/workers` all pass through `sanitizeWorker`, ensuring internal token fields are never transmitted to clients.

---

## 4. Why the Project is NOT Production-Ready

1. **Absence of Authentication & Authorization (RBAC):**
   - There are no doctor, nurse, or hospital staff login accounts.
   - The entire clinical records subsystem (`/records`) and worker database (`/workers`) are unprotected.
2. **Audit Logging Header (`x-user`) is Trivially Spoofable:**
   - `logAudit()` currently assigns the actor identity using `req.get('x-user') || 'system'`.
   - Because there is no authentication layer, any client or attacker can supply an arbitrary string in the `x-user` request header (e.g., `x-user: Dr. Sharma` or `x-user: Administrator`).
   - Consequently, the audit log **cannot be treated as an authenticated, non-repudiable, or reliable identity log** until server-side authentication (Phase 2) verifies the caller's cryptographic session.
3. **Plaintext Flat-File Storage:**
   - Data resides in unencrypted JSON files (`backend/data/*.json`) lacking ACID guarantees, row-level security, or database-level access controls.
4. **Lack of Patient Consent Mechanisms:**
   - Inter-hospital sharing of health records (mandated by SIH25083) requires patient consent workflows, which are not yet implemented.
5. **CORS and UUIDs are NOT Security Boundaries:**
   - Restricting CORS origins only limits web browsers; any script, curl command, or native tool can interact with the API unrestricted.
   - Using non-predictable IDs reduces enumeration, but does not provide authorization.

---

## 5. Mandatory Policy

> [!CAUTION]
> **USE FICTIONAL DATA ONLY:** Under no circumstances should real Aadhaar, ABHA, phone numbers, or genuine medical histories be entered into MediGuard AI until Phase 2 (PostgreSQL migration, bcrypt/argon2 authentication, hospital RBAC, and patient consent management) is fully implemented and audited.
