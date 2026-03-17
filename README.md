# Lumina Library Management System

A premium, modern Library Management System (LMS) with dual portals for Students and Administrators.

## 🚀 Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) (v16+ recommended)
- [MySQL](https://www.mysql.com/) (Optional: The system automatically falls back to **Mock Mode** if no database is found)

### Installation
1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Configure the environment:
   Create a `.env` file in the root directory with the following:
   ```env
   PORT=3000
   DB_HOST=localhost
   DB_USER=root
   DB_PASSWORD=your_password
   DB_NAME=library_db
   ADMIN_SECRET_ID=7905
   ```
4. Setup the database (if using MySQL):
   ```bash
   npm run setup-db
   ```

### Running the App
- **Development Mode:**
  ```bash
  npm run dev
  ```
- **Production Mode:**
  ```bash
  npm start
  ```
The application will be available at [http://localhost:3000](http://localhost:3000).

### 📱 Access from Other Devices (Phone/Laptop on same Wi-Fi)
Find your laptop's local IP by running `ipconfig` (Windows) and look for **IPv4 Address** under Wi-Fi.

Then on any device on the same Wi-Fi, open:
```
http://192.168.29.92:3000
```
> Replace `192.168.29.92` with your current local IP — it may change each time you reconnect to Wi-Fi.

---

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
