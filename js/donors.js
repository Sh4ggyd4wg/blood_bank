/* ========================================
   BloodConnect — Donors Page Logic
   ======================================== */

document.addEventListener('DOMContentLoaded', () => {
  const session = requireAuth();
  if (!session) return;
  initSidebar();
  initTabs();
  loadDonors();
  setupDonorFilters();
  setupDonorForm();
});

async function loadDonors(filters = {}) {
  try {
    const params = new URLSearchParams();
    if (filters.blood_group) params.set('blood_group', filters.blood_group);
    if (filters.status) params.set('status', filters.status);
    if (filters.search) params.set('search', filters.search);

    const donors = await api(`/donors?${params.toString()}`);
    const stats = await api('/donors/stats');
    renderDonorStats(stats);
    renderDonorTable(donors);
  } catch (err) {
    showToast(err.message || 'Failed to load donors', 'error');
  }
}

function renderDonorStats(stats) {
  const el = (id, val) => { const e = document.getElementById(id); if (e) e.textContent = val; };
  el('statTotalDonors', stats.total);
  el('statEligible', stats.eligible);
  el('statIneligible', stats.ineligible);
  el('statTotalDonations', stats.totalDonations);
}

function renderDonorTable(donors) {
  const tbody = document.getElementById('donorTableBody');
  if (!tbody) return;

  if (donors.length === 0) {
    tbody.innerHTML = `
      <tr><td colspan="8">
        <div class="empty-state">
          <div class="empty-icon">👥</div>
          <h3>No donors found</h3>
          <p>Register a new donor or adjust your filters.</p>
        </div>
      </td></tr>`;
    return;
  }

  const session = getSession();

  tbody.innerHTML = donors.map(d => {
    const elig = checkEligibility(d.lastDonation);
    const statusBadge = elig.eligible
      ? '<span class="badge badge-green">Eligible</span>'
      : `<span class="badge badge-amber">Wait ${elig.daysLeft}d</span>`;

    let actions = `<button class="btn btn-sm btn-secondary" onclick="viewDonor(${d.id})">View</button>`;
    if (session?.role === 'admin') {
      actions += ` <button class="btn btn-sm btn-primary" onclick="editDonor(${d.id})">Edit</button>`;
      actions += ` <button class="btn btn-sm btn-danger" onclick="deleteDonor(${d.id})">Delete</button>`;
    }

    return `
      <tr>
        <td style="font-weight:600;color:var(--text-muted);font-size:0.82rem;">D${String(d.id).padStart(3, '0')}</td>
        <td><strong>${d.name}</strong></td>
        <td><span class="blood-group-chip">${d.bloodGroup}</span></td>
        <td>${d.gender || '—'}</td>
        <td>${d.phone || '—'}</td>
        <td>${formatDate(d.lastDonation)}</td>
        <td>${statusBadge}</td>
        <td><div class="flex" style="gap:0.35rem;">${actions}</div></td>
      </tr>`;
  }).join('');
}

function setupDonorFilters() {
  const filterBlood = document.getElementById('filterBlood');
  const filterStatus = document.getElementById('filterStatus');
  const filterSearch = document.getElementById('filterSearch');

  const applyFilters = () => {
    const filters = {};
    if (filterBlood?.value) filters.blood_group = filterBlood.value;
    if (filterStatus?.value) filters.status = filterStatus.value;
    if (filterSearch?.value) filters.search = filterSearch.value.trim();
    loadDonors(filters);
  };

  filterBlood?.addEventListener('change', applyFilters);
  filterStatus?.addEventListener('change', applyFilters);
  filterSearch?.addEventListener('input', applyFilters);
}

function setupDonorForm() {
  const form = document.getElementById('newDonorForm');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(form);

    const name = formData.get('donorName')?.trim();
    const email = formData.get('donorEmail')?.trim();
    const phone = formData.get('donorPhone')?.trim();
    const bloodGroup = formData.get('donorBlood');
    const gender = formData.get('donorGender');
    const address = formData.get('donorAddress')?.trim();
    const dateOfBirth = formData.get('donorDOB');

    if (!name || !bloodGroup) {
      showToast('Name and blood group are required', 'error');
      return;
    }

    try {
      await api('/donors', {
        method: 'POST',
        body: JSON.stringify({ name, email, phone, bloodGroup, gender, address, dateOfBirth }),
      });
      showToast('Donor registered successfully!', 'success');
      closeModal('newDonorModal');
      form.reset();
      loadDonors();
    } catch (err) {
      showToast(err.message || 'Failed to register donor', 'error');
    }
  });
}

async function viewDonor(id) {
  try {
    const d = await api(`/donors/${id}`);
    const elig = checkEligibility(d.lastDonation);

    const modal = document.getElementById('viewDonorModal');
    if (!modal) return;

    modal.querySelector('.modal-body').innerHTML = `
      <div style="display:flex;align-items:center;gap:1rem;margin-bottom:1.5rem;">
        <div class="donor-avatar" style="width:56px;height:56px;font-size:1.2rem;">${d.name.split(' ').map(n => n[0]).join('')}</div>
        <div>
          <h3 style="margin-bottom:0.2rem;">${d.name}</h3>
          <span class="blood-group-chip">${d.bloodGroup}</span>
          ${elig.eligible
        ? '<span class="badge badge-green" style="margin-left:0.5rem;">Eligible</span>'
        : `<span class="badge badge-amber" style="margin-left:0.5rem;">Wait ${elig.daysLeft}d</span>`}
        </div>
      </div>
      <div class="detail-grid" style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;">
        <div><label style="font-size:0.75rem;color:var(--text-muted);text-transform:uppercase;">Email</label><p>${d.email || '—'}</p></div>
        <div><label style="font-size:0.75rem;color:var(--text-muted);text-transform:uppercase;">Phone</label><p>${d.phone || '—'}</p></div>
        <div><label style="font-size:0.75rem;color:var(--text-muted);text-transform:uppercase;">Gender</label><p>${d.gender || '—'}</p></div>
        <div><label style="font-size:0.75rem;color:var(--text-muted);text-transform:uppercase;">Age</label><p>${d.age || '—'}</p></div>
        <div><label style="font-size:0.75rem;color:var(--text-muted);text-transform:uppercase;">Address</label><p>${d.address || '—'}</p></div>
        <div><label style="font-size:0.75rem;color:var(--text-muted);text-transform:uppercase;">Last Donation</label><p>${formatDate(d.lastDonation)}</p></div>
        <div><label style="font-size:0.75rem;color:var(--text-muted);text-transform:uppercase;">Total Donations</label><p>${d.totalDonations}</p></div>
        <div><label style="font-size:0.75rem;color:var(--text-muted);text-transform:uppercase;">Total Litres</label><p>${d.totalLitres}L</p></div>
      </div>`;
    openModal('viewDonorModal');
  } catch (err) {
    showToast(err.message || 'Failed to load donor details', 'error');
  }
}

async function editDonor(id) {
  try {
    const d = await api(`/donors/${id}`);
    const modal = document.getElementById('editDonorModal');
    if (!modal) return;

    modal.querySelector('.modal-body').innerHTML = `
      <form id="editDonorForm">
        <div class="form-row">
          <div class="form-group"><label>Name</label><input class="form-control" name="name" value="${d.name}" required></div>
          <div class="form-group"><label>Email</label><input class="form-control" type="email" name="email" value="${d.email || ''}"></div>
        </div>
        <div class="form-row">
          <div class="form-group"><label>Phone</label><input class="form-control" name="phone" value="${d.phone || ''}"></div>
          <div class="form-group"><label>Blood Group</label>
            <select class="form-control" name="bloodGroup">
              ${['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map(bg => `<option ${bg === d.bloodGroup ? 'selected' : ''}>${bg}</option>`).join('')}
            </select>
          </div>
        </div>
        <div class="form-row">
          <div class="form-group"><label>Gender</label>
            <select class="form-control" name="gender">
              <option value="">—</option>
              <option ${d.gender === 'Male' ? 'selected' : ''}>Male</option>
              <option ${d.gender === 'Female' ? 'selected' : ''}>Female</option>
              <option ${d.gender === 'Other' ? 'selected' : ''}>Other</option>
            </select>
          </div>
          <div class="form-group"><label>Date of Birth</label><input class="form-control" type="date" name="dateOfBirth" value="${d.dateOfBirth ? new Date(d.dateOfBirth).toISOString().split('T')[0] : ''}"></div>
        </div>
        <div class="form-group"><label>Address</label><input class="form-control" name="address" value="${d.address || ''}"></div>
        <button type="submit" class="btn btn-primary btn-block" style="margin-top:1rem;">Save Changes</button>
      </form>`;

    const form = modal.querySelector('#editDonorForm');
    form.onsubmit = async (e) => {
      e.preventDefault();
      const fd = new FormData(form);
      try {
        await api(`/donors/${id}`, {
          method: 'PUT',
          body: JSON.stringify({
            name: fd.get('name'),
            email: fd.get('email'),
            phone: fd.get('phone'),
            bloodGroup: fd.get('bloodGroup'),
            gender: fd.get('gender'),
            address: fd.get('address'),
            dateOfBirth: fd.get('dateOfBirth') || null,
          }),
        });
        showToast('Donor updated!', 'success');
        closeModal('editDonorModal');
        loadDonors();
      } catch (err) {
        showToast(err.message || 'Update failed', 'error');
      }
    };
    openModal('editDonorModal');
  } catch (err) {
    showToast(err.message || 'Failed to load donor', 'error');
  }
}

async function deleteDonor(id) {
  if (!confirm('Are you sure you want to delete this donor?')) return;
  try {
    await api(`/donors/${id}`, { method: 'DELETE' });
    showToast('Donor deleted', 'warning');
    loadDonors();
  } catch (err) {
    showToast(err.message || 'Delete failed', 'error');
  }
}
