# PLAN: End-to-End Encryption (E2EE) & Handshake Hardening

This plan outlines the roadmap to transition OpenClaw Fleet from server-side encryption to a true zero-knowledge architecture.

## 1. ANALYSIS: Current Security Posture

- **Encryption at Rest**: Server uses `INTERNAL_ENCRYPTION_KEY` to encrypt/decrypt `config_json` and `agent_secret`.
- **Handshake**: Agent sends `agent_secret` in the POST body. Secure over HTTPS, but server "knows" the secret.
- **Dashboard**: Receives decrypted data from the server.

---

## 2. PHASE 1: Handshake Hardening (HMAC-SHA256)

**Goal**: The `agent_secret` should never leave the agent.

- [ ] **Agent Side**:
  - Generate a timestamp or nonce.
  - Create a signature: `HMAC_SHA256(agent_id + timestamp, agent_secret)`.
  - Send `{ agent_id, timestamp, signature }` to `/api/agents/handshake`.
- [ ] **Server Side**:
  - Fetch the encrypted `agent_secret` from DB.
  - Decrypt it internally (server still needs to know it for verification).
  - Compute the same HMAC and compare signatures.
  - Implement a timestamp window (e.g., +/- 1 minute) to prevent replay attacks.

---

## 3. PHASE 2: Zero-Knowledge Dashboard (Browser Crypto)

**Goal**: The server should be unable to read `config_json` (Provider Keys, Env Vars).

- [ ] **Client-Side Utilities (`lib/client-crypto.js`)**:
  - Use Web Crypto API (`SubtleCrypto`).
  - Implement PBKDF2 for key derivation from a user-provided passphrase.
  - Implement AES-GCM for encrypting/decrypting the JSON config.
- [ ] **Dashboard Integration**:
  - On first load/login: Prompt user for their "Encryption Master Key".
  - Store key only in `sessionStorage` (volatice memory).
  - Before saving agent config: Encrypt in-browser.
  - After fetching agent config: Decrypt in-browser.
- [ ] **Server Update**:
  - API routes should stop attempting to decrypt `config_json` if it's marked as E2EE.

---

## 4. PHASE 3: Agent-Side E2EE Data access

**Goal**: The agent needs to decrypt the config without the server's help.

- [ ] **Key Derivation**: Derive the decryption key from the `AGENT_SECRET` or a separate `ENCRYPTION_SECRET`.
- [ ] **Handshake Update**: Handshake returns the encrypted blob as-is; the agent decrypts it locally.

---

## 5. VERIFICATION & TESTING

- [ ] **Man-in-the-Middle (MITM) Sim**: Verify no secrets appear in network traces.
- [ ] **DB Audit**: Confirm `config_json` is double-encrypted (Browser AES + Server AES) or shifted entirely to Browser AES.
- [ ] **Recovery Logic**: Document that losing the Master Key means total data loss for configs.

---

## NEXT STEPS

1. Implement `HMAC` handshake in `app/api/[[...path]]/route.js`.
2. Update the Python monitor script to support signed handshakes.
3. Create the `DashboardKey` prompt in `app/page.js`.
