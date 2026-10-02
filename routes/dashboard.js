const express = require('express');
const router = express.Router();
const db = require('../db');

// GET /api/dashboard
router.get('/', async (req, res) => {
    try {
        // Donors
        const { rows: donors } = await db.query('SELECT donor_id, name, blood_group, last_donation_date, eligible FROM donor');
        const now = new Date();
        const eligibleDonors = donors.filter(d => {
            if (!d.last_donation_date) return true;
            return Math.floor((now - new Date(d.last_donation_date)) / (1000 * 60 * 60 * 24)) >= 56;
        });

        // Inventory
        const { rows: inventory } = await db.query(
            `SELECT bi.blood_group, bi.quantity, bi.status FROM blood_inventory bi ORDER BY bi.blood_group`
        );
        const totalUnits = inventory.reduce((s, i) => s + i.quantity, 0);
        const totalLitres = parseFloat((totalUnits * 0.45).toFixed(2));

        // Requests
        const { rows: requests } = await db.query(
            `SELECT br.request_id, br.blood_group, br.quantity_requested, br.request_date,
              br.request_status, br.priority, br.notes,
              h.hospital_name, r.name AS patient_name
       FROM blood_request br
       LEFT JOIN hospital h ON br.hospital_id = h.hospital_id
       LEFT JOIN recipient r ON br.recipient_id = r.recipient_id
       ORDER BY br.request_date DESC, br.request_id DESC`
        );
        const pending = requests.filter(r => r.request_status === 'pending').length;

        // Donations
        const { rows: donations } = await db.query(
            `SELECT bd.donation_id, bd.donation_date, bd.quantity, bd.blood_group,
              d.name AS donor_name
       FROM blood_donation bd
       LEFT JOIN donor dn ON bd.donor_id = dn.donor_id
       LEFT JOIN donor d ON bd.donor_id = d.donor_id
       ORDER BY bd.donation_date DESC`
        );
        const monthly = donations.filter(d => {
            const dd = new Date(d.donation_date);
            return dd.getMonth() === now.getMonth() && dd.getFullYear() === now.getFullYear();
        });

        // Recent activity
        const recentRequests = requests.slice(0, 3).map(r => ({
            dot: r.request_status === 'pending' ? 'amber' : r.request_status === 'approved' ? 'blue' : 'green',
            text: `<strong>${r.hospital_name}</strong> requested ${r.quantity_requested}u of <strong>${r.blood_group}</strong>`,
            time: r.request_date,
        }));
        const recentDonations = donations.slice(0, 3).map(d => ({
            dot: 'red',
            text: `<strong>${d.donor_name}</strong> donated ${d.quantity}L (<strong>${d.blood_group}</strong>)`,
            time: d.donation_date,
        }));
        const activities = [...recentRequests, ...recentDonations]
            .sort((a, b) => new Date(b.time) - new Date(a.time))
            .slice(0, 6);

        res.json({
            stats: {
                totalDonors: donors.length,
                eligibleCount: eligibleDonors.length,
                totalUnits,
                totalLitres,
                pendingRequests: pending,
                totalRequests: requests.length,
                monthlyDonations: monthly.length,
                monthlyLitres: parseFloat((monthly.length * 0.45).toFixed(1)),
            },
            inventory: inventory.map(i => ({
                bloodGroup: i.blood_group,
                units: i.quantity,
                litres: parseFloat((i.quantity * 0.45).toFixed(2)),
            })),
            recentRequests: requests.slice(0, 5).map(r => ({
                id: r.request_id,
                hospital: r.hospital_name,
                bloodGroup: r.blood_group,
                units: r.quantity_requested,
                urgency: r.priority,
                status: r.request_status,
                requestDate: r.request_date,
            })),
            eligibleDonors: eligibleDonors.slice(0, 6).map(d => ({
                id: d.donor_id,
                name: d.name,
                bloodGroup: d.blood_group,
            })),
            activities,
        });
    } catch (err) {
        console.error('Dashboard error:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router;
