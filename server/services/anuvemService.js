const crypto = require('crypto');
const { getStore, save, appendAudit } = require('./secureStore');
const cameras = require('../data/cameras');
const { stolenPlates, wantedPersons } = require('../data/testData');

function listCameras() { return cameras; }

function registerPass({ type, refId, cameraId, meta }) {
  const s = getStore();
  const id = crypto.randomUUID();
  const time = new Date().toISOString();
  s.passes.push({ id, type, refId, cameraId, time, meta: meta || {} });
  appendAudit('system', 'pass_registered', { id, type, refId, cameraId });
  save();
  return { id, time };
}

function findVehicleStatus(plate) {
  const flagged = stolenPlates.find(v => v.plate === plate);
  return flagged ? { status: 'stolen', info: flagged } : { status: 'ok' };
}

function findPersonStatus(personId) {
  const flagged = wantedPersons.find(p => p.id === personId);
  if (flagged) return { status: flagged.name.includes('Desaparecid') ? 'missing' : 'wanted', info: flagged };
  return { status: 'ok' };
}

function createAlert({ type, refId, reason }) {
  const s = getStore();
  const id = crypto.randomUUID();
  const createdAt = new Date().toISOString();
  const alert = { id, type, refId, reason, createdAt, status: 'pending', approvals: [] };
  s.alerts.unshift(alert);
  appendAudit('system', 'alert_created', { id, type, refId, reason });
  save();
  return alert;
}

function approveAlert(id, operator) {
  const s = getStore();
  const a = s.alerts.find(x => x.id === id);
  if (!a) throw new Error('alert_not_found');
  if (a.status !== 'pending') return a;
  a.status = 'active';
  a.approvals.push({ operator, time: new Date().toISOString() });
  appendAudit(operator, 'alert_approved', { id });
  save();
  return a;
}

function rejectAlert(id, operator) {
  const s = getStore();
  const a = s.alerts.find(x => x.id === id);
  if (!a) throw new Error('alert_not_found');
  if (a.status !== 'pending') return a;
  a.status = 'rejected';
  a.approvals.push({ operator, time: new Date().toISOString(), rejected: true });
  appendAudit(operator, 'alert_rejected', { id });
  save();
  return a;
}

function listAlerts(status) {
  const s = getStore();
  if (!status || status === 'all') return s.alerts.slice(0, 200);
  return s.alerts.filter(a => a.status === status).slice(0, 200);
}

function getPassesByRef(type, refId) {
  const s = getStore();
  return s.passes.filter(p => p.type === type && p.refId === refId);
}

function auditLogs() { return getStore().audit.slice(0, 500); }

module.exports = {
  listCameras,
  registerPass,
  findVehicleStatus,
  findPersonStatus,
  createAlert,
  approveAlert,
  rejectAlert,
  listAlerts,
  getPassesByRef,
  auditLogs
};
