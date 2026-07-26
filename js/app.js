/* ========================================
   BloodConnect — Shared Utilities & Data
   ======================================== */

const APP_PREFIX = 'bloodconnect_';

/* ---------- Seed Data ---------- */
const SEED_DONORS = [
  { id: 'D001', name: 'Aarav Sharma', email: 'aarav@email.com', phone: '9876543210', bloodGroup: 'A+', age: 28, gender: 'Male', address: 'Mumbai, Maharashtra', lastDonation: '2026-05-15', totalDonations: 4, totalLitres: 1.8, status: 'eligible', registered: '2024-01-10' },
  { id: 'D002', name: 'Priya Patel', email: 'priya@email.com', phone: '9876543211', bloodGroup: 'O+', age: 32, gender: 'Female', address: 'Delhi, NCR', lastDonation: '2026-07-01', totalDonations: 6, totalLitres: 2.7, status: 'ineligible', registered: '2023-06-20' },
  { id: 'D003', name: 'Rohan Verma', email: 'rohan@email.com', phone: '9876543212', bloodGroup: 'B+', age: 25, gender: 'Male', address: 'Bangalore, Karnataka', lastDonation: '2026-03-10', totalDonations: 2, totalLitres: 0.9, status: 'eligible', registered: '2025-02-14' },
  { id: 'D004', name: 'Sneha Reddy', email: 'sneha@email.com', phone: '9876543213', bloodGroup: 'AB+', age: 30, gender: 'Female', address: 'Hyderabad, Telangana', lastDonation: '2026-06-20', totalDonations: 3, totalLitres: 1.35, status: 'ineligible', registered: '2024-08-05' },
  { id: 'D005', name: 'Vikram Singh', email: 'vikram@email.com', phone: '9876543214', bloodGroup: 'O-', age: 35, gender: 'Male', address: 'Chandigarh, Punjab', lastDonation: '2026-01-25', totalDonations: 8, totalLitres: 3.6, status: 'eligible', registered: '2022-11-30' },
  { id: 'D006', name: 'Ananya Iyer', email: 'ananya@email.com', phone: '9876543215', bloodGroup: 'A-', age: 27, gender: 'Female', address: 'Chennai, Tamil Nadu', lastDonation: '2026-04-12', totalDonations: 5, totalLitres: 2.25, status: 'eligible', registered: '2023-09-18' },
  { id: 'D007', name: 'Karthik Nair', email: 'karthik@email.com', phone: '9876543216', bloodGroup: 'B-', age: 29, gender: 'Male', address: 'Kochi, Kerala', lastDonation: '2026-02-28', totalDonations: 3, totalLitres: 1.35, status: 'eligible', registered: '2024-04-22' },
  { id: 'D008', name: 'Meera Joshi', email: 'meera@email.com', phone: '9876543217', bloodGroup: 'AB-', age: 31, gender: 'Female', address: 'Pune, Maharashtra', lastDonation: '2026-07-15', totalDonations: 1, totalLitres: 0.45, status: 'ineligible', registered: '2026-01-08' },
  { id: 'D009', name: 'Arjun Kumar', email: 'arjun@email.com', phone: '9876543218', bloodGroup: 'O+', age: 26, gender: 'Male', address: 'Jaipur, Rajasthan', lastDonation: '2026-05-30', totalDonations: 4, totalLitres: 1.8, status: 'eligible', registered: '2024-07-12' },
  { id: 'D010', name: 'Divya Menon', email: 'divya@email.com', phone: '9876543219', bloodGroup: 'A+', age: 33, gender: 'Female', address: 'Kolkata, West Bengal', lastDonation: '2026-06-05', totalDonations: 7, totalLitres: 3.15, status: 'ineligible', registered: '2023-03-01' },
  { id: 'D011', name: 'Rahul Gupta', email: 'rahul@email.com', phone: '9876543220', bloodGroup: 'B+', age: 24, gender: 'Male', address: 'Lucknow, Uttar Pradesh', lastDonation: '2026-04-20', totalDonations: 2, totalLitres: 0.9, status: 'eligible', registered: '2025-06-10' },
  { id: 'D012', name: 'Ishita Chowdhury', email: 'ishita@email.com', phone: '9876543221', bloodGroup: 'O-', age: 28, gender: 'Female', address: 'Guwahati, Assam', lastDonation: '2026-03-18', totalDonations: 3, totalLitres: 1.35, status: 'eligible', registered: '2024-12-15' },
];

const SEED_INVENTORY = [
  { bloodGroup: 'A+', units: 24, litres: 10.8, lastUpdated: '2026-07-25' },
  { bloodGroup: 'A-', units: 8, litres: 3.6, lastUpdated: '2026-07-24' },
  { bloodGroup: 'B+', units: 18, litres: 8.1, lastUpdated: '2026-07-25' },
  { bloodGroup: 'B-', units: 5, litres: 2.25, lastUpdated: '2026-07-23' },
  { bloodGroup: 'AB+', units: 12, litres: 5.4, lastUpdated: '2026-07-25' },
  { bloodGroup: 'AB-', units: 3, litres: 1.35, lastUpdated: '2026-07-22' },
  { bloodGroup: 'O+', units: 30, litres: 13.5, lastUpdated: '2026-07-26' },
  { bloodGroup: 'O-', units: 6, litres: 2.7, lastUpdated: '2026-07-24' },
];

const SEED_REQUESTS = [
  { id: 'R001', hospital: 'City General Hospital', bloodGroup: 'O+', units: 3, urgency: 'urgent', status: 'pending', patient: 'Ravi Mehta', requestDate: '2026-07-26', notes: 'Emergency surgery scheduled' },
  { id: 'R002', hospital: 'Apollo Medical Center', bloodGroup: 'A+', units: 2, urgency: 'normal', status: 'approved', patient: 'Sunita Devi', requestDate: '2026-07-25', notes: 'Scheduled transfusion' },
  { id: 'R003', hospital: 'Max Super Specialty', bloodGroup: 'B-', units: 1, urgency: 'critical', status: 'dispatched', patient: 'Amit Saxena', requestDate: '2026-07-24', notes: 'Accident victim' },
  { id: 'R004', hospital: 'Fortis Hospital', bloodGroup: 'AB+', units: 2, urgency: 'normal', status: 'pending', patient: 'Lakshmi Rao', requestDate: '2026-07-26', notes: 'Post-operative care' },
  { id: 'R005', hospital: 'AIIMS Delhi', bloodGroup: 'O-', units: 4, urgency: 'critical', status: 'pending', patient: 'Manoj Tiwari', requestDate: '2026-07-26', notes: 'Multiple units needed for surgery' },
  { id: 'R006', hospital: 'Medanta Hospital', bloodGroup: 'A-', units: 1, urgency: 'normal', status: 'approved', patient: 'Kavita Sharma', requestDate: '2026-07-23', notes: 'Routine procedure' },
];

const SEED_USERS = [
  { id: 'U001', username: 'admin', password: 'admin123', name: 'Admin User', role: 'admin', email: 'admin@bloodconnect.com' },
  { id: 'U002', username: 'staff', password: 'staff123', name: 'Hospital Staff', role: 'staff', email: 'staff@hospital.com' },
  { id: 'U003', username: 'donor', password: 'donor123', name: 'Aarav Sharma', role: 'donor', email: 'aarav@email.com', donorId: 'D001' },
];

const SEED_DONATIONS = [
  { id: 'DN001', donorId: 'D001', donorName: 'Aarav Sharma', bloodGroup: 'A+', litres: 0.45, date: '2026-05-15', bloodBank: 'Central Blood Bank', status: 'completed' },
  { id: 'DN002', donorId: 'D002', donorName: 'Priya Patel', bloodGroup: 'O+', litres: 0.45, date: '2026-07-01', bloodBank: 'City Blood Center', status: 'completed' },
  { id: 'DN003', donorId: 'D003', donorName: 'Rohan Verma', bloodGroup: 'B+', litres: 0.45, date: '2026-03-10', bloodBank: 'Central Blood Bank', status: 'completed' },
  { id: 'DN004', donorId: 'D005', donorName: 'Vikram Singh', bloodGroup: 'O-', litres: 0.45, date: '2026-01-25', bloodBank: 'Metro Blood Bank', status: 'completed' },
  { id: 'DN005', donorId: 'D006', donorName: 'Ananya Iyer', bloodGroup: 'A-', litres: 0.45, date: '2026-04-12', bloodBank: 'Central Blood Bank', status: 'completed' },
  { id: 'DN006', donorId: 'D009', donorName: 'Arjun Kumar', bloodGroup: 'O+', litres: 0.45, date: '2026-05-30', bloodBank: 'City Blood Center', status: 'completed' },
  { id: 'DN007', donorId: 'D010', donorName: 'Divya Menon', bloodGroup: 'A+', litres: 0.45, date: '2026-06-05', bloodBank: 'Metro Blood Bank', status: 'completed' },
  { id: 'DN008', donorId: 'D004', donorName: 'Sneha Reddy', bloodGroup: 'AB+', litres: 0.45, date: '2026-06-20', bloodBank: 'Central Blood Bank', status: 'completed' },
];

/* ---------- Data Helpers ---------- */
function getData(key) {
  try {
    const raw = localStorage.getItem(APP_PREFIX + key);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

function setData(key, value) {
  localStorage.setItem(APP_PREFIX + key, JSON.stringify(value));
}

function seedIfNeeded() {
  if (!getData('seeded')) {
    setData('donors', SEED_DONORS);
    setData('inventory', SEED_INVENTORY);
    setData('requests', SEED_REQUESTS);
    setData('users', SEED_USERS);
    setData('donations', SEED_DONATIONS);
    setData('seeded', true);
  }
}

function generateId(prefix) {
  const items = getData(prefix === 'D' ? 'donors' : prefix === 'R' ? 'requests' : prefix === 'DN' ? 'donations' : 'users');
  const num = items ? items.length + 1 : 1;
  return `${prefix}${String(num).padStart(3, '0')}`;
}

/* ---------- Eligibility Check ---------- */
function checkEligibility(lastDonationDate) {
  if (!lastDonationDate) return { eligible: true, daysLeft: 0 };
  const last = new Date(lastDonationDate);
  const now = new Date();
  const diffDays = Math.floor((now - last) / (1000 * 60 * 60 * 24));
  const eligible = diffDays >= 56;
  return { eligible, daysLeft: eligible ? 0 : 56 - diffDays, daysSince: diffDays };
}

/* ---------- Date Formatting ---------- */
function formatDate(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function timeAgo(dateStr) {
  const d = new Date(dateStr);
  const now = new Date();
  const diff = Math.floor((now - d) / 1000);
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return formatDate(dateStr);
}

/* ---------- Toast Notifications ---------- */
function showToast(message, type = 'info') {
  let container = document.querySelector('.toast-container');
  if (!container) {
    container = document.createElement('div');
    container.className = 'toast-container';
    document.body.appendChild(container);
  }
  const icons = { success: '✓', error: '✕', warning: '⚠', info: 'ℹ' };
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `
    <span class="toast-icon">${icons[type] || icons.info}</span>
    <span class="toast-message">${message}</span>
    <button class="toast-close" onclick="this.parentElement.remove()">✕</button>
  `;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 4000);
}

/* ---------- Sidebar & Navigation ---------- */
function initSidebar() {
  const menuToggle = document.querySelector('.menu-toggle');
  const sidebar = document.querySelector('.sidebar');
  const overlay = document.querySelector('.sidebar-overlay');

  if (menuToggle && sidebar) {
    menuToggle.addEventListener('click', () => {
      sidebar.classList.toggle('open');
      if (overlay) overlay.classList.toggle('active');
    });
  }

  if (overlay) {
    overlay.addEventListener('click', () => {
      sidebar.classList.remove('open');
      overlay.classList.remove('active');
    });
  }

  // Set active nav link
  const currentPage = window.location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.nav-link').forEach(link => {
    const href = link.getAttribute('href');
    if (href === currentPage) {
      link.classList.add('active');
    }
  });

  // Update user info in sidebar
  const session = getData('session');
  if (session) {
    const userName = document.querySelector('.sidebar-user .user-name');
    const userRole = document.querySelector('.sidebar-user .user-role');
    const userAvatar = document.querySelector('.sidebar-user .avatar');
    if (userName) userName.textContent = session.name;
    if (userRole) userRole.textContent = session.role;
    if (userAvatar) userAvatar.textContent = session.name.split(' ').map(n => n[0]).join('').toUpperCase();
  }

  // Update pending request badge
  const requests = getData('requests') || [];
  const pending = requests.filter(r => r.status === 'pending').length;
  const reqBadge = document.querySelector('[data-badge="requests"]');
  if (reqBadge) {
    reqBadge.textContent = pending;
    if (pending === 0) reqBadge.style.display = 'none';
  }
}

/* ---------- Auth Guard ---------- */
function requireAuth() {
  const session = getData('session');
  if (!session) {
    window.location.href = 'login.html';
    return null;
  }
  return session;
}

function logout() {
  localStorage.removeItem(APP_PREFIX + 'session');
  window.location.href = 'login.html';
}

/* ---------- Modal Helpers ---------- */
function openModal(id) {
  const modal = document.getElementById(id);
  if (modal) modal.classList.add('active');
}

function closeModal(id) {
  const modal = document.getElementById(id);
  if (modal) modal.classList.remove('active');
}

/* ---------- Tab System ---------- */
function initTabs() {
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const tabGroup = btn.closest('.tabs');
      const targetId = btn.dataset.tab;
      tabGroup.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const parent = tabGroup.parentElement;
      parent.querySelectorAll('.tab-content').forEach(content => {
        content.classList.toggle('active', content.id === targetId);
      });
    });
  });
}

/* ---------- Stat Counter Animation ---------- */
function animateCounters() {
  document.querySelectorAll('[data-count]').forEach(el => {
    const target = parseInt(el.dataset.count);
    const duration = 1500;
    const start = performance.now();
    const initial = 0;

    function update(now) {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      el.textContent = Math.floor(initial + (target - initial) * eased);
      if (progress < 1) requestAnimationFrame(update);
    }
    requestAnimationFrame(update);
  });
}

/* ---------- Init ---------- */
document.addEventListener('DOMContentLoaded', () => {
  seedIfNeeded();
});
