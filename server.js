const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

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

app.listen(PORT, '0.0.0.0', () => {
    console.log(`Library System running on http://localhost:${PORT}`);
    console.log(`Network access: http://<your-local-IP>:${PORT}`);
});