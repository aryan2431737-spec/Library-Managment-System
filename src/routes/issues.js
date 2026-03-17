const express = require('express');
const router = express.Router();
const db = require('../database/db');

// GET /api/issues/stats/dashboard  ← MUST be before /:id
router.get('/stats/dashboard', async (req, res) => {
    try {
        const [bookStat] = await db.query('SELECT COUNT(*) as total FROM books');
        const [memberStat] = await db.query('SELECT COUNT(*) as total FROM members WHERE status = "active"');
        const [issueStat] = await db.query('SELECT COUNT(*) as total FROM issues WHERE status = "issued"');
        const [overdueStat] = await db.query('SELECT COUNT(*) as total FROM issues WHERE status = "overdue" OR (status = "issued" AND due_date < CURDATE())');
        const [fineStat] = await db.query('SELECT SUM(fine_amount) as total FROM issues');
        const [recentIssues] = await db.query(`
            SELECT i.*, b.title as book_title, m.name as member_name 
            FROM issues i 
            JOIN books b ON i.book_id = b.id 
            JOIN members m ON i.member_id = m.id 
            ORDER BY i.created_at DESC LIMIT 5
        `);

        res.json({
            total_books: bookStat[0].total,
            total_members: memberStat[0].total,
            active_issues: issueStat[0].total,
            overdue_books: overdueStat[0].total,
            total_fines: fineStat[0].total || 0,
            recent_issues: Array.isArray(recentIssues) ? recentIssues : []
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /api/issues (all records or filter by status)
router.get('/', async (req, res) => {
    const { status } = req.query;
    try {
        let query = `
            SELECT i.*, b.title as book_title, b.isbn as book_isbn, m.name as member_name 
            FROM issues i 
            JOIN books b ON i.book_id = b.id 
            JOIN members m ON i.member_id = m.id
        `;
        let params = [];
        
        if (status) {
            query += ' WHERE i.status = ?';
            params = [status];
        }
        
        query += ' ORDER BY i.issue_date DESC';
        const [rows] = await db.query(query, params);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST /api/issues/issue
router.post('/issue', async (req, res) => {
    const { book_id, member_id, due_date } = req.body;
    try {
        await db.query('START TRANSACTION');

        // Check book availability
        const [book] = await db.query('SELECT available_copies FROM books WHERE id = ?', [book_id]);
        if (book.length === 0) throw new Error('Book not found');
        if (book[0].available_copies <= 0) throw new Error('No copies available for issue');

        // Check member status
        const [member] = await db.query('SELECT status FROM members WHERE id = ?', [member_id]);
        if (member.length === 0) throw new Error('Member not found');
        if (member[0].status !== 'active') throw new Error('Member account is not active');

        // Create issue record
        await db.query(
            'INSERT INTO issues (book_id, member_id, due_date, status) VALUES (?, ?, ?, "issued")',
            [book_id, member_id, due_date]
        );

        // Update book counters
        await db.query('UPDATE books SET available_copies = available_copies - 1 WHERE id = ?', [book_id]);

        await db.query('COMMIT');
        res.status(201).json({ message: 'Book issued successfully' });
    } catch (err) {
        await db.query('ROLLBACK');
        res.status(500).json({ error: err.message });
    }
});

// POST /api/issues/return/:id
router.post('/return/:id', async (req, res) => {
    const issueId = req.params.id;
    const returnDate = new Date().toISOString().split('T')[0];

    try {
        await db.query('START TRANSACTION');

        const [issue] = await db.query('SELECT * FROM issues WHERE id = ?', [issueId]);
        if (issue.length === 0 || issue[0].status === 'returned') {
            throw new Error('Valid issue record not found');
        }

        // Calculate fine (₹2 per day overdue)
        const dueDate = new Date(issue[0].due_date);
        const retDate = new Date(returnDate);
        let fine = 0;
        let daysOverdue = 0;
        
        if (retDate > dueDate) {
            const diffTime = Math.abs(retDate - dueDate);
            daysOverdue = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            fine = daysOverdue * 2;
        }

        await db.query(
            'UPDATE issues SET return_date = ?, fine_amount = ?, status = "returned" WHERE id = ?',
            [returnDate, fine, issueId]
        );

        await db.query('UPDATE books SET available_copies = available_copies + 1 WHERE id = ?', [issue[0].book_id]);

        await db.query('COMMIT');
        res.json({ 
            message: fine > 0 ? `Book returned! Fine: ₹${fine} (${daysOverdue} days overdue)` : 'Book returned! No fine.',
            fine,
            daysOverdue
        });
    } catch (err) {
        await db.query('ROLLBACK');
        res.status(500).json({ error: err.message });
    }
});

// POST /api/issues/renew/:id  ← MUST be before /:id too
router.post('/renew/:id', async (req, res) => {
    try {
        const [result] = await db.query(
            'UPDATE issues SET due_date = DATE_ADD(due_date, INTERVAL 7 DAY) WHERE id = ? AND status = "issued"',
            [req.params.id]
        );
        
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Issue not found or already returned' });
        }
        
        res.json({ message: 'Book renewed successfully for 7 days' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// PUT /api/issues/:id
router.put('/:id', async (req, res) => {
    const { due_date } = req.body;
    try {
        await db.query('UPDATE issues SET due_date = ? WHERE id = ?', [due_date, req.params.id]);
        res.json({ message: 'Issue updated successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
