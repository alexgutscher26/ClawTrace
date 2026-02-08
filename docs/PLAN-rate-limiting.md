# ⚡ PLAN: API Rate Limiting (Supabase-based)

This plan outlines the implementation of a consolidated rate-limiting layer using the existing Supabase infrastructure to protect the OpenClaw Fleet API from DDoS and misconfigured agents.

---

## 📋 Overview
- **Domain**: Security / Backend
- **Project Type**: WEB (Next.js + Supabase)
- **Goal**: Implement a centralized rate-limiting engine within the API route that differentiates between Free and Pro tiers.

## 🎯 Success Criteria
- [x] API rejects requests exceeding thresholds with `429 Too Many Requests`.
- [x] Rate limit state is persisted in Supabase.
- [x] Pro tier users have significantly higher/different limits than Free users.
- [x] Error messages are returned in a JSON format compatible with PowerShell/Python agents.
- [x] No significant performance regression on legitimate requests.

## 🛠️ Tech Stack
- **Next.js App Router** (Catch-all API route)
- **Supabase** (As the state persistence layer)
- **PostgreSQL JSONB** (For efficient bucket/window storage)

## 📂 Proposed Changes / Structure
- `supabase/migrations/[timestamp]_add_rate_limits_table.sql`: New table for tracking request buckets.
- `app/api/[[...path]]/route.js`: Update to include the `checkRateLimit` logic before processing requests.

---

## 📝 Task Breakdown

### Phase 1: Database Foundation (P0)
| Task ID | Name | Agent | Skills | Dependencies |
|---------|------|-------|--------|--------------|
| T1 | Create `rate_limits` table | `database-architect` | `database-design` | [x] COMPLETE |
| **INPUT** | Requirements: Column for `identifier` (IP/Token), `bucket` (JSONB), `last_reset` (TIMESTAMPTZ). |
| **OUTPUT** | SQL Migration file created and applied. |
| **VERIFY** | Run `run_sql` to check if `rate_limits` table exists and has correct columns. |

### Phase 2: Logic Implementation (P1)
| Task ID | Name | Agent | Skills | Dependencies |
|---------|------|-------|--------|--------------|
| T2 | Implement Rate Limit Logic | `backend-specialist` | `clean-code` | [x] COMPLETE |
| **INPUT** | `app/api/[[...path]]/route.js` and tier info from profiles. |
| **OUTPUT** | `checkRateLimit` function added to API route. |
| **VERIFY** | Logic check: Ensure it handles tier-based constants correctly. |

| Task ID | Name | Agent | Skills | Dependencies |
|---------|------|-------|--------|--------------|
| T3 | Integrate into API Lifecycle | `backend-specialist` | `clean-code` | [x] COMPLETE |
| **INPUT** | API routes in `route.js` (GET/POST). |
| **OUTPUT** | All relevant path handlers invoke `checkRateLimit`. |
| **VERIFY** | Manual curl test against `/api/health` multiple times to trigger limit. |

### Phase 3: Polish & Error Handling (P2)
| Task ID | Name | Agent | Skills | Dependencies |
|---------|------|-------|--------|--------------|
| T4 | Standardize Error JSON | `backend-specialist` | `api-patterns` | [x] COMPLETE |
| **INPUT** | PowerShell/Python client expectations. |
| **OUTPUT** | `{ "error": "Too many requests", "retry_after": X }` response format. |
| **VERIFY** | Run PS script and verify it prints the "FAIL" message correctly when 429 occurs. |

---

## ✅ PHASE X: FINAL VERIFICATION
- [x] **Security**: Verify IP-based limiting for unauthenticated paths (`/handshake`).
- [x] **Tiering**: Verify Pro user can send 10x more heartbeats than Free user.
- [x] **Performance**: Measure handshake latency with rate-limit check (Target: <100ms overhead).
- [x] **UI**: Verify `todo.md` is updated to mark Rate Limiting as complete.

---
*Created by project-planner agent*
