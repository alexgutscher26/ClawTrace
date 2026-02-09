# Plan: Agent Secret Handshake (JWT-based)

Transition heartbeat communication from simple UUID checks to a secure "Secret Handshake" using signed JWTs.

## Overview

- **Project Type**: BACKEND / CLI
- **Strategy**: Signed JWTs (Option B)
- **Security**: Agents authenticate with an `AGENT_SECRET` to receive a `SESSION_JWT`.
- **Breaking Change**: This will be required for all new heartbeats. Existing agents without secrets will need migration or re-creation (per user "no backfilling" instruction).

## Success Criteria

- [x] New agents are created with a secure, auto-generated `agent_secret`.
- [x] `/api/agents/handshake` endpoint verifies secret and returns a JWT.
- [x] `/api/heartbeat` requires a valid JWT in the `Authorization` header.
- [x] CLI supports the handshake flow and stores the session token.
- [x] Generated install scripts (Bash, PowerShell, Python) perform the handshake automatically.

## Tech Stack

- **Auth**: `jose` (standard JWT library for Next.js/Edge) or Web Crypto API.
- **Database**: Supabase (PostgreSQL).
- **Runtime**: Next.js (App Router).

## File Structure Changes

- `app/api/[[...path]]/route.js`: Add handshake logic, update heartbeat verification, and installer templates.
- `cli/index.js`: Implement login/handshake logic and token persistence (in-memory or local config).

## Task Breakdown

### Phase 1: Database & Foundation (P0)

| Task ID | Name                      | Agent                | Skills                  | Priority | Dependencies |
| ------- | ------------------------- | -------------------- | ----------------------- | -------- | ------------ |
| T1      | Add `agent_secret` column | `backend-specialist` | `database-design`       | P0       | None         |
| T2      | Install `jose` dependency | `orchestrator`       | `nodejs-best-practices` | P0       | None         |

**T1 INPUT→OUTPUT→VERIFY**:

- [x] **Input**: SQL command to add column.
- [x] **Output**: `agents` table has `agent_secret` (text, nullable).
- [x] **Verify**: Run a schema check via Supabase or a test query.

### Phase 2: API Implementation (P1)

| Task ID | Name                         | Agent                | Skills         | Priority | Dependencies |
| ------- | ---------------------------- | -------------------- | -------------- | -------- | ------------ |
| T3      | Update Agent Creation        | `backend-specialist` | `api-patterns` | P1       | T1           |
| T4      | Implement Handshake Endpoint | `backend-specialist` | `api-patterns` | P1       | T2, T3       |
| T5      | Secure Heartbeat Endpoint    | `backend-specialist` | `api-patterns` | P1       | T4           |

**T4 INPUT→OUTPUT→VERIFY**:

- [x] **Input**: Logic for `POST /api/agents/handshake`.
- [x] **Output**: Returns signed JWT if credentials match.
- [x] **Verify**: `curl -X POST /api/agents/handshake -d '{"agent_id": "...", "agent_secret": "..."}'`.

### Phase 3: CLI & Scripts (P2)

| Task ID | Name                       | Agent                | Skills       | Priority | Dependencies |
| ------- | -------------------------- | -------------------- | ------------ | -------- | ------------ |
| T6      | Update CLI Heartbeat Logic | `backend-specialist` | `clean-code` | P2       | T5           |
| T7      | Update Installer Templates | `backend-specialist` | `clean-code` | P2       | T5           |

**T6 INPUT→OUTPUT→VERIFY**:

- [x] **Input**: Redesign `monitorCommand` in `cli/index.js`.
- [x] **Output**: CLI performs handshake before interval starts.
- [x] **Verify**: Run `openclaw monitor --agent-id=... --agent-secret=...`.

## Phase X: Verification

- [ ] Run `security_scan.py` to ensure secrets aren't exposed in logs.
- [ ] Verify JWT expiration (short-lived vs long-lived).
- [ ] Validate that heartbeat fails WITHOUT the token.
- [ ] Validate that heartbeat fails with an EXPIRED token.
- [ ] Confirm installer scripts correctly include the secret.
