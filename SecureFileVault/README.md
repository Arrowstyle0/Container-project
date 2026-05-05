# Secure File Vault

Secure File Vault is a full-stack web application for storing encrypted files in a personal vault. Files are encrypted in the browser before upload, stored in Backblaze B2, tracked in MongoDB, and managed through an Angular dashboard.

## What I Used

### Frontend

- Angular 21
- TypeScript
- HTML and CSS
- RxJS
- Browser Web Crypto API
- npm

### Backend

- Node.js
- Express.js
- MongoDB
- Mongoose
- JSON Web Tokens
- bcrypt
- Multer
- dotenv
- CORS
- node-cron
- Nodemailer

### Storage and Services

- Backblaze B2 for cloud file storage
- Gmail SMTP through Nodemailer for expiration emails
- MongoDB database for users and file metadata

### Development Software

- Node.js and npm for installing and running the project
- Angular CLI for the frontend development server and builds
- MongoDB local server or MongoDB Atlas
- Git and GitHub for version control
- Backblaze B2 account and application key
- Gmail account with an app password for email notifications
- VS Code or any code editor

## Main Features

- User signup and login
- Password-based client-side key derivation
- Browser-side AES-GCM file encryption before upload
- JWT-based API authentication
- File upload, download, and delete
- Bulk delete for all vault files
- Backblaze B2 file storage
- MongoDB metadata storage
- Daily scheduled expiration check
- Email notification when files expire
- Soft delete for expired files, followed by permanent cleanup after 30 days

## Project Structure

```text
SecureFileVault/
  backend/
    models/
    routes/
    services/
    server.js
    package.json
  frontend/
    src/
    angular.json
    package.json
```

## Backend Setup

1. Go to the backend folder:

```bash
cd backend
```

2. Install dependencies:

```bash
npm install
```

3. Create a `.env` file in the `backend` folder:

```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/securefilevault
JWT_SECRET=your_jwt_secret

B2_APP_KEY_ID=your_backblaze_key_id
B2_APP_KEY=your_backblaze_application_key
B2_BUCKET_NAME=your_bucket_name

EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_gmail_app_password
```

4. Start the backend server:

```bash
node server.js
```

The backend runs on:

```text
http://localhost:5000
```

## Frontend Setup

1. Go to the frontend folder:

```bash
cd frontend
```

2. Install dependencies:

```bash
npm install
```

3. Start the Angular development server:

```bash
npm start
```

The frontend runs on:

```text
http://localhost:4200
```

## API Overview

The backend API is served from:

```text
http://localhost:5000/api
```

Main API routes:

- `POST /api/auth/signup`
- `POST /api/auth/login`
- `POST /api/files/upload`
- `GET /api/files`
- `GET /api/files/:id/download`
- `DELETE /api/files/:id`
- `DELETE /api/files/all`

## Security Notes

- Files are encrypted in the browser before they are uploaded.
- The server stores encrypted file data, file metadata, IV values, and salts.
- Password-derived authentication data is hashed before storage.
- JWT tokens are used to protect file routes.
- The `.env` file should never be committed to GitHub.
- `node_modules` should not be committed because dependencies can be restored with `npm install`.

## Build

To build the frontend for production:

```bash
cd frontend
npm run build
```

## Author

Secure File Vault was built as a full-stack file vault project using Angular, Node.js, Express, MongoDB, Backblaze B2, and browser-based encryption 
by Aabhansh Srivastava.

