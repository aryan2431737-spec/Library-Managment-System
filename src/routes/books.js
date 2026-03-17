const express = require('express');
const router = express.Router();
const db = require('../database/db');

// GET /api/books (list all or search)
router.get('/', async (req, res) => {
    const { search } = req.query;
    try {
        let query = 'SELECT * FROM books';
        let params = [];
        
        if (search) {
            query += ' WHERE title LIKE ? OR author LIKE ? OR isbn LIKE ?';
            const term = `%${search}%`;
            params = [term, term, term];
        }
        
        query += ' ORDER BY created_at DESC';
        const [rows] = await db.query(query, params);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST /api/books (add new book)
router.post('/', async (req, res) => {
    const { title, author, isbn, category, total_copies, published_year } = req.body;
    try {
        const [result] = await db.query(
            'INSERT INTO books (title, author, isbn, category, total_copies, available_copies, published_year) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [title, author, isbn, category, total_copies, total_copies, published_year]
        );
        res.status(201).json({ id: result.insertId, ...req.body });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// PUT /api/books/:id
router.put('/:id', async (req, res) => {
    const { title, author, isbn, category, total_copies, published_year } = req.body;
    try {
        await db.query(
            'UPDATE books SET title = ?, author = ?, isbn = ?, category = ?, total_copies = ?, published_year = ? WHERE id = ?',
            [title, author, isbn, category, total_copies, published_year, req.params.id]
        );
        res.json({ message: 'Book updated successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// DELETE /api/books/:id
router.delete('/:id', async (req, res) => {
    try {
        await db.query('DELETE FROM books WHERE id = ?', [req.params.id]);
        res.json({ message: 'Book deleted successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
