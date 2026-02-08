# Plan: Automated Cron Jobs (Vercel)

> **Goal:** Establish a reliable, automated system for maintaining fleet health and database hygiene using Vercel Cron Jobs.

## 1. Context & Scope

-   **Platform:** Vercel (Serverless Functions)
-   **Trigger Mechanism:** `vercel.json` crons + Next.js App Router API Routes
-   **Security:** `CRON_SECRET` validation to prevent unauthorized external access
-   **Database:** Supabase (assumed from context) via existing client

### Objectives
1.  **Stale Agent Check** (Every 5 mins): Mark agents as "offline" if they miss heartbeats.
2.  **Data Hygiene** (Nightly @ 00:00 UTC): Hard delete `heartbeat` records > 30 days old to prevent table bloat.

---

## 2. Technical Architecture

### A. Vercel Cron Configuration (`vercel.json`)
Define schedule expressions for the serverless function triggers.

```json
{
  "crons": [
    {
      "path": "/api/cron/check-stale",
      "schedule": "*/5 * * * *"
    },
    {
      "path": "/api/cron/cleanup-heartbeats",
      "schedule": "0 0 * * *"
    }
  ]
}
```

### B. Security Middleware
Create a reusable utility or middleware pattern to verify the `Authorization` header matches `process.env.CRON_SECRET`. All cron endpoints **must** fail with `401 Unauthorized` if this header is missing or incorrect.

### C. API Routes (Next.js App Router)

#### 1. `/api/cron/check-stale`
-   **Logic:**
    -   Fetch all `active` agents where `last_heartbeat < NOW() - 5 minutes`.
    -   Update status to `offline`.
    -   (Optional) Trigger alert (out of scope for this task, but good designed hook).
-   **Method:** GET (Vercel Crons uses GET)

#### 2. `/api/cron/cleanup-heartbeats`
-   **Logic:**
    -   Execute `DELETE FROM heartbeats WHERE created_at < NOW() - INTERVAL '30 days'`.
    -   Log number of deleted rows.
-   **Method:** GET

---

## 3. Implementation Steps

### Phase 1: Security & Setup
- [ ] **Create/Update `vercel.json`**: Define the cron schedules.
- [ ] **Env Var Setup**: Document `CRON_SECRET` requirement in `.env.local` and `.env.example`.
- [ ] **Auth Utility**: Create `lib/cron-auth.ts` to standardise the secret check.

### Phase 2: Stale Agent Monitor
- [ ] **Create Route**: `app/api/cron/check-stale/route.ts`.
- [ ] **Query Logic**:
    -   Select agents with `status = 'online'` AND `last_seen < 5 mins ago`.
    -   Batch update their status to `offline`.
- [ ] **Testing**: Manually trigger endpoint with/without secret.

### Phase 3: Data Maintenance
- [ ] **Create Route**: `app/api/cron/cleanup-heartbeats/route.ts`.
- [ ] **Query Logic**:
    -   SQL Delete operation for records > 30 days.
    -   Use a transaction or limit batch size if millions of rows are expected (start simple for now).
- [ ] **Testing**: Insert a dummy mock record with backdated timestamp and verify deletion.

### Phase 4: Verification
- [ ] **Local Test**: Use cURL to hit endpoints locally.
- [ ] **Deploy Check**: Verify Vercel dashboard shows Cron Jobs as "Scheduled".

---

## 4. Risks & Mitigations

-   **Risk:** Token Timeouts on cleanup.
    -   *Mitigation:* If table is huge, delete in chunks (e.g., `LIMIT 1000`). For now, a simple delete is acceptable for MVP.
-   **Risk:** accidental public access.
    -   *Mitigation:* Strict `CRON_SECRET` validation.
-   **Risk:** Timezone confusion.
    -   *Mitigation:* Use UTC for all DB comparisons.

---

## 5. Agent Assignments
-   **Backend Specialist**: Implementation of API routes and DB queries.
-   **DevOps**: Vercel configuration.
