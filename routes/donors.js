const express = require('express');
const router = express.Router();
const db = require('../db');

// GET /api/donors
router.get('/', async (req, res) => {
    try {
        const { blood_group, status, search } = req.query;
        let q = 'SELECT * FROM donor';
        const conditions = [];
        const params = [];
        let idx = 1;

        if (blood_group) {
            conditions.push(`blood_group = $${idx++}`);
            params.push(blood_group);
        }
        if (status === 'eligible') {
            conditions.push('eligible = TRUE');
        } else if (status === 'ineligible') {
            conditions.push('eligible = FALSE');
        }
        if (search) {
            conditions.push(`(LOWER(name) LIKE $${idx} OR LOWER(email) LIKE $${idx} OR phone LIKE $${idx})`);
            params.push(`%${search.toLowerCase()}%`);
            idx++;
        }

        if (conditions.length > 0) {
            q += ' WHERE ' + conditions.join(' AND ');
        }
        q += ' ORDER BY donor_id';

        const { rows } = await db.query(q, params);

        // Compute eligibility and format for frontend
        const now = new Date();
        const donors = rows.map(d => {
            let daysSince = null;
            let eligibleCalc = true;
            if (d.last_donation_date) {
                daysSince = Math.floor((now - new Date(d.last_donation_date)) / (1000 * 60 * 60 * 24));
                eligibleCalc = daysSince >= 56;
            }
            return {
                id: d.donor_id,
                name: d.name,
                email: d.email,
                phone: d.phone,
                bloodGroup: d.blood_group,
                age: d.date_of_birth ? Math.floor((now - new Date(d.date_of_birth)) / (1000 * 60 * 60 * 24 * 365.25)) : null,
                gender: d.gender,
                address: d.address,
                lastDonation: d.last_donation_date,
                status: eligibleCalc ? 'eligible' : 'ineligible',
                registered: d.registered,
                dateOfBirth: d.date_of_birth,
            };
        });

        res.json(donors);
    } catch (err) {
        console.error('Get donors error:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

// GET /api/donors/stats
router.get('/stats', async (req, res) => {
    try {
        const { rows: allDonors } = await db.query('SELECT donor_id, last_donation_date, eligible FROM donor');
        const { rows: donations } = await db.query('SELECT donation_id, donor_id, quantity FROM blood_donation');

        const total = allDonors.length;
        const now = new Date();
        const eligible = allDonors.filter(d => {
            if (!d.last_donation_date) return true;
            return Math.floor((now - new Date(d.last_donation_date)) / (1000 * 60 * 60 * 24)) >= 56;
        }).length;
        const totalDonations = donations.length;
        const totalLitres = donations.reduce((s, d) => s + (d.quantity || 0.45), 0);

        res.json({ total, eligible, ineligible: total - eligible, totalDonations, totalLitres: parseFloat(totalLitres.toFixed(2)) });
    } catch (err) {
        console.error('Donor stats error:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

// GET /api/donors/:id
router.get('/:id', async (req, res) => {
    try {
        const { rows } = await db.query('SELECT * FROM donor WHERE donor_id = $1', [req.params.id]);
        if (rows.length === 0) return res.status(404).json({ error: 'Donor not found' });

        const d = rows[0];
        const { rows: donations } = await db.query(
            `SELECT bd.*, bb.blood_bank_name FROM blood_donation bd
       LEFT JOIN blood_bank bb ON bd.blood_bank_id = bb.blood_bank_id
       WHERE bd.donor_id = $1 ORDER BY bd.donation_date DESC`,
            [d.donor_id]
        );

        const now = new Date();
        res.json({
            id: d.donor_id,
            name: d.name,
            email: d.email,
            phone: d.phone,
            bloodGroup: d.blood_group,
            age: d.date_of_birth ? Math.floor((now - new Date(d.date_of_birth)) / (1000 * 60 * 60 * 24 * 365.25)) : null,
            gender: d.gender,
            address: d.address,
            lastDonation: d.last_donation_date,
            status: d.eligible ? 'eligible' : 'ineligible',
            registered: d.registered,
            dateOfBirth: d.date_of_birth,
            totalDonations: donations.length,
            totalLitres: parseFloat(donations.reduce((s, dn) => s + (dn.quantity || 0.45), 0).toFixed(2)),
            donations: donations.map(dn => ({
                id: dn.donation_id,
                date: dn.donation_date,
                quantity: dn.quantity,
                bloodGroup: dn.blood_group,
                bloodBank: dn.blood_bank_name,
                status: dn.status,
            })),
        });
    } catch (err) {
        console.error('Get donor error:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

// POST /api/donors
router.post('/', async (req, res) => {
    try {
        const { name, email, phone, bloodGroup, gender, address, dateOfBirth } = req.body;
        if (!name || !bloodGroup) {
            return res.status(400).json({ error: 'Name and blood group are required' });
        }

        const { rows } = await db.query(
            `INSERT INTO donor (name, email, phone, blood_group, gender, address, date_of_birth, eligible)
       VALUES ($1,$2,$3,$4,$5,$6,$7,TRUE) RETURNING donor_id`,
            [name, email || null, phone || null, bloodGroup, gender || null, address || null, dateOfBirth || null]
        );

        res.status(201).json({ id: rows[0].donor_id, message: 'Donor created' });
    } catch (err) {
        console.error('Create donor error:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

// PUT /api/donors/:id
router.put('/:id', async (req, res) => {
    try {
        const { name, email, phone, bloodGroup, gender, address, dateOfBirth } = req.body;
        const { rowCount } = await db.query(
            `UPDATE donor SET name=$1, email=$2, phone=$3, blood_group=$4, gender=$5, address=$6, date_of_birth=$7
       WHERE donor_id=$8`,
            [name, email, phone, bloodGroup, gender, address, dateOfBirth || null, req.params.id]
        );
        if (rowCount === 0) return res.status(404).json({ error: 'Donor not found' });
        res.json({ message: 'Donor updated' });
    } catch (err) {
        console.error('Update donor error:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

// DELETE /api/donors/:id
router.delete('/:id', async (req, res) => {
    try {
        const { rowCount } = await db.query('DELETE FROM donor WHERE donor_id = $1', [req.params.id]);
        if (rowCount === 0) return res.status(404).json({ error: 'Donor not found' });
        res.json({ message: 'Donor deleted' });
    } catch (err) {
        console.error('Delete donor error:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router;
