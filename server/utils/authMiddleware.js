const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../config');
const { getDemoUserId } = require('../demoUser');

module.exports = function(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth) {
    // no auth -> use demo user fallback (allows playing without registering)
    const demoId = getDemoUserId();
    if (demoId) {
      req.user = { id: demoId, demo: true };
      return next();
    }
    return res.status(401).json({ error: 'no token' });
  }
  const parts = auth.split(' ');
  if (parts.length !== 2) return res.status(401).json({ error: 'malformed token' });
  const token = parts[1];
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.user = payload;
    next();
  } catch (err) {
    // invalid token -> fall back to demo if available
    const demoId = getDemoUserId();
    if (demoId) {
      req.user = { id: demoId, demo: true };
      return next();
    }
    return res.status(401).json({ error: 'invalid token' });
  }
};
