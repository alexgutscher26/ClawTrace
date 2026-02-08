# PLAN: Data Encryption at Rest

This plan outlines the implementation of AES-256-GCM encryption for sensitive agent data stored in Supabase/PostgreSQL.

## 1. ANALYSIS & ARCHITECTURE

### Sensitive Fields Targeted:
- `agents.config_json`: Contains sensitive provider keys and environment variables.
- `agents.agent_secret`: The shared secret used for agent authentication.

### Technical Stack:
- **Algorithm**: `aes-256-gcm` (Authenticated Encryption with Associated Data).
- **Key Storage**: `INTERNAL_ENCRYPTION_KEY` environment variable (32-byte hex string).
- **Format**: Encrypted data will be stored as a JSON string in the format: `{ "iv": "hex", "authTag": "hex", "content": "encrypted_hex" }`.

---

## 2. PHASE 1: CRYPTO UTILITIES
- [ ] Create `lib/encryption.js` utility.
- [ ] Implement `encrypt(text)` and `decrypt(data)` functions using Node.js `crypto` module.
- [ ] Add rigorous error handling for decryption failures (e.g., wrong key).
- [ ] Implement a "Double-Check" verification (encrypt + decrypt test during initialization).

---

## 3. PHASE 2: DATABASE MIGRATIONS
- [ ] Create a Supabase migration to backup the `agents` table.
- [ ] Implement a temporary Node.js script to:
    - [ ] Fetch all agents.
    - [ ] Encrypt their existing `config_json` and `agent_secret`.
    - [ ] Update rows in the database.
- [ ] Note: Field types in Supabase remain `jsonb` and `text`, but content will now follow the encryption schema.

---

## 4. PHASE 3: API & BACKEND INTEGRATION
- [ ] Update `POST /api/agents` to encrypt `config_json` and `agent_secret` before insertion.
- [ ] Update `GET /api/agents` and `GET /api/agents/[id]` to decrypt fields before returning to the frontend.
- [ ] Update `POST /api/agents/handshake` to decrypt `agent_secret` for validation.
- [ ] Update `/api/install-agent-*` routes to ensure scripts are generated using decrypted secrets.

---

## 5. PHASE 4: UI COMPATIBILITY
- [ ] Ensure `AgentDetailView` properly handles decrypted JSON for the config editor.
- [ ] Test the "Save Config" functionality to verify re-encryption works seamlessly.

---

## 6. VERIFICATION CHECKLIST
- [ ] **Handshake Test**: Can an existing agent still handshake after encryption?
- [ ] **Config Editor Test**: Can I edit and save JSON config without seeing hexadecimal gibberish?
- [ ] **Security Audit**: Query the DB directly via Supabase SQL Editor—ensure `agent_secret` is no longer readable as plaintext.
- [ ] **Zero Downtime**: Verify migration script doesn't lock the table for extended periods.

---

## NEXT STEPS
1. Review the key management strategy.
2. Run `/create` to implement `lib/encryption.js`.
