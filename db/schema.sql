-- BloodConnect — PostgreSQL Schema
-- Matches the ER diagram: 7 entity tables + 1 users table

DROP TABLE IF EXISTS blood_request CASCADE;
DROP TABLE IF EXISTS blood_donation CASCADE;
DROP TABLE IF EXISTS blood_inventory CASCADE;
DROP TABLE IF EXISTS recipient CASCADE;
DROP TABLE IF EXISTS donor CASCADE;
DROP TABLE IF EXISTS hospital CASCADE;
DROP TABLE IF EXISTS blood_bank CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- ============================================
-- Independent entities
-- ============================================

CREATE TABLE donor (
    donor_id    SERIAL PRIMARY KEY,
    name        VARCHAR(100) NOT NULL,
    gender      VARCHAR(10),
    date_of_birth DATE,
    blood_group VARCHAR(5)  NOT NULL,
    phone       VARCHAR(20),
    email       VARCHAR(100),
    address     TEXT,
    last_donation_date DATE,
    eligible    BOOLEAN DEFAULT TRUE,
    registered  DATE DEFAULT CURRENT_DATE
);

CREATE TABLE recipient (
    recipient_id    SERIAL PRIMARY KEY,
    name            VARCHAR(100) NOT NULL,
    blood_group     VARCHAR(5)  NOT NULL,
    age             INT,
    gender          VARCHAR(10),
    phone           VARCHAR(20),
    medical_condition TEXT
);

CREATE TABLE hospital (
    hospital_id     SERIAL PRIMARY KEY,
    hospital_name   VARCHAR(150) NOT NULL,
    address         TEXT,
    phone           VARCHAR(20),
    email           VARCHAR(100)
);

CREATE TABLE blood_bank (
    blood_bank_id   SERIAL PRIMARY KEY,
    blood_bank_name VARCHAR(150) NOT NULL,
    address         TEXT,
    phone           VARCHAR(20),
    email           VARCHAR(100)
);

-- ============================================
-- Dependent / relationship entities
-- ============================================

CREATE TABLE blood_donation (
    donation_id     SERIAL PRIMARY KEY,
    donor_id        INT NOT NULL REFERENCES donor(donor_id) ON DELETE CASCADE,
    blood_bank_id   INT NOT NULL REFERENCES blood_bank(blood_bank_id) ON DELETE CASCADE,
    donation_date   DATE NOT NULL DEFAULT CURRENT_DATE,
    quantity        REAL NOT NULL DEFAULT 0.45,
    blood_group     VARCHAR(5) NOT NULL,
    status          VARCHAR(20) DEFAULT 'completed'
);

CREATE TABLE blood_inventory (
    inventory_id    SERIAL PRIMARY KEY,
    blood_bank_id   INT NOT NULL REFERENCES blood_bank(blood_bank_id) ON DELETE CASCADE,
    blood_group     VARCHAR(5) NOT NULL,
    quantity        REAL NOT NULL DEFAULT 0,
    expiry_date     DATE,
    status          VARCHAR(20) DEFAULT 'available'
);

CREATE TABLE blood_request (
    request_id          SERIAL PRIMARY KEY,
    recipient_id        INT REFERENCES recipient(recipient_id) ON DELETE SET NULL,
    hospital_id         INT REFERENCES hospital(hospital_id) ON DELETE SET NULL,
    blood_bank_id       INT REFERENCES blood_bank(blood_bank_id) ON DELETE SET NULL,
    blood_group         VARCHAR(5) NOT NULL,
    quantity_requested  REAL NOT NULL DEFAULT 1,
    request_date        DATE DEFAULT CURRENT_DATE,
    request_status      VARCHAR(20) DEFAULT 'pending',
    priority            VARCHAR(20) DEFAULT 'normal',
    notes               TEXT
);

-- ============================================
-- Application users (for auth)
-- ============================================

CREATE TABLE users (
    user_id     SERIAL PRIMARY KEY,
    username    VARCHAR(50) UNIQUE NOT NULL,
    password    VARCHAR(255) NOT NULL,
    name        VARCHAR(100) NOT NULL,
    role        VARCHAR(20) NOT NULL DEFAULT 'donor',
    email       VARCHAR(100),
    donor_id    INT REFERENCES donor(donor_id) ON DELETE SET NULL
);
