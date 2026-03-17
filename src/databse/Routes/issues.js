const express = require('express');
const router  = express.Router();
const db      = require('../database/db');

// GET all issues
router.get('/', async (req, res) => {
  try {
    const { status } = req.query;
    let query = `
      SELECT i.*, b.title AS book_title, b.author, m.name AS member_name, m.email
      FROM issues i
      JOIN books b   ON i.book_id   = b.id
      JOIN members m ON i.member_id = m.id
      WHERE 1=1`;
    const params = [];
    if (status) { query += ' AND i.status = ?'; params.push(status); }
    query += ' ORDER BY i.created_at DESC';
    const [rows] = await db.execute(query, params);
    res.json({ success: true, data: rows, count: rows.length });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST issue a book
router.post('/issue', async (req, res) => {
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    const { book_id, member_id, due_date, notes } = req.body;
    if (!book_id || !member_id || !due_date) {
      return res.status(400).json({ success: false, error: 'book_id, member_id and due_date are required' });
    }

    // Check availability
    const [book] = await conn.execute('SELECT available_copies FROM books WHERE id = ?', [book_id]);
    if (!book.length || book[0].available_copies < 1) {
      return res.status(400).json({ success: false, error: 'Book is not available' });
    }

    // Check member status
    const [member] = await conn.execute('SELECT status FROM members WHERE id = ?', [member_id]);
    if (!member.length || member[0].status !== 'active') {
      return res.status(400).json({ success: false, error: 'Member is not active' });
    }

    // Create issue record
    const [result] = await conn.execute(
      'INSERT INTO issues (book_id, member_id, due_date, notes) VALUES (?,?,?,?)',
      [book_id, member_id, due_date, notes || null]
    );

    // Decrement available copies
    await conn.execute('UPDATE books SET available_copies = available_copies - 1 WHERE id = ?', [book_id]);

    await conn.commit();
    res.status(201).json({ success: true, message: 'Book issued successfully', id: result.insertId });
  } catch (err) {
    await conn.rollback();
    res.status(500).json({ success: false, error: err.message });
  } finally {
    conn.release();
  }
});

// POST return a book
router.post('/return/:id', async (req, res) => {
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    const [issue] = await conn.execute('SELECT * FROM issues WHERE id = ?', [req.params.id]);
    if (!issue.length) return res.status(404).json({ success: false, error: 'Issue record not found' });
    if (issue[0].status === 'returned') return res.status(400).json({ success: false, error: 'Book already returned' });

    const today = new Date().toISOString().split('T')[0];
    const dueDate = new Date(issue[0].due_date);
    const returnDate = new Date(today);
    const overdueDays = Math.max(0, Math.floor((returnDate - dueDate) / (1000 * 60 * 60 * 24)));
    const fine = overdueDays * 2.00; // ₹2 per day fine

    await conn.execute(
      'UPDATE issues SET status=?, return_date=?, fine_amount=? WHERE id=?',
      ['returned', today, fine, req.params.id]
    );
    await conn.execute('UPDATE books SET available_copies = available_copies + 1 WHERE id = ?', [issue[0].book_id]);

    await conn.commit();
    res.json({ success: true, message: 'Book returned successfully', fine_amount: fine, overdue_days: overdueDays });
  } catch (err) {
    await conn.rollback();
    res.status(500).json({ success: false, error: err.message });
  } finally {
    conn.release();
  }
});

// GET dashboard stats
router.get('/stats/dashboard', async (req, res) => {
  try {
    const [[totalBooks]]   = await db.execute('SELECT COUNT(*) AS count FROM books');
    const [[totalMembers]] = await db.execute('SELECT COUNT(*) AS count FROM members WHERE status="active"');
    const [[activeIssues]] = await db.execute('SELECT COUNT(*) AS count FROM issues WHERE status="issued"');
    const [[overdueBooks]] = await db.execute('SELECT COUNT(*) AS count FROM issues WHERE status="issued" AND due_date < CURDATE()');
    const [[totalFines]]   = await db.execute('SELECT COALESCE(SUM(fine_amount),0) AS total FROM issues');
    const [recentIssues]   = await db.execute(`
      SELECT i.id, b.title, m.name AS member_name, i.issue_date, i.due_date, i.status
      FROM issues i JOIN books b ON i.book_id=b.id JOIN members m ON i.member_id=m.id
      ORDER BY i.created_at DESC LIMIT 5`);
    res.json({
      success: true,
      data: {
        total_books:    totalBooks.count,
        total_members:  totalMembers.count,
        active_issues:  activeIssues.count,
        overdue_books:  overdueBooks.count,
        total_fines:    totalFines.total,
        recent_issues:  recentIssues,
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;