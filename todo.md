# ⚡ OpenClaw Fleet Orchestrator - Universal Roadmap

This document serves as the master source of truth for the development, stabilization, and scaling of the OpenClaw Fleet platform.

---

## � P0: CRITICAL STABILITY & SECURITY (Now)

_Tasks required to move from 'Alpha/Demo' to a 'Production-Ready' state._

### 🔐 Security & Authentication

- [x] **Agent Secret Handshake**: Replace simple UUID checks with signed JWTs or long-lived `AGENT_SECRET` keys for all heartbeat communication.
- [x] **Rate Limiting**: Implement Global and Route-level rate limiting on the API to prevent DDoS from misconfigured agents.
- [x] **Data Encryption at Rest**: Ensure all sensitive agent configuration (keys, env vars) in MongoDB/Supabase are encrypted using AES-256.
- [x] **Team Scoping**: Fix potential IDOR (Insecure Direct Object Reference) vulnerabilities; ensure a user can _never_ query or restart an agent they don't own by brute-forcing IDs.

### 🛠️ Infrastructure & Backend

- [x] **Automated Cron Jobs**:
  - [x] Set up `/api/cron/check-stale` on a 5-minute trigger.
  - [x] Implement a nightly cleanup cron to purge heartbeat data older than 30 days.
- [x] **Database Optimization**:
  - [x] Create compound indexes: `{ user_id: 1, fleet_id: 1, status: 1 }` (Implemented via SQL migration `20260209_001_optimize_performance.sql`).
  - [x] Implement database connection pooling (Supabase/Prisma) to handle 1000+ concurrent agent heartbeats. (Optimized Supabase connection usage via atomic `check_rate_limit` RPC to reduce round-trips/overhead).
- [x] **Next.js Route Migration**:
  - [x] Move from `useHashRouter` (current implementation in `app/page.js`) to real **Next.js App Router pages**.
  - [x] Benefit: Better SEO, faster initial loads, and cleaner URL structures (e.g., `/dashboard/agents/[id]`).

---

## 🟢 P1: UX & CORE IMPROVEMENTS (Next)

_Refining the experience for developers and fleet managers._

### 🎨 Frontend Polish

- [x] **UI/UX Redesign**: Redesigned Landing and Dashboard using `ui-ux-pro-max` workflow (Glassmorphism, Plus Jakarta Sans).
- [x] **Design System Consistency**:
  - [x] Migrate all ad-hoc styles in `page.js` to reusable Shadcn/UI components (Implemented Global Grid Brutalist Theme).
  - [x] Implement a consistent "Grid Brutalism" theme across the dashboard.
- [x] **Supabase Realtime v2**:
  - [x] Eliminate the "Refresh" button. Use `supabase.channel()` to subscribe to agent status changes globally.
  - [x] Add a "Live" badge that pulses when a heartbeat is received.
- [x] **Accessibility (A11y)**:
  - [x] Perform a full ARIA audit. Ensure screen readers can navigate the complex agent tables.
  - [x] Implement full keyboard navigation (e.g., `Cmd+K` for global agent search).

### ⌨️ CLI / Monitor Improvements

- [x] **OpenClaw CLI v2.0**:
  - [x] **Auto-Discovery**: CLI should optionally scan local network for OpenClaw gateways to simplify pairing.
  - [x] **Plugin System**: Allow users to write custom Python/JS scripts to monitor specific app metrics (e.g., "Queue Length" or "Database Connections").
  - [x] **Service Mode**: Add `openclaw install-service` to automatically set up systemd (Linux) or Launchctl (macOS) persistence.
- [x] **Metric Accuracy**:
  - [x] Move from "Simulated Latency" to real ICP/Round-trip pings to the agent's actual gateway URL.
  - [x] Capture "Memory Pressure" and "Disk I/O" metrics.

---

## � P2: ADVANCED FEATURES (Roadmap)

_Adding the "SaaS" value-add that justifies the Pro/Enterprise tiers._

### 🛡️ Enterprise Management

- [x] **Policy Profiles (Dev, Ops, Exec)**: Pre-built roles to control skills and tools.
- [x] **Policy Enforcement Engine**:
  - [x] Create a UI to define "Guardrails" (e.g., "Agent X cannot use tools that cost > $1.00").
  - [x] Real-time policy syncing: Agent heartbeats should receive a "Policy Update" in the response body.

### 📊 Intelligence & Alerts

- [ ] **Multi-Channel Alerting**:
  - [ ] Webhook support for Slack/Discord/PagerDuty.
  - [ ] "Alert Fatigue" prevention: Implement "Squelch" rules (e.g., "Don't alert me more than once per hour for this agent").
- [ ] **Cost Analytics**:
  - [ ] Deep-dive into token usage per model (GPT-4 vs Clause).
  - [ ] "Savings Recommendations" (e.g., "This agent could run on Llama-3 for 90% less cost").

### � Self-Hosting & Deployment

- [x] **Dockerized Fleet**: Provide a `docker-compose.yml` for users who want to host the entire Fleet Dashboard in private air-gapped VPCs.
- [x] **Deployment Templates**:
  - [x] One-click DigitalOcean Droplet creation for new agents.
  - [x] Terraform/OpenTofu provider for managing fleets via IaC.

---

## 🔵 P3: FUTURE EXPLORATION (Long-term)

_Visionary ideas for 2026 and beyond._

- [ ] **OpenClaw Terminal**: A secure, browser-based shell that allows developers to `ssh` into an agent directly from the dashboard for debugging.
- [ ] **Predictive Scaling**: Automatically spin up more agent instances when wait-times/latency exceed 500ms across a fleet.
- [ ] **Model Switcher**: A "Kill Switch" to instantly rotate all agents to an emergency backup model (e.g., rotate from GPT-4 to Claude 3 if OpenAI has an outage).
- [ ] **Community Marketplace**: A repository of pre-configured agent "templates" (e.g., "SEO Agent", "Python Dev Agent") that can be provisioned in one click.

---

_Generated by Antigravity - Version 2.0_
