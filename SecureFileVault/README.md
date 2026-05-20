# SecureVault

**Zero-Knowledge, End-to-End Encrypted File Storage**

SecureVault is a secure file storage platform where files are encrypted in the browser before upload. The server never sees your plaintext data. Built with Angular 21, Node.js/Express, MongoDB, and Backblaze B2 cloud storage.

---

## Table of Contents

- [Features](#features)
- [Architecture](#architecture)
- [Security Model](#security-model)
- [Tech Stack](#tech-stack)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [API Reference](#api-reference)
- [Project Structure](#project-structure)
- [Docker Deployment](#docker-deployment)

---

## Features

### Zero-Knowledge Encryption
- All files are encrypted **client-side** with **AES-256-GCM** before they ever leave the browser.
- The server only stores ciphertext blobs — it cannot read your files.
- Encryption keys are derived from your master passphrase using **Argon2id** (memory-hard KDF), making brute-force attacks impractical.

### Parent Device System
- Users can designate up to **2 devices as Parent Devices**.
- Parent devices have elevated privileges:
  - **Delete files** — Only parent devices can delete files from the vault.
  - **Bypass lockouts** — If the account is locked, only parent devices can log in.
  - **Unlock accounts** — A successful parent device login resets the lockout.
- Non-parent devices can upload, download, and share files but **cannot delete** them.

### Anonymous Device Rate Limiting & Permanent Lockout
- After **5 failed login attempts** from non-parent (anonymous) devices, the account is **permanently locked**.
- Locked accounts can **only be accessed from a parent device**.
- Parent device login resets the lockout and failed attempt counter.
- IP-based rate limiting is also active (20 requests per 15 minutes via `express-rate-limit`).

### Two-Factor Authentication (2FA)
- TOTP-based 2FA using Google Authenticator, Authy, or any TOTP app.
- QR code generation for easy setup.
- 2FA is enforced on every login once enabled.

### File Management
- **Drag-and-drop upload** with real-time progress tracking.
- **Chunked encryption** — large files (up to 2GB) are split into 5MB chunks, each encrypted with a unique IV.
- **Secure sharing** — generate a share link that includes the decryption key in the URL fragment (never sent to the server).
- **File expiration** — files auto-expire after 30 days (configurable). Expired files are soft-deleted, then hard-deleted after another 30 days.
- **Email notifications** — expiration notices sent via SendGrid/Nodemailer.

### Dark / Light Theme
- Full dark and light mode support across all pages.
- Theme persists in `localStorage`.
- Toggle available on the landing page, auth page, and sidebar.

### Responsive Design
- Fully responsive across desktop, tablet, and mobile.
- Sidebar collapses to a hamburger menu on screens under 900px.
- All grids, cards, and modals adapt to small viewports.

---

## Architecture

```
┌──────────────────┐        ┌──────────────────┐        ┌──────────────────┐
│                  │        │                  │        │                  │
│   Angular 21     │───────▶│   Express API    │───────▶│   MongoDB        │
│   (Browser)      │  HTTPS │   (Node.js)      │        │   (Atlas/Local)  │
│                  │        │                  │        │                  │
│  ┌────────────┐  │        │  ┌────────────┐  │        └──────────────────┘
│  │ Argon2id   │  │        │  │ bcrypt     │  │
│  │ AES-256    │  │        │  │ JWT        │  │        ┌──────────────────┐
│  │ WebCrypto  │  │        │  │ Rate Limit │  │───────▶│   Backblaze B2   │
│  └────────────┘  │        │  └────────────┘  │        │   (File Storage) │
│                  │        │                  │        │                  │
└──────────────────┘        └──────────────────┘        └──────────────────┘
```

**Key Principle:** The server is "blind" — it stores encrypted blobs and metadata but never has access to plaintext files or the master encryption key.

---

## Security Model

| Layer | Technology | Purpose |
|---|---|---|
| Key Derivation | **Argon2id** (16MB RAM, 2 iterations) | Derives auth token + encryption key from master passphrase |
| File Encryption | **AES-256-GCM** (WebCrypto API) | Client-side file encryption with per-chunk IVs |
| Auth Token | **SHA-256 → bcrypt** | Queryable hash for login, bcrypt for verification |
| Session | **JWT** (15min) + **Refresh Tokens** (7 days, HttpOnly cookie) | Stateless auth with secure rotation |
| 2FA | **TOTP** (otplib) | Time-based one-time passwords |
| Rate Limiting | **express-rate-limit** | 20 login attempts per 15 min per IP |
| Device Lockout | **Permanent lockout** after 5 failed attempts | Only parent devices can unlock |
| File Deletion | **Parent-device-only** | Non-parent devices cannot delete any files |

### Encryption Flow

1. User enters master passphrase
2. **Argon2id** derives two keys:
   - `authToken` — sent to server for authentication (server stores bcrypt hash)
   - `encKey` — AES-256 CryptoKey, **stays in browser memory only**
3. On file upload:
   - File is split into 5MB chunks
   - Each chunk is encrypted with AES-256-GCM using a unique IV
   - Ciphertext blob is uploaded to Backblaze B2
4. On file download:
   - Ciphertext is fetched from B2
   - Decrypted chunk-by-chunk in the browser using the same key

---

## Tech Stack

### Frontend
| Technology | Version | Purpose |
|---|---|---|
| Angular | 21 | SPA framework |
| Angular Material | 21 | UI components (slide toggles, theming) |
| Argon2-browser | 1.18 | Client-side key derivation |
| WebCrypto API | Native | AES-256-GCM encryption/decryption |
| Poppins | Google Fonts | Typography |

### Backend
| Technology | Version | Purpose |
|---|---|---|
| Node.js / Express | 5.x | REST API server |
| MongoDB / Mongoose | 9.x | User accounts, file metadata, device registry |
| Backblaze B2 | 1.7 | Encrypted file blob storage |
| bcrypt | 6.x | Password hashing |
| jsonwebtoken | 9.x | JWT access/refresh tokens |
| otplib / qrcode | 13.x / 1.5 | TOTP 2FA generation & QR codes |
| express-rate-limit | 8.x | IP-based rate limiting |
| node-cron | 4.x | Scheduled file expiration |
| SendGrid / Nodemailer | — | Email notifications |

---

## Getting Started

### Prerequisites
- Node.js 18+
- MongoDB (local or Atlas)
- Backblaze B2 account (with a bucket and application key)

### 1. Clone the repository
```bash
git clone <repo-url>
cd SecureFileVault
```

### 2. Backend Setup
```bash
cd backend
npm install
```

Create a `.env` file (see [Environment Variables](#environment-variables)):
```bash
cp .env.example .env
# Edit .env with your values
```

Start the backend:
```bash
npx nodemon server.js
```

### 3. Frontend Setup
```bash
cd frontend
npm install
ng serve
```

The app will be available at `http://localhost:4200`.

---

## Environment Variables

Create `backend/.env` with the following:

```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/securefilevault
JWT_SECRET=<random-64-char-hex-string>

# Backblaze B2
B2_APP_KEY_ID=<your-b2-key-id>
B2_APP_KEY=<your-b2-app-key>
B2_BUCKET_NAME=<your-bucket-name>

# Email (SendGrid or SMTP)
SENDGRID_API_KEY=<your-sendgrid-key>
EMAIL_USER=<your-email>
EMAIL_PASS=<your-email-password>
```

---

## API Reference

### Auth Routes (`/api/auth`)

| Method | Endpoint | Description | Auth |
|---|---|---|---|
| `POST` | `/signup` | Create account | No |
| `POST` | `/login` | Login (returns JWT) | No |
| `POST` | `/refresh` | Refresh access token | Cookie |
| `POST` | `/logout` | Invalidate refresh token | Cookie |
| `POST` | `/2fa/generate` | Generate TOTP secret & QR | JWT |
| `POST` | `/2fa/enable` | Verify & enable 2FA | JWT |
| `GET` | `/devices` | List trusted devices | JWT |
| `POST` | `/devices/:id/set-parent` | Set device as parent (max 2) | JWT |
| `POST` | `/devices/:id/remove-parent` | Remove parent status | JWT |
| `GET` | `/profile` | Get user profile & email | JWT |

### File Routes (`/api/files`)

| Method | Endpoint | Description | Auth | Restriction |
|---|---|---|---|---|
| `POST` | `/upload` | Upload encrypted file | JWT | Any device |
| `GET` | `/` | List user's files | JWT | Any device |
| `GET` | `/:id/download` | Download encrypted file | JWT | Any device |
| `DELETE` | `/:id` | Delete a file | JWT | **Parent device only** |
| `DELETE` | `/all` | Delete all files | JWT | **Parent device only** |

---

## Project Structure

```
SecureFileVault/
├── docker-compose.yml          # Docker orchestration
├── README.md
│
├── backend/
│   ├── server.js               # Express app, MongoDB connection, cron jobs
│   ├── .env                    # Environment variables
│   ├── Dockerfile
│   ├── package.json
│   ├── models/
│   │   ├── User.js             # User schema (devices, 2FA, lockout)
│   │   └── File.js             # File metadata schema
│   ├── routes/
│   │   ├── auth.js             # Auth, 2FA, device management
│   │   └── files.js            # File CRUD with parent device guard
│   └── services/
│       ├── b2Service.js        # Backblaze B2 upload/download/delete
│       └── emailService.js     # SendGrid email notifications
│
├── frontend/
│   ├── Dockerfile
│   ├── package.json
│   └── src/
│       ├── styles.css           # Global CSS with dark/light theme variables
│       ├── material-theme.scss  # Angular Material theme config
│       └── app/
│           ├── app.routes.ts    # Route definitions
│           ├── landing/         # Public landing page
│           ├── auth/            # Login / Signup
│           ├── layout/          # Sidebar + topbar shell
│           ├── vault/
│           │   ├── files/       # File grid, upload, download
│           │   ├── devices/     # Device management, parent toggle
│           │   └── settings/    # 2FA, recovery email, sessions
│           └── services/
│               ├── api.ts       # HTTP API client
│               ├── crypto.ts    # Argon2 + AES-256-GCM encryption
│               └── theme.service.ts  # Dark/Light mode service
```

---

## Docker Deployment

```bash
# From the project root
docker-compose up --build
```

This starts three containers:
- **frontend** — Nginx serving the Angular build on port `4200`
- **backend** — Node.js API on port `5000`
- **mongo** — MongoDB on port `27017` with persistent volume

---

## License

MIT
