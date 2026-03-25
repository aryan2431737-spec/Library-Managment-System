const express = require('express');
const cors = require('cors');
const path = require('path');
const session = require('express-session');
const MySQLStore = require('express-mysql-session')(session);
require('dotenv').config();
const { dbConfig } = require('./src/database/db');

const app = express();
const PORT = process.env.PORT || 3000;
const SESSION_MAX_AGE_MS = (Number(process.env.SESSION_MAX_AGE_DAYS) || 7) * 24 * 60 * 60 * 1000;
const allowMock = process.env.ALLOW_MOCK_DATA === 'true';

let sessionStore;
if (dbConfig) {
    sessionStore = new MySQLStore({
        ...dbConfig,
        clearExpired: true,
        checkExpirationInterval: 15 * 60 * 1000,
        expiration: SESSION_MAX_AGE_MS,
        createDatabaseTable: true,
        schema: { tableName: 'sessions' }
    });
} else if (!allowMock) {
    throw new Error('Database config missing. Set DB_HOST, DB_USER, DB_PASSWORD, DB_NAME for persistent auth.');
} else {
    console.warn('Running without DB config because ALLOW_MOCK_DATA=true. Sessions will reset on restart.');
}

// Middleware
app.set('trust proxy', 1);
app.use(cors({ origin: process.env.CLIENT_ORIGIN || true, credentials: true }));
app.use(express.json());
app.use(session({
    name: 'lib.sid',
    secret: process.env.SESSION_SECRET || 'library-session-secret-change-me',
    resave: false,
    saveUninitialized: false,
    store: sessionStore,
    cookie: {
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
        maxAge: SESSION_MAX_AGE_MS
    }
}));
app.use(express.static(path.join(__dirname, 'public')));

// Health checks for Render and uptime monitoring
app.get('/healthz', (req, res) => {
    res.status(200).json({
        status: 'ok',
        service: 'library-system',
        timestamp: new Date().toISOString()
    });
});

app.get('/api/health', (req, res) => {
    res.status(200).json({
        status: 'ok',
        service: 'library-system',
        timestamp: new Date().toISOString()
    });
});

// Routes
const bookRoutes = require(path.join(__dirname, 'src', 'routes', 'books'));
const memberRoutes = require(path.join(__dirname, 'src', 'routes', 'members'));
const issueRoutes = require(path.join(__dirname, 'src', 'routes', 'issues'));
const authRoutes = require(path.join(__dirname, 'src', 'routes', 'auth'));
const adminRoutes = require(path.join(__dirname, 'src', 'routes', 'admin'));

app.use('/api/books', bookRoutes);
app.use('/api/members', memberRoutes);
app.use('/api/issues', issueRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);

// Fallback for SPA
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`Library System running on port ${PORT}`);
});

server.on('error', (err) => {
    console.error('Server startup failed:', err);
    process.exit(1);
});
