/* ========================================
   BloodConnect — Shared Utilities
   ======================================== */

const API_BASE = '/api';

/* ---------- API Fetch Helper ---------- */
async function api(endpoint, options = {}) {
  try {
    const res = await fetch(`${API_BASE}${endpoint}`, {
      headers: { 'Content-Type': 'application/json', ...options.headers },
      ...options,
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || `Request failed (${res.status})`);
    }
    return data;
  } catch (err) {
    if (err.message === 'Failed to fetch') {
      throw new Error('Cannot connect to server. Is the backend running?');
    }
    throw err;
  }
}

/* ---------- Session Helpers ---------- */
function getSession() {
  try {
    const raw = localStorage.getItem('bloodconnect_session');
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

function setSession(data) {
  localStorage.setItem('bloodconnect_session', JSON.stringify(data));
}

function clearSession() {
  localStorage.removeItem('bloodconnect_session');
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
  const session = getSession();
  if (session) {
    const userName = document.querySelector('.sidebar-user .user-name');
    const userRole = document.querySelector('.sidebar-user .user-role');
    const userAvatar = document.querySelector('.sidebar-user .avatar');
    if (userName) userName.textContent = session.name;
    if (userRole) userRole.textContent = session.role;
    if (userAvatar) userAvatar.textContent = session.name.split(' ').map(n => n[0]).join('').toUpperCase();
  }

  // Update pending request badge (async)
  api('/requests/stats').then(stats => {
    const reqBadge = document.querySelector('[data-badge="requests"]');
    if (reqBadge) {
      reqBadge.textContent = stats.pending;
      if (stats.pending === 0) reqBadge.style.display = 'none';
    }
  }).catch(() => { });
}

/* ---------- Auth Guard ---------- */
function requireAuth() {
  const session = getSession();
  if (!session) {
    window.location.href = 'login.html';
    return null;
  }
  return session;
}

function logout() {
  clearSession();
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
