/* ========================================
   BloodConnect — Requests Page Logic
   ======================================== */

document.addEventListener('DOMContentLoaded', () => {
    const session = requireAuth();
    if (!session) return;
    initSidebar();
    loadRequests();
    setupRequestForm();
    setupRequestFilters();
});

async function loadRequests(filters = {}) {
    try {
        const params = new URLSearchParams();
        if (filters.status) params.set('status', filters.status);
        if (filters.urgency) params.set('urgency', filters.urgency);
        if (filters.blood_group) params.set('blood_group', filters.blood_group);
        if (filters.search) params.set('search', filters.search);

        const requests = await api(`/requests?${params.toString()}`);
        renderRequestTable(requests);

        const stats = await api('/requests/stats');
        renderRequestStats(stats);
    } catch (err) {
        showToast(err.message || 'Failed to load requests', 'error');
    }
}

function renderRequestStats(stats) {
    const el = (id, val) => { const e = document.getElementById(id); if (e) e.textContent = val; };
    el('statTotalRequests', stats.total);
    el('statPending', stats.pending);
    el('statApproved', stats.approved);
    el('statDispatched', stats.dispatched);
}

function renderRequestTable(requests) {
    const tbody = document.getElementById('requestTableBody');
    if (!tbody) return;

    if (requests.length === 0) {
        tbody.innerHTML = `
      <tr><td colspan="8">
        <div class="empty-state">
          <div class="empty-icon">📋</div>
          <h3>No requests found</h3>
          <p>Create a new blood request or adjust your filters.</p>
        </div>
      </td></tr>`;
        return;
    }

    const session = getSession();

    tbody.innerHTML = requests.map(req => {
        const statusBadge = {
            pending: '<span class="badge badge-amber">⏳ Pending</span>',
            approved: '<span class="badge badge-blue">✓ Approved</span>',
            dispatched: '<span class="badge badge-green">🚚 Dispatched</span>',
            rejected: '<span class="badge badge-red">✕ Rejected</span>',
        }[req.status] || '<span class="badge badge-gray">Unknown</span>';

        const urgencyBadge = {
            normal: '<span class="badge badge-gray">Normal</span>',
            urgent: '<span class="badge badge-amber">Urgent</span>',
            critical: '<span class="badge badge-red">🔴 Critical</span>',
        }[req.urgency] || '';

        let actions = '';
        if (session?.role === 'admin' || session?.role === 'staff') {
            if (req.status === 'pending') {
                actions = `
          <button class="btn btn-sm btn-success" onclick="updateRequestStatus(${req.id}, 'approved')">Approve</button>
          <button class="btn btn-sm btn-danger" onclick="updateRequestStatus(${req.id}, 'rejected')">Reject</button>`;
            } else if (req.status === 'approved') {
                actions = `<button class="btn btn-sm btn-primary" onclick="updateRequestStatus(${req.id}, 'dispatched')">Dispatch</button>`;
            } else {
                actions = '<span class="text-muted" style="font-size:0.8rem;">Completed</span>';
            }
        }

        return `
      <tr>
        <td style="font-weight:600;color:var(--text-muted);font-size:0.82rem;">R${String(req.id).padStart(3, '0')}</td>
        <td>${req.hospital}</td>
        <td>${req.patient}</td>
        <td><span class="blood-group-chip">${req.bloodGroup}</span></td>
        <td><strong>${req.units}</strong></td>
        <td>${urgencyBadge}</td>
        <td>${statusBadge}</td>
        <td>
          <div class="flex" style="gap:0.35rem;">${actions}</div>
        </td>
      </tr>`;
    }).join('');
}

function setupRequestForm() {
    const form = document.getElementById('newRequestForm');
    if (!form) return;

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(form);

        const hospital = formData.get('reqHospital')?.trim();
        const patient = formData.get('reqPatient')?.trim();
        const bloodGroup = formData.get('reqBloodGroup');
        const units = parseInt(formData.get('reqUnits'));
        const urgency = formData.get('reqUrgency');
        const notes = formData.get('reqNotes')?.trim();

        if (!hospital || !patient || !bloodGroup || !units) {
            showToast('Please fill in all required fields', 'error');
            return;
        }

        try {
            const result = await api('/requests', {
                method: 'POST',
                body: JSON.stringify({ hospital, patient, bloodGroup, units, urgency, notes }),
            });

            if (result.warning) {
                showToast(result.warning, 'warning');
            }
            showToast('Blood request created successfully!', 'success');
            closeModal('newRequestModal');
            form.reset();
            loadRequests();
        } catch (err) {
            showToast(err.message || 'Failed to create request', 'error');
        }
    });
}

async function updateRequestStatus(id, newStatus) {
    try {
        const result = await api(`/requests/${id}/status`, {
            method: 'PUT',
            body: JSON.stringify({ status: newStatus }),
        });
        showToast(result.message, newStatus === 'rejected' ? 'warning' : 'success');
        loadRequests();
    } catch (err) {
        showToast(err.message || 'Failed to update status', 'error');
    }
}

function setupRequestFilters() {
    const filterStatus = document.getElementById('filterReqStatus');
    const filterUrgency = document.getElementById('filterReqUrgency');
    const filterBlood = document.getElementById('filterReqBlood');
    const filterSearch = document.getElementById('filterReqSearch');

    const applyFilters = () => {
        const filters = {};
        if (filterStatus?.value) filters.status = filterStatus.value;
        if (filterUrgency?.value) filters.urgency = filterUrgency.value;
        if (filterBlood?.value) filters.blood_group = filterBlood.value;
        if (filterSearch?.value) filters.search = filterSearch.value.trim();
        loadRequests(filters);
    };

    filterStatus?.addEventListener('change', applyFilters);
    filterUrgency?.addEventListener('change', applyFilters);
    filterBlood?.addEventListener('change', applyFilters);
    filterSearch?.addEventListener('input', applyFilters);
}
