// Database operations grouped by feature. The existing browser API stays the same.
const express = require('express');
const { wrap, requireValue, id, text, email, eligibility, donorInput, transaction, today, integer, bloodGroup, date, hashPassword, verifyPassword } = require('./helpers');
// AUTH
function authRoutes(db, auth) {
  const router = express.Router();
  router.post('/login', wrap(async (req, res) => {
    const username = text(req.body.username, 'Username', 50);
    const { rows } = await db.query('SELECT user_id,password FROM users WHERE lower(username)=lower($1)', [username]);
    requireValue(rows.length && await verifyPassword(req.body.password, rows[0].password), 'Incorrect username or password.', 401);
    auth.start(req, res, rows[0].user_id);
    res.json({
      message: 'Logged in.'
    });
  }));
  router.get('/me', auth.requireAuth, (req, res) => res.json(req.user));
  router.post('/logout', (req, res) => {
    auth.clear(req, res);
    res.json({
      message: 'Logged out.'
    });
  });
  router.post('/signup', wrap(async (req, res) => {
    requireValue(req.body.role === undefined || req.body.role === 'donor', 'Public registration is for donors only.');
    const username = text(req.body.username, 'Username', 50);
    requireValue(/^[A-Za-z0-9_.-]{3,50}$/.test(username), 'Username must contain 3–50 letters, digits, dots, underscores or hyphens.');
    const password = await hashPassword(req.body.password);
    await transaction(db, async (client) => {
      const values = donorInput(req.body, await today(client));
      const { rows } = await client.query(`INSERT INTO donor(name,gender,date_of_birth,blood_group,phone,email,address)
    VALUES($1,$2,$3,$4,$5,$6,$7) RETURNING donor_id`, values);
      await client.query(`INSERT INTO users(username,password,name,role,email,donor_id)
    VALUES($1,$2,$3,'donor',$4,$5)`, [username, password, values[0], values[5], rows[0].donor_id]);
    });
    res.status(201).json({
      message: 'Account created. An administrator must verify your donor profile before donation.'
    });
  }));
  return router;
}
// DONORS
function donorsRoutes(db, auth, waitDays) {
  const router = express.Router();
  router.use(auth.roles('admin', 'donor'));
  router.get('/', auth.roles('admin'), wrap(async (req, res) => {
    const current = await today(db);
    const { rows } = await db.query(`SELECT d.*, t.total_donations::int AS total_donations, t.total_litres::float AS total_litres
   FROM donor d JOIN donor_totals t ON t.donor_id=d.donor_id ORDER BY d.donor_id`);
    let donors = rows.map(d =>({
      ...d, ...eligibility(d, current, waitDays)
    }));
    if (req.query.bloodGroup) donors = donors.filter(d => d.blood_group === req.query.bloodGroup);
    if (req.query.status === 'eligible') donors = donors.filter(d => d.canDonate);
    if (req.query.status === 'ineligible') donors = donors.filter(d =>!d.canDonate);
    if (req.query.search) {
      const search = String(req.query.search).toLowerCase();
      donors = donors.filter(d =>[d.name, d.email, d.phone, String(d.donor_id)].some(v => v && v.toLowerCase().includes(search)));
    }
    res.json(donors);
  }));
  async function detail(req, res) {
    const donorId = req.params.id === 'me'? req.user.donor_id: id(req.params.id);
    requireValue(req.user.role === 'admin' || donorId === req.user.donor_id, 'You can view only your own profile.', 403);
    const { rows } = await db.query('SELECT * FROM donor WHERE donor_id=$1', [donorId]);
    requireValue(rows.length, 'Donor not found.', 404);
    const history = await db.query(`SELECT bd.*,bb.blood_bank_name FROM blood_donation bd
   JOIN blood_bank bb USING(blood_bank_id) WHERE bd.donor_id=$1 ORDER BY donation_date DESC,donation_id DESC`, [donorId]);
    res.json({
      ...rows[0], ...eligibility(rows[0], await today(db), waitDays), waitDays, donations: history.rows
    });
  }
  router.get('/:id', wrap(detail));
  router.post('/', auth.roles('admin'), wrap(async (req, res) => {
    const values = donorInput(req.body, await today(db));
    const { rows } = await db.query(`INSERT INTO donor(name,gender,date_of_birth,blood_group,phone,email,address)
   VALUES($1,$2,$3,$4,$5,$6,$7) RETURNING donor_id`, values);
    res.status(201).json({
      message: 'Donor registered. Verify the profile before recording a donation.', id: rows[0].donor_id
    });
  }));
  router.put('/:id', wrap(async (req, res) => {
    const donorId = req.params.id === 'me'? req.user.donor_id: id(req.params.id);
    requireValue(req.user.role === 'admin' || donorId === req.user.donor_id, 'You can edit only your own profile.', 403);
    await transaction(db, async (client) => {
      const { rows } = await client.query('SELECT * FROM donor WHERE donor_id=$1 FOR UPDATE', [donorId]);
      requireValue(rows.length, 'Donor not found.', 404);
      const old = rows[0];
      if (req.user.role === 'donor') {
        requireValue(!['bloodGroup', 'dateOfBirth', 'gender', 'eligible', 'lastDonationDate', 'role'].some(k => Object.hasOwn(req.body, k)), 'Only name, email, phone and address can be changed here. Ask an administrator to correct verified details.');
        const name = text(req.body.name, 'Name'), mail = email(req.body.email, true);
        await client.query('UPDATE donor SET name=$1,email=$2,phone=$3,address=$4 WHERE donor_id=$5', [name, mail, text(req.body.phone, 'Phone', 20, true), text(req.body.address, 'Address', 500, true), donorId]);
        await client.query('UPDATE users SET name=$1,email=$2 WHERE donor_id=$3', [name, mail, donorId]);
      } else {
        const values = donorInput(req.body, await today(client), false);
        requireValue(typeof req.body.eligible === 'boolean', 'Verification must be true or false.');
        if (old.blood_group !== values[3]) {
          const history = await client.query('SELECT donation_id FROM blood_donation WHERE donor_id=$1 LIMIT 1', [donorId]);
          requireValue(!history.rows.length, 'Blood group cannot be changed once donation history exists.', 409);
        }
        await client.query(`UPDATE donor SET name=$1,gender=$2,date_of_birth=$3,blood_group=$4,phone=$5,email=$6,address=$7,eligible=$8
     WHERE donor_id=$9`, [...values, req.body.eligible, donorId]);
        await client.query('UPDATE users SET name=$1,email=$2 WHERE donor_id=$3', [values[0], values[5], donorId]);
      }
    });
    res.json({
      message: 'Profile updated.'
    });
  }));
  router.delete('/:id', auth.roles('admin'), wrap(async (req, res) => {
    const result = await db.query('DELETE FROM donor WHERE donor_id=$1', [id(req.params.id)]);
    requireValue(result.rowCount, 'Donor not found.', 404);
    res.json({
      message: 'Unused donor record deleted.'
    });
  }));
  return router;
}
// DONATIONS
function donationsRoutes(db, auth, waitDays) {
  const router = express.Router();
  router.use(auth.roles('admin'));
  router.get('/', wrap(async (req, res) => {
    const { rows } = await db.query(`SELECT bd.*,d.name AS donor_name,bb.blood_bank_name FROM blood_donation bd
   JOIN donor d USING(donor_id) JOIN blood_bank bb USING(blood_bank_id) ORDER BY donation_date DESC,donation_id DESC`);
    res.json(rows);
  }));
  router.post('/', wrap(async (req, res) => {
    const donorId = integer(req.body.donorId), bankId = integer(req.body.bloodBankId);
    const expiry = date(req.body.expiryDate, 'Expiry date');
    requireValue(req.body.confirmed === true, 'Confirm that the donation has been verified and completed.');
    requireValue(req.body.quantity === undefined || req.body.quantity === 0.45, 'One recorded donation is one project unit (0.45 L).');
    requireValue(req.body.donationDate === undefined, 'Donation date is assigned by the server.');
    const donationId = await transaction(db, async (client) => {
      const current = await today(client);
      requireValue(expiry > current, 'Enter a future expiry date.');
      const { rows } = await client.query('SELECT * FROM donor WHERE donor_id=$1 FOR UPDATE', [donorId]);
      requireValue(rows.length, 'Donor not found.', 404);
      const result = eligibility(rows[0], current, waitDays);
      requireValue(result.canDonate, result.reason, 409);
      const record = await client.query(`INSERT INTO blood_donation(donor_id,blood_bank_id,donation_date,quantity,blood_group)
    VALUES($1,$2,$3,0.45,$4) RETURNING donation_id`, [donorId, bankId, current, rows[0].blood_group]);
      await client.query('UPDATE donor SET last_donation_date=$1 WHERE donor_id=$2', [current, donorId]);
      await client.query(`INSERT INTO blood_inventory(blood_bank_id,blood_group,quantity,expiry_date) VALUES($1,$2,1,$3)
    ON CONFLICT(blood_bank_id,blood_group,expiry_date) DO UPDATE SET quantity=blood_inventory.quantity+1`, [bankId, rows[0].blood_group, expiry]);
      return record.rows[0].donation_id;
    });
    res.status(201).json({
      message: 'Donation recorded. One unit added to inventory.', id: donationId
    });
  }));
  return router;
}
// INVENTORY
function inventoryRoutes(db, auth) {
  const router = express.Router();
  router.use(auth.roles('admin', 'staff'));
  router.get('/', wrap(async (req, res) => {
    const summary = await db.query(`SELECT bb.blood_bank_id,bb.blood_bank_name,g.blood_group,
   COALESCE(SUM(bi.quantity) FILTER (WHERE bi.expiry_date>=CURRENT_DATE),0)::int AS units,
   COALESCE(SUM(bi.quantity) FILTER (WHERE bi.expiry_date<CURRENT_DATE),0)::int AS expired_units
   FROM blood_bank bb CROSS JOIN (VALUES ('A+'),('A-'),('B+'),('B-'),('AB+'),('AB-'),('O+'),('O-')) g(blood_group)
   LEFT JOIN blood_inventory bi ON bi.blood_bank_id=bb.blood_bank_id AND bi.blood_group=g.blood_group
   GROUP BY bb.blood_bank_id,g.blood_group ORDER BY bb.blood_bank_id,g.blood_group`);
    let batches = [];
    if (req.user.role === 'admin') batches =(await db.query(`SELECT bi.*,bb.blood_bank_name,
   (expiry_date<CURRENT_DATE) AS expired FROM blood_inventory bi JOIN blood_bank bb USING(blood_bank_id)
   ORDER BY expiry_date,inventory_id`)).rows;
    res.json({
      summary: summary.rows.map(r =>({
        ...r, litres: Number((r.units * 0.45).toFixed(2)), status: r.units <= 2? 'critical': r.units <= 5? 'low': 'available'
      })), batches
    });
  }));
  return router;
}
// REQUESTS
function requestsRoutes(db, auth) {
  const router = express.Router();
  router.use(auth.roles('admin', 'staff'));
  router.get('/', wrap(async (req, res) => {
    const own = req.user.role === 'staff';
    const { rows } = await db.query(`SELECT br.*,r.name AS patient_name,h.hospital_name,bb.blood_bank_name
   FROM blood_request br JOIN recipient r USING(recipient_id) JOIN hospital h USING(hospital_id)
   JOIN blood_bank bb USING(blood_bank_id) ${own?'WHERE br.hospital_id=$1':''}
   ORDER BY CASE br.priority WHEN 'critical' THEN 0 WHEN 'urgent' THEN 1 ELSE 2 END,br.request_date,br.request_id`, own?[req.user.hospital_id]:  []);
    res.json(rows);
  }));
  router.post('/', auth.roles('staff'), wrap(async (req, res) => {
    const group = bloodGroup(req.body.bloodGroup), units = integer(req.body.units, 'Units');
    const bankId = integer(req.body.bloodBankId), priority = req.body.priority || 'normal';
    requireValue(['normal', 'urgent', 'critical'].includes(priority), 'Invalid urgency.');
    requireValue(req.body.hospitalId === undefined || req.body.hospitalId === req.user.hospital_id, 'You can submit only for your hospital.', 403);
    const notes = text(req.body.notes, 'Notes', 1000, true) || '';
    const requestId = await transaction(db, async (client) => {
      let recipientId;
      if (req.body.recipientId) {
        recipientId = integer(req.body.recipientId);
        const { rows } = await client.query(`SELECT r.* FROM recipient r WHERE recipient_id=$1 AND EXISTS
     (SELECT 1 FROM blood_request br WHERE br.recipient_id=r.recipient_id AND br.hospital_id=$2)`, [recipientId, req.user.hospital_id]);
        requireValue(rows.length, 'Recipient is not available to your hospital.', 403);
        requireValue(rows[0].blood_group === group, 'Requested group must match this recipient in the project exact-match model.');
      } else {
        const patient = text(req.body.patientName, 'Patient name');
        recipientId =(await client.query('INSERT INTO recipient(name,blood_group) VALUES($1,$2) RETURNING recipient_id', [patient, group])).rows[0].recipient_id;
      }
      return(await client.query(`INSERT INTO blood_request(recipient_id,hospital_id,blood_bank_id,blood_group,quantity_requested,priority,notes)
    VALUES($1,$2,$3,$4,$5,$6,$7) RETURNING request_id`, [recipientId, req.user.hospital_id, bankId, group, units, priority, notes])).rows[0].request_id;
    });
    res.status(201).json({
      message: 'Request submitted. Pending requests do not reserve stock.', id: requestId
    });
  }));
  router.put('/:id/status', auth.roles('admin'), wrap(async (req, res) => {
    const requestId = id(req.params.id), status = req.body.status;
    requireValue(['approved', 'rejected', 'dispatched'].includes(status), 'Invalid request status.');
    await transaction(db, async (client) => {
      const { rows } = await client.query('SELECT * FROM blood_request WHERE request_id=$1 FOR UPDATE', [requestId]);
      requireValue(rows.length, 'Request not found.', 404);
      const request = rows[0];
      const valid =(request.request_status === 'pending' &&['approved', 'rejected'].includes(status)) ||(request.request_status === 'approved' && status === 'dispatched');
      requireValue(valid, `Cannot change ${request.request_status} to ${status}.`, 409);
      if (status === 'approved' || status === 'dispatched') {
        const stock = await client.query(`SELECT inventory_id,quantity FROM blood_inventory
     WHERE blood_bank_id=$1 AND blood_group=$2 AND expiry_date>=CURRENT_DATE AND quantity>0
     ORDER BY expiry_date,inventory_id FOR UPDATE`, [request.blood_bank_id, request.blood_group]);
        const total = stock.rows.reduce((sum, batch) => sum + batch.quantity, 0);
        requireValue(total >= request.quantity_requested, `Only ${total} usable unit(s) available at the selected bank.`, 409);
        if (status === 'dispatched') {
          let remaining = request.quantity_requested;
          for (const batch of stock.rows) {
            if (remaining === 0) break;
            const used = Math.min(remaining, batch.quantity);
            await client.query('UPDATE blood_inventory SET quantity=quantity-$1 WHERE inventory_id=$2', [used, batch.inventory_id]);
            remaining -= used;
          }
        }
      }
      await client.query('UPDATE blood_request SET request_status=$1 WHERE request_id=$2', [status, requestId]);
    });
    res.json({
      message: status === 'dispatched'? 'Blood dispatched. Inventory updated.': status === 'approved'? 'Request approved. Stock is checked again at dispatch.': 'Request rejected.'
    });
  }));
  return router;
}
// ADMIN
function adminRoutes(db, auth) {
  const router = express.Router();
  router.use(auth.roles('admin'));
  router.get('/users', wrap(async (req, res) => {
    const { rows } = await db.query(`SELECT u.user_id,u.username,u.name,u.email,u.role,u.donor_id,u.hospital_id,h.hospital_name
   FROM users u LEFT JOIN hospital h USING(hospital_id) ORDER BY user_id`);
    res.json(rows);
  }));
  router.post('/users', wrap(async (req, res) => {
    const username = text(req.body.username, 'Username', 50), role = req.body.role;
    requireValue(/^[A-Za-z0-9_.-]{3,50}$/.test(username), 'Username must contain 3–50 letters, digits, dots, underscores or hyphens.');
    requireValue(['admin', 'staff', 'donor'].includes(role), 'Invalid role.');
    const password = await hashPassword(req.body.password);
    await transaction(db, async (client) => {
      let donorId = null, hospitalId = null, name, mail;
      if (role === 'donor') {
        donorId = integer(req.body.donorId, 'Donor ID');
        const { rows } = await client.query('SELECT * FROM donor WHERE donor_id=$1 FOR UPDATE', [donorId]);
        requireValue(rows.length, 'Donor not found.', 404);
        name = rows[0].name;
        mail = rows[0].email;
      } else {
        name = text(req.body.name, 'Name');
        mail = email(req.body.email, true);
        if (role === 'staff') hospitalId = integer(req.body.hospitalId, 'Hospital ID');
      }
      await client.query(`INSERT INTO users(username,password,name,role,email,donor_id,hospital_id)
    VALUES($1,$2,$3,$4,$5,$6,$7)`, [username, password, name, role, mail, donorId, hospitalId]);
    });
    res.status(201).json({
      message: 'Account created.'
    });
  }));
  router.delete('/users/:id', wrap(async (req, res) => {
    const userId = id(req.params.id);
    requireValue(userId !== req.user.user_id, 'You cannot delete your own account.', 409);
    await transaction(db, async (client) => {
      // Serialize account deletion so concurrent requests cannot remove every admin.
      await client.query('LOCK TABLE users IN SHARE ROW EXCLUSIVE MODE');
      const { rows } = await client.query('SELECT role FROM users WHERE user_id=$1', [userId]);
      requireValue(rows.length, 'User not found.', 404);
      if (rows[0].role === 'admin') {
        const count =(await client.query("SELECT COUNT(*)::int AS count FROM users WHERE role='admin'")).rows[0].count;
        requireValue(count > 1, 'The last administrator cannot be deleted.', 409);
      }
      await client.query('DELETE FROM users WHERE user_id=$1', [userId]);
    });
    res.json({
      message: 'Account deleted. Donor and donation history were preserved.'
    });
  }));
  return router;
}
// LOOKUPS
function lookupsRoutes(db, auth) {
  const router = express.Router();
  router.use(auth.roles('admin', 'staff'));
  router.get('/', wrap(async (req, res) => {
    const banks =(await db.query('SELECT blood_bank_id,blood_bank_name FROM blood_bank ORDER BY blood_bank_id')).rows;
    const hospitals = req.user.role === 'admin'?(await db.query('SELECT hospital_id,hospital_name FROM hospital ORDER BY hospital_id')).rows:  [];
    const recipients = req.user.role === 'staff'?(await db.query(`SELECT DISTINCT r.recipient_id,r.name,r.blood_group FROM recipient r
   JOIN blood_request br USING(recipient_id) WHERE br.hospital_id=$1 ORDER BY r.recipient_id`, [req.user.hospital_id])).rows:  [];
    res.json({
      banks, hospitals, recipients
    });
  }));
  return router;
}
// DASHBOARD
function dashboardRoutes(db, auth) {
  const router = express.Router();
  router.use(auth.roles('admin', 'staff'));
  router.get('/', wrap(async (req, res) => {
    const own = req.user.role === 'staff';
    const requests =(await db.query(`SELECT request_status,COUNT(*)::int AS count FROM blood_request
   ${own?'WHERE hospital_id=$1':''} GROUP BY request_status`, own?[req.user.hospital_id]:  [])).rows;
    const stock =(await db.query('SELECT COALESCE(SUM(quantity),0)::int AS units FROM available_inventory')).rows[0];
    let details = {
    };
    if (!own) {
      const donors =(await db.query('SELECT COUNT(*)::int AS count FROM donor')).rows[0];
      const donations =(await db.query(`SELECT COUNT(*)::int AS count,COALESCE(SUM(quantity),0)::float AS litres
    FROM blood_donation WHERE status='completed' AND donation_date>=date_trunc('month',CURRENT_DATE)::date
    AND donation_date<=CURRENT_DATE`)).rows[0];
      details = {
        donors: donors.count, monthlyDonations: donations.count, monthlyLitres: donations.litres
      };
    }
    res.json({
      requests, usableUnits: stock.units, ...details
    });
  }));
  return router;
}
module.exports = {
  auth: authRoutes, donors: donorsRoutes, donations: donationsRoutes, inventory: inventoryRoutes, requests: requestsRoutes, admin: adminRoutes, lookups: lookupsRoutes, dashboard: dashboardRoutes
};
