const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const db = require('../db');

// GET /api/admin/stats
router.get('/stats', async (req, res) => {
    try {
        const [donors, inventory, requests, donations, users] = await Promise.all([
            db.query('SELECT COUNT(*) AS count FROM donor'),
            db.query('SELECT SUM(quantity) AS total_units FROM blood_inventory'),
            db.query('SELECT request_status, COUNT(*) AS count FROM blood_request GROUP BY request_status'),
            db.query('SELECT COUNT(*) AS count FROM blood_donation'),
            db.query('SELECT COUNT(*) AS count FROM users'),
        ]);

        const requestStats = {};
        requests.rows.forEach(r => { requestStats[r.request_status] = parseInt(r.count); });

        res.json({
            totalDonors: parseInt(donors.rows[0].count),
            totalUnits: parseInt(inventory.rows[0].total_units) || 0,
            totalRequests: Object.values(requestStats).reduce((s, v) => s + v, 0),
            pendingRequests: requestStats.pending || 0,
            approvedRequests: requestStats.approved || 0,
            dispatchedRequests: requestStats.dispatched || 0,
            totalDonations: parseInt(donations.rows[0].count),
            totalUsers: parseInt(users.rows[0].count),
        });
    } catch (err) {
        console.error('Admin stats error:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

// GET /api/admin/users
router.get('/users', async (req, res) => {
    try {
        const { rows } = await db.query(
            'SELECT user_id, username, name, role, email, donor_id FROM users ORDER BY user_id'
        );
        res.json(rows.map(u => ({
            id: u.user_id,
            username: u.username,
            name: u.name,
            role: u.role,
            email: u.email,
            donorId: u.donor_id,
        })));
    } catch (err) {
        console.error('Get users error:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

// POST /api/admin/users
router.post('/users', async (req, res) => {
    try {
        const { username, password, name, role, email } = req.body;
        if (!username || !password || !name || !role) {
            return res.status(400).json({ error: 'All fields are required' });
        }

        const existing = await db.query('SELECT user_id FROM users WHERE LOWER(username) = LOWER($1)', [username]);
        if (existing.rows.length > 0) {
            return res.status(409).json({ error: 'Username already exists' });
        }

        const hashed = await bcrypt.hash(password, 10);
        const { rows } = await db.query(
            'INSERT INTO users (username, password, name, role, email) VALUES ($1,$2,$3,$4,$5) RETURNING user_id',
            [username, hashed, name, role, email || null]
        );

        res.status(201).json({ id: rows[0].user_id, message: 'User created' });
    } catch (err) {
        console.error('Create user error:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

// DELETE /api/admin/users/:id
router.delete('/users/:id', async (req, res) => {
    try {
        const { rowCount } = await db.query('DELETE FROM users WHERE user_id = $1', [req.params.id]);
        if (rowCount === 0) return res.status(404).json({ error: 'User not found' });
        res.json({ message: 'User deleted' });
    } catch (err) {
        console.error('Delete user error:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

// GET /api/admin/donations
router.get('/donations', async (req, res) => {
    try {
        const { rows } = await db.query(
            `SELECT bd.*, d.name AS donor_name, bb.blood_bank_name
       FROM blood_donation bd
       LEFT JOIN donor d ON bd.donor_id = d.donor_id
       LEFT JOIN blood_bank bb ON bd.blood_bank_id = bb.blood_bank_id
       ORDER BY bd.donation_date DESC`
        );
        res.json(rows.map(dn => ({
            id: dn.donation_id,
            donorId: dn.donor_id,
            donorName: dn.donor_name,
            bloodGroup: dn.blood_group,
            litres: dn.quantity,
            date: dn.donation_date,
            bloodBank: dn.blood_bank_name,
            status: dn.status,
        })));
    } catch (err) {
        console.error('Get donations error:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

// GET /api/admin/inventory  — full inventory with blood bank names
router.get('/inventory', async (req, res) => {
    try {
        const { rows } = await db.query(
            `SELECT bi.*, bb.blood_bank_name FROM blood_inventory bi
       LEFT JOIN blood_bank bb ON bi.blood_bank_id = bb.blood_bank_id
       ORDER BY bi.blood_group`
        );
        res.json(rows.map(item => ({
            bloodGroup: item.blood_group,
            units: item.quantity,
            litres: parseFloat((item.quantity * 0.45).toFixed(2)),
            bloodBank: item.blood_bank_name,
            status: item.status,
        })));
    } catch (err) {
        console.error('Admin inventory error:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router;
