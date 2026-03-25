// API base: use current origin when on http(s), else assume server on localhost:3000
var API_BASE = (typeof window !== 'undefined' && window.location && (window.location.protocol === 'http:' || window.location.protocol === 'https:'))
    ? window.location.origin
    : 'http://localhost:3000';
var API_URL = API_BASE + '/api';

// State Management
let currentSection = 'dashboard';
let debounceTimer;
let currentUser = JSON.parse(localStorage.getItem('lib_user')) || null;

// Initialize
document.addEventListener('DOMContentLoaded', function() {
    updateClock();
    setInterval(updateClock, 1000);
    setupEventListeners();

    // Form submit delegation: catch login forms even if handlers missed
    document.addEventListener('submit', function(e) {
        var form = e.target;
        if (!form || form.id !== 'form-admin-login' && form.id !== 'form-login') return;
        e.preventDefault();
        e.stopPropagation();
        if (form.id === 'form-admin-login') {
            var secretInput = document.getElementById('admin-secret-id');
            adminLogin(secretInput ? secretInput.value : '');
        } else {
            var u = document.getElementById('login-username');
            var p = document.getElementById('login-password');
            login(u ? u.value : '', p ? p.value : '');
        }
    }, true);

    // Ensure landing card clicks open auth (backup for inline onclick)
    var landing = document.getElementById('page-landing');
    if (landing) {
        landing.addEventListener('click', function(e) {
            var card = e.target.closest('.landing-card');
            if (!card) return;
            e.preventDefault();
            var isAdmin = card.querySelector('.fa-user-shield');
            if (isAdmin) showAuth('admin');
            else showAuth('member');
        });
    }

    var savedUser = localStorage.getItem('lib_user');
    if (savedUser) {
        currentUser = JSON.parse(savedUser);
        showApp();
    } else {
        showLanding();
    }
});

// Global exports for inline onclick handlers
window.showAuth = showAuth;
window.toggleAuth = toggleAuth;
window.showLanding = showLanding;
window.requestRenewal = requestRenewal;
window.borrowBook = borrowBook;
window.navigate = navigate;
window.logout = logout;
window.openEditBook = openEditBook;
window.deleteItem = deleteItem;
window.returnBook = returnBook;
window.openEditMember = openEditMember;
window.closeModal = closeModal;
window.openModal = openModal;
window.openCreateStudentModal = openCreateStudentModal;

// Auth Logic
function showLanding() {
    document.getElementById('page-landing').style.display = 'block';
    document.getElementById('page-login').style.display = 'none';
    document.getElementById('main-app').style.display = 'none';
}

let currentAuthRole = 'member'; // 'admin' | 'member'

function showAuth(role) {
    currentAuthRole = role;
    var landing = document.getElementById('page-landing');
    var loginPage = document.getElementById('page-login');
    var mainApp = document.getElementById('main-app');
    if (landing) landing.style.display = 'none';
    if (mainApp) mainApp.style.display = 'none';
    if (loginPage) {
        loginPage.style.display = 'flex';
        loginPage.style.visibility = 'visible';
    }
    var authTitle = document.getElementById('auth-title');
    var authSubtitle = document.getElementById('auth-subtitle');
    var authIcon = document.getElementById('auth-icon');
    var adminLogin = document.getElementById('admin-login-container');
    var studentLogin = document.getElementById('login-form-container');
    var regToggle = document.getElementById('reg-toggle-text');
    var registerContainer = document.getElementById('register-form-container');
    if (role === 'admin') {
        if (authTitle) authTitle.textContent = 'Admin Console';
        if (authSubtitle) authSubtitle.textContent = 'Enter your Secret ID to continue';
        if (authIcon) authIcon.innerHTML = '<i class="fas fa-user-shield"></i>';
        if (adminLogin) adminLogin.style.display = 'block';
        if (studentLogin) studentLogin.style.display = 'none';
        if (registerContainer) registerContainer.style.display = 'none';
        if (regToggle) regToggle.style.display = 'none';
    } else {
        if (authTitle) authTitle.textContent = 'Student Portal';
        if (authSubtitle) authSubtitle.textContent = 'Sign in with your Login ID and password';
        if (authIcon) authIcon.innerHTML = '<i class="fas fa-user-graduate"></i>';
        if (adminLogin) adminLogin.style.display = 'none';
        if (studentLogin) studentLogin.style.display = 'block';
        if (registerContainer) registerContainer.style.display = 'none';
        if (regToggle) regToggle.style.display = 'block';
        toggleAuth(false);
    }
}

function showLogin() {
    // Legacy support, default to landing
    showLanding();
}

function toggleAuth(isRegister) {
    document.getElementById('login-form-container').style.display = isRegister ? 'none' : 'block';
    document.getElementById('register-form-container').style.display = isRegister ? 'block' : 'none';
}

function showApp() {
    if (!currentUser) return;
    const displayName = currentUser.name || currentUser.username || 'User';
    var landing = document.getElementById('page-landing');
    var loginPage = document.getElementById('page-login');
    var mainApp = document.getElementById('main-app');
    if (landing) landing.style.display = 'none';
    if (loginPage) loginPage.style.display = 'none';
    if (mainApp) mainApp.style.display = 'flex';
    var un = document.getElementById('display-username');
    var roleEl = document.getElementById('display-role');
    if (un) un.innerText = displayName;
    if (roleEl) roleEl.innerText = currentUser.role || 'member';
    document.body.className = 'role-' + (currentUser.role || 'member');
    
    if (currentUser.role === 'member') {
        document.querySelectorAll('.staff-only').forEach(el => el.style.display = 'none');
        document.querySelectorAll('.member-only').forEach(el => el.style.display = 'flex');
        const welcomeEl = document.getElementById('member-welcome');
        if (welcomeEl) welcomeEl.textContent = `Welcome, ${displayName}`;
        // Strictly prevent dashboard access – go to member dashboard (My Books)
        if (currentSection === 'dashboard') {
            navigate('my-books');
        } else {
            navigate(currentSection);
        }
    } else {
        document.querySelectorAll('.staff-only').forEach(el => el.style.display = 'flex');
        document.querySelectorAll('.member-only').forEach(el => el.style.display = 'none');
        if (currentSection === 'my-books') {
            navigate('dashboard');
        } else {
            navigate(currentSection);
        }
    }
}

async function adminLogin(secretId) {
    console.log("Admin login clicked");
    try {
        var res = await fetch(API_URL + '/admin/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ secretId: String(secretId).trim() })
        });
        var data;
        try { data = await res.json(); } catch (_) { data = { error: 'Invalid response' }; }
        if (res.ok && data && data.role === 'admin') {
            currentUser = data;
            localStorage.setItem('lib_user', JSON.stringify(data));
            showToast('Welcome, Admin');
            showApp();
        } else {
            showToast((data && data.error) || 'Invalid Secret ID', 'error');
        }
    } catch (err) {
        showToast('Connection failed. Open http://localhost:3000 and ensure server is running.', 'error');
    }
}

async function login(username, password) {
    try {
        var res = await fetch(API_URL + '/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: username, password: password })
        });
        var data;
        try { data = await res.json(); } catch (_) { data = { error: 'Invalid response' }; }
        if (res.ok && data && (data.role === 'member' || data.role === 'staff')) {
            currentUser = data;
            localStorage.setItem('lib_user', JSON.stringify(data));
            showToast('Welcome, ' + (data.name || data.username || ''));
            showApp();
        } else {
            showToast((data && data.error) || 'Invalid Login ID or password', 'error');
        }
    } catch (err) {
        showToast('Connection failed. Open http://localhost:3000 and ensure server is running.', 'error');
    }
}

async function register(name, email, phone, username, password) {
    try {
        const res = await fetch(`${API_URL}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, email, phone, username, password })
        });
        const data = await res.json();
        
        if (res.ok) {
            showToast('Account created! Please sign in.');
            toggleAuth(false);
        } else {
            showToast(data.error, 'error');
        }
    } catch (err) {
        showToast('Registration failed', 'error');
    }
}

function logout() {
    localStorage.removeItem('lib_user');
    currentUser = null;
    showLogin();
    showToast('Logged out successfully');
}

// Clock
function updateClock() {
    const now = new Date();
    const clockEl = document.getElementById('live-clock');
    if (clockEl) {
        clockEl.innerText = now.toLocaleTimeString('en-GB', { hour12: false });
    }
}

// Navigation
function navigate(pageId) {
    // Role protection
    if (currentUser.role === 'member' && ['dashboard', 'members', 'issue-return'].includes(pageId)) {
        return navigate('my-books');
    }

    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
    
    const targetPage = document.getElementById(`page-${pageId}`);
    const targetNav = document.getElementById(`nav-${pageId}`);
    
    if (targetPage) targetPage.classList.add('active');
    if (targetNav) targetNav.classList.add('active');
    
    document.getElementById('page-title').innerText = pageId.charAt(0).toUpperCase() + pageId.slice(1).replace('-', ' / ');
    
    currentSection = pageId;
    loadPageData(pageId);
}

// Data Loaders
async function loadPageData(pageId) {
    try {
        switch(pageId) {
            case 'dashboard': await loadDashboard(); break;
            case 'books': await loadBooks(); break;
            case 'members': await loadMembers(); break;
            case 'issue-return': await loadIssueReturn(); break;
            case 'records': await loadRecords(); break;
            case 'my-books': await loadMyBooks(); break;
        }
    } catch (err) {
        showToast(`Failed to load ${pageId} data`, 'error');
    }
}

async function loadDashboard() {
    const res = await fetch(`${API_URL}/issues/stats/dashboard`);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);

    document.getElementById('stat-total-books').innerText = data.total_books;
    document.getElementById('stat-active-members').innerText = data.total_members;
    document.getElementById('stat-books-issued').innerText = data.active_issues;
    document.getElementById('stat-overdue').innerText = data.overdue_books;

    document.getElementById('greeting').innerText = `Good day, ${currentUser.name || currentUser.username}`;

    const tbody = document.querySelector('#table-recent tbody');
    tbody.innerHTML = data.recent_issues.map(row => `
        <tr>
            <td>${row.book_title}</td>
            <td>${row.member_name}</td>
            <td>${formatDate(row.created_at)}</td>
            <td><span class="status-badge badge-${getStatusColor(row.status)}">${row.status}</span></td>
        </tr>
    `).join('');
}

async function loadBooks(search = '') {
    const res = await fetch(`${API_URL}/books${search ? `?search=${search}` : ''}`);
    const data = await res.json();
    const tbody = document.querySelector('#table-books tbody');
    
    const isStaff = currentUser.role !== 'member';

    tbody.innerHTML = data.map(b => `
        <tr>
            <td>#${b.id}</td>
            <td>
                <strong>${b.title}</strong><br>
                <small style="color:var(--text-dim)">ISBN: ${b.isbn}</small>
            </td>
            <td>${b.author}</td>
            <td>${b.category || '-'}</td>
            <td>
                <span style="color: ${b.available_copies > 0 ? 'var(--green)' : 'var(--red)'}; font-weight: bold">
                    ${b.available_copies}
                </span>
            </td>
            <td>${b.total_copies}</td>
            <td class="table-actions">
                ${isStaff ? `
                    <button class="btn-icon" onclick="openEditBook(${b.id})" title="Edit"><i class="fas fa-edit"></i></button>
                    <button class="btn-icon delete" onclick="deleteItem('books', ${b.id})" title="Delete"><i class="fas fa-trash"></i></button>
                ` : `
                    <button class="btn btn-purple btn-sm" onclick="borrowBook(${b.id})" ${b.available_copies <= 0 ? 'disabled' : ''}>
                        ${b.available_copies > 0 ? 'Borrow' : 'Waitlist'}
                    </button>
                `}
            </td>
        </tr>
    `).join('');
}

async function borrowBook(bookId) {
    if (!currentUser || !currentUser.member_id) {
        showToast('Only registered members can borrow books', 'error');
        return;
    }

    try {
        const res = await fetch(`${API_URL}/issues/issue`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                book_id: bookId,
                member_id: currentUser.member_id,
                due_date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
            })
        });
        
        const data = await res.json();
        if (res.ok) {
            showToast('Book borrowed successfully!', 'success');
            loadBooks(); // Refresh catalog
        } else {
            showToast(data.error, 'error');
        }
    } catch (err) {
        showToast('Borrowing failed', 'error');
    }
}

async function loadMembers(search = '') {
    const res = await fetch(`${API_URL}/members${search ? `?search=${search}` : ''}`);
    const data = await res.json();
    const tbody = document.querySelector('#table-members tbody');
    
    tbody.innerHTML = data.map(m => `
        <tr>
            <td>#${m.id}</td>
            <td><strong>${m.name}</strong></td>
            <td>${m.email}</td>
            <td>${m.username || '-'}</td>
            <td>${m.phone || '-'}</td>
            <td><span class="badge ${m.membership_type}">${m.membership_type}</span></td>
            <td><span class="badge ${m.status}">${m.status}</span></td>
            <td class="table-actions">
                <button class="btn-icon" onclick="openEditMember(${m.id})" title="Edit"><i class="fas fa-edit"></i></button>
                <button class="btn-icon delete" onclick="deleteItem('members', ${m.id})" title="Delete"><i class="fas fa-trash"></i></button>
            </td>
        </tr>
    `).join('');
}

async function loadMyBooks() {
    if (!currentUser || !currentUser.member_id) return;
    try {
        const res = await fetch(`${API_URL}/issues`);
        const allIssues = res.ok ? await res.json() : [];
        const myIssues = Array.isArray(allIssues) ? allIssues.filter(i => i.member_id == currentUser.member_id) : [];
        const tbody = document.querySelector('#table-my-books tbody');
        if (!tbody) return;
        tbody.innerHTML = myIssues.map(i => {
            const fine = Number(i.fine_amount) || 0;
            return `
            <tr>
                <td>${i.book_title || '-'}</td>
                <td>${formatDate(i.issue_date)}</td>
                <td>${formatDate(i.due_date)}</td>
                <td style="color:${fine > 0 ? 'var(--red)' : 'inherit'}">₹${fine}</td>
                <td><span class="status-badge badge-${getStatusColor(i.status)}">${i.status}</span></td>
                <td>
                    ${i.status === 'issued' ? `<button class="btn btn-purple btn-sm" onclick="requestRenewal(${i.id})">Renew</button>` : '-'}
                </td>
            </tr>
        `}).join('');
    } catch (err) {
        showToast('Failed to load your books', 'error');
    }
}

async function requestRenewal(issueId) {
    try {
        const res = await fetch(`${API_URL}/issues/renew/${issueId}`, { method: 'POST' });
        const data = await res.json();
        if (res.ok) {
            showToast(data.message, 'success');
            loadMyBooks();
        } else {
            showToast(data.error, 'error');
        }
    } catch (err) {
        showToast('Renewal request failed', 'error');
    }
}

async function loadIssueReturn() {
    const [booksRes, membersRes] = await Promise.all([
        fetch(`${API_URL}/books`),
        fetch(`${API_URL}/members`)
    ]);
    
    const books = await booksRes.json();
    const members = await membersRes.json();

    const bookSelect = document.getElementById('select-issue-book');
    const memberSelect = document.getElementById('select-issue-member');

    bookSelect.innerHTML = '<option value="">Select available book...</option>' + 
        books.filter(b => b.available_copies > 0).map(b => `<option value="${b.id}">${b.title} (${b.available_copies} left)</option>`).join('');

    memberSelect.innerHTML = '<option value="">Select active member...</option>' + 
        members.filter(m => m.status === 'active').map(m => `<option value="${m.id}">${m.name}</option>`).join('');

    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 14);
    document.getElementById('input-issue-duedate').value = dueDate.toISOString().split('T')[0];

    loadIssuedTable();
}

async function loadIssuedTable() {
    const res = await fetch(`${API_URL}/issues?status=issued`);
    const data = await res.json();
    const tbody = document.querySelector('#table-issued tbody');
    const today = new Date();

    tbody.innerHTML = data.map(i => {
        const isOverdue = new Date(i.due_date) < today;
        return `
            <tr class="${isOverdue ? 'overdue-row' : ''}">
                <td>${i.book_title}</td>
                <td>${i.member_name}</td>
                <td style="color: ${isOverdue ? 'var(--red)' : 'inherit'}">
                    ${isOverdue ? '<i class="fas fa-exclamation-triangle"></i> ' : ''}
                    ${formatDate(i.due_date)}
                </td>
                <td class="table-actions">
                    <button class="btn btn-green btn-sm" onclick="returnBook(${i.id})">Return</button>
                </td>
            </tr>
        `;
    }).join('');
}

async function loadRecords(filter = 'all') {
    const url = filter === 'all' ? `${API_URL}/issues` : `${API_URL}/issues?status=${filter}`;
    const res = await fetch(url);
    const data = await res.json();
    
    // Filter for members
    const displayData = currentUser.role === 'member' ? data.filter(r => r.member_id == currentUser.member_id) : data;

    const tbody = document.querySelector('#table-records tbody');
    tbody.innerHTML = displayData.map(r => `
        <tr>
            <td>${r.book_title}</td>
            <td>${r.member_name}</td>
            <td>${formatDate(r.issue_date)}</td>
            <td>${formatDate(r.due_date)}</td>
            <td>${r.return_date ? formatDate(r.return_date) : '-'}</td>
            <td style="color: ${(r.fine_amount || 0) > 0 ? 'var(--red)' : 'inherit'}">₹${r.fine_amount ?? 0}</td>
            <td><span class="status-badge badge-${getStatusColor(r.status)}">${r.status}</span></td>
        </tr>
    `).join('');
}

// Edit Dialogs
async function openEditBook(id) {
    const res = await fetch(`${API_URL}/books`);
    const books = await res.json();
    const book = books.find(b => b.id == id);
    if (!book) return;

    document.getElementById('edit-book-id').value = book.id;
    document.getElementById('edit-book-title').value = book.title;
    document.getElementById('edit-book-author').value = book.author;
    document.getElementById('edit-book-isbn').value = book.isbn;
    document.getElementById('edit-book-category').value = book.category;
    document.getElementById('edit-book-total').value = book.total_copies;
    document.getElementById('edit-book-year').value = book.published_year;
    
    openModal('modal-edit-book');
}

async function openEditMember(id) {
    const res = await fetch(`${API_URL}/members`);
    const members = await res.json();
    const member = members.find(m => m.id == id);
    if (!member) return;

    document.getElementById('edit-member-id').value = member.id;
    document.getElementById('edit-member-name').value = member.name;
    document.getElementById('edit-member-email').value = member.email;
    document.getElementById('edit-member-phone').value = member.phone;
    document.getElementById('edit-member-type').value = member.membership_type;
    document.getElementById('edit-member-status').value = member.status;
    document.getElementById('edit-member-address').value = member.address;

    openModal('modal-edit-member');
}

// Actions
async function returnBook(id) {
    try {
        const res = await fetch(`${API_URL}/issues/return/${id}`, { method: 'POST' });
        const data = await res.json();
        if (res.ok) {
            showToast(data.message, 'success');
            loadIssueReturn();
        } else {
            showToast(data.error, 'error');
        }
    } catch (err) {
        showToast('Network error on return', 'error');
    }
}

async function deleteItem(type, id) {
    if (!confirm(`Are you sure you want to delete this ${type.slice(0, -1)}?`)) return;
    try {
        const res = await fetch(`${API_URL}/${type}/${id}`, { method: 'DELETE' });
        if (res.ok) {
            showToast('Deleted successfully');
            loadPageData(currentSection);
        } else {
            const data = await res.json();
            showToast(data.error, 'error');
        }
    } catch (err) {
        showToast('Delete failed', 'error');
    }
}

// Event Listeners
function setupEventListeners() {
    // Admin login (Secret ID) – backup; submit is also handled by document delegation
    var formAdminLogin = document.getElementById('form-admin-login');
    if (formAdminLogin) {
        formAdminLogin.addEventListener('submit', function(e) { e.preventDefault(); adminLogin(document.getElementById('admin-secret-id').value); });
    }

    // Student login – backup; submit is also handled by document delegation
    var formLogin = document.getElementById('form-login');
    if (formLogin) {
        formLogin.addEventListener('submit', function(e) {
            e.preventDefault();
            login(document.getElementById('login-username').value, document.getElementById('login-password').value);
        });
    }

    // Registration
    const regForm = document.getElementById('form-register');
    if (regForm) {
        regForm.onsubmit = (e) => {
            e.preventDefault();
            register(
                document.getElementById('reg-name').value,
                document.getElementById('reg-email').value,
                document.getElementById('reg-phone').value,
                document.getElementById('reg-username').value,
                document.getElementById('reg-password').value
            );
        };
    }

    const bookSearchItem = document.getElementById('input-books-search');
    if (bookSearchItem) {
        bookSearchItem.addEventListener('input', (e) => {
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(() => loadBooks(e.target.value), 400);
        });
    }

    const memberSearchItem = document.getElementById('input-members-search');
    if (memberSearchItem) {
        memberSearchItem.addEventListener('input', (e) => {
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(() => loadMembers(e.target.value), 400);
        });
    }

    // Add Book
    const addBookForm = document.getElementById('form-add-book');
    if (addBookForm) {
        addBookForm.onsubmit = async (e) => {
            e.preventDefault();
            const data = {
                title: document.getElementById('book-title').value,
                author: document.getElementById('book-author').value,
                isbn: document.getElementById('book-isbn').value,
                category: document.getElementById('book-category').value,
                total_copies: parseInt(document.getElementById('book-total').value),
                published_year: parseInt(document.getElementById('book-year').value)
            };
            const res = await fetch(`${API_URL}/books`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            if (res.ok) {
                showToast('Book added successfully');
                closeModal('modal-add-book');
                addBookForm.reset();
                loadBooks();
            }
        };
    }

    // Edit Book
    const editBookForm = document.getElementById('form-edit-book');
    if (editBookForm) {
        editBookForm.onsubmit = async (e) => {
            e.preventDefault();
            const id = document.getElementById('edit-book-id').value;
            const data = {
                title: document.getElementById('edit-book-title').value,
                author: document.getElementById('edit-book-author').value,
                isbn: document.getElementById('edit-book-isbn').value,
                category: document.getElementById('edit-book-category').value,
                total_copies: parseInt(document.getElementById('edit-book-total').value),
                published_year: parseInt(document.getElementById('edit-book-year').value)
            };
            const res = await fetch(`${API_URL}/books/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            if (res.ok) {
                showToast('Book updated successfully');
                closeModal('modal-edit-book');
                loadBooks();
            }
        };
    }

    // Add Member
    const addMemberForm = document.getElementById('form-add-member');
    if (addMemberForm) {
        addMemberForm.onsubmit = async (e) => {
            e.preventDefault();
            const data = {
                name: document.getElementById('member-name').value,
                email: document.getElementById('member-email').value,
                phone: document.getElementById('member-phone').value,
                membership_type: document.getElementById('member-type').value,
                address: document.getElementById('member-address').value
            };
            const res = await fetch(`${API_URL}/members`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            if (res.ok) {
                showToast('Member registered successfully');
                closeModal('modal-add-member');
                addMemberForm.reset();
                loadMembers();
            }
        };
    }

    // Edit Member
    const editMemberForm = document.getElementById('form-edit-member');
    if (editMemberForm) {
        editMemberForm.onsubmit = async (e) => {
            e.preventDefault();
            const id = document.getElementById('edit-member-id').value;
            const data = {
                name: document.getElementById('edit-member-name').value,
                email: document.getElementById('edit-member-email').value,
                phone: document.getElementById('edit-member-phone').value,
                membership_type: document.getElementById('edit-member-type').value,
                address: document.getElementById('edit-member-address').value,
                status: document.getElementById('edit-member-status').value
            };
            const res = await fetch(`${API_URL}/members/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            if (res.ok) {
                showToast('Member updated successfully');
                closeModal('modal-edit-member');
                loadMembers();
            }
        };
    }

    // Issue Book
    const issueForm = document.getElementById('form-issuebook');
    if (issueForm) {
        issueForm.onsubmit = async (e) => {
            e.preventDefault();
            const data = {
                book_id: document.getElementById('select-issue-book').value,
                member_id: document.getElementById('select-issue-member').value,
                due_date: document.getElementById('input-issue-duedate').value
            };
            const res = await fetch(`${API_URL}/issues/issue`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            if (res.ok) {
                showToast('Book issued successfully');
                issueForm.reset();
                loadIssueReturn();
            } else {
                const err = await res.json();
                showToast(err.error, 'error');
            }
        };
    }

    // Create student account (admin)
    const formCreateStudent = document.getElementById('form-create-student');
    if (formCreateStudent) {
        formCreateStudent.onsubmit = async (e) => {
            e.preventDefault();
            const name = document.getElementById('create-student-name').value.trim();
            const email = document.getElementById('create-student-email').value.trim();
            const password = document.getElementById('create-student-password').value;
            try {
                const res = await fetch(`${API_URL}/auth/create-student`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ name, email, password })
                });
                const data = await res.json();
                if (res.ok) {
                    document.getElementById('created-login-id').textContent = 'Login ID: ' + data.loginId + ' (password: the one you set)';
                    document.getElementById('create-student-success').style.display = 'block';
                    document.getElementById('form-create-student-wrap').style.display = 'none';
                    formCreateStudent.reset();
                    loadMembers();
                } else {
                    showToast(data.error || 'Failed to create account', 'error');
                }
            } catch (err) {
                showToast('Request failed', 'error');
            }
        };
    }

    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.onclick = () => {
            document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            loadRecords(btn.dataset.filter);
        };
    });

    window.onclick = (e) => {
        if (e.target.classList.contains('modal-overlay')) {
            document.querySelectorAll('.modal-overlay').forEach(m => m.style.display = 'none');
        }
    };
}

// Utils
function openModal(id) { document.getElementById(id).style.display = 'flex'; }
function closeModal(id) { document.getElementById(id).style.display = 'none'; }
function openCreateStudentModal() {
    const successEl = document.getElementById('create-student-success');
    const formWrap = document.getElementById('form-create-student-wrap');
    if (successEl) successEl.style.display = 'none';
    if (formWrap) formWrap.style.display = 'block';
    openModal('modal-create-student');
}

function formatDate(dateStr) {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${date.getDate().toString().padStart(2, '0')} ${months[date.getMonth()]} ${date.getFullYear()}`;
}

function getStatusColor(status) {
    const map = { 'issued': 'purple', 'returned': 'green', 'overdue': 'red', 'available': 'green' };
    return map[status] || 'gold';
}

function showToast(msg, type = 'success') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = 'toast animate-slide';
    toast.style.borderLeft = `4px solid ${type === 'success' ? 'var(--green)' : 'var(--red)'}`;
    toast.innerText = msg;
    container.appendChild(toast);
    setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}
