# Lumina Library Management System

A modern Library Management System with separate flows for administrators and students.

## Render Deployment Notes

- Start command: `npm start`
- Health check path: `/healthz`
- Optional API health endpoint: `/api/health`
- MySQL is required for persistent users, sessions, and records.
- `DB_HOST=localhost` only works on your own computer. On Render, use the hostname from your hosted MySQL provider.
- If your MySQL provider requires TLS/SSL, set `DB_SSL=true`.
- Use `.env.example` as the template, then run `npm run setup-db` once to create the database tables.
- Sessions are stored in MySQL via `express-session`; keep `ALLOW_MOCK_DATA=false` in production so redeploys do not wipe users.

## Getting Started

1. Install dependencies with `npm install`
2. Copy `.env.example` values into your local `.env`
3. Run `npm run setup-db` after configuring MySQL
4. Start the app with `npm start`

## Project Structure

Active app structure:

```text
|-- public/                 # Frontend assets (static files)
|   |-- css/                # Custom CSS styles
|   |   |-- landing.css     # Landing page styling
|   |   `-- style.css       # App and dashboard styling
|   |-- js/                 # Frontend logic
|   |   `-- app.js          # Main SPA client script
|   |-- favicon.svg         # Site icon
|   `-- index.html          # Main SPA landing page
|-- src/                    # Backend source code
|   |-- database/           # DB connection and setup logic
|   |   |-- db.js           # MySQL connection pool and mock data fallback
|   |   `-- setup.js        # DB and table initialization script
|   `-- routes/             # API route handlers
|       |-- admin.js        # Admin-specific endpoints (/api/admin)
|       |-- auth.js         # Authentication endpoints (/api/auth)
|       |-- books.js        # Catalog management (/api/books)
|       |-- issues.js       # Borrowing and returns (/api/issues)
|       `-- members.js      # Member records (/api/members)
|-- server.js               # Main Express server entry point
|-- .env                    # Local environment variables (not committed)
|-- .env.example            # Deployment environment template
|-- package.json            # NPM dependencies and scripts
|-- package-lock.json       # Locked dependency versions
|-- render.yaml             # Render service configuration
`-- README.md               # Project documentation
```

## Portals And Roles

### Admin Console

- Login: enter the `ADMIN_SECRET_ID` from your environment variables.
- Features: manage books, members, issues, returns, and student accounts.

### Student Portal

- Login: use the login ID and password created by the admin.
- Features: browse books, view issued items, and request renewals.

## Recent Fixes

- Added MySQL-backed persistence for users and sessions
- Improved Render startup and deployment diagnostics
- Added health check endpoints for hosting platforms
- Improved the landing page and dashboard experience
