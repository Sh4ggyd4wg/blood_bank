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

function loadDonors() {
    const donors = getData('donors') || [];
    renderDonorTable(donors);
    renderDonorStats(donors);
}

function renderDonorStats(donors) {
    const total = donors.length;
    const eligible = donors.filter(d => checkEligibility(d.lastDonation).eligible).length;
    const totalLitres = donors.reduce((sum, d) => sum + d.totalLitres, 0);
    const thisMonth = donors.filter(d => {
        if (!d.lastDonation) return false;
        const ld = new Date(d.lastDonation);
        const now = new Date();
        return ld.getMonth() === now.getMonth() && ld.getFullYear() === now.getFullYear();
    }).length;

    const statEls = {
        totalDonors: document.getElementById('statTotalDonors'),
        eligibleDonors: document.getElementById('statEligible'),
        totalLitres: document.getElementById('statTotalLitres'),
        thisMonth: document.getElementById('statThisMonth'),
    };

    if (statEls.totalDonors) statEls.totalDonors.textContent = total;
    if (statEls.eligibleDonors) statEls.eligibleDonors.textContent = eligible;
    if (statEls.totalLitres) statEls.totalLitres.textContent = totalLitres.toFixed(1) + 'L';
    if (statEls.thisMonth) statEls.thisMonth.textContent = thisMonth;
}

function renderDonorTable(donors) {
    const tbody = document.getElementById('donorTableBody');
    if (!tbody) return;

    if (donors.length === 0) {
        tbody.innerHTML = `
      <tr><td colspan="8">
        <div class="empty-state">
          <div class="empty-icon">🩸</div>
          <h3>No donors found</h3>
          <p>Try adjusting your filters or add a new donor.</p>
        </div>
      </td></tr>`;
        return;
    }

    tbody.innerHTML = donors.map(donor => {
        const elig = checkEligibility(donor.lastDonation);
        const eligBadge = elig.eligible
            ? '<span class="badge badge-green">Eligible</span>'
            : `<span class="badge badge-amber">Wait ${elig.daysLeft}d</span>`;

        return `
      <tr>
        <td>
          <div class="flex" style="align-items:center;gap:0.75rem;">
            <div class="donor-avatar" style="width:36px;height:36px;font-size:0.75rem;">${donor.name.split(' ').map(n => n[0]).join('')}</div>
            <div>
              <div style="font-weight:600;font-size:0.88rem;">${donor.name}</div>
              <div style="font-size:0.75rem;color:var(--text-muted);">${donor.id}</div>
            </div>
          </div>
        </td>
        <td><span class="blood-group-chip">${donor.bloodGroup}</span></td>
        <td>${donor.phone || '—'}</td>
        <td>${donor.totalDonations}</td>
        <td><strong>${donor.totalLitres.toFixed(2)}L</strong></td>
        <td>${donor.lastDonation ? formatDate(donor.lastDonation) : 'Never'}</td>
        <td>${eligBadge}</td>
        <td>
          <div class="flex" style="gap:0.35rem;">
            <button class="btn btn-sm btn-secondary" onclick="viewDonor('${donor.id}')" title="View">👁</button>
            <button class="btn btn-sm btn-secondary" onclick="editDonor('${donor.id}')" title="Edit">✏️</button>
            <button class="btn btn-sm btn-danger" onclick="deleteDonor('${donor.id}')" title="Delete" style="padding:0.45rem 0.6rem;">🗑</button>
          </div>
        </td>
      </tr>`;
    }).join('');
}

function setupDonorFilters() {
    const filterBlood = document.getElementById('filterBloodGroup');
    const filterStatus = document.getElementById('filterStatus');
    const filterSearch = document.getElementById('filterSearch');

    const applyFilters = () => {
        let donors = getData('donors') || [];
        const blood = filterBlood?.value;
        const status = filterStatus?.value;
        const search = filterSearch?.value.toLowerCase().trim();

        if (blood) donors = donors.filter(d => d.bloodGroup === blood);
        if (status === 'eligible') donors = donors.filter(d => checkEligibility(d.lastDonation).eligible);
        if (status === 'ineligible') donors = donors.filter(d => !checkEligibility(d.lastDonation).eligible);
        if (search) donors = donors.filter(d =>
            d.name.toLowerCase().includes(search) ||
            d.id.toLowerCase().includes(search) ||
            d.bloodGroup.toLowerCase().includes(search) ||
            d.phone?.includes(search)
        );

        renderDonorTable(donors);
    };

    filterBlood?.addEventListener('change', applyFilters);
    filterStatus?.addEventListener('change', applyFilters);
    filterSearch?.addEventListener('input', applyFilters);
}

function setupDonorForm() {
    const form = document.getElementById('addDonorForm');
    if (!form) return;

    form.addEventListener('submit', (e) => {
        e.preventDefault();
        const donors = getData('donors') || [];
        const formData = new FormData(form);

        const name = formData.get('donorName')?.trim();
        const email = formData.get('donorEmail')?.trim();
        const phone = formData.get('donorPhone')?.trim();
        const bloodGroup = formData.get('donorBloodGroup');
        const age = parseInt(formData.get('donorAge'));
        const gender = formData.get('donorGender');
        const address = formData.get('donorAddress')?.trim();

        if (!name || !bloodGroup || !phone) {
            showToast('Please fill in all required fields', 'error');
            return;
        }

        if (age && (age < 18 || age > 65)) {
            showToast('Donor must be between 18 and 65 years old', 'error');
            return;
        }

        const newDonor = {
            id: generateId('D'),
            name, email, phone, bloodGroup,
            age: age || 0,
            gender: gender || '',
            address: address || '',
            lastDonation: null,
            totalDonations: 0,
            totalLitres: 0,
            status: 'eligible',
            registered: new Date().toISOString().split('T')[0],
        };

        donors.push(newDonor);
        setData('donors', donors);
        showToast(`Donor ${name} registered successfully!`, 'success');
        closeModal('addDonorModal');
        form.reset();
        loadDonors();
    });
}

function viewDonor(id) {
    const donors = getData('donors') || [];
    const donor = donors.find(d => d.id === id);
    if (!donor) return;

    const elig = checkEligibility(donor.lastDonation);
    const donations = (getData('donations') || []).filter(d => d.donorId === id);

    const modal = document.getElementById('viewDonorModal');
    if (!modal) return;

    modal.querySelector('.modal-body').innerHTML = `
    <div style="text-align:center;margin-bottom:1.5rem;">
      <div class="donor-avatar" style="width:64px;height:64px;font-size:1.4rem;margin:0 auto 0.75rem;">${donor.name.split(' ').map(n => n[0]).join('')}</div>
      <h3 style="font-size:1.2rem;">${donor.name}</h3>
      <span class="blood-group-chip" style="margin-top:0.5rem;">${donor.bloodGroup}</span>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;margin-bottom:1.5rem;">
      <div><span style="font-size:0.75rem;color:var(--text-muted);display:block;">Email</span><span style="font-size:0.88rem;">${donor.email || '—'}</span></div>
      <div><span style="font-size:0.75rem;color:var(--text-muted);display:block;">Phone</span><span style="font-size:0.88rem;">${donor.phone || '—'}</span></div>
      <div><span style="font-size:0.75rem;color:var(--text-muted);display:block;">Age / Gender</span><span style="font-size:0.88rem;">${donor.age || '—'} / ${donor.gender || '—'}</span></div>
      <div><span style="font-size:0.75rem;color:var(--text-muted);display:block;">Address</span><span style="font-size:0.88rem;">${donor.address || '—'}</span></div>
      <div><span style="font-size:0.75rem;color:var(--text-muted);display:block;">Total Donations</span><span style="font-size:0.88rem;font-weight:700;">${donor.totalDonations}</span></div>
      <div><span style="font-size:0.75rem;color:var(--text-muted);display:block;">Total Litres</span><span style="font-size:0.88rem;font-weight:700;">${donor.totalLitres.toFixed(2)}L</span></div>
      <div><span style="font-size:0.75rem;color:var(--text-muted);display:block;">Last Donation</span><span style="font-size:0.88rem;">${donor.lastDonation ? formatDate(donor.lastDonation) : 'Never'}</span></div>
      <div><span style="font-size:0.75rem;color:var(--text-muted);display:block;">Eligibility</span>${elig.eligible ? '<span class="badge badge-green">Eligible Now</span>' : `<span class="badge badge-amber">Wait ${elig.daysLeft} days</span>`}</div>
    </div>
    ${donations.length > 0 ? `
      <h4 style="font-size:0.9rem;margin-bottom:0.75rem;">Donation History</h4>
      <div class="table-container">
        <table class="data-table">
          <thead><tr><th>Date</th><th>Litres</th><th>Blood Bank</th></tr></thead>
          <tbody>${donations.map(d => `<tr><td>${formatDate(d.date)}</td><td>${d.litres}L</td><td>${d.bloodBank}</td></tr>`).join('')}</tbody>
        </table>
      </div>` : '<p class="text-muted text-center">No donation history yet.</p>'}
  `;

    openModal('viewDonorModal');
}

function editDonor(id) {
    const donors = getData('donors') || [];
    const donor = donors.find(d => d.id === id);
    if (!donor) return;

    const form = document.getElementById('addDonorForm');
    if (!form) return;

    form.querySelector('[name="donorName"]').value = donor.name;
    form.querySelector('[name="donorEmail"]').value = donor.email || '';
    form.querySelector('[name="donorPhone"]').value = donor.phone || '';
    form.querySelector('[name="donorBloodGroup"]').value = donor.bloodGroup;
    form.querySelector('[name="donorAge"]').value = donor.age || '';
    form.querySelector('[name="donorGender"]').value = donor.gender || '';
    form.querySelector('[name="donorAddress"]').value = donor.address || '';

    // Change modal title
    const modalTitle = document.querySelector('#addDonorModal .modal-header h3');
    if (modalTitle) modalTitle.textContent = 'Edit Donor';

    // Swap form submission to update mode
    const submitBtn = form.querySelector('button[type="submit"]');
    if (submitBtn) submitBtn.textContent = 'Update Donor';

    form.onsubmit = (e) => {
        e.preventDefault();
        const formData = new FormData(form);
        donor.name = formData.get('donorName')?.trim();
        donor.email = formData.get('donorEmail')?.trim();
        donor.phone = formData.get('donorPhone')?.trim();
        donor.bloodGroup = formData.get('donorBloodGroup');
        donor.age = parseInt(formData.get('donorAge')) || 0;
        donor.gender = formData.get('donorGender');
        donor.address = formData.get('donorAddress')?.trim();

        setData('donors', donors);
        showToast('Donor updated successfully!', 'success');
        closeModal('addDonorModal');
        form.reset();
        form.onsubmit = null;
        if (modalTitle) modalTitle.textContent = 'Register New Donor';
        if (submitBtn) submitBtn.textContent = 'Register Donor';
        setupDonorForm();
        loadDonors();
    };

    openModal('addDonorModal');
}

function deleteDonor(id) {
    if (!confirm('Are you sure you want to remove this donor?')) return;
    let donors = getData('donors') || [];
    donors = donors.filter(d => d.id !== id);
    setData('donors', donors);
    showToast('Donor removed', 'warning');
    loadDonors();
}
