const express = require('express');
const router = express.Router();
const db = require('../db');

// GET /api/inventory
router.get('/', async (req, res) => {
    try {
        const { search } = req.query;
        let q = `SELECT bi.*, bb.blood_bank_name FROM blood_inventory bi
             LEFT JOIN blood_bank bb ON bi.blood_bank_id = bb.blood_bank_id`;
        const params = [];

        if (search) {
            q += ' WHERE UPPER(bi.blood_group) LIKE $1';
            params.push(`%${search.toUpperCase()}%`);
        }
        q += ' ORDER BY bi.blood_group';

        const { rows } = await db.query(q, params);
        const inventory = rows.map(item => ({
            inventoryId: item.inventory_id,
            bloodBankId: item.blood_bank_id,
            bloodBankName: item.blood_bank_name,
            bloodGroup: item.blood_group,
            units: item.quantity,
            litres: parseFloat((item.quantity * 0.45).toFixed(2)),
            expiryDate: item.expiry_date,
            status: item.status,
        }));

        res.json(inventory);
    } catch (err) {
        console.error('Get inventory error:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

// GET /api/inventory/stats
router.get('/stats', async (req, res) => {
    try {
        const { rows } = await db.query('SELECT blood_group, quantity, status FROM blood_inventory');
        const totalUnits = rows.reduce((s, i) => s + i.quantity, 0);
        const totalLitres = parseFloat((totalUnits * 0.45).toFixed(2));
        const lowStock = rows.filter(i => i.quantity <= 5).length;
        const critical = rows.filter(i => i.quantity <= 2).length;

        res.json({ totalUnits, totalLitres, lowStock, critical, bloodGroups: rows.length });
    } catch (err) {
        console.error('Inventory stats error:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

// PUT /api/inventory/:bloodGroup/adjust
router.put('/:bloodGroup/adjust', async (req, res) => {
    try {
        const bloodGroup = decodeURIComponent(req.params.bloodGroup);
        const { delta } = req.body; // +1 or -1

        const { rows } = await db.query('SELECT * FROM blood_inventory WHERE blood_group = $1', [bloodGroup]);
        if (rows.length === 0) return res.status(404).json({ error: 'Blood group not found in inventory' });

        const item = rows[0];
        const newQty = item.quantity + delta;

        if (newQty < 0) {
            return res.status(400).json({ error: `No ${bloodGroup} units available to deduct` });
        }

        let status = 'available';
        if (newQty <= 2) status = 'critical';
        else if (newQty <= 5) status = 'low';

        await db.query(
            'UPDATE blood_inventory SET quantity = $1, status = $2 WHERE inventory_id = $3',
            [newQty, status, item.inventory_id]
        );

        res.json({
            message: `${bloodGroup} stock ${delta > 0 ? 'increased' : 'decreased'} by ${Math.abs(delta)} unit(s)`,
            units: newQty,
        });
    } catch (err) {
        console.error('Adjust inventory error:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router;
