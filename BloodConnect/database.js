
const fs = require('node:fs');
const path = require('node:path');
const readline = require('node:readline/promises');
const { Client } = require('pg');
const { hashPassword } = require('./helpers');

const configPath = path.join(__dirname, 'config.json');
const schemaLabel = 'BloodConnect schema v1';

async function askForConfig() {
  if (!process.stdin.isTTY) {
    throw new Error('Run npm start in a normal Terminal window so setup can ask for your PostgreSQL details.');
  }
  const input = readline.createInterface({ input: process.stdin, output: process.stdout });
  try {
    console.log('Enter your postgres details:');
    const defaultUser = 'postgres';
    const host = (await input.question('PostgreSQL host [localhost]: ')).trim() || 'localhost';
    const port = Number((await input.question('PostgreSQL port [5432]: ')).trim() || '5432');
    const user = (await input.question(`PostgreSQL username [${defaultUser}]: `)).trim() || defaultUser;
    const password = await input.question('PostgreSQL password [Enter for no password]: ');
    const database = (await input.question('Project database [bloodconnect]: ')).trim() || 'bloodconnect';
    const webPort = Number((await input.question('Website port [3000]: ')).trim() || '3000');
    return { host, port, user, password, database, webPort };
  } finally {
    input.close();
  }
}

function validateConfig(config) {
  if (!config || typeof config !== 'object') throw new Error('Invalid config.json. Run npm run setup.');
  if (typeof config.host !== 'string' || !config.host.trim()) throw new Error('A PostgreSQL host is required.');
  if (typeof config.user !== 'string' || !config.user.trim()) throw new Error('A PostgreSQL username is required.');
  if (typeof config.password !== 'string') throw new Error('PostgreSQL password must be a string; use an empty string for no password.');
  if (!/^[a-z][a-z0-9_]{0,62}$/.test(config.database || '')) throw new Error('Database name must start with a lowercase letter and contain only lowercase letters, numbers or underscores.');
  config.port = Number(config.port ?? 5432);
  config.webPort = Number(config.webPort ?? 3000);
  for (const port of [config.port, config.webPort]) {
    if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('Ports must be whole numbers between 1 and 65535.');
  }
}

async function initializeDatabase(config) {
  validateConfig(config);
  let client = new Client({ ...config, connectionTimeoutMillis: 5000 });
  try {
    await client.connect();
  } catch (error) {
    await client.end().catch(() => {});
    if (error.code !== '3D000') throw error;
    const maintenance = new Client({ ...config, database: 'postgres', connectionTimeoutMillis: 5000 });
    try {
      await maintenance.connect();
      if (!/^[a-z][a-z0-9_]{0,62}$/.test(config.database)) throw new Error('Invalid database name.');
      try {
        await maintenance.query(`CREATE DATABASE "${config.database}"`);
      } catch (createError) {
        if (createError.code !== '42P04') throw createError; 
      }
    } finally {
      await maintenance.end();
    }
    client = new Client({ ...config, connectionTimeoutMillis: 5000 });
    await client.connect();
  }

  try {
    await client.query('BEGIN');
    await client.query('SELECT pg_advisory_xact_lock(230202, 3)');
    const tables = await client.query("SELECT tablename FROM pg_tables WHERE schemaname = 'public'");
    const label = await client.query("SELECT obj_description(oid, 'pg_namespace') AS label FROM pg_namespace WHERE nspname = 'public'");
    if (tables.rows.length) {
      const expected = ['donor', 'recipient', 'hospital', 'blood_bank', 'blood_donation', 'blood_inventory', 'blood_request', 'users'];
      if (![schemaLabel, 'BloodConnect classroom v3'].includes(label.rows[0]?.label) || !expected.every(name => tables.rows.some(row => row.tablename === name))) {
        throw new Error('This database contains another project or an incomplete schema. Choose a new empty database with npm run setup. Nothing was deleted.');
      }
      await client.query('COMMIT');
      return false;
    }

    await client.query(fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8'));
    const accounts = [
      ['admin', 'Admin123!', 'Administrator', 'admin', 'admin@example.com', null, null],
      ['staff', 'Staff123!', 'Hospital Staff', 'staff', 'staff@example.com', null, 1],
      ['donor', 'Donor123!', 'Demo Donor', 'donor', 'donor@example.com', 1, null]
    ];
    for (const account of accounts) {
      account[1] = await hashPassword(account[1]);
      await client.query(
        'INSERT INTO users(username, password, name, role, email, donor_id, hospital_id) VALUES ($1, $2, $3, $4, $5, $6, $7)',
        account
      );
    }
    await client.query(`COMMENT ON SCHEMA public IS '${schemaLabel}'`);
    await client.query('COMMIT');
    return true;
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    throw error;
  } finally {
    await client.end();
  }
}

function explainError(error) {
  const message = error.message || String(error);
  if (error.code === '28P01' || /password must be a (?:non-empty )?string/i.test(message)) {
    return 'PostgreSQL requires a password for this connection. A blank password works only when PostgreSQL allows password-free local access. In psql or pgAdmin, connect using your working administrator account and set a password for your PostgreSQL user, then run npm run setup again. See the password section in README.md.';
  }
  if (error.code === 'ECONNREFUSED' || /ECONNREFUSED/.test(message)) {
    return 'PostgreSQL is not reachable. Start your PostgreSQL server, then run npm start again. If you use a different host or port, run npm run setup to correct the connection details.';
  }
  if (error.code === '42501') {
    return 'Your PostgreSQL user lacks permission to create the database or tables. Create the chosen empty database owned by this user in pgAdmin, then retry.';
  }
  return message;
}

async function ensureSetup(reconfigure = false) {
  let config;
  if (!reconfigure && fs.existsSync(configPath)) {
    try { config = JSON.parse(fs.readFileSync(configPath, 'utf8')); }
    catch { throw new Error('Cannot read config.json. Run npm run setup to enter your connection details again.'); }
  } else {
    config = await askForConfig();
  }
  validateConfig(config);
  const created = await initializeDatabase(config);
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2) + '\n', { mode: 0o600 });
  if (created) {
    console.log('Server Ready!');
  }
  return config;
}

if (require.main === module) {
  ensureSetup(true).then(() => console.log('Setup saved. Now run npm start.')).catch(error => {
    console.error('\nSetup failed:', explainError(error));
    process.exitCode = 1;
  });
}

module.exports = { ensureSetup, initializeDatabase, explainError };
