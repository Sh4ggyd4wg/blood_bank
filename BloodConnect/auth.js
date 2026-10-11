const crypto = require('node:crypto');
const { wrap, requireValue } = require('./helpers');
function createAuth(db, secure = false) {
  const sessions = new Map();
  const lifetime = 8 * 60 * 60 * 1000;
  const cookieOptions = {
    httpOnly: true, sameSite: 'strict', secure, path: '/'
  };
  function token(req) {
    const match =(req.headers.cookie || '').match(/(?:^|;\s*)bloodconnect_session=([a-f0-9]{64})(?:;|$)/);
    return match? match[1]: null;
  }
  function clear(req, res) {
    sessions.delete(token(req));
    res.clearCookie('bloodconnect_session', cookieOptions);
  }
  function start(req, res, userId) {
    const now = Date.now();
    for (const[key, session] of sessions) if (session.expires <= now) sessions.delete(key);
    sessions.delete(token(req));
    const key = crypto.randomBytes(32).toString('hex');
    sessions.set(key, {
      userId, expires: now + lifetime
    });
    res.cookie('bloodconnect_session', key, {
      ...cookieOptions, maxAge: lifetime
    });
  }
  const requireAuth = wrap(async (req, res, next) => {
    const key = token(req), session = sessions.get(key);
    requireValue(session && session.expires > Date.now(), 'Please log in.', 401);
    const { rows } = await db.query(`SELECT u.user_id,u.username,u.name,u.role,u.email,u.donor_id,u.hospital_id,
   h.hospital_name FROM users u LEFT JOIN hospital h USING (hospital_id) WHERE user_id=$1`, [session.userId]);
    requireValue(rows.length, 'Please log in again.', 401);
    req.user = rows[0];
    next();
  });
  const roles =(...allowed) =>(req, res, next) => {
    if (!allowed.includes(req.user.role)) return res.status(403).json({
      error: 'You do not have permission for this action.'
    });
    next();
  };
  return {
    start, clear, requireAuth, roles
  };
}
module.exports = createAuth;
