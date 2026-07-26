/* ========================================
   BloodConnect — Admin Panel Logic
   ======================================== */

document.addEventListener('DOMContentLoaded', () => {
    const session = requireAuth();
    if (!session) return;
    if (session.role !== 'admin') {
        showToast('Access denied. Admin privileges required.', 'error');
        setTimeout(() => window.location.href = 'index.html', 1500);
        return;
    }
    initSidebar();
    initTabs();
    loadAdminDashboard();
    setupUserManagement();
    setupReportGeneration();
});

function loadAdminDashboard() {
    const donors = getData('donors') || [];
    const requests = getData('requests') || [];
    const inventory = getData('inventory') || [];
    const donations = getData('donations') || [];
    const users = getData('users') || [];

    // Overview stats
    const el = (id, val) => { const e = document.getElementById(id); if (e) e.textContent = val; };
    el('adminTotalDonors', donors.length);
    el('adminTotalRequests', requests.length);
    el('adminTotalUnits', inventory.reduce((s, i) => s + i.units, 0));
    el('adminTotalUsers', users.length);
    el('adminPendingReqs', requests.filter(r => r.status === 'pending').length);
    el('adminTotalDonations', donations.length);

    // Blood group distribution chart
    renderBloodGroupChart(inventory);

    // Donation trend chart
    renderDonationChart(donations);

    // Recent activity
    renderAdminActivity(requests, donations);
}

function renderBloodGroupChart(inventory) {
    const canvas = document.getElementById('bloodGroupChart');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const w = canvas.parentElement.clientWidth;
    const h = 280;
    canvas.width = w * 2;
    canvas.height = h * 2;
    canvas.style.width = w + 'px';
    canvas.style.height = h + 'px';
    ctx.scale(2, 2);

    const data = inventory.map(i => i.units);
    const labels = inventory.map(i => i.bloodGroup);
    const maxVal = Math.max(...data, 1);
    const barWidth = Math.min(50, (w - 80) / data.length - 12);
    const chartHeight = h - 60;
    const startX = 50;
    const startY = h - 40;

    // Background grid
    ctx.strokeStyle = 'rgba(255,255,255,0.05)';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
        const y = startY - (chartHeight / 4) * i;
        ctx.beginPath();
        ctx.moveTo(startX, y);
        ctx.lineTo(w - 20, y);
        ctx.stroke();
        ctx.fillStyle = '#6b7280';
        ctx.font = '10px Inter';
        ctx.textAlign = 'right';
        ctx.fillText(Math.round((maxVal / 4) * i), startX - 8, y + 4);
    }

    // Bars
    const colors = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#06b6d4', '#3b82f6', '#8b5cf6', '#ec4899'];

    data.forEach((val, i) => {
        const barHeight = (val / maxVal) * chartHeight;
        const x = startX + i * ((w - 80) / data.length) + ((w - 80) / data.length - barWidth) / 2;
        const y = startY - barHeight;

        // Bar gradient
        const grad = ctx.createLinearGradient(x, y, x, startY);
        grad.addColorStop(0, colors[i % colors.length]);
        grad.addColorStop(1, colors[i % colors.length] + '44');
        ctx.fillStyle = grad;

        // Rounded bar
        const radius = 4;
        ctx.beginPath();
        ctx.moveTo(x + radius, y);
        ctx.lineTo(x + barWidth - radius, y);
        ctx.quadraticCurveTo(x + barWidth, y, x + barWidth, y + radius);
        ctx.lineTo(x + barWidth, startY);
        ctx.lineTo(x, startY);
        ctx.lineTo(x, y + radius);
        ctx.quadraticCurveTo(x, y, x + radius, y);
        ctx.fill();

        // Value on top
        ctx.fillStyle = '#f1f1f4';
        ctx.font = 'bold 11px Inter';
        ctx.textAlign = 'center';
        ctx.fillText(val, x + barWidth / 2, y - 8);

        // Label
        ctx.fillStyle = '#9ca3af';
        ctx.font = '11px Inter';
        ctx.fillText(labels[i], x + barWidth / 2, startY + 18);
    });
}

function renderDonationChart(donations) {
    const canvas = document.getElementById('donationChart');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    // Group donations by month
    const months = {};
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    donations.forEach(d => {
        const date = new Date(d.date);
        const key = `${monthNames[date.getMonth()]} ${date.getFullYear()}`;
        months[key] = (months[key] || 0) + 1;
    });

    const labels = Object.keys(months).slice(-6);
    const data = labels.map(l => months[l]);

    const w = canvas.parentElement.clientWidth;
    const h = 280;
    canvas.width = w * 2;
    canvas.height = h * 2;
    canvas.style.width = w + 'px';
    canvas.style.height = h + 'px';
    ctx.scale(2, 2);

    if (data.length < 2) {
        ctx.fillStyle = '#6b7280';
        ctx.font = '14px Inter';
        ctx.textAlign = 'center';
        ctx.fillText('Not enough data for trend chart', w / 2, h / 2);
        return;
    }

    const maxVal = Math.max(...data, 1);
    const chartHeight = h - 70;
    const startX = 50;
    const startY = h - 45;
    const stepX = (w - 80) / (data.length - 1);

    // Grid
    ctx.strokeStyle = 'rgba(255,255,255,0.05)';
    for (let i = 0; i <= 4; i++) {
        const y = startY - (chartHeight / 4) * i;
        ctx.beginPath();
        ctx.moveTo(startX, y);
        ctx.lineTo(w - 20, y);
        ctx.stroke();
        ctx.fillStyle = '#6b7280';
        ctx.font = '10px Inter';
        ctx.textAlign = 'right';
        ctx.fillText(Math.round((maxVal / 4) * i), startX - 8, y + 4);
    }

    // Area fill
    const points = data.map((val, i) => ({
        x: startX + i * stepX,
        y: startY - (val / maxVal) * chartHeight,
    }));

    const areaGrad = ctx.createLinearGradient(0, points[0].y, 0, startY);
    areaGrad.addColorStop(0, 'rgba(220, 38, 38, 0.3)');
    areaGrad.addColorStop(1, 'rgba(220, 38, 38, 0)');
    ctx.fillStyle = areaGrad;
    ctx.beginPath();
    ctx.moveTo(points[0].x, startY);
    points.forEach(p => ctx.lineTo(p.x, p.y));
    ctx.lineTo(points[points.length - 1].x, startY);
    ctx.fill();

    // Line
    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 2.5;
    ctx.lineJoin = 'round';
    ctx.beginPath();
    points.forEach((p, i) => i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y));
    ctx.stroke();

    // Points + labels
    points.forEach((p, i) => {
        ctx.fillStyle = '#ef4444';
        ctx.beginPath();
        ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#1e1e28';
        ctx.beginPath();
        ctx.arc(p.x, p.y, 2, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#f1f1f4';
        ctx.font = 'bold 10px Inter';
        ctx.textAlign = 'center';
        ctx.fillText(data[i], p.x, p.y - 12);

        ctx.fillStyle = '#9ca3af';
        ctx.font = '10px Inter';
        ctx.fillText(labels[i], p.x, startY + 18);
    });
}

function renderAdminActivity(requests, donations) {
    const container = document.getElementById('adminActivity');
    if (!container) return;

    const items = [
        ...requests.slice(-4).reverse().map(r => ({
            type: r.status === 'pending' ? 'amber' : r.status === 'approved' ? 'blue' : 'green',
            text: `<strong>${r.hospital}</strong> requested ${r.units} units of <strong>${r.bloodGroup}</strong> — ${r.status}`,
            time: r.requestDate,
        })),
        ...donations.slice(-4).reverse().map(d => ({
            type: 'red',
            text: `<strong>${d.donorName}</strong> donated ${d.litres}L of <strong>${d.bloodGroup}</strong>`,
            time: d.date,
        })),
    ].sort((a, b) => new Date(b.time) - new Date(a.time)).slice(0, 8);

    container.innerHTML = items.map(item => `
    <div class="activity-item">
      <div class="activity-dot ${item.type}"></div>
      <div>
        <div class="activity-text">${item.text}</div>
        <div class="activity-time">${formatDate(item.time)}</div>
      </div>
    </div>
  `).join('');
}

/* ---------- User Management ---------- */
function setupUserManagement() {
    renderUserTable();

    const form = document.getElementById('addUserForm');
    if (!form) return;

    form.addEventListener('submit', (e) => {
        e.preventDefault();
        const users = getData('users') || [];
        const formData = new FormData(form);

        const name = formData.get('newUserName')?.trim();
        const username = formData.get('newUserUsername')?.trim();
        const email = formData.get('newUserEmail')?.trim();
        const password = formData.get('newUserPassword');
        const role = formData.get('newUserRole');

        if (!name || !username || !password || !role) {
            showToast('All fields are required', 'error');
            return;
        }

        if (users.find(u => u.username.toLowerCase() === username.toLowerCase())) {
            showToast('Username already exists', 'error');
            return;
        }

        users.push({
            id: generateId('U'),
            name, username, email, password, role,
        });

        setData('users', users);
        showToast('User created successfully!', 'success');
        closeModal('addUserModal');
        form.reset();
        renderUserTable();
    });
}

function renderUserTable() {
    const tbody = document.getElementById('userTableBody');
    if (!tbody) return;

    const users = getData('users') || [];

    tbody.innerHTML = users.map(user => {
        const roleBadge = {
            admin: '<span class="badge badge-red">Admin</span>',
            staff: '<span class="badge badge-blue">Staff</span>',
            donor: '<span class="badge badge-green">Donor</span>',
        }[user.role] || '<span class="badge badge-gray">Unknown</span>';

        return `
      <tr>
        <td style="font-size:0.82rem;color:var(--text-muted);">${user.id}</td>
        <td><strong>${user.name}</strong></td>
        <td>${user.username}</td>
        <td>${user.email || '—'}</td>
        <td>${roleBadge}</td>
        <td>
          <button class="btn btn-sm btn-danger" onclick="deleteUser('${user.id}')" ${user.username === 'admin' ? 'disabled style="opacity:0.4;cursor:not-allowed;"' : ''}>Delete</button>
        </td>
      </tr>`;
    }).join('');
}

function deleteUser(id) {
    if (!confirm('Delete this user?')) return;
    let users = getData('users') || [];
    users = users.filter(u => u.id !== id);
    setData('users', users);
    showToast('User deleted', 'warning');
    renderUserTable();
}

/* ---------- Report Generation ---------- */
function setupReportGeneration() {
    const genBtn = document.getElementById('generateReportBtn');
    if (!genBtn) return;

    genBtn.addEventListener('click', generateReport);
}

function generateReport() {
    const donors = getData('donors') || [];
    const inventory = getData('inventory') || [];
    const requests = getData('requests') || [];
    const donations = getData('donations') || [];

    const reportContainer = document.getElementById('reportOutput');
    if (!reportContainer) return;

    const totalDonors = donors.length;
    const totalUnits = inventory.reduce((s, i) => s + i.units, 0);
    const totalLitres = inventory.reduce((s, i) => s + i.litres, 0);
    const pendingRequests = requests.filter(r => r.status === 'pending').length;
    const fulfilledRequests = requests.filter(r => r.status === 'dispatched').length;
    const lowStockGroups = inventory.filter(i => i.units <= 5).map(i => i.bloodGroup);
    const eligibleDonors = donors.filter(d => checkEligibility(d.lastDonation).eligible).length;

    // Blood group distribution
    const bgDist = {};
    donors.forEach(d => { bgDist[d.bloodGroup] = (bgDist[d.bloodGroup] || 0) + 1; });

    // Top donors by litres
    const topDonors = [...donors].sort((a, b) => b.totalLitres - a.totalLitres).slice(0, 5);

    reportContainer.innerHTML = `
    <div style="margin-bottom:1.5rem;">
      <h3 style="font-size:1.1rem;margin-bottom:0.5rem;">📊 System Report — ${formatDate(new Date().toISOString())}</h3>
      <p class="text-muted" style="font-size:0.82rem;">Generated on ${new Date().toLocaleString('en-IN')}</p>
    </div>

    <div class="stats-grid" style="margin-bottom:1.5rem;">
      <div class="stat-card red">
        <div class="stat-icon">🩸</div>
        <div class="stat-info"><h3>Total Blood Units</h3><div class="stat-value">${totalUnits}</div><div class="stat-change">${totalLitres.toFixed(1)} litres</div></div>
      </div>
      <div class="stat-card green">
        <div class="stat-icon">👥</div>
        <div class="stat-info"><h3>Registered Donors</h3><div class="stat-value">${totalDonors}</div><div class="stat-change positive">${eligibleDonors} eligible</div></div>
      </div>
      <div class="stat-card blue">
        <div class="stat-icon">📋</div>
        <div class="stat-info"><h3>Requests Fulfilled</h3><div class="stat-value">${fulfilledRequests}</div><div class="stat-change">${pendingRequests} pending</div></div>
      </div>
    </div>

    ${lowStockGroups.length > 0 ? `
      <div style="background:rgba(245,158,11,0.1);border:1px solid rgba(245,158,11,0.3);border-radius:var(--radius-sm);padding:1rem;margin-bottom:1.5rem;">
        <strong style="color:#fbbf24;">⚠ Low Stock Alert:</strong>
        <span style="color:var(--text-secondary);"> ${lowStockGroups.map(g => `<span class="blood-group-chip" style="margin-left:0.3rem;">${g}</span>`).join(' ')} need restocking</span>
      </div>` : ''}

    <div class="grid-2" style="gap:1.5rem;">
      <div>
        <h4 style="margin-bottom:0.75rem;font-size:0.95rem;">Donor Distribution by Blood Group</h4>
        <table class="data-table">
          <thead><tr><th>Blood Group</th><th>Donors</th></tr></thead>
          <tbody>${Object.entries(bgDist).map(([bg, count]) =>
        `<tr><td><span class="blood-group-chip">${bg}</span></td><td>${count}</td></tr>`
    ).join('')}</tbody>
        </table>
      </div>
      <div>
        <h4 style="margin-bottom:0.75rem;font-size:0.95rem;">Top Donors by Volume</h4>
        <table class="data-table">
          <thead><tr><th>Donor</th><th>Total</th></tr></thead>
          <tbody>${topDonors.map(d =>
        `<tr><td>${d.name}</td><td><strong>${d.totalLitres.toFixed(2)}L</strong></td></tr>`
    ).join('')}</tbody>
        </table>
      </div>
    </div>
  `;

    showToast('Report generated successfully!', 'success');
}
