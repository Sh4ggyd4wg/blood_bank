const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const db = require('../db');

// POST /api/auth/login
router.post('/login', async (req, res) => {
    try {
        const { username, password, role } = req.body;
        if (!username || !password) {
            return res.status(400).json({ error: 'Username and password are required' });
        }

        let q = 'SELECT * FROM users WHERE LOWER(username) = LOWER($1)';
        const params = [username];
        if (role) {
            q += ' AND role = $2';
            params.push(role);
        }

        const { rows } = await db.query(q, params);
        if (rows.length === 0) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const user = rows[0];
        const valid = await bcrypt.compare(password, user.password);
        if (!valid) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        res.json({
            id: user.user_id,
            name: user.name,
            role: user.role,
            username: user.username,
            email: user.email,
            donorId: user.donor_id || null,
            loginTime: new Date().toISOString(),
        });
    } catch (err) {
        console.error('Login error:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

// POST /api/auth/signup
router.post('/signup', async (req, res) => {
    try {
        const { name, email, username, password, role, phone, bloodGroup } = req.body;
        if (!name || !email || !username || !password || !role) {
            return res.status(400).json({ error: 'All required fields must be provided' });
        }
        if (password.length < 6) {
            return res.status(400).json({ error: 'Password must be at least 6 characters' });
        }

        // Check username uniqueness
        const existing = await db.query('SELECT user_id FROM users WHERE LOWER(username) = LOWER($1)', [username]);
        if (existing.rows.length > 0) {
            return res.status(409).json({ error: 'Username already exists' });
        }

        // Check email uniqueness
        const existingEmail = await db.query('SELECT user_id FROM users WHERE LOWER(email) = LOWER($1)', [email]);
        if (existingEmail.rows.length > 0) {
            return res.status(409).json({ error: 'Email already registered' });
        }

        const hashed = await bcrypt.hash(password, 10);
        let donorId = null;

        // If signing up as a donor, create a donor record
        if (role === 'donor' && bloodGroup) {
            const donorResult = await db.query(
                `INSERT INTO donor (name, email, phone, blood_group, eligible)
         VALUES ($1, $2, $3, $4, TRUE) RETURNING donor_id`,
                [name, email, phone || '', bloodGroup]
            );
            donorId = donorResult.rows[0].donor_id;
        }

        await db.query(
            'INSERT INTO users (username, password, name, role, email, donor_id) VALUES ($1,$2,$3,$4,$5,$6)',
            [username, hashed, name, role, email, donorId]
        );

        res.status(201).json({ message: 'Account created successfully' });
    } catch (err) {
        console.error('Signup error:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router;
