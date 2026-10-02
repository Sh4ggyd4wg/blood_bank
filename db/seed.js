const fs = require('fs');
const path = require('path');
const bcrypt = require('bcrypt');
const db = require('./index');

async function seed() {
    const client = await db.pool.connect();
    try {
        // Run schema
        const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
        await client.query(schema);
        console.log('✓ Schema created');

        // --- Blood Banks ---
        const banks = [
            ['Central Blood Bank', '12 MG Road, Mumbai', '022-12345678', 'central@bloodbank.com'],
            ['City Blood Center', '45 Ring Road, Delhi', '011-87654321', 'city@bloodcenter.com'],
            ['Metro Blood Bank', '78 Station Rd, Pune', '020-11223344', 'metro@bloodbank.com'],
        ];
        for (const b of banks) {
            await client.query(
                'INSERT INTO blood_bank (blood_bank_name, address, phone, email) VALUES ($1,$2,$3,$4)',
                b
            );
        }
        console.log('✓ Blood banks seeded');

        // --- Hospitals ---
        const hospitals = [
            ['City General Hospital', 'Sector 5, Mumbai', '022-55501234', 'info@citygeneral.com'],
            ['Apollo Medical Center', 'Jubilee Hills, Hyderabad', '040-55505678', 'info@apollo.com'],
            ['Max Super Specialty', 'Saket, Delhi', '011-55509012', 'info@maxhospital.com'],
            ['Fortis Hospital', 'Bannerghatta, Bangalore', '080-55503456', 'info@fortis.com'],
            ['AIIMS Delhi', 'Ansari Nagar, Delhi', '011-55507890', 'info@aiims.com'],
            ['Medanta Hospital', 'Sector 38, Gurugram', '0124-5550123', 'info@medanta.com'],
        ];
        for (const h of hospitals) {
            await client.query(
                'INSERT INTO hospital (hospital_name, address, phone, email) VALUES ($1,$2,$3,$4)',
                h
            );
        }
        console.log('✓ Hospitals seeded');

        // --- Donors ---
        const donors = [
            ['Aarav Sharma', 'Male', '1998-03-15', 'A+', '9876543210', 'aarav@email.com', 'Mumbai, Maharashtra', '2026-05-15', true],
            ['Priya Patel', 'Female', '1994-07-22', 'O+', '9876543211', 'priya@email.com', 'Delhi, NCR', '2026-07-01', false],
            ['Rohan Verma', 'Male', '2001-11-05', 'B+', '9876543212', 'rohan@email.com', 'Bangalore, Karnataka', '2026-03-10', true],
            ['Sneha Reddy', 'Female', '1996-02-28', 'AB+', '9876543213', 'sneha@email.com', 'Hyderabad, Telangana', '2026-06-20', false],
            ['Vikram Singh', 'Male', '1991-09-10', 'O-', '9876543214', 'vikram@email.com', 'Chandigarh, Punjab', '2026-01-25', true],
            ['Ananya Iyer', 'Female', '1999-06-18', 'A-', '9876543215', 'ananya@email.com', 'Chennai, Tamil Nadu', '2026-04-12', true],
            ['Karthik Nair', 'Male', '1997-01-30', 'B-', '9876543216', 'karthik@email.com', 'Kochi, Kerala', '2026-02-28', true],
            ['Meera Joshi', 'Female', '1995-12-03', 'AB-', '9876543217', 'meera@email.com', 'Pune, Maharashtra', '2026-07-15', false],
            ['Arjun Kumar', 'Male', '2000-04-25', 'O+', '9876543218', 'arjun@email.com', 'Jaipur, Rajasthan', '2026-05-30', true],
            ['Divya Menon', 'Female', '1993-08-14', 'A+', '9876543219', 'divya@email.com', 'Kolkata, West Bengal', '2026-06-05', false],
            ['Rahul Gupta', 'Male', '2002-05-20', 'B+', '9876543220', 'rahul@email.com', 'Lucknow, Uttar Pradesh', '2026-04-20', true],
            ['Ishita Chowdhury', 'Female', '1998-10-08', 'O-', '9876543221', 'ishita@email.com', 'Guwahati, Assam', '2026-03-18', true],
        ];
        for (const d of donors) {
            await client.query(
                `INSERT INTO donor (name, gender, date_of_birth, blood_group, phone, email, address, last_donation_date, eligible)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
                d
            );
        }
        console.log('✓ Donors seeded');

        // --- Recipients ---
        const recipients = [
            ['Ravi Mehta', 'O+', 45, 'Male', '9800000001', 'Emergency surgery patient'],
            ['Sunita Devi', 'A+', 38, 'Female', '9800000002', 'Scheduled transfusion'],
            ['Amit Saxena', 'B-', 29, 'Male', '9800000003', 'Accident victim'],
            ['Lakshmi Rao', 'AB+', 52, 'Female', '9800000004', 'Post-operative care'],
            ['Manoj Tiwari', 'O-', 41, 'Male', '9800000005', 'Multiple units needed for surgery'],
            ['Kavita Sharma', 'A-', 35, 'Female', '9800000006', 'Routine procedure'],
        ];
        for (const r of recipients) {
            await client.query(
                'INSERT INTO recipient (name, blood_group, age, gender, phone, medical_condition) VALUES ($1,$2,$3,$4,$5,$6)',
                r
            );
        }
        console.log('✓ Recipients seeded');

        // --- Blood Inventory (for blood_bank_id = 1 — Central Blood Bank) ---
        const inventory = [
            [1, 'A+', 24, null, 'available'],
            [1, 'A-', 8, null, 'available'],
            [1, 'B+', 18, null, 'available'],
            [1, 'B-', 5, null, 'low'],
            [1, 'AB+', 12, null, 'available'],
            [1, 'AB-', 3, null, 'critical'],
            [1, 'O+', 30, null, 'available'],
            [1, 'O-', 6, null, 'low'],
        ];
        for (const inv of inventory) {
            await client.query(
                'INSERT INTO blood_inventory (blood_bank_id, blood_group, quantity, expiry_date, status) VALUES ($1,$2,$3,$4,$5)',
                inv
            );
        }
        console.log('✓ Inventory seeded');

        // --- Blood Donations ---
        // donor_id mapped: D001=1, D002=2, etc.  blood_bank: Central=1, City=2, Metro=3
        const donations = [
            [1, 1, '2026-05-15', 0.45, 'A+', 'completed'],
            [2, 2, '2026-07-01', 0.45, 'O+', 'completed'],
            [3, 1, '2026-03-10', 0.45, 'B+', 'completed'],
            [5, 3, '2026-01-25', 0.45, 'O-', 'completed'],
            [6, 1, '2026-04-12', 0.45, 'A-', 'completed'],
            [9, 2, '2026-05-30', 0.45, 'O+', 'completed'],
            [10, 3, '2026-06-05', 0.45, 'A+', 'completed'],
            [4, 1, '2026-06-20', 0.45, 'AB+', 'completed'],
        ];
        for (const dn of donations) {
            await client.query(
                `INSERT INTO blood_donation (donor_id, blood_bank_id, donation_date, quantity, blood_group, status)
         VALUES ($1,$2,$3,$4,$5,$6)`,
                dn
            );
        }
        console.log('✓ Donations seeded');

        // --- Blood Requests ---
        // recipient_id: 1-6, hospital_id: 1-6, all to blood_bank_id=1
        const requests = [
            [1, 1, 1, 'O+', 3, '2026-07-26', 'pending', 'urgent', 'Emergency surgery scheduled'],
            [2, 2, 1, 'A+', 2, '2026-07-25', 'approved', 'normal', 'Scheduled transfusion'],
            [3, 3, 1, 'B-', 1, '2026-07-24', 'dispatched', 'critical', 'Accident victim'],
            [4, 4, 1, 'AB+', 2, '2026-07-26', 'pending', 'normal', 'Post-operative care'],
            [5, 5, 1, 'O-', 4, '2026-07-26', 'pending', 'critical', 'Multiple units needed for surgery'],
            [6, 6, 1, 'A-', 1, '2026-07-23', 'approved', 'normal', 'Routine procedure'],
        ];
        for (const rq of requests) {
            await client.query(
                `INSERT INTO blood_request (recipient_id, hospital_id, blood_bank_id, blood_group, quantity_requested, request_date, request_status, priority, notes)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
                rq
            );
        }
        console.log('✓ Requests seeded');

        // --- Users ---
        const salt = await bcrypt.genSalt(10);
        const users = [
            ['admin', await bcrypt.hash('admin123', salt), 'Admin User', 'admin', 'admin@bloodconnect.com', null],
            ['staff', await bcrypt.hash('staff123', salt), 'Hospital Staff', 'staff', 'staff@hospital.com', null],
            ['donor', await bcrypt.hash('donor123', salt), 'Aarav Sharma', 'donor', 'aarav@email.com', 1],
        ];
        for (const u of users) {
            await client.query(
                'INSERT INTO users (username, password, name, role, email, donor_id) VALUES ($1,$2,$3,$4,$5,$6)',
                u
            );
        }
        console.log('✓ Users seeded');

        console.log('\n🎉 Database seeded successfully!');
    } catch (err) {
        console.error('Seed error:', err);
        process.exit(1);
    } finally {
        client.release();
        await db.pool.end();
    }
}

seed();
