const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const DATA_DIR = path.join(__dirname, '..', 'data');
const STORE_FILE = path.join(DATA_DIR, 'store.enc');

const ALGO = 'aes-256-gcm';
const KEY = (() => {
  const env = process.env.ANUVEM_SECRET;
  if (env && Buffer.from(env).length >= 32) {
    return crypto.createHash('sha256').update(env).digest();
  }
  return crypto.randomBytes(32);
})();

let memory = null;

function ensureDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
}

function encrypt(plain) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGO, KEY, iv);
  const enc = Buffer.concat([cipher.update(Buffer.from(plain, 'utf8')), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([Buffer.from('ANV1'), iv, tag, enc]).toString('base64');
}

function decrypt(payloadB64) {
  const buf = Buffer.from(payloadB64, 'base64');
  const magic = buf.subarray(0, 4).toString('utf8');
  if (magic !== 'ANV1') throw new Error('invalid payload');
  const iv = buf.subarray(4, 16);
  const tag = buf.subarray(16, 32);
  const enc = buf.subarray(32);
  const decipher = crypto.createDecipheriv(ALGO, KEY, iv);
  decipher.setAuthTag(tag);
  const dec = Buffer.concat([decipher.update(enc), decipher.final()]);
  return dec.toString('utf8');
}

function defaultStore() {
  return {
    vehicles: [], // { id, plate, status: 'ok'|'stolen', notes }
    persons: [], // { id, name, status: 'ok'|'wanted'|'missing', notes }
    passes: [], // { id, type:'vehicle'|'person', refId, cameraId, time, meta }
    alerts: [], // { id, type, refId, reason, createdAt, status:'pending'|'active'|'rejected', approvals:[] }
    audit: [] // { id, time, actor, action, details }
  };
}

function load() {
  ensureDir();
  if (!fs.existsSync(STORE_FILE)) {
    memory = defaultStore();
    save();
    return memory;
  }
  try {
    const raw = fs.readFileSync(STORE_FILE, 'utf8');
    const plain = decrypt(raw);
    memory = JSON.parse(plain);
  } catch (e) {
    memory = defaultStore();
  }
  return memory;
}

function save() {
  ensureDir();
  const plain = JSON.stringify(memory || defaultStore());
  const enc = encrypt(plain);
  fs.writeFileSync(STORE_FILE, enc, 'utf8');
}

function getStore() {
  if (!memory) load();
  return memory;
}

function appendAudit(actor, action, details) {
  const s = getStore();
  const id = crypto.randomUUID();
  const time = new Date().toISOString();
  s.audit.unshift({ id, time, actor, action, details });
  if (s.audit.length > 2000) s.audit = s.audit.slice(0, 2000);
  save();
  return id;
}

module.exports = { getStore, save, load, appendAudit };
