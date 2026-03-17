const express = require('express');
const router = express.Router();

const ADMIN_SECRET_ID = process.env.ADMIN_SECRET_ID || '7905';

// POST /api/admin/login — Admin logs in with Secret ID
router.post('/login', async (req, res) => {
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

module.exports = router;
