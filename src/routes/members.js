const express = require('express');
const router = express.Router();
const db = require('../database/db');

// GET /api/members (list all or search)
router.get('/', async (req, res) => {
    const { search } = req.query;
    try {
        let query = `
            SELECT m.*, u.username 
            FROM members m 
            LEFT JOIN users u ON m.id = u.member_id
        `;
        let params = [];
        
        if (search) {
            query += ' WHERE m.name LIKE ? OR m.email LIKE ? OR u.username LIKE ?';
            const term = `%${search}%`;
            params = [term, term, term];
        }
        
        query += ' ORDER BY m.created_at DESC';
        const [rows] = await db.query(query, params);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST /api/members (add new member)
router.post('/', async (req, res) => {
    const { name, email, phone, membership_type, address } = req.body;
    try {
        const [result] = await db.query(
            'INSERT INTO members (name, email, phone, membership_type, address) VALUES (?, ?, ?, ?, ?)',
            [name, email, phone, membership_type, address]
        );
        res.status(201).json({ id: result.insertId, ...req.body });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// PUT /api/members/:id
router.put('/:id', async (req, res) => {
    const { name, email, phone, membership_type, address, status } = req.body;
    try {
        await db.query(
            'UPDATE members SET name = ?, email = ?, phone = ?, membership_type = ?, address = ?, status = ? WHERE id = ?',
            [name, email, phone, membership_type, address, status, req.params.id]
        );
        res.json({ message: 'Member updated successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// DELETE /api/members/:id
router.delete('/:id', async (req, res) => {
    try {
        await db.query('DELETE FROM members WHERE id = ?', [req.params.id]);
        res.json({ message: 'Member deleted successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
