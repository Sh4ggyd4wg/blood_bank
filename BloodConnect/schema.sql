
CREATE TABLE donor (
 donor_id SERIAL PRIMARY KEY,
 name VARCHAR(100) NOT NULL CHECK (length(trim(name)) > 0),
 gender VARCHAR(10) CHECK (gender IN ('Male','Female','Other')),
 date_of_birth DATE NOT NULL,
 blood_group VARCHAR(3) NOT NULL CHECK (blood_group IN ('A+','A-','B+','B-','AB+','AB-','O+','O-')),
 phone VARCHAR(20),
 email VARCHAR(100),
 address TEXT,
 last_donation_date DATE,
 eligible BOOLEAN NOT NULL DEFAULT FALSE, 
 registered DATE NOT NULL DEFAULT CURRENT_DATE
);
CREATE UNIQUE INDEX donor_email_unique ON donor (lower(email)) WHERE email IS NOT NULL;
CREATE TABLE recipient (
 recipient_id SERIAL PRIMARY KEY,
 name VARCHAR(100) NOT NULL CHECK (length(trim(name)) > 0),
 blood_group VARCHAR(3) NOT NULL CHECK (blood_group IN ('A+','A-','B+','B-','AB+','AB-','O+','O-')),
 age INT CHECK (age BETWEEN 0 AND 130),
 gender VARCHAR(10) CHECK (gender IN ('Male','Female','Other')),
 phone VARCHAR(20),
 medical_condition TEXT
);
CREATE TABLE hospital (
 hospital_id SERIAL PRIMARY KEY,
 hospital_name VARCHAR(150) NOT NULL,
 address TEXT,
 phone VARCHAR(20),
 email VARCHAR(100)
);
CREATE TABLE blood_bank (
 blood_bank_id SERIAL PRIMARY KEY,
 blood_bank_name VARCHAR(150) NOT NULL,
 address TEXT,
 phone VARCHAR(20),
 email VARCHAR(100)
);
CREATE TABLE blood_donation (
 donation_id SERIAL PRIMARY KEY,
 donor_id INT NOT NULL REFERENCES donor(donor_id) ON DELETE RESTRICT,
 blood_bank_id INT NOT NULL REFERENCES blood_bank(blood_bank_id) ON DELETE RESTRICT,
 donation_date DATE NOT NULL DEFAULT CURRENT_DATE,
 quantity NUMERIC(5,2) NOT NULL DEFAULT 0.45 CHECK (quantity = 0.45), 
 blood_group VARCHAR(3) NOT NULL CHECK (blood_group IN ('A+','A-','B+','B-','AB+','AB-','O+','O-')),
 status VARCHAR(20) NOT NULL DEFAULT 'completed' CHECK (status = 'completed')
);
CREATE TABLE blood_inventory (
 inventory_id SERIAL PRIMARY KEY,
 blood_bank_id INT NOT NULL REFERENCES blood_bank(blood_bank_id) ON DELETE RESTRICT,
 blood_group VARCHAR(3) NOT NULL CHECK (blood_group IN ('A+','A-','B+','B-','AB+','AB-','O+','O-')),
 quantity INT NOT NULL DEFAULT 0 CHECK (quantity >= 0),
 expiry_date DATE NOT NULL,
 UNIQUE (blood_bank_id, blood_group, expiry_date)
);
CREATE TABLE blood_request (
 request_id SERIAL PRIMARY KEY,
 recipient_id INT NOT NULL REFERENCES recipient(recipient_id) ON DELETE RESTRICT,
 hospital_id INT NOT NULL REFERENCES hospital(hospital_id) ON DELETE RESTRICT,
 blood_bank_id INT NOT NULL REFERENCES blood_bank(blood_bank_id) ON DELETE RESTRICT,
 blood_group VARCHAR(3) NOT NULL CHECK (blood_group IN ('A+','A-','B+','B-','AB+','AB-','O+','O-')),
 quantity_requested INT NOT NULL CHECK (quantity_requested > 0),
 request_date DATE NOT NULL DEFAULT CURRENT_DATE,
 request_status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (request_status IN ('pending','approved','rejected','dispatched')),
 priority VARCHAR(20) NOT NULL DEFAULT 'normal' CHECK (priority IN ('normal','urgent','critical')),
 notes TEXT NOT NULL DEFAULT ''
);
CREATE TABLE users (
 user_id SERIAL PRIMARY KEY,
 username VARCHAR(50) NOT NULL CHECK (length(trim(username)) >= 3),
 password VARCHAR(255) NOT NULL,
 name VARCHAR(100) NOT NULL,
 role VARCHAR(20) NOT NULL CHECK (role IN ('admin','staff','donor')),
 email VARCHAR(100),
 donor_id INT UNIQUE REFERENCES donor(donor_id) ON DELETE RESTRICT,
 hospital_id INT REFERENCES hospital(hospital_id) ON DELETE RESTRICT,
 CHECK ((role = 'donor' AND donor_id IS NOT NULL AND hospital_id IS NULL)
     OR (role = 'staff' AND hospital_id IS NOT NULL AND donor_id IS NULL)
     OR (role = 'admin' AND donor_id IS NULL AND hospital_id IS NULL))
);
CREATE UNIQUE INDEX users_username_unique ON users (lower(username));
CREATE UNIQUE INDEX users_email_unique ON users (lower(email)) WHERE email IS NOT NULL;
CREATE INDEX request_hospital_index ON blood_request (hospital_id);
CREATE INDEX donation_donor_index ON blood_donation (donor_id, donation_date);


CREATE VIEW available_inventory AS
SELECT inventory_id, blood_bank_id, blood_group, quantity, expiry_date
FROM blood_inventory
WHERE expiry_date >= CURRENT_DATE AND quantity > 0;


CREATE VIEW donor_totals AS
SELECT d.donor_id, d.name, d.blood_group,
       COUNT(bd.donation_id) AS total_donations,
       COALESCE(SUM(bd.quantity), 0) AS total_litres
FROM donor d
LEFT JOIN blood_donation bd ON bd.donor_id = d.donor_id
GROUP BY d.donor_id, d.name, d.blood_group;

CREATE FUNCTION check_request_transition() RETURNS TRIGGER
LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.request_status = OLD.request_status THEN
    RETURN NEW;
  END IF;
  IF (OLD.request_status = 'pending' AND NEW.request_status IN ('approved', 'rejected'))
     OR (OLD.request_status = 'approved' AND NEW.request_status IN ('dispatched', 'rejected')) THEN
    RETURN NEW;
  END IF;
  RAISE EXCEPTION 'Invalid request transition: % to %', OLD.request_status, NEW.request_status
    USING ERRCODE = '23514';
END;
$$;

CREATE TRIGGER request_transition_guard
BEFORE UPDATE OF request_status ON blood_request
FOR EACH ROW EXECUTE FUNCTION check_request_transition();


INSERT INTO blood_bank (blood_bank_name, address) VALUES
  ('Central Blood Bank', 'Central district'),
  ('Community Blood Bank', 'Community district'),
  ('Regional Blood Bank', 'Regional district');
INSERT INTO hospital (hospital_name, address) VALUES
  ('General Hospital', 'Central district'),
  ('Community Hospital', 'Community district'),
  ('Regional Hospital', 'Regional district');
INSERT INTO donor (name, gender, date_of_birth, blood_group, email, eligible) VALUES
  ('Demo Donor', 'Other', (CURRENT_DATE - INTERVAL '22 years')::date,
   'O+', 'donor@example.com', TRUE);

