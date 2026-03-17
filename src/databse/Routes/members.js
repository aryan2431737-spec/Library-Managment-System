const express = require('express');
const router  = express.Router();
const db      = require('../database/db');

// GET all members
router.get('/', async (req, res) => {
  try {
    const { search, status } = req.query;
    let query = 'SELECT * FROM members WHERE 1=1';
    const params = [];
    if (search) {
      query += ' AND (name LIKE ? OR email LIKE ? OR phone LIKE ?)';
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }
    if (status) { query += ' AND status = ?'; params.push(status); }
    query += ' ORDER BY created_at DESC';
    const [rows] = await db.execute(query, params);
    res.json({ success: true, data: rows, count: rows.length });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET single member + their active issues
router.get('/:id', async (req, res) => {
  try {
    const [rows] = await db.execute('SELECT * FROM members WHERE id = ?', [req.params.id]);
    if (!rows.length) return res.status(404).json({ success: false, error: 'Member not found' });
    const [issues] = await db.execute(
      `SELECT i.*, b.title, b.author FROM issues i
       JOIN books b ON i.book_id = b.id
       WHERE i.member_id = ? ORDER BY i.issue_date DESC`,
      [req.params.id]
    );
    res.json({ success: true, data: { ...rows[0], issues } });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST add member
router.post('/', async (req, res) => {
  try {
    const { name, email, phone, address, membership_type } = req.body;
    if (!name || !email) return res.status(400).json({ success: false, error: 'Name and email are required' });
    const [result] = await db.execute(
      'INSERT INTO members (name, email, phone, address, membership_type) VALUES (?,?,?,?,?)',
      [name, email, phone || null, address || null, membership_type || 'basic']
    );
    res.status(201).json({ success: true, message: 'Member added successfully', id: result.insertId });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// PUT update member
router.put('/:id', async (req, res) => {
  try {
    const { name, email, phone, address, membership_type, status } = req.body;
    await db.execute(
      'UPDATE members SET name=?, email=?, phone=?, address=?, membership_type=?, status=? WHERE id=?',
      [name, email, phone, address, membership_type, status, req.params.id]
    );
    res.json({ success: true, message: 'Member updated successfully' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE member
router.delete('/:id', async (req, res) => {
  try {
    await db.execute('DELETE FROM members WHERE id = ?', [req.params.id]);
    res.json({ success: true, message: 'Member deleted successfully' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;