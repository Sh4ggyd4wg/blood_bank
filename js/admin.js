/* ========================================
   BloodConnect — Admin Panel Logic
   ======================================== */

document.addEventListener('DOMContentLoaded', () => {
  const session = requireAuth();
  if (!session) return;
  if (session.role !== 'admin') {
    showToast('Access denied. Admin only.', 'error');
    setTimeout(() => window.location.href = 'index.html', 1500);
    return;
  }
  initSidebar();
  initTabs();
  loadAdminDashboard();
  setupUserManagement();
  setupReportGeneration();
});

async function loadAdminDashboard() {
  try {
    const stats = await api('/admin/stats');
    const inventory = await api('/admin/inventory');
    const donations = await api('/admin/donations');
    const requests = await api('/requests');

    const el = (id, val) => { const e = document.getElementById(id); if (e) e.textContent = val; };
    el('adminTotalDonors', stats.totalDonors);
    el('adminTotalUnits', stats.totalUnits);
    el('adminTotalRequests', stats.totalRequests);
    el('adminTotalUsers', stats.totalUsers);

    renderBloodGroupChart(inventory);
    renderDonationChart(donations);
    renderAdminActivity(requests, donations);
  } catch (err) {
    showToast(err.message || 'Failed to load admin dashboard', 'error');
  }
}

function renderBloodGroupChart(inventory) {
  const container = document.getElementById('bloodGroupChart');
  if (!container) return;

  const maxUnits = Math.max(...inventory.map(i => i.units), 1);

  container.innerHTML = `
    <div style="display:flex;align-items:flex-end;gap:0.75rem;height:200px;padding:0 1rem;">
      ${inventory.map(item => {
    const height = Math.max((item.units / maxUnits) * 100, 5);
    let color = 'var(--accent-green)';
    if (item.units <= 2) color = 'var(--red-primary)';
    else if (item.units <= 5) color = 'var(--accent-amber)';

    return `
        <div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:0.35rem;">
          <div style="font-size:0.75rem;font-weight:600;">${item.units}</div>
          <div style="width:100%;height:${height}%;background:${color};border-radius:4px 4px 0 0;min-height:8px;transition:height 0.5s ease;"></div>
          <div style="font-size:0.7rem;font-weight:600;color:var(--text-secondary);">${item.bloodGroup}</div>
        </div>`;
  }).join('')}
    </div>`;
}

function renderDonationChart(donations) {
  const container = document.getElementById('donationChart');
  if (!container) return;

  // Group by month
  const months = {};
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  donations.forEach(d => {
    const date = new Date(d.date);
    const key = `${date.getFullYear()}-${date.getMonth()}`;
    const label = `${monthNames[date.getMonth()]} ${date.getFullYear()}`;
    if (!months[key]) months[key] = { label, count: 0 };
    months[key].count++;
  });

  const data = Object.values(months).slice(-6);
  if (data.length === 0) {
    container.innerHTML = '<div style="text-align:center;padding:2rem;color:var(--text-muted);">No donation data available</div>';
    return;
  }

  const maxCount = Math.max(...data.map(d => d.count), 1);

  container.innerHTML = `
    <div style="display:flex;align-items:flex-end;gap:1rem;height:180px;padding:0 1rem;">
      ${data.map(m => {
    const height = Math.max((m.count / maxCount) * 100, 5);
    return `
        <div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:0.35rem;">
          <div style="font-size:0.75rem;font-weight:600;">${m.count}</div>
          <div style="width:100%;height:${height}%;background:var(--red-primary);border-radius:4px 4px 0 0;min-height:8px;"></div>
          <div style="font-size:0.65rem;color:var(--text-muted);">${m.label}</div>
        </div>`;
  }).join('')}
    </div>`;
}

function renderAdminActivity(requests, donations) {
  const container = document.getElementById('adminActivity');
  if (!container) return;

  const activities = [
    ...requests.slice(0, 3).map(r => ({
      dot: r.status === 'pending' ? 'amber' : r.status === 'approved' ? 'blue' : 'green',
      text: `<strong>${r.hospital}</strong> — ${r.units}u ${r.bloodGroup} (${r.status})`,
      time: r.requestDate,
    })),
    ...donations.slice(0, 3).map(d => ({
      dot: 'red',
      text: `<strong>${d.donorName}</strong> donated ${d.litres}L (${d.bloodGroup})`,
      time: d.date,
    })),
  ].sort((a, b) => new Date(b.time) - new Date(a.time)).slice(0, 6);

  container.innerHTML = activities.map(a => `
    <div class="activity-item">
      <div class="activity-dot ${a.dot}"></div>
      <div>
        <div class="activity-text">${a.text}</div>
        <div class="activity-time">${formatDate(a.time)}</div>
      </div>
    </div>`).join('');
}

/* ---------- User Management ---------- */
async function setupUserManagement() {
  await renderUserTable();

  const form = document.getElementById('newUserForm');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(form);
    const username = fd.get('newUsername')?.trim();
    const password = fd.get('newPassword');
    const name = fd.get('newUserName')?.trim();
    const role = fd.get('newUserRole');
    const email = fd.get('newUserEmail')?.trim();

    if (!username || !password || !name || !role) {
      showToast('Please fill all required fields', 'error');
      return;
    }

    try {
      await api('/admin/users', {
        method: 'POST',
        body: JSON.stringify({ username, password, name, role, email }),
      });
      showToast('User created!', 'success');
      closeModal('newUserModal');
      form.reset();
      renderUserTable();
    } catch (err) {
      showToast(err.message || 'Failed to create user', 'error');
    }
  });
}

async function renderUserTable() {
  const tbody = document.getElementById('userTableBody');
  if (!tbody) return;

  try {
    const users = await api('/admin/users');
    const session = getSession();

    tbody.innerHTML = users.map(u => `
      <tr>
        <td style="font-weight:600;color:var(--text-muted);font-size:0.82rem;">${u.id}</td>
        <td><strong>${u.name}</strong></td>
        <td>${u.username}</td>
        <td><span class="badge badge-${u.role === 'admin' ? 'red' : u.role === 'staff' ? 'blue' : 'green'}">${u.role}</span></td>
        <td>${u.email || '—'}</td>
        <td>
          ${u.id !== session?.id ? `<button class="btn btn-sm btn-danger" onclick="deleteUser(${u.id})">Delete</button>` : '<span class="text-muted" style="font-size:0.8rem;">Current</span>'}
        </td>
      </tr>`).join('');
  } catch (err) {
    showToast(err.message || 'Failed to load users', 'error');
  }
}

async function deleteUser(id) {
  if (!confirm('Delete this user?')) return;
  try {
    await api(`/admin/users/${id}`, { method: 'DELETE' });
    showToast('User deleted', 'warning');
    renderUserTable();
  } catch (err) {
    showToast(err.message || 'Delete failed', 'error');
  }
}

/* ---------- Report Generation ---------- */
function setupReportGeneration() {
  const btn = document.getElementById('generateReportBtn');
  if (btn) btn.addEventListener('click', generateReport);
}

async function generateReport() {
  try {
    const [stats, inventory, donations, requests] = await Promise.all([
      api('/admin/stats'),
      api('/admin/inventory'),
      api('/admin/donations'),
      api('/requests'),
    ]);

    const reportContainer = document.getElementById('reportOutput');
    if (!reportContainer) return;

    const now = new Date();
    reportContainer.innerHTML = `
      <div style="background:var(--bg-secondary);border:1px solid var(--border-color);border-radius:var(--radius-md);padding:2rem;margin-top:1rem;">
        <div style="text-align:center;margin-bottom:2rem;">
          <h2>🩸 BloodConnect System Report</h2>
          <p style="color:var(--text-muted);">Generated on ${now.toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })} at ${now.toLocaleTimeString('en-IN')}</p>
        </div>
        <hr style="border-color:var(--border-color);margin:1.5rem 0;">
        <h3>📊 Overview</h3>
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:1rem;margin:1rem 0;">
          <div><strong>${stats.totalDonors}</strong><br><span style="color:var(--text-muted);">Total Donors</span></div>
          <div><strong>${stats.totalUnits}</strong><br><span style="color:var(--text-muted);">Blood Units</span></div>
          <div><strong>${stats.totalRequests}</strong><br><span style="color:var(--text-muted);">Total Requests</span></div>
          <div><strong>${stats.pendingRequests}</strong><br><span style="color:var(--text-muted);">Pending Requests</span></div>
          <div><strong>${stats.totalDonations}</strong><br><span style="color:var(--text-muted);">Total Donations</span></div>
          <div><strong>${stats.totalUsers}</strong><br><span style="color:var(--text-muted);">System Users</span></div>
        </div>
        <hr style="border-color:var(--border-color);margin:1.5rem 0;">
        <h3>🩸 Blood Inventory</h3>
        <table class="data-table" style="margin:1rem 0;">
          <thead><tr><th>Blood Group</th><th>Units</th><th>Litres</th><th>Status</th></tr></thead>
          <tbody>
            ${inventory.map(i => `<tr>
              <td><span class="blood-group-chip">${i.bloodGroup}</span></td>
              <td><strong>${i.units}</strong></td>
              <td>${i.litres}L</td>
              <td><span class="badge badge-${i.units <= 2 ? 'red' : i.units <= 5 ? 'amber' : 'green'}">${i.units <= 2 ? 'Critical' : i.units <= 5 ? 'Low' : 'OK'}</span></td>
            </tr>`).join('')}
          </tbody>
        </table>
        <hr style="border-color:var(--border-color);margin:1.5rem 0;">
        <h3>📋 Recent Requests</h3>
        <table class="data-table" style="margin:1rem 0;">
          <thead><tr><th>Hospital</th><th>Blood Group</th><th>Units</th><th>Status</th><th>Priority</th></tr></thead>
          <tbody>
            ${requests.slice(0, 10).map(r => `<tr>
              <td>${r.hospital}</td>
              <td><span class="blood-group-chip">${r.bloodGroup}</span></td>
              <td>${r.units}</td>
              <td><span class="badge badge-${r.status === 'pending' ? 'amber' : r.status === 'approved' ? 'blue' : 'green'}">${r.status}</span></td>
              <td><span class="badge badge-${r.urgency === 'critical' ? 'red' : r.urgency === 'urgent' ? 'amber' : 'gray'}">${r.urgency}</span></td>
            </tr>`).join('')}
          </tbody>
        </table>
      </div>`;

    showToast('Report generated!', 'success');
  } catch (err) {
    showToast(err.message || 'Failed to generate report', 'error');
  }
}
