const mysql = require('mysql2/promise');
require('dotenv').config();

async function setup() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST,
        port: Number(process.env.DB_PORT || 3306),
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD
    });

    console.log('Connected to MySQL server for setup.');

    await connection.query(`CREATE DATABASE IF NOT EXISTS \`${process.env.DB_NAME}\``);
    console.log(`Database "${process.env.DB_NAME}" ensured.`);

    await connection.changeUser({ database: process.env.DB_NAME });

    // Table: books
    await connection.query(`
        CREATE TABLE IF NOT EXISTS books (
            id INT AUTO_INCREMENT PRIMARY KEY,
            title VARCHAR(255) NOT NULL,
            author VARCHAR(255) NOT NULL,
            isbn VARCHAR(20) UNIQUE,
            category VARCHAR(100),
            total_copies INT DEFAULT 1,
            available_copies INT DEFAULT 1,
            published_year INT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    `);
    console.log('Table "books" ensured.');

    // Table: members
    await connection.query(`
        CREATE TABLE IF NOT EXISTS members (
            id INT AUTO_INCREMENT PRIMARY KEY,
            name VARCHAR(255) NOT NULL,
            email VARCHAR(255) UNIQUE NOT NULL,
            phone VARCHAR(20),
            address TEXT,
            membership_type ENUM('basic', 'student', 'premium') DEFAULT 'basic',
            status ENUM('active', 'inactive', 'suspended') DEFAULT 'active',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    `);
    console.log('Table "members" ensured.');

    // Table: users
    await connection.query(`
        CREATE TABLE IF NOT EXISTS users (
            id INT AUTO_INCREMENT PRIMARY KEY,
            username VARCHAR(50) UNIQUE NOT NULL,
            password VARCHAR(255) NOT NULL,
            role ENUM('admin', 'staff', 'member') DEFAULT 'member',
            member_id INT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (member_id) REFERENCES members(id)
        )
    `);
    console.log('Table "users" ensured.');

    // Table: issues
    await connection.query(`
        CREATE TABLE IF NOT EXISTS issues (
            id INT AUTO_INCREMENT PRIMARY KEY,
            book_id INT,
            member_id INT,
            issue_date DATE DEFAULT (CURRENT_DATE),
            due_date DATE NOT NULL,
            return_date DATE,
            status ENUM('issued', 'returned', 'overdue') DEFAULT 'issued',
            fine_amount DECIMAL(10, 2) DEFAULT 0.00,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (book_id) REFERENCES books(id),
            FOREIGN KEY (member_id) REFERENCES members(id)
        )
    `);
    console.log('Table "issues" ensured.');

    // Table: sessions (for express-session persistent store)
    await connection.query(`
        CREATE TABLE IF NOT EXISTS sessions (
            session_id VARCHAR(128) NOT NULL,
            expires INT(11) UNSIGNED NOT NULL,
            data MEDIUMTEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (session_id),
            INDEX expires_idx (expires)
        ) ENGINE=InnoDB
    `);
    console.log('Table "sessions" ensured.');

    // Seed Data
    const [bookCount] = await connection.query('SELECT COUNT(*) as count FROM books');
    if (bookCount[0].count === 0) {
        await connection.query(`
            INSERT INTO books (title, author, isbn, category, total_copies, available_copies, published_year) VALUES
            ('The Great Gatsby', 'F. Scott Fitzgerald', '9780743273565', 'Fiction', 3, 3, 1925),
            ('1984', 'George Orwell', '9780451524935', 'Dystopian', 5, 5, 1949),
            ('To Kill a Mockingbird', 'Harper Lee', '9780061120084', 'Fiction', 4, 4, 1960),
            ('The Catcher in the Rye', 'J.D. Salinger', '9787543321724', 'Fiction', 2, 2, 1951),
            ('The Hobbit', 'J.R.R. Tolkien', '9780547928227', 'Fantasy', 6, 6, 1937),
            ('Brave New World', 'Aldous Huxley', '9780060850524', 'Dystopian', 3, 3, 1932),
            ('The Alchemist', 'Paulo Coelho', '9780062315007', 'Philosophy', 10, 10, 1988),
            ('Sapiens', 'Yuval Noah Harari', '9780062316097', 'History', 4, 4, 2011),
            ('The Silent Patient', 'Alex Michaelides', '9781250301697', 'Thriller', 2, 2, 2019),
            ('Atomic Habits', 'James Clear', '9780735211292', 'Self-help', 8, 8, 2018)
        `);
        console.log('Sample books seeded.');
    }

    const [memberCount] = await connection.query('SELECT COUNT(*) as count FROM members');
    if (memberCount[0].count === 0) {
        await connection.query(`
            INSERT IGNORE INTO members (name, email, phone, membership_type, status) VALUES
            ('Aryan Sharma', 'aryan@example.com', '9876543210', 'student', 'active'),
            ('Priya Singh', 'priya@example.com', '9876543211', 'premium', 'active'),
            ('Rahul Gupta', 'rahul@example.com', '9876543212', 'basic', 'active'),
            ('Neha Verma', 'neha@example.com', '9876543213', 'student', 'active'),
            ('Amit Kumar', 'amit@example.com', '9876543214', 'premium', 'active')
        `);
        console.log('Sample members seeded.');
    }

    const [userCount] = await connection.query('SELECT COUNT(*) as count FROM users');
    if (userCount[0].count === 0) {
        await connection.query(`
            INSERT INTO users (username, password, role, member_id) VALUES
            ('admin', 'password123', 'admin', NULL),
            ('staff', 'password123', 'staff', NULL)
        `);
        console.log('Default admin and staff users seeded.');
    }

    await connection.end();
    console.log('Database setup complete.');
}

setup().catch(err => {
    console.error('Setup failed:', err);
    process.exit(1);
});
