# ⚡ OpenClaw Fleet Orchestrator - Universal Roadmap

This document serves as the master source of truth for the development, stabilization, and scaling of the OpenClaw Fleet platform. 

---

## � P0: CRITICAL STABILITY & SECURITY (Now)
*Tasks required to move from 'Alpha/Demo' to a 'Production-Ready' state.*

### 🔐 Security & Authentication
- [x] **Agent Secret Handshake**: Replace simple UUID checks with signed JWTs or long-lived `AGENT_SECRET` keys for all heartbeat communication.
- [ ] **Rate Limiting**: Implement Global and Route-level rate limiting on the API to prevent DDoS from misconfigured agents.
- [ ] **Data Encryption at Rest**: Ensure all sensitive agent configuration (keys, env vars) in MongoDB/Supabase are encrypted using AES-256.
- [ ] **Team Scoping**: Fix potential IDOR (Insecure Direct Object Reference) vulnerabilities; ensure a user can *never* query or restart an agent they don't own by brute-forcing IDs.

### 🛠️ Infrastructure & Backend
- [ ] **Automated Cron Jobs**:
    - [ ] Set up `/api/cron/check-stale` on a 5-minute trigger.
    - [ ] Implement a nightly cleanup cron to purge heartbeat data older than 30 days.
- [ ] **Database Optimization**:
    - [ ] Create compound indexes: `{ user_id: 1, fleet_id: 1, status: 1 }`.
    - [ ] Implement database connection pooling (Supabase/Prisma) to handle 1000+ concurrent agent heartbeats.
- [ ] **Next.js Route Migration**:
    - [ ] Move from `useHashRouter` (current implementation in `app/page.js`) to real **Next.js App Router pages**.
    - [ ] Benefit: Better SEO, faster initial loads, and cleaner URL structures (e.g., `/dashboard/agents/[id]`).

---

## 🟢 P1: UX & CORE IMPROVEMENTS (Next)
*Refining the experience for developers and fleet managers.*

### 🎨 Frontend Polish
- [ ] **Design System Consistency**:
    - [ ] Migrate all ad-hoc styles in `page.js` to reusable Shadcn/UI components.
    - [ ] Implement a consistent "Glassmorphism" theme across the dashboard.
- [ ] **Supabase Realtime v2**:
    - [ ] Eliminate the "Refresh" button. Use `supabase.channel()` to subscribe to agent status changes globally.
    - [ ] Add a "Live" badge that pulses when a heartbeat is received.
- [ ] **Advanced Visualization**:
    - [ ] Replace simple Recharts with Brush/Zoom capability for looking at 24h-7d history.
    - [ ] Add a "Fleet Heatmap" showing which regions (us-east, eu-west) are under the most load.
- [ ] **Accessibility (A11y)**:
    - [ ] Perform a full ARIA audit. Ensure screen readers can navigate the complex agent tables.
    - [ ] Implement full keyboard navigation (e.g., `Cmd+K` for global agent search).

### ⌨️ CLI / Monitor Improvements
- [ ] **OpenClaw CLI v2.0**:
    - [ ] **Auto-Discovery**: CLI should optionally scan local network for OpenClaw gateways to simplify pairing.
    - [ ] **Plugin System**: Allow users to write custom Python/JS scripts to monitor specific app metrics (e.g., "Queue Length" or "Database Connections").
    - [ ] **Service Mode**: Add `openclaw install-service` to automatically set up systemd (Linux) or Launchctl (macOS) persistence.
- [ ] **Metric Accuracy**:
    - [ ] Move from "Simulated Latency" to real ICP/Round-trip pings to the agent's actual gateway URL.
    - [ ] Capture "Memory Pressure" and "Disk I/O" metrics.

---

## � P2: ADVANCED FEATURES (Roadmap)
*Adding the "SaaS" value-add that justifies the Pro/Enterprise tiers.*

### 🛡️ Enterprise Management
- [ ] **Policy Enforcement Engine**:
    - [ ] Create a UI to define "Guardrails" (e.g., "Agent X cannot use tools that cost > $1.00").
    - [ ] Real-time policy syncing: Agent heartbeats should receive a "Policy Update" in the response body.
- [ ] **RBAC (Role Based Access Control)**:
    - [ ] **Owner**: Full control.
    - [ ] **Maintainer**: Can restart agents and change config.
    - [ ] **Viewer**: Read-only metrics used for stakeholders.
- [ ] **Audit Trail**: A searchable log of every manual action taken on an agent (who changed config, who triggered a restart).

### 📊 Intelligence & Alerts
- [ ] **Multi-Channel Alerting**:
    - [ ] Webhook support for Slack/Discord/PagerDuty.
    - [ ] "Alert Fatigue" prevention: Implement "Squelch" rules (e.g., "Don't alert me more than once per hour for this agent").
- [ ] **Cost Analytics**:
    - [ ] Deep-dive into token usage per model (GPT-4 vs Clause).
    - [ ] "Savings Recommendations" (e.g., "This agent could run on Llama-3 for 90% less cost").

### � Self-Hosting & Deployment
- [ ] **Dockerized Fleet**: Provide a `docker-compose.yml` for users who want to host the entire Fleet Dashboard in private air-gapped VPCs.
- [ ] **Deployment Templates**:
    - [ ] One-click DigitalOcean Droplet creation for new agents.
    - [ ] Terraform/OpenTofu provider for managing fleets via IaC.

---

## 🔵 P3: FUTURE EXPLORATION (Long-term)
*Visionary ideas for 2026 and beyond.*

- [ ] **OpenClaw Terminal**: A secure, browser-based shell that allows developers to `ssh` into an agent directly from the dashboard for debugging.
- [ ] **Predictive Scaling**: Automatically spin up more agent instances when wait-times/latency exceed 500ms across a fleet.
- [ ] **Model Switcher**: A "Kill Switch" to instantly rotate all agents to an emergency backup model (e.g., rotate from GPT-4 to Claude 3 if OpenAI has an outage).
- [ ] **Community Marketplace**: A repository of pre-configured agent "templates" (e.g., "SEO Agent", "Python Dev Agent") that can be provisioned in one click.

---

## 🧹 TECHNICAL DEBT / MAINTENANCE
- [ ] **Refactor Monolith**: Split `app/api/[[...path]]/route.js` into distinct files for `/fleets`, `/agents`, `/alerts`, and `/billing`.
- [ ] **Typings**: Convert the project to **TypeScript** to prevent the "undefined" errors seen in early bug logs.
- [ ] **E2E Testing**: Add Playwright tests to simulate a user registering, adding an agent, and observing a simulated failure/alert cycle.
- [ ] **Dependency Update**: Audit and update 60+ dependencies listed in `package.json`.

---
*Generated by Antigravity - Version 2.0*
