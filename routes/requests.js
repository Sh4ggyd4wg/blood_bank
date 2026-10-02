const express = require('express');
const router = express.Router();
const db = require('../db');

// GET /api/requests
router.get('/', async (req, res) => {
    try {
        const { status, urgency, blood_group, search } = req.query;
        let q = `SELECT br.*, h.hospital_name, r.name AS patient_name
             FROM blood_request br
             LEFT JOIN hospital h ON br.hospital_id = h.hospital_id
             LEFT JOIN recipient r ON br.recipient_id = r.recipient_id`;
        const conditions = [];
        const params = [];
        let idx = 1;

        if (status) {
            conditions.push(`br.request_status = $${idx++}`);
            params.push(status);
        }
        if (urgency) {
            conditions.push(`br.priority = $${idx++}`);
            params.push(urgency);
        }
        if (blood_group) {
            conditions.push(`br.blood_group = $${idx++}`);
            params.push(blood_group);
        }
        if (search) {
            conditions.push(`(LOWER(h.hospital_name) LIKE $${idx} OR LOWER(r.name) LIKE $${idx})`);
            params.push(`%${search.toLowerCase()}%`);
            idx++;
        }

        if (conditions.length > 0) {
            q += ' WHERE ' + conditions.join(' AND ');
        }
        q += ' ORDER BY br.request_date DESC, br.request_id DESC';

        const { rows } = await db.query(q, params);
        const requests = rows.map(r => ({
            id: r.request_id,
            hospital: r.hospital_name || 'Unknown Hospital',
            hospitalId: r.hospital_id,
            patient: r.patient_name || 'Unknown',
            recipientId: r.recipient_id,
            bloodGroup: r.blood_group,
            units: r.quantity_requested,
            urgency: r.priority,
            status: r.request_status,
            notes: r.notes,
            requestDate: r.request_date,
        }));

        res.json(requests);
    } catch (err) {
        console.error('Get requests error:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

// GET /api/requests/stats
router.get('/stats', async (req, res) => {
    try {
        const { rows } = await db.query('SELECT request_status FROM blood_request');
        const total = rows.length;
        const pending = rows.filter(r => r.request_status === 'pending').length;
        const approved = rows.filter(r => r.request_status === 'approved').length;
        const dispatched = rows.filter(r => r.request_status === 'dispatched').length;
        res.json({ total, pending, approved, dispatched });
    } catch (err) {
        console.error('Request stats error:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

// POST /api/requests
router.post('/', async (req, res) => {
    try {
        const { hospital, patient, bloodGroup, units, urgency, notes } = req.body;
        if (!hospital || !patient || !bloodGroup || !units) {
            return res.status(400).json({ error: 'Hospital, patient, blood group, and units are required' });
        }

        // Find or create hospital
        let hospitalId;
        const { rows: existingHospitals } = await db.query(
            'SELECT hospital_id FROM hospital WHERE LOWER(hospital_name) = LOWER($1)',
            [hospital]
        );
        if (existingHospitals.length > 0) {
            hospitalId = existingHospitals[0].hospital_id;
        } else {
            const { rows: newH } = await db.query(
                'INSERT INTO hospital (hospital_name) VALUES ($1) RETURNING hospital_id',
                [hospital]
            );
            hospitalId = newH[0].hospital_id;
        }

        // Find or create recipient
        let recipientId;
        const { rows: existingRecipients } = await db.query(
            'SELECT recipient_id FROM recipient WHERE LOWER(name) = LOWER($1) AND blood_group = $2',
            [patient, bloodGroup]
        );
        if (existingRecipients.length > 0) {
            recipientId = existingRecipients[0].recipient_id;
        } else {
            const { rows: newR } = await db.query(
                'INSERT INTO recipient (name, blood_group) VALUES ($1, $2) RETURNING recipient_id',
                [patient, bloodGroup]
            );
            recipientId = newR[0].recipient_id;
        }

        // Check stock warning
        const { rows: stockRows } = await db.query(
            'SELECT quantity FROM blood_inventory WHERE blood_group = $1',
            [bloodGroup]
        );
        let warning = null;
        if (stockRows.length > 0 && stockRows[0].quantity < units) {
            warning = `Only ${stockRows[0].quantity} units of ${bloodGroup} available. Requested ${units}.`;
        }

        // Default blood_bank_id = 1
        const { rows: newReq } = await db.query(
            `INSERT INTO blood_request (recipient_id, hospital_id, blood_bank_id, blood_group, quantity_requested, priority, notes)
       VALUES ($1, $2, 1, $3, $4, $5, $6) RETURNING request_id`,
            [recipientId, hospitalId, bloodGroup, units, urgency || 'normal', notes || '']
        );

        res.status(201).json({
            id: newReq[0].request_id,
            message: 'Blood request created successfully',
            warning,
        });
    } catch (err) {
        console.error('Create request error:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

// PUT /api/requests/:id/status
router.put('/:id/status', async (req, res) => {
    try {
        const { status } = req.body;
        const requestId = req.params.id;

        const { rows } = await db.query('SELECT * FROM blood_request WHERE request_id = $1', [requestId]);
        if (rows.length === 0) return res.status(404).json({ error: 'Request not found' });

        const request = rows[0];

        // If dispatching, deduct from inventory
        if (status === 'dispatched') {
            const { rows: stockRows } = await db.query(
                'SELECT * FROM blood_inventory WHERE blood_group = $1',
                [request.blood_group]
            );
            if (stockRows.length > 0) {
                const stock = stockRows[0];
                if (stock.quantity < request.quantity_requested) {
                    return res.status(400).json({
                        error: `Not enough ${request.blood_group} stock! Only ${stock.quantity} units available.`,
                    });
                }
                const newQty = stock.quantity - request.quantity_requested;
                let invStatus = 'available';
                if (newQty <= 2) invStatus = 'critical';
                else if (newQty <= 5) invStatus = 'low';

                await db.query(
                    'UPDATE blood_inventory SET quantity = $1, status = $2 WHERE inventory_id = $3',
                    [newQty, invStatus, stock.inventory_id]
                );
            }
        }

        await db.query('UPDATE blood_request SET request_status = $1 WHERE request_id = $2', [status, requestId]);

        const messages = {
            approved: 'Request approved!',
            rejected: 'Request rejected.',
            dispatched: 'Blood dispatched! Inventory updated.',
        };

        res.json({ message: messages[status] || 'Status updated' });
    } catch (err) {
        console.error('Update request status error:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router;
