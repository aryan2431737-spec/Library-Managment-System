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

// Stateful Mock Data
let mockBooks = [
  { id: 1, title: 'The Great Gatsby', author: 'F. Scott Fitzgerald', isbn: '9780743273565', category: 'Fiction', total_copies: 3, available_copies: 3, published_year: 1925, created_at: new Date() },
  { id: 2, title: '1984', author: 'George Orwell', isbn: '9780451524935', category: 'Dystopian', total_copies: 5, available_copies: 4, published_year: 1949, created_at: new Date() },
  { id: 3, title: 'To Kill a Mockingbird', author: 'Harper Lee', isbn: '9780061120084', category: 'Fiction', total_copies: 4, available_copies: 4, published_year: 1960, created_at: new Date() }
];

let mockMembers = [
  { id: 1, name: 'Aryan Singh', email: 'aryan@example.com', phone: '1234567890', address: '123 Library St', membership_type: 'premium', status: 'active', created_at: new Date() },
  { id: 2, name: 'Deepak Kumar', email: 'deepak@example.com', phone: '9876543210', address: '456 Reader Way', membership_type: 'student', status: 'active', created_at: new Date() }
];

let mockUsers = [
  { id: 1, username: 'admin', password: 'password123', role: 'admin', member_id: null },
  { id: 2, username: 'staff', password: 'password123', role: 'staff', member_id: null },
  { id: 3, username: 'aryan', password: 'password123', role: 'member', member_id: 1 },
  { id: 4, username: 'deepak', password: 'password123', role: 'member', member_id: 2 }
];

let mockIssues = [
  { id: 1, book_id: 2, member_id: 1, issue_date: new Date(), due_date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), return_date: null, status: 'issued', fine_amount: 0.00, book_title: '1984', member_name: 'Aryan Singh', book_isbn: '9780451524935', created_at: new Date() }
];

const mock = {
    query: async (sql, params) => {
        const q = sql.toLowerCase().trim();
        
        // Transaction control
        if (q.startsWith('start transaction') || q.startsWith('commit') || q.startsWith('rollback')) {
            return [{}];
        }

        // Dashboard Stats (Special Selects)
        if (q.includes('select count(*) as total from books')) return [[{ total: mockBooks.length }]];
        if (q.includes('select count(*) as total from members where status = "active"')) return [[{ total: mockMembers.filter(m => m.status === 'active').length }]];
        if (q.includes('select count(*) as total from issues where status = "issued"')) return [[{ total: mockIssues.filter(i => i.status === 'issued').length }]];
        if (q.includes('curdate()')) return [[{ total: mockIssues.filter(i => i.status === 'issued' && new Date(i.due_date) < new Date()).length }]];
        if (q.includes('sum(fine_amount)')) return [[{ total: mockIssues.reduce((sum, i) => sum + i.fine_amount, 0) }]];

        // SELECT Queries
        if (q.startsWith('select')) {
            if (q.includes('from books')) {
                if (q.includes('where id = ?')) {
                    return [mockBooks.filter(b => b.id == params[0])];
                }
                if (params && params.length > 0) {
                    const term = params[0].toString().toLowerCase().replace(/%/g, '');
                    return [mockBooks.filter(b => b.title.toLowerCase().includes(term) || b.author.toLowerCase().includes(term) || b.isbn.includes(term))];
                }
                return [mockBooks];
            }
            if (q.includes('from members')) {
                let membersData = mockMembers.map(m => {
                    const user = mockUsers.find(u => u.member_id === m.id);
                    return { ...m, username: user ? user.username : null };
                });
                
                if (q.includes('where id = ?')) {
                    return [membersData.filter(m => m.id == params[0])];
                }
                if (q.includes('where email = ?')) {
                    return [membersData.filter(m => m.email === params[0])];
                }
                if (params && params.length > 0) {
                    const term = params[0].toString().toLowerCase().replace(/%/g, '');
                    return [membersData.filter(m => 
                        m.name.toLowerCase().includes(term) || 
                        m.email.toLowerCase().includes(term) ||
                        (m.username && m.username.toLowerCase().includes(term))
                    )];
                }
                return [membersData];
            }
            if (q.includes('from users')) {
                if (q.includes('where username = ?')) {
                    return [mockUsers.filter(u => u.username === params[0])];
                }
                if (q.includes('where username = ? and password = ?')) {
                    return [mockUsers.filter(u => u.username === params[0] && u.password === params[1])];
                }
                return [mockUsers];
            }
            if (q.includes('from issues')) {
                // Enrich issues with book/member info (simulating JOIN)
                const enriched = mockIssues.map(i => {
                    const book = mockBooks.find(b => b.id === i.book_id) || {};
                    const member = mockMembers.find(m => m.id === i.member_id) || {};
                    return {
                        ...i,
                        book_title: i.book_title || book.title || 'Unknown',
                        book_isbn: i.book_isbn || book.isbn || '',
                        member_name: i.member_name || member.name || 'Unknown'
                    };
                });
                if (q.includes('where i.id = ?') || q.includes('where id = ?')) {
                    return [enriched.filter(i => i.id == params[0])];
                }
                if (q.includes('where i.status = ?') || q.includes('where status = ?')) {
                    return [enriched.filter(i => i.status === params[0])];
                }
                // Recent issues limit 5 (for dashboard)
                if (q.includes('limit 5')) {
                    return [enriched.slice(-5).reverse()];
                }
                return [enriched];
            }

        }

        // INSERT Queries
        if (q.startsWith('insert')) {
            if (q.includes('into books')) {
                const b = { id: mockBooks.length + 1, title: params[0], author: params[1], isbn: params[2], category: params[3], total_copies: parseInt(params[4]), available_copies: parseInt(params[5]), published_year: params[6], created_at: new Date() };
                mockBooks.push(b);
                return [{ insertId: b.id }];
            }
            if (q.includes('into members')) {
                // Auth register: (name, email, phone, membership_type, status) = 5 params
                // Members API: (name, email, phone, membership_type, address) = 5 params
                const isAuthRegister = q.includes('membership_type, status');
                const isMembersApi = q.includes('membership_type, status) VALUES') === false;

                const m = {
                    id: mockMembers.length + 1,
                    name: params[0],
                    email: params[1],
                    phone: params[2] || null,
                    membership_type: params[3],
                    address: isMembersApi ? params[4] : null,
                    status: isAuthRegister ? params[4] : 'active',
                    created_at: new Date()
                };
                mockMembers.push(m);
                return [{ insertId: m.id }];
            }
            if (q.includes('into issues')) {
                const i = { id: mockIssues.length + 1, book_id: parseInt(params[0]), member_id: parseInt(params[1]), due_date: params[2], status: 'issued', fine_amount: 0.00, created_at: new Date(), issue_date: new Date() };
                const book = mockBooks.find(b => b.id === i.book_id);
                const member = mockMembers.find(m => m.id === i.member_id);
                i.book_title = book ? book.title : 'Unknown';
                i.member_name = member ? member.name : 'Unknown';
                mockIssues.push(i);
                return [{ insertId: i.id }];
            }
            if (q.includes('into accounts') || q.includes('into users')) {
                const u = { id: mockUsers.length + 1, username: params[0], password: params[1], role: params[2], member_id: params[3] };
                mockUsers.push(u);
                return [{ insertId: u.id }];
            }
        }

        // UPDATE Queries
        if (q.startsWith('update')) {
            if (q.includes('update books set title')) {
                const b = mockBooks.find(b => b.id == params[6]);
                if (b) {
                    b.title = params[0]; b.author = params[1]; b.isbn = params[2];
                    b.category = params[3]; b.total_copies = params[4]; b.published_year = params[5];
                }
                return [{ affectedRows: 1 }];
            }
            if (q.includes('update members set name')) {
                const m = mockMembers.find(m => m.id == params[6]);
                if (m) {
                    m.name = params[0]; m.email = params[1]; m.phone = params[2];
                    m.membership_type = params[3]; m.address = params[4]; m.status = params[5];
                }
                return [{ affectedRows: 1 }];
            }
            if (q.includes('update issues set due_date')) {
                const i = mockIssues.find(i => i.id == params[1]);
                if (i) i.due_date = params[0];
                return [{ affectedRows: 1 }];
            }
            if (q.includes('update books set available_copies')) {
                const b = mockBooks.find(b => b.id == params[0]);
                if (b) {
                    if (q.includes('available_copies - 1')) b.available_copies--;
                    else if (q.includes('available_copies + 1')) b.available_copies++;
                }
                return [{ affectedRows: 1 }];
            }
            if (q.includes('update issues set return_date')) {
                const i = mockIssues.find(i => i.id == params[2]);
                if (i) {
                    i.return_date = params[0];
                    i.fine_amount = params[1];
                    i.status = 'returned';
                }
                return [{ affectedRows: 1 }];
            }
            if (q.includes('update issues set due_date = date_add')) {
                const i = mockIssues.find(i => i.id == params[0]);
                if (i) {
                    const d = new Date(i.due_date);
                    d.setDate(d.getDate() + 7);
                    i.due_date = d;
                }
                return [{ affectedRows: 1 }];
            }
        }

        // DELETE Queries
        if (q.startsWith('delete')) {
            if (q.includes('from books')) {
                mockBooks = mockBooks.filter(b => b.id != params[0]);
                return [{ affectedRows: 1 }];
            }
            if (q.includes('from members')) {
                mockMembers = mockMembers.filter(m => m.id != params[0]);
                return [{ affectedRows: 1 }];
            }
        }

        // Auth Queries
        if (q.includes('from users')) {
            const user = mockUsers.find(u => u.username === params[0] && u.password === params[1]);
            return [user ? [user] : []];
        }

        return [[]];
    }
};

async function query(sql, params) {
  if (isMock) return mock.query(sql, params);
  try {
    return await pool.query(sql, params);
  } catch (err) {
    console.warn('MySQL query failed, using mock:', err.message);
    isMock = true;
    return mock.query(sql, params);
  }
}

module.exports = {
  query
};
