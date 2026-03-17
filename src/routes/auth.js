const express = require('express');
const router = express.Router();
const db = require('../database/db');

const ADMIN_SECRET_ID = process.env.ADMIN_SECRET_ID || '7905';

// POST /api/auth/admin-login — Admin logs in with Secret ID only
router.post('/admin-login', async (req, res) => {
    const { secretId } = req.body;
    try {
        if (!secretId || String(secretId).trim() !== ADMIN_SECRET_ID) {
            return res.status(401).json({ error: 'Invalid Secret ID' });
        }
        res.json({
            id: 0,
            username: 'admin',
            role: 'admin',
            member_id: null,
            message: 'Login successful'
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST /api/auth/login — Student/Member login with ID (given by admin) and password
router.post('/login', async (req, res) => {
    const { username, password } = req.body;
    try {
        const [users] = await db.query('SELECT * FROM users WHERE username = ? AND password = ?', [username, password]);
        
        if (users.length === 0) {
            return res.status(401).json({ error: 'Invalid login ID or password' });
        }

        const user = users[0];
        if (user.role === 'admin') {
            return res.status(401).json({ error: 'Use Admin Console and Secret ID to login as admin' });
        }
        res.json({
            id: user.id,
            username: user.username,
            role: user.role,
            member_id: user.member_id,
            message: 'Login successful'
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST /api/auth/register
router.post('/register', async (req, res) => {
    const { username, password, name, email, phone } = req.body;
    try {
        // Check if username already exists
        const [existingUser] = await db.query('SELECT id FROM users WHERE username = ?', [username]);
        if (existingUser.length > 0) {
            return res.status(400).json({ error: 'Username already exists. Please choose a different username.' });
        }

        // Check if member with this email already exists
        const [existingMember] = await db.query('SELECT id, name, phone FROM members WHERE email = ?', [email]);
        
        let memberId;
        if (existingMember.length > 0) {
            // Member already exists, use existing member ID
            memberId = existingMember[0].id;
            // Optional: Update member phone if missing
            if (!existingMember[0].phone && phone) {
                await db.query('UPDATE members SET phone = ? WHERE id = ?', [phone, memberId]);
            }
        } else {
            // Create new member record
            const [memberResult] = await db.query(
                'INSERT INTO members (name, email, phone, membership_type, status) VALUES (?, ?, ?, ?, ?)',
                [name, email, phone || null, 'student', 'active']
            );
            memberId = memberResult.insertId;
        }

        // Create user record linked to member
        await db.query(
            'INSERT INTO users (username, password, role, member_id) VALUES (?, ?, ?, ?)',
            [username, password, 'member', memberId]
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
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
        return res.status(400).json({ error: 'Name, email and password are required' });
    }
    try {
        const [memberResult] = await db.query(
            'INSERT INTO members (name, email, membership_type, status) VALUES (?, ?, ?, ?)',
            [name, email, 'student', 'active']
        );
        const memberId = memberResult.insertId;
        const loginId = 'STU' + memberId;
        await db.query(
            'INSERT INTO users (username, password, role, member_id) VALUES (?, ?, ?, ?)',
            [loginId, password, 'member', memberId]
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

module.exports = router;
