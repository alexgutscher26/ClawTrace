# Implement Policy Profiles (Dev, Ops, Exec)

## Goal
Implement the "Policy Profiles" feature as described in the mission briefing: "Pre-built roles (Dev, Ops, Exec) to control agent skills, tools, and data access." This involves database schema changes, API updates, and a new UI section in the agent details.

## Tasks

### 1. Database Schema
- [ ] **Create Migration**: Add `policy_profile` column to `public.agents` table in Supabase. → Verify: Run `SELECT policy_profile FROM agents` in Supabase SQL editor.
    ```sql
    ALTER TABLE public.agents ADD COLUMN IF NOT EXISTS policy_profile TEXT DEFAULT 'dev' CHECK (policy_profile IN ('dev', 'ops', 'exec'));
    ```

### 2. Backend Logic & API
- [ ] **Define Policy Constants**: Create `lib/policies.js` to define the capabilities for each profile. → Verify: File exists and is exportable.
- [ ] **Update Handshake**: Modify `app/api/[[...path]]/route.js` to include `policy_profile` in the handshake response. → Verify: `curl` handshake returns `policy_profile`.
- [ ] **Update Heartbeat**: Ensure the heartbeat response can optionally override or confirm the current policy. → Verify: `curl` heartbeat reflects policy status.

### 3. Frontend UI
- [ ] **Display Profile in Table**: Add a column/badge in the `DashboardView` agent table showing the policy profile. → Verify: Badge is visible on dashboard.
- [ ] **Policy Management UI**: Add a new section or tab in `AgentDetailView` to switch the agent's policy profile. → Verify: Switching profile triggered a successful `PUT` request.
- [ ] **Profile Visual Identity**: Assign distinct icons/colors for Dev (Blue/White), Ops (Emerald/Green), and Exec (Gold/Amber). → Verify: UI looks premium and follows the theme.

### 4. Verification & Audit
- [ ] **Test Handshake with Policy**: Ensure a new agent receives the correct default policy.
- [ ] **Run UX Audit**: Verify the new UI doesn't clutter the `AgentDetailView`.

## Done When
- [ ] Every agent has a `policy_profile`.
- [ ] The policy profile is visible in the Dashboard and editable in the Agent Details.
- [ ] The agent handshake API returns the policy configuration.

## Notes
- Policy profiles are currently "Pre-built". Custom policy definitions (the "Policy Enforcement Engine") is a P2 feature in `todo.md`.
- We use HSL tailored colors for the badges to ensure a premium feel.
