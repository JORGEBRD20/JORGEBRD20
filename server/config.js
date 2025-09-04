const JWT_SECRET = process.env.JWT_SECRET || 'change_this_secret';

if (process.env.NODE_ENV === 'production' && JWT_SECRET === 'change_this_secret') {
  console.error('FATAL: JWT_SECRET not set in production');
  process.exit(1);
}

module.exports = { JWT_SECRET };
