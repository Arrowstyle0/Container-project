# SecureVault — Phase 2 & Phase 3 Implementation Plan

Phase 1 is complete. This plan covers all Phase 2 (Advanced Privacy) and Phase 3 (Management & UX) features.

---

## Phase 2: Advanced Privacy

### 2.1 Emergency Recovery Kit — BIP-39 Mnemonic

> **Goal:** Replace the hex recovery key with a human-readable 24-word seed phrase (BIP-39 standard).

#### [MODIFY] [User.js](file:///d:/Container/Container%20Project/SecureFileVault/backend/models/User.js)
- Add `encryptedRecoveryMnemonic: String` — stores the mnemonic encrypted with a hash of the master passphrase (so only the user can decrypt it)
- Keep `hashedRecoveryKey` for backward compat, now storing bcrypt hash of the mnemonic-derived key

#### [NEW] [mnemonic.ts](file:///d:/Container/Container%20Project/SecureFileVault/frontend/src/app/services/mnemonic.ts)
- Pure client-side BIP-39 implementation (2048 English wordlist embedded)
- `generateMnemonic()` → returns 24 words using `crypto.getRandomValues(32)` for 256 bits of entropy
- `mnemonicToSeed(words)` → derives a 32-byte key from the mnemonic via PBKDF2
- No npm dependency needed — we'll embed the BIP-39 wordlist (~16KB)

#### [MODIFY] [auth.ts](file:///d:/Container/Container%20Project/SecureFileVault/frontend/src/app/auth/auth.ts) + [auth.html](file:///d:/Container/Container%20Project/SecureFileVault/frontend/src/app/auth/auth.html)
- On signup: generate 24-word mnemonic, show in a grid, require user to confirm
- Replace the old hex `recoveryKey` display with a styled word grid

#### [MODIFY] [auth.js](file:///d:/Container/Container%20Project/SecureFileVault/backend/routes/auth.js)
- `/signup`: accept mnemonic-derived hash instead of raw hex recovery key
- `/recover`: new endpoint that accepts a 24-word mnemonic, verifies it, and allows password reset

---

### 2.2 Duress Passphrase — Dummy Vault

> **Goal:** A second passphrase that opens a fake vault with decoy files, protecting real data under coercion.

#### [MODIFY] [User.js](file:///d:/Container/Container%20Project/SecureFileVault/backend/models/User.js)
- Add `duressAuthHash: String` — queryable hash of the duress passphrase
- Add `hashedDuressAuthToken: String` — bcrypt of the duress auth token

#### [NEW] [DuressFile.js](file:///d:/Container/Container%20Project/SecureFileVault/backend/models/DuressFile.js)
- Separate collection `duressfiles` — stores decoy file metadata
- Same schema as `File` but associated with the duress passphrase

#### [MODIFY] [auth.js](file:///d:/Container/Container%20Project/SecureFileVault/backend/routes/auth.js)
- Login flow: check duress hash first — if matched, issue a JWT with `{ isDuress: true }` claim
- Token contains the vault type so the file routes know which collection to query

#### [MODIFY] [files.js](file:///d:/Container/Container%20Project/SecureFileVault/backend/routes/files.js)
- All file routes check `req.user.isDuress` — if true, query `DuressFile` collection instead of `File`
- Delete restrictions are relaxed in duress mode (since it's a decoy vault)

#### [MODIFY] [settings.html](file:///d:/Container/Container%20Project/SecureFileVault/frontend/src/app/vault/settings/settings.html) + [settings.ts](file:///d:/Container/Container%20Project/SecureFileVault/frontend/src/app/vault/settings/settings.ts)
- New card in Settings: "Duress Passphrase" — set/update a secondary passphrase
- Warning: "This passphrase opens a decoy vault to protect your real data under coercion"

#### [MODIFY] [crypto.ts](file:///d:/Container/Container%20Project/SecureFileVault/frontend/src/app/services/crypto.ts)
- `deriveKeys()` stays the same — the duress passphrase just produces a different key naturally (different input → different Argon2 output)

---

### 2.3 Encrypted Search Indexing — Blind Index

> **Goal:** Search filenames without the server knowing them. Uses HMAC-SHA256 blind indexing.

#### [MODIFY] [File.js](file:///d:/Container/Container%20Project/SecureFileVault/backend/models/File.js)
- Add `blindIndex: String` — HMAC-SHA256 of the lowercase filename, indexed in MongoDB

#### [MODIFY] [crypto.ts](file:///d:/Container/Container%20Project/SecureFileVault/frontend/src/app/services/crypto.ts)
- `generateBlindIndex(filename, key)` — derives an HMAC-SHA256 of the filename using the user's encryption key
- Sent as `X-Blind-Index` header during upload

#### [MODIFY] [files.js](file:///d:/Container/Container%20Project/SecureFileVault/backend/routes/files.js)
- Upload route: store `blindIndex` from header
- New `GET /files/search?q=<blindIndex>` — returns files matching the blind index

#### [MODIFY] [files.ts](file:///d:/Container/Container%20Project/SecureFileVault/frontend/src/app/vault/files/files.ts)
- Search bar computes blind index client-side, sends to server
- Server returns matching files without knowing the actual filename

#### [MODIFY] [layout.html](file:///d:/Container/Container%20Project/SecureFileVault/frontend/src/app/layout/layout.html)
- Connect the existing search bar to the blind index search

---

### 2.4 Dead Man's Switch — Data Inheritance

> **Goal:** If the user doesn't check in within N days, notify beneficiaries and optionally grant access.

#### [MODIFY] [User.js](file:///d:/Container/Container%20Project/SecureFileVault/backend/models/User.js)
- Add fields:
  - `deadManSwitch.enabled: Boolean`
  - `deadManSwitch.intervalDays: Number` (e.g., 30, 60, 90)
  - `deadManSwitch.lastCheckIn: Date`
  - `deadManSwitch.beneficiaries: [{ email, name, encryptedKey }]`

#### [MODIFY] [auth.js](file:///d:/Container/Container%20Project/SecureFileVault/backend/routes/auth.js)
- New endpoints:
  - `POST /dead-man/configure` — set interval + beneficiaries
  - `POST /dead-man/check-in` — reset the timer (called on every login or manually)

#### [MODIFY] [server.js](file:///d:/Container/Container%20Project/SecureFileVault/backend/server.js)
- New daily cron job: check all users where `deadManSwitch.enabled && lastCheckIn < now - intervalDays`
- Send email to beneficiaries with encrypted access package

#### [NEW] [dead-man.html](file:///d:/Container/Container%20Project/SecureFileVault/frontend/src/app/vault/dead-man/) + Component
- New vault sub-route: `/vault/dead-man`
- UI: Toggle switch, interval selector, beneficiary list with email inputs
- "Check In Now" button

---

## Phase 3: Management & UX

### 3.1 Chunked File Streaming — Media Playback

> **Goal:** Stream encrypted video/audio directly in the browser without downloading the full file.

#### [MODIFY] [files.js](file:///d:/Container/Container%20Project/SecureFileVault/backend/routes/files.js)
- New `GET /files/:id/stream?chunk=N` — returns a specific encrypted chunk from B2 using range requests

#### [MODIFY] [crypto.ts](file:///d:/Container/Container%20Project/SecureFileVault/frontend/src/app/services/crypto.ts)
- `decryptChunk(chunkData, iv, chunkIndex, key)` — decrypt a single chunk

#### [MODIFY] [files.ts](file:///d:/Container/Container%20Project/SecureFileVault/frontend/src/app/vault/files/files.ts) + [files.html](file:///d:/Container/Container%20Project/SecureFileVault/frontend/src/app/vault/files/files.html)
- Detect media files (video/audio) by extension
- "Play" button that opens a modal with a `<video>` or `<audio>` element
- Uses `MediaSource` API to feed decrypted chunks progressively

---

### 3.2 Secure Fragment Sharing

> **Already partially implemented.** The share function puts the key in the URL fragment (`#`).

#### [NEW] [share/](file:///d:/Container/Container%20Project/SecureFileVault/frontend/src/app/share/) Component
- New route: `/share/:fileId`
- Reads the key from `location.hash` (never sent to server)
- Fetches the encrypted file, decrypts with the fragment key, triggers download
- No login required — the share link IS the authorization

#### [MODIFY] [files.js](file:///d:/Container/Container%20Project/SecureFileVault/backend/routes/files.js)
- New `GET /files/:id/shared` — returns encrypted file without requiring JWT auth (file ID is unguessable)

#### [MODIFY] [app.routes.ts](file:///d:/Container/Container%20Project/SecureFileVault/frontend/src/app/app.routes.ts)
- Add route: `{ path: 'share/:id', component: SharePage }`

---

### 3.3 Automated Expiration — Self-Destructing Links

> **Partially done** — cron job exists for file expiration. Need to add per-share expiration.

#### [MODIFY] [File.js](file:///d:/Container/Container%20Project/SecureFileVault/backend/models/File.js)
- Add `shareLinks: [{ token, expiresAt, maxDownloads, downloadCount }]`

#### [MODIFY] [files.ts](file:///d:/Container/Container%20Project/SecureFileVault/frontend/src/app/vault/files/files.ts)
- Share modal: let user set expiration (1h, 24h, 7d) and max download count
- Generate a unique share token

#### [MODIFY] [files.js](file:///d:/Container/Container%20Project/SecureFileVault/backend/routes/files.js)
- `POST /files/:id/share` — create a share link with expiration + max downloads
- `GET /files/shared/:token` — serve the file if the link is still valid, increment counter

---

### 3.4 Web Worker Crypto — Background Encryption

> **Goal:** Move AES-256-GCM encryption/decryption to a Web Worker so the UI stays at 60fps.

#### [NEW] [crypto.worker.ts](file:///d:/Container/Container%20Project/SecureFileVault/frontend/src/app/workers/crypto.worker.ts)
- Receives messages: `{ action: 'encrypt' | 'decrypt', chunkBuffer, iv, rawKey }`
- Uses `self.crypto.subtle` inside the worker
- Returns encrypted/decrypted buffer via `postMessage`

#### [MODIFY] [crypto.ts](file:///d:/Container/Container%20Project/SecureFileVault/frontend/src/app/services/crypto.ts)
- `encryptFile()` and `decryptFile()` spawn a worker pool
- Export the raw key bytes, send to worker, import inside worker
- Fall back to main-thread if Web Workers aren't available

---

## User Review Required

> [!IMPORTANT]
> **Scope & Priority:** This is a large feature set. I recommend implementing in order: **2.1 → 2.2 → 2.3 → 3.4 → 3.2 → 3.3 → 3.1 → 2.4** (easiest/highest-value first, Dead Man's Switch and Streaming last since they're the most complex).

> [!WARNING]
> **BIP-39 Wordlist:** I'll embed a 2048-word English wordlist directly in the frontend (~16KB). No external npm dependency needed.

> [!WARNING]
> **Duress Vault:** The duress passphrase inherently produces different Argon2 keys. The server distinguishes them by checking the duress auth hash *before* the real auth hash. The duress vault looks identical to the real one from the UI.

## Open Questions

1. **Dead Man's Switch email content:** Should beneficiaries receive the raw decryption key, or an encrypted package they unlock with a pre-shared secret?
2. **Streaming format:** Should we support only common formats (MP4/MP3/WebM) or attempt to play any format?
3. **Share link auth:** Should shared files be truly public (anyone with the link), or require email verification?

## Verification Plan

### Automated Tests
- `ng build` — verify zero compilation errors
- Backend: manual API testing via the browser for each new endpoint
- Encryption/decryption round-trip test for Web Worker path

### Manual Verification
- Signup flow: verify 24-word mnemonic display and recovery
- Login with duress passphrase: verify it opens a separate vault
- Search: type a filename, verify blind index returns correct results
- Stream: upload an MP4, verify playback without full download
- Share: generate link, open in incognito, verify download works
- Expiration: set 1-minute expiry, verify link dies
