/* ========================================
   BloodConnect — Inventory Page Logic
   ======================================== */

document.addEventListener('DOMContentLoaded', () => {
    const session = requireAuth();
    if (!session) return;
    initSidebar();
    loadInventory();
    setupInventorySearch();
});

async function loadInventory(searchQuery) {
    try {
        const params = searchQuery ? `?search=${encodeURIComponent(searchQuery)}` : '';
        const inventory = await api(`/inventory${params}`);
        renderBloodGrid(inventory);
        renderInventoryTable(inventory);
        renderInventoryStats(inventory);
    } catch (err) {
        showToast(err.message || 'Failed to load inventory', 'error');
    }
}

function renderInventoryStats(inventory) {
    const totalUnits = inventory.reduce((s, i) => s + i.units, 0);
    const totalLitres = inventory.reduce((s, i) => s + i.litres, 0);
    const lowStock = inventory.filter(i => i.units <= 5).length;
    const critical = inventory.filter(i => i.units <= 2).length;

    const el = (id, val) => {
        const e = document.getElementById(id);
        if (e) e.textContent = val;
    };

    el('statTotalUnits', totalUnits);
    el('statTotalLitresInv', totalLitres.toFixed(1) + 'L');
    el('statLowStock', lowStock);
    el('statCritical', critical);
}

function renderBloodGrid(inventory) {
    const grid = document.getElementById('bloodGrid');
    if (!grid) return;

    grid.innerHTML = inventory.map(item => {
        let statusClass = '';
        let statusLabel = '';
        if (item.units <= 2) {
            statusClass = 'critical';
            statusLabel = '<span class="badge badge-red" style="margin-top:0.5rem;">CRITICAL</span>';
        } else if (item.units <= 5) {
            statusClass = 'low-stock';
            statusLabel = '<span class="badge badge-amber" style="margin-top:0.5rem;">LOW STOCK</span>';
        } else {
            statusLabel = '<span class="badge badge-green" style="margin-top:0.5rem;">AVAILABLE</span>';
        }

        const maxUnits = 40;
        const pct = Math.min((item.units / maxUnits) * 100, 100);
        const barClass = item.units <= 2 ? 'red' : item.units <= 5 ? 'amber' : 'green';

        return `
      <div class="blood-card ${statusClass}">
        <div class="blood-type">${item.bloodGroup}</div>
        <div class="blood-units">${item.units}</div>
        <div class="blood-label">Units Available</div>
        <div class="progress-bar">
          <div class="progress-fill ${barClass}" style="width:${pct}%"></div>
        </div>
        <div style="font-size:0.75rem;color:var(--text-muted);margin-top:0.35rem;">${item.litres.toFixed(1)}L total</div>
        ${statusLabel}
      </div>`;
    }).join('');
}

function renderInventoryTable(inventory) {
    const tbody = document.getElementById('inventoryTableBody');
    if (!tbody) return;

    tbody.innerHTML = inventory.map(item => {
        let statusBadge;
        if (item.units <= 2) statusBadge = '<span class="badge badge-red">Critical</span>';
        else if (item.units <= 5) statusBadge = '<span class="badge badge-amber">Low</span>';
        else statusBadge = '<span class="badge badge-green">Sufficient</span>';

        return `
      <tr>
        <td><span class="blood-group-chip">${item.bloodGroup}</span></td>
        <td><strong>${item.units}</strong></td>
        <td>${item.litres.toFixed(1)}L</td>
        <td>${statusBadge}</td>
        <td>${item.bloodBankName || '—'}</td>
        <td>
          <div class="flex" style="gap:0.35rem;">
            <button class="btn btn-sm btn-success" onclick="adjustStock('${item.bloodGroup}', 1)">+ Add</button>
            <button class="btn btn-sm btn-danger" onclick="adjustStock('${item.bloodGroup}', -1)">− Use</button>
          </div>
        </td>
      </tr>`;
    }).join('');
}

async function adjustStock(bloodGroup, delta) {
    try {
        const result = await api(`/inventory/${encodeURIComponent(bloodGroup)}/adjust`, {
            method: 'PUT',
            body: JSON.stringify({ delta }),
        });
        showToast(result.message, delta > 0 ? 'success' : 'warning');
        loadInventory();
    } catch (err) {
        showToast(err.message || 'Failed to adjust stock', 'error');
    }
}

function setupInventorySearch() {
    const searchInput = document.getElementById('inventorySearch');
    if (!searchInput) return;

    searchInput.addEventListener('input', () => {
        const query = searchInput.value.trim();
        loadInventory(query || undefined);
    });
}
