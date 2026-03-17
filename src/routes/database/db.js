const mysql = require('mysql2/promise');
require('dotenv').config();

let pool;
let isMock = false;

// Attempt real MySQL connection
try {
  pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    connectTimeout: 2000
  });

  // Test connection
  pool.getConnection()
    .then(conn => {
      console.log('Connected to MySQL successfully.');
      conn.release();
    })
    .catch(err => {
      console.warn('MySQL Connection failed. Falling back to MOCK MODE.');
      isMock = true;
    });
} catch (err) {
  console.warn('Failed to initialize MySQL pool. Falling back to MOCK MODE.');
  isMock = true;
}

// Re-implementing MOCK logic to match the NEW specialized schema requirements
let mockBooks = [
  { id: 1, title: 'The Great Gatsby', author: 'F. Scott Fitzgerald', isbn: '9780743273565', category: 'Fiction', total_copies: 3, available_copies: 3, published_year: 1925, created_at: new Date() },
  { id: 2, title: '1984', author: 'George Orwell', isbn: '9780451524935', category: 'Dystopian', total_copies: 5, available_copies: 4, published_year: 1949, created_at: new Date() },
  { id: 3, title: 'To Kill a Mockingbird', author: 'Harper Lee', isbn: '9780061120084', category: 'Fiction', total_copies: 4, available_copies: 4, published_year: 1960, created_at: new Date() }
];

let mockMembers = [
  { id: 1, name: 'Aryan Singh', email: 'aryan@example.com', phone: '1234567890', address: '123 Library St', membership_type: 'premium', status: 'active', created_at: new Date() },
  { id: 2, name: 'Deepak Kumar', email: 'deepak@example.com', phone: '9876543210', address: '456 Reader Way', membership_type: 'student', status: 'active', created_at: new Date() }
];

let mockIssues = [
  { id: 1, book_id: 2, member_id: 1, issue_date: new Date(), due_date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), return_date: null, status: 'issued', fine_amount: 0.00, book_title: '1984', member_name: 'Aryan Singh', book_isbn: '9780451524935', created_at: new Date() }
];

const mock = {
  query: async (sql, params) => {
    // Basic mock router to simulate the specific queries in the routes
    const query = sql.toLowerCase().trim();
    
    // Dashboard Stats
    if (query.includes('select count(*) as total from books')) return [[{ total: mockBooks.length }]];
    if (query.includes('select count(*) as total from members where status = "active"')) return [[{ total: mockMembers.filter(m => m.status === 'active').length }]];
    if (query.includes('select count(*) as total from issues where status = "issued"')) return [[{ total: mockIssues.filter(i => i.status === 'issued').length }]];
    if (query.includes('curdate()')) return [[{ total: mockIssues.filter(i => i.status === 'issued' && new Date(i.due_date) < new Date()).length }]];
    if (query.includes('sum(fine_amount)')) return [[{ total: mockIssues.reduce((sum, i) => sum + i.fine_amount, 0) }]];

    // List/Search Books
    if (query.includes('from books')) {
      if (params && params.length > 0) {
        const term = params[0].replace(/%/g, '');
        return [mockBooks.filter(b => b.title.toLowerCase().includes(term) || b.author.toLowerCase().includes(term) || b.isbn.includes(term))];
      }
      return [mockBooks];
    }

    // List/Search Members
    if (query.includes('from members')) {
      if (params && params.length > 0) {
        const term = params[0].replace(/%/g, '');
        return [mockMembers.filter(m => m.name.toLowerCase().includes(term) || m.email.toLowerCase().includes(term))];
      }
      return [mockMembers];
    }

    // List Issues
    if (query.includes('from issues')) {
      if (query.includes('where i.status = ?')) {
        return [mockIssues.filter(i => i.status === params[0])];
      }
      return [mockIssues];
    }

    // Inserts (Issue/Book/Member)
    if (query.includes('insert into')) {
      return [{ insertId: Date.now() }];
    }

    // Update (Return/Counter)
    if (query.includes('update')) {
      return [{ affectedRows: 1 }];
    }

    return [[]]; // Default empty
  }
};

module.exports = {
  query: (sql, params) => isMock ? mock.query(sql, params) : pool.query(sql, params)
};
