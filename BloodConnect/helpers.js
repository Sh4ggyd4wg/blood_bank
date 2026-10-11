const groups = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
class AppError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}
function requireValue(condition, message, status = 400) {
  if (!condition) throw new AppError(status, message);
}
function text(value, label, max = 100, optional = false) {
  if (optional &&(value === undefined || value === null || value === '')) return null;
  requireValue(typeof value === 'string', `${label} is required.`);
  const result = value.trim();
  requireValue(result.length > 0 && result.length <= max, `${label} must contain 1–${max} characters.`);
  return result;
}
function email(value, required = false) {
  const result = text(value, 'Email', 100, !required);
  if (result) requireValue(/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(result), 'Enter a valid email address.');
  return result? result.toLowerCase(): null;
}
function integer(value, label = 'ID') {
  requireValue(typeof value === 'number' && Number.isSafeInteger(value) && value > 0 && value <= 2147483647, `${label} must be a positive whole number.`);
  return value;
}
function id(value) {
  requireValue(/^\d+$/.test(String(value)), 'Invalid ID.');
  return integer(Number(value));
}
function bloodGroup(value) {
  requireValue(groups.includes(value), 'Choose a valid blood group.');
  return value;
}
function date(value, label) {
  requireValue(typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value), `${label} must be a valid date.`);
  const parsed = new Date(value + 'T00:00:00Z');
  requireValue(!Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value, `${label} must be a valid date.`);
  return value;
}
function ageOn(birth, today) {
  let age = Number(today.slice(0, 4)) - Number(birth.slice(0, 4));
  if (today.slice(5) < birth.slice(5)) age--;
  return age;
}
function eligibility(donor, today, waitDays) {
  const age = ageOn(donor.date_of_birth, today);
  const elapsed = donor.last_donation_date? Math.floor((Date.parse(today) - Date.parse(donor.last_donation_date)) / 86400000): null;
  const daysLeft = elapsed === null? 0: Math.max(0, waitDays - elapsed);
  let reason = 'Eligible under project rules';
  if (!donor.eligible) reason = 'Awaiting administrator verification';
  else if (age < 18 || age > 65) reason = 'Outside the project age range (18–65)';
  else if (daysLeft) reason = `Wait ${daysLeft} more day(s)`;
  return {
    age, canDonate: donor.eligible && age >= 18 && age <= 65 && daysLeft === 0, daysLeft, reason, verified: donor.eligible
  };
}
function donorInput(body, today, registration = true) {
  const birth = date(body.dateOfBirth, 'Date of birth');
  requireValue(birth <= today, 'Date of birth cannot be in the future.');
  if (registration) requireValue(ageOn(birth, today) >= 18 && ageOn(birth, today) <= 65, 'The project accepts donor registration between ages 18 and 65.');
  const gender = text(body.gender, 'Gender', 10, true);
  requireValue(!gender ||['Male', 'Female', 'Other'].includes(gender), 'Invalid gender.');
  return [text(body.name, 'Name'), gender, birth, bloodGroup(body.bloodGroup), text(body.phone, 'Phone', 20, true), email(body.email, true), text(body.address, 'Address', 500, true)];
}
const wrap = fn =>(req, res, next) => Promise.resolve(fn(req, res, next)).catch (next);
async function transaction(db, fn) {
  const client = await db.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}
async function today(db) {
  return(await db.query('SELECT CURRENT_DATE::text AS today')).rows[0].today;
}
const crypto = require('node:crypto');
const { promisify } = require('node:util');
const scrypt = promisify(crypto.scrypt);
async function hashPassword(password) {
  requireValue(typeof password === 'string' && password.length >= 8 && password.length <= 128, 'Password must contain 8–128 characters.');
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = await scrypt(password, salt, 64);
  return `scrypt:${salt}:${hash.toString('hex')}`;
}
async function verifyPassword(password, stored) {
  if (typeof password !== 'string' || password.length > 128 ||!stored) return false;
  const[scheme, salt, hex] = stored.split(':');
  if (scheme !== 'scrypt' ||!salt ||!/^[a-f0-9]{128}$/.test(hex || '')) return false;
  const hash = await scrypt(password, salt, 64);
  return crypto.timingSafeEqual(hash, Buffer.from(hex, 'hex'));
}
module.exports = {
  AppError, requireValue, text, email, integer, id, bloodGroup, date, ageOn, eligibility, donorInput, wrap, transaction, today, groups, hashPassword, verifyPassword
};
