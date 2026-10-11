const express = require('express');
const path = require('path');
const routes = require('./routes');
const createAuth = require('./auth');
function createApp(db, options = {
}) {
  const app = express();
  const waitDays = Number(options.waitDays ?? 56);
  if (!Number.isInteger(waitDays) || waitDays < 1 || waitDays > 365) throw new Error('Waiting interval must be an integer between 1 and 365.');
  const auth = createAuth(db, options.secureCookies ?? false);
  app.disable('x-powered-by');
  app.use((req, res, next) => {
    res.set('X-Content-Type-Options', 'nosniff');
    res.set('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; object-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'");
    next();
  });
  app.use('/api', (req, res, next) => {
    res.set('Cache-Control', 'no-store');
    // Cross-site forms cannot add this header. No cross-origin API access is enabled.
    if (!['GET', 'HEAD'].includes(req.method) && req.get('X-BloodConnect-Request') !== '1') return res.status(403).json({
      error: 'Invalid request origin.'
    });
    if (!['GET', 'HEAD'].includes(req.method) &&!req.is('application/json')) return res.status(415).json({
      error: 'Send JSON data.'
    });
    next();
  });
  app.use(express.json({
    limit: '32kb'
  }));
  app.use('/api/auth', routes.auth(db, auth));
  app.use('/api', auth.requireAuth);
  app.use('/api/donors', routes.donors(db, auth, waitDays));
  app.use('/api/donations', routes.donations(db, auth, waitDays));
  app.use('/api/inventory', routes.inventory(db, auth));
  app.use('/api/requests', routes.requests(db, auth));
  app.use('/api/admin', routes.admin(db, auth));
  app.use('/api/lookups', routes.lookups(db, auth));
  app.use('/api/dashboard', routes.dashboard(db, auth));
  app.use('/api', (req, res) => res.status(404).json({
    error: 'API endpoint not found.'
  }));
  app.use(express.static(path.join(__dirname, 'public')));
  app.use((req, res) => res.status(404).send('Page not found.'));
  app.use((err, req, res, next) => {
    if (err.code === '23505') return res.status(409).json({
      error: 'That username, email, donor account, or inventory batch already exists.'
    });
    if (err.code === '23503') return res.status(409).json({
      error: 'A referenced record is missing, or this record is still linked to an account or history.'
    });
    if (['23514', '23502', '22P02', '22003', '22007', '22008'].includes(err.code)) return res.status(400).json({
      error: 'The supplied data violates a database rule.'
    });
    if (err.status && err.status < 500) return res.status(err.status).json({
      error: err.type === 'entity.parse.failed'? 'Invalid JSON.': err.message
    });
    console.error('Request failed:', err.message);
    res.status(500).json({
      error: 'The operation failed. No partial transaction was saved.'
    });
  });
  return app;
}
module.exports = createApp;
