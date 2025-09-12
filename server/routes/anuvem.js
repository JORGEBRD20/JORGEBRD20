const express = require('express');
const router = express.Router();
const { detectPlateFromImage, detectPersonFromImage } = require('../services/detectionService');
const {
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
} = require('../services/anuvemService');

router.get('/health', (req, res) => res.json({ ok: true, name: 'A Nuvem' }));
router.get('/cameras', (req, res) => res.json({ ok: true, cameras: listCameras() }));

router.post('/simulate/pass', (req, res) => {
  try {
    const { cameraId, imageType, imageRef, meta } = req.body || {};
    if (!cameraId || !imageType) return res.status(400).json({ error: 'cameraId e imageType são obrigatórios' });
    let type, refId, status, detection;
    if (imageType === 'vehicle') {
      detection = detectPlateFromImage(imageRef);
      refId = detection.plate;
      type = 'vehicle';
      status = findVehicleStatus(refId);
    } else if (imageType === 'person') {
      detection = detectPersonFromImage(imageRef);
      refId = detection.id;
      type = 'person';
      status = findPersonStatus(refId);
    } else {
      return res.status(400).json({ error: 'imageType deve ser vehicle ou person' });
    }
    const pass = registerPass({ type, refId, cameraId, meta: { detection } });

    let alert = null;
    if (status.status === 'stolen' || status.status === 'wanted' || status.status === 'missing') {
      alert = createAlert({ type, refId, reason: status.status });
    }

    return res.json({ ok: true, pass, detection, status, alert });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'server_error' });
  }
});

router.get('/alerts', (req, res) => {
  const status = (req.query.status || 'pending').toString();
  return res.json({ ok: true, alerts: listAlerts(status) });
});

router.post('/alerts/:id/approve', (req, res) => {
  try {
    const id = req.params.id;
    const operator = (req.body && req.body.operator) || 'operador-ficticio';
    const a = approveAlert(id, operator);
    return res.json({ ok: true, alert: a });
  } catch (e) {
    return res.status(404).json({ error: 'alert_not_found' });
  }
});

router.post('/alerts/:id/reject', (req, res) => {
  try {
    const id = req.params.id;
    const operator = (req.body && req.body.operator) || 'operador-ficticio';
    const a = rejectAlert(id, operator);
    return res.json({ ok: true, alert: a });
  } catch (e) {
    return res.status(404).json({ error: 'alert_not_found' });
  }
});

router.get('/reports/track', (req, res) => {
  const type = req.query.type;
  const refId = req.query.refId;
  if (!type || !refId) return res.status(400).json({ error: 'type e refId são obrigatórios' });
  const passes = getPassesByRef(type, refId).map(p => ({
    ...p,
    camera: listCameras().find(c => c.id === p.cameraId) || null
  }));
  return res.json({ ok: true, passes });
});

router.get('/reports/summary', (req, res) => {
  const pending = listAlerts('pending').length;
  const active = listAlerts('active').length;
  const rejected = listAlerts('rejected').length;
  return res.json({ ok: true, totals: { pending, active, rejected } });
});

router.get('/audit', (req, res) => {
  return res.json({ ok: true, audit: auditLogs() });
});

module.exports = router;
