const express = require('express');
const router = express.Router();
const db = require('../database/db');

const ADMIN_SECRET_ID = process.env.ADMIN_SECRET_ID || '7905';
const allowMock = process.env.ALLOW_MOCK_DATA === 'true';
const PERSISTENT_DB_REQUIRED = 'Persistent database not configured. Set DB_HOST, DB_USER, and DB_NAME to keep accounts between deploys.';
const DEFAULT_SIGNUP_MEMBERSHIP = 'student';

function assertDbReady(res) {
    if (typeof db.isUsingMock === 'function' && db.isUsingMock()) {
        if (!allowMock) {
            res.status(503).json({ error: PERSISTENT_DB_REQUIRED });
            return false;
        }
    }
    return true;
}

function persistSession(req, userPayload) {
    return new Promise((resolve, reject) => {
        req.session.regenerate((err) => {
            if (err) return reject(err);
            req.session.user = userPayload;
            req.session.save((saveErr) => saveErr ? reject(saveErr) : resolve());
        });
    });
}

// POST /api/auth/admin-login — Admin logs in with Secret ID only
router.post('/admin-login', async (req, res) => {
    if (!assertDbReady(res)) return;
    const { secretId } = req.body;
    try {
        if (!secretId || String(secretId).trim() !== ADMIN_SECRET_ID) {
            return res.status(401).json({ error: 'Invalid Secret ID' });
        }
        const userPayload = {
            id: 0,
            username: 'admin',
            role: 'admin',
            member_id: null,
            message: 'Login successful'
        };

        await persistSession(req, userPayload);
        res.json(userPayload);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST /api/auth/login — Student/Member login with ID (given by admin) and password
router.post('/login', async (req, res) => {
    if (!assertDbReady(res)) return;
    const { username, password } = req.body;
    try {
        const [users] = await db.query(
            `SELECT u.*, m.name
             FROM users u
             LEFT JOIN members m ON m.id = u.member_id
             WHERE u.username = ? AND u.password = ?`,
            [username, password]
        );
        
        if (users.length === 0) {
            return res.status(401).json({ error: 'Invalid login ID or password' });
        }

        const user = users[0];
        if (user.role === 'admin') {
            return res.status(401).json({ error: 'Use Admin Console and Secret ID to login as admin' });
        }
        const userPayload = {
            id: user.id,
            username: user.username,
            role: user.role,
            member_id: user.member_id,
            name: user.name || user.username,
            message: 'Login successful'
        };

        await persistSession(req, userPayload);
        res.json(userPayload);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST /api/auth/register
router.post('/register', async (req, res) => {
    if (!assertDbReady(res)) return;
    const { username, password, name, email, phone } = req.body;
    const cleanUsername = String(username || '').trim();
    const cleanPassword = String(password || '');
    const cleanName = String(name || '').trim();
    const cleanEmail = String(email || '').trim().toLowerCase();
    const cleanPhone = String(phone || '').trim() || null;

    if (!cleanUsername || !cleanPassword || !cleanName || !cleanEmail) {
        return res.status(400).json({ error: 'Username, password, name and email are required.' });
    }

    try {
        // Check if username already exists
        const [existingUser] = await db.query('SELECT id FROM users WHERE username = ?', [cleanUsername]);
        if (existingUser.length > 0) {
            return res.status(400).json({ error: 'Username already exists. Please choose a different username.' });
        }

        // Reuse an unclaimed member row when one already exists for the email,
        // but always update it with the submitted signup details.
        const [existingMember] = await db.query(
            `SELECT m.id, m.phone, u.id AS user_id
             FROM members m
             LEFT JOIN users u ON u.member_id = m.id
             WHERE m.email = ?`,
            [cleanEmail]
        );
        
        let memberId;
        if (existingMember.length > 0) {
            if (existingMember[0].user_id) {
                return res.status(400).json({ error: 'An account with this email already exists. Please login instead.' });
            }

            memberId = existingMember[0].id;
            await db.query(
                'UPDATE members SET name = ?, phone = ?, membership_type = ?, status = ? WHERE id = ?',
                [cleanName, cleanPhone || existingMember[0].phone || null, DEFAULT_SIGNUP_MEMBERSHIP, 'active', memberId]
            );
        } else {
            const [memberResult] = await db.query(
                'INSERT INTO members (name, email, phone, membership_type, status) VALUES (?, ?, ?, ?, ?)',
                [cleanName, cleanEmail, cleanPhone, DEFAULT_SIGNUP_MEMBERSHIP, 'active']
            );
            memberId = memberResult.insertId;
        }

        await db.query(
            'INSERT INTO users (username, password, role, member_id) VALUES (?, ?, ?, ?)',
            [cleanUsername, cleanPassword, 'member', memberId]
        );

        res.status(201).json({ message: 'Registration successful! Please login.' });
    } catch (err) {
        if (err.message && err.message.includes('Duplicate entry')) {
            return res.status(400).json({ error: 'Username or email already exists' });
        }
        res.status(500).json({ error: err.message });
    }
});

// POST /api/auth/create-student — Admin creates a student account (returns login ID for student)
router.post('/create-student', async (req, res) => {
    if (!assertDbReady(res)) return;
    const { name, email, password } = req.body;
    const cleanName = String(name || '').trim();
    const cleanEmail = String(email || '').trim().toLowerCase();
    const cleanPassword = String(password || '');

    if (!cleanName || !cleanEmail || !cleanPassword) {
        return res.status(400).json({ error: 'Name, email and password are required' });
    }
    try {
        const [existingMember] = await db.query(
            `SELECT m.id, u.id AS user_id
             FROM members m
             LEFT JOIN users u ON u.member_id = m.id
             WHERE m.email = ?`,
            [cleanEmail]
        );

        let memberId;
        if (existingMember.length > 0) {
            if (existingMember[0].user_id) {
                return res.status(400).json({ error: 'Email already exists' });
            }

            memberId = existingMember[0].id;
            await db.query(
                'UPDATE members SET name = ?, membership_type = ?, status = ? WHERE id = ?',
                [cleanName, DEFAULT_SIGNUP_MEMBERSHIP, 'active', memberId]
            );
        } else {
            const [memberResult] = await db.query(
                'INSERT INTO members (name, email, membership_type, status) VALUES (?, ?, ?, ?)',
                [cleanName, cleanEmail, DEFAULT_SIGNUP_MEMBERSHIP, 'active']
            );
            memberId = memberResult.insertId;
        }

        const loginId = 'STU' + memberId;
        await db.query(
            'INSERT INTO users (username, password, role, member_id) VALUES (?, ?, ?, ?)',
            [loginId, cleanPassword, 'member', memberId]
        );
        res.status(201).json({
            message: 'Student account created. Share the Login ID and password with the student.',
            loginId,
            memberId
        });
    } catch (err) {
        if (err.message && err.message.includes('Duplicate entry')) {
            return res.status(400).json({ error: 'Email already exists' });
        }
        res.status(500).json({ error: err.message });
    }
});

// GET /api/auth/me — return logged-in session, if any
router.get('/me', (req, res) => {
    if (req.session && req.session.user) {
        return res.json(req.session.user);
    }
    res.status(401).json({ error: 'Not authenticated' });
});

// POST /api/auth/logout — destroy session
router.post('/logout', (req, res) => {
    if (!req.session) return res.json({ message: 'Logged out' });
    req.session.destroy(() => {
        res.json({ message: 'Logged out' });
    });
});

module.exports = router;
