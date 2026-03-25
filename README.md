# Lumina Library Management System

A premium, modern Library Management System (LMS) with dual portals for Students and Administrators.

## Render Deployment Notes

- Start command: `npm start`
- Health check path: `/healthz`
- Optional API health endpoint: `/api/health`
- MySQL is required for persistence (users, sessions, data). The app will stop if `DB_HOST`, `DB_USER`, or `DB_NAME` are missing.
- Use `.env.example` as the template, then run `npm run setup-db` once to provision tables (including persistent `sessions`).
- Sessions are stored in MySQL via `express-session`; set `SESSION_SECRET` and keep `ALLOW_MOCK_DATA=false` in production so redeploys do not wipe users.

## 🚀 Getting Started


## 📁 Project Structure

```text
├── public/                 # Frontend assets (Static files)
│   ├── css/                # Custom CSS styles
│   ├── js/                 # Frontend logic (app.js)
│   └── index.html          # Main SPA landing page
├── src/                    # Backend source code
│   ├── database/           # DB connection & setup logic
│   │   ├── db.js           # MySQL connection pool / Mock data
│   │   └── setup.js        # DB/Table initialization script
│   └── routes/             # API Route handlers
│       ├── admin.js        # Admin specific logic (/api/admin)
│       ├── auth.js         # General auth logic (/api/auth)
│       ├── books.js        # Catalog management (/api/books)
│       ├── issues.js       # Borrowing & returns (/api/issues)
│       └── members.js      # User/Member records (/api/members)
├── server.js               # Main Express.js server entry point
├── .env                    # Environment variables (Sensitive data)
├── package.json            # NPM dependencies and scripts
└── README.md               # Project documentation
```

---

## 🔑 Portals & Roles

### Admin Console
- **Login:** Enter the `ADMIN_SECRET_ID` from your `.env` (Default: `7905`).
- **Features:** Manage book catalog, register new members, create student accounts, oversee issues/returns, and view system-wide records.

### Student Portal
- **Login:** Use the Login ID (e.g., `STU1`) and password provided by the librarian.
- **Features:** Browse the catalog, borrow books, view borrowed items, and request renewals.

---

## 🛠 Recent Fixes (v2.0)
- **Unified Admin API:** Created dedicated `/api/admin/login` for higher security.
- **Clean Routing:** Fixed a bug where history states were corrupting the application URL.
- **Cache Management:** Implemented fingerprinting for JS assets to ensure the latest fixes load immediately.
- **Improved UX:** Fixed broken portal buttons and added responsive redirection logic.
