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

function loadRequests() {
    const requests = getData('requests') || [];
    renderRequestTable(requests);
    renderRequestStats(requests);
}

function renderRequestStats(requests) {
    const total = requests.length;
    const pending = requests.filter(r => r.status === 'pending').length;
    const approved = requests.filter(r => r.status === 'approved').length;
    const dispatched = requests.filter(r => r.status === 'dispatched').length;

    const el = (id, val) => { const e = document.getElementById(id); if (e) e.textContent = val; };
    el('statTotalRequests', total);
    el('statPending', pending);
    el('statApproved', approved);
    el('statDispatched', dispatched);
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

    const session = getData('session');

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
          <button class="btn btn-sm btn-success" onclick="updateRequestStatus('${req.id}', 'approved')">Approve</button>
          <button class="btn btn-sm btn-danger" onclick="updateRequestStatus('${req.id}', 'rejected')">Reject</button>`;
            } else if (req.status === 'approved') {
                actions = `<button class="btn btn-sm btn-primary" onclick="updateRequestStatus('${req.id}', 'dispatched')">Dispatch</button>`;
            } else {
                actions = '<span class="text-muted" style="font-size:0.8rem;">Completed</span>';
            }
        }

        return `
      <tr>
        <td style="font-weight:600;color:var(--text-muted);font-size:0.82rem;">${req.id}</td>
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

    form.addEventListener('submit', (e) => {
        e.preventDefault();
        const requests = getData('requests') || [];
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

        // Check if stock is available
        const inventory = getData('inventory') || [];
        const stock = inventory.find(i => i.bloodGroup === bloodGroup);
        if (stock && stock.units < units) {
            showToast(`Only ${stock.units} units of ${bloodGroup} available. Requested ${units}.`, 'warning');
        }

        const newRequest = {
            id: generateId('R'),
            hospital, patient, bloodGroup,
            units, urgency: urgency || 'normal',
            status: 'pending',
            notes: notes || '',
            requestDate: new Date().toISOString().split('T')[0],
        };

        requests.push(newRequest);
        setData('requests', requests);
        showToast('Blood request created successfully!', 'success');
        closeModal('newRequestModal');
        form.reset();
        loadRequests();
    });
}

function updateRequestStatus(id, newStatus) {
    const requests = getData('requests') || [];
    const req = requests.find(r => r.id === id);
    if (!req) return;

    // If dispatching, deduct from inventory
    if (newStatus === 'dispatched') {
        const inventory = getData('inventory') || [];
        const stock = inventory.find(i => i.bloodGroup === req.bloodGroup);
        if (stock) {
            if (stock.units < req.units) {
                showToast(`Not enough ${req.bloodGroup} stock! Only ${stock.units} units available.`, 'error');
                return;
            }
            stock.units -= req.units;
            stock.litres = parseFloat((stock.units * 0.45).toFixed(2));
            stock.lastUpdated = new Date().toISOString().split('T')[0];
            setData('inventory', inventory);
        }
    }

    req.status = newStatus;
    setData('requests', requests);

    const messages = {
        approved: 'Request approved!',
        rejected: 'Request rejected.',
        dispatched: 'Blood dispatched! Inventory updated.',
    };

    showToast(messages[newStatus] || 'Status updated.', newStatus === 'rejected' ? 'warning' : 'success');
    loadRequests();
}

function setupRequestFilters() {
    const filterStatus = document.getElementById('filterReqStatus');
    const filterUrgency = document.getElementById('filterReqUrgency');
    const filterBlood = document.getElementById('filterReqBlood');
    const filterSearch = document.getElementById('filterReqSearch');

    const applyFilters = () => {
        let requests = getData('requests') || [];
        const status = filterStatus?.value;
        const urgency = filterUrgency?.value;
        const blood = filterBlood?.value;
        const search = filterSearch?.value.toLowerCase().trim();

        if (status) requests = requests.filter(r => r.status === status);
        if (urgency) requests = requests.filter(r => r.urgency === urgency);
        if (blood) requests = requests.filter(r => r.bloodGroup === blood);
        if (search) requests = requests.filter(r =>
            r.hospital.toLowerCase().includes(search) ||
            r.patient.toLowerCase().includes(search) ||
            r.id.toLowerCase().includes(search)
        );

        renderRequestTable(requests);
    };

    filterStatus?.addEventListener('change', applyFilters);
    filterUrgency?.addEventListener('change', applyFilters);
    filterBlood?.addEventListener('change', applyFilters);
    filterSearch?.addEventListener('input', applyFilters);
}
