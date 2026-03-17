const express = require('express');
const router  = express.Router();
const db      = require('../database/db');

// GET all books
router.get('/', async (req, res) => {
  try {
    const { search, category } = req.query;
    let query = 'SELECT * FROM books WHERE 1=1';
    const params = [];
    if (search) {
      query += ' AND (title LIKE ? OR author LIKE ? OR isbn LIKE ?)';
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }
    if (category) {
      query += ' AND category = ?';
      params.push(category);
    }
    query += ' ORDER BY created_at DESC';
    const [rows] = await db.execute(query, params);
    res.json({ success: true, data: rows, count: rows.length });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET single book
router.get('/:id', async (req, res) => {
  try {
    const [rows] = await db.execute('SELECT * FROM books WHERE id = ?', [req.params.id]);
    if (!rows.length) return res.status(404).json({ success: false, error: 'Book not found' });
    res.json({ success: true, data: rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST add book
router.post('/', async (req, res) => {
  try {
    const { title, author, isbn, category, total_copies, published_year } = req.body;
    if (!title || !author) return res.status(400).json({ success: false, error: 'Title and author are required' });
    const copies = total_copies || 1;
    const [result] = await db.execute(
      'INSERT INTO books (title, author, isbn, category, total_copies, available_copies, published_year) VALUES (?,?,?,?,?,?,?)',
      [title, author, isbn || null, category || null, copies, copies, published_year || null]
    );
    res.status(201).json({ success: true, message: 'Book added successfully', id: result.insertId });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// PUT update book
router.put('/:id', async (req, res) => {
  try {
    const { title, author, isbn, category, total_copies, published_year } = req.body;
    await db.execute(
      'UPDATE books SET title=?, author=?, isbn=?, category=?, total_copies=?, published_year=? WHERE id=?',
      [title, author, isbn, category, total_copies, published_year, req.params.id]
    );
    res.json({ success: true, message: 'Book updated successfully' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE book
router.delete('/:id', async (req, res) => {
  try {
    await db.execute('DELETE FROM books WHERE id = ?', [req.params.id]);
    res.json({ success: true, message: 'Book deleted successfully' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;