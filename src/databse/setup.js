const mysql = require('mysql2/promise');
require('dotenv').config();

async function setupDatabase() {
  const conn = await mysql.createConnection({
    host:     process.env.DB_HOST     || 'localhost',
    user:     process.env.DB_USER     || 'root',
    password: process.env.DB_PASSWORD || '',
  });

  console.log('🔧 Setting up database...');

  // Create database
  await conn.execute(`CREATE DATABASE IF NOT EXISTS ${process.env.DB_NAME || 'library_db'}`);
  await conn.execute(`USE ${process.env.DB_NAME || 'library_db'}`);

  // Books table
  await conn.execute(`
    CREATE TABLE IF NOT EXISTS books (
      id          INT AUTO_INCREMENT PRIMARY KEY,
      title       VARCHAR(255) NOT NULL,
      author      VARCHAR(255) NOT NULL,
      isbn        VARCHAR(20)  UNIQUE,
      category    VARCHAR(100),
      total_copies   INT DEFAULT 1,
      available_copies INT DEFAULT 1,
      published_year INT,
      created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Members table
  await conn.execute(`
    CREATE TABLE IF NOT EXISTS members (
      id          INT AUTO_INCREMENT PRIMARY KEY,
      name        VARCHAR(255) NOT NULL,
      email       VARCHAR(255) UNIQUE NOT NULL,
      phone       VARCHAR(20),
      address     TEXT,
      membership_type ENUM('basic','premium','student') DEFAULT 'basic',
      joined_date DATE DEFAULT (CURRENT_DATE),
      status      ENUM('active','inactive','suspended') DEFAULT 'active',
      created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Issues table (book lending records)
  await conn.execute(`
    CREATE TABLE IF NOT EXISTS issues (
      id           INT AUTO_INCREMENT PRIMARY KEY,
      book_id      INT NOT NULL,
      member_id    INT NOT NULL,
      issue_date   DATE DEFAULT (CURRENT_DATE),
      due_date     DATE NOT NULL,
      return_date  DATE,
      status       ENUM('issued','returned','overdue') DEFAULT 'issued',
      fine_amount  DECIMAL(10,2) DEFAULT 0.00,
      notes        TEXT,
      created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (book_id)   REFERENCES books(id)   ON DELETE CASCADE,
      FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE CASCADE
    )
  `);

  // Seed sample books
  await conn.execute(`
    INSERT IGNORE INTO books (title, author, isbn, category, total_copies, available_copies, published_year) VALUES
    ('The Great Gatsby',       'F. Scott Fitzgerald', '978-0743273565', 'Fiction',   3, 3, 1925),
    ('To Kill a Mockingbird',  'Harper Lee',          '978-0061935466', 'Fiction',   2, 2, 1960),
    ('1984',                   'George Orwell',       '978-0451524935', 'Dystopian', 4, 4, 1949),
    ('Clean Code',             'Robert C. Martin',    '978-0132350884', 'Technology',3, 3, 2008),
    ('The Pragmatic Programmer','David Thomas',       '978-0135957059', 'Technology',2, 2, 2019),
    ('Sapiens',                'Yuval Noah Harari',   '978-0062316097', 'History',   3, 3, 2011),
    ('Atomic Habits',          'James Clear',         '978-0735211292', 'Self-Help', 5, 5, 2018),
    ('The Alchemist',          'Paulo Coelho',        '978-0062315007', 'Fiction',   4, 4, 1988),
    ('Deep Work',              'Cal Newport',         '978-1455586691', 'Self-Help', 2, 2, 2016),
    ('Thinking Fast and Slow', 'Daniel Kahneman',     '978-0374533557', 'Psychology',3, 3, 2011)
  `);

  // Seed sample members
  await conn.execute(`
    INSERT IGNORE INTO members (name, email, phone, membership_type, status) VALUES
    ('Aryan Sharma',   'aryan@example.com',   '9876543210', 'student',  'active'),
    ('Priya Singh',    'priya@example.com',   '9876543211', 'premium',  'active'),
    ('Rahul Gupta',    'rahul@example.com',   '9876543212', 'basic',    'active'),
    ('Neha Verma',     'neha@example.com',    '9876543213', 'student',  'active'),
    ('Amit Kumar',     'amit@example.com',    '9876543214', 'premium',  'active')
  `);

  console.log('✅ Database setup complete!');
  console.log('✅ Sample books and members added!');
  await conn.end();
}

setupDatabase().catch(err => {
  console.error('❌ Setup failed:', err.message);
  process.exit(1);
});