import { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import '../../styles/anuvem.css';

const API = (path) => (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000') + '/anuvem' + path;

export default function ANuvem() {
  const [cameras, setCameras] = useState([]);
  const [form, setForm] = useState({ imageType: 'vehicle', cameraId: '', imageRef: '' });
  const [alerts, setAlerts] = useState([]);
  const [statusFilter, setStatusFilter] = useState('pending');
  const [selectedTrack, setSelectedTrack] = useState({ type: 'vehicle', refId: '' });
  const [track, setTrack] = useState([]);
  const [summary, setSummary] = useState({ pending: 0, active: 0, rejected: 0 });
  const [audit, setAudit] = useState([]);

  useEffect(() => { fetchCameras(); fetchAlerts(); fetchSummary(); fetchAudit(); }, []);

  async function fetchCameras() {
    const res = await axios.get(API('/cameras'));
    if (res.data.ok) setCameras(res.data.cameras);
    setForm(f => ({ ...f, cameraId: res.data.cameras?.[0]?.id || '' }));
  }

  async function fetchAlerts() {
    const res = await axios.get(API('/alerts?status=') + encodeURIComponent(statusFilter));
    if (res.data.ok) setAlerts(res.data.alerts);
  }

  async function fetchSummary() {
    const res = await axios.get(API('/reports/summary'));
    if (res.data.ok) setSummary(res.data.totals);
  }

  async function fetchAudit() {
    const res = await axios.get(API('/audit'));
    if (res.data.ok) setAudit(res.data.audit);
  }

  async function simulatePass() {
    if (!form.cameraId) return alert('Selecione uma câmera');
    const payload = { cameraId: form.cameraId, imageType: form.imageType, imageRef: form.imageRef || Math.random().toString() };
    const res = await axios.post(API('/simulate/pass'), payload);
    if (res.data.ok) {
      fetchAlerts(); fetchSummary(); fetchAudit();
      if (res.data.status?.status !== 'ok') alert('Alerta gerado: ' + res.data.status?.status + ' - aguardando aprovação.');
      if (res.data.detection) {
        if (form.imageType === 'vehicle') setSelectedTrack({ type: 'vehicle', refId: res.data.detection.plate });
        else setSelectedTrack({ type: 'person', refId: res.data.detection.id });
        loadTrack(form.imageType === 'vehicle' ? 'vehicle' : 'person', form.imageType === 'vehicle' ? res.data.detection.plate : res.data.detection.id);
      }
    }
  }

  async function approve(id) { await axios.post(API('/alerts/' + id + '/approve'), { operator: 'op-1' }); fetchAlerts(); fetchSummary(); fetchAudit(); }
  async function reject(id) { await axios.post(API('/alerts/' + id + '/reject'), { operator: 'op-1' }); fetchAlerts(); fetchSummary(); fetchAudit(); }

  async function loadTrack(type, refId) {
    if (!type || !refId) return;
    const res = await axios.get(API('/reports/track') + `?type=${encodeURIComponent(type)}&refId=${encodeURIComponent(refId)}`);
    if (res.data.ok) setTrack(res.data.passes || []);
  }

  const mapData = useMemo(() => {
    const pts = track.map(p => ({ x: p.camera?.coords?.x || 0, y: p.camera?.coords?.y || 0, id: p.cameraId, time: p.time }));
    return pts;
  }, [track]);

  return (
    <div className="anuvem-root">
      <div className="header-bar">
        <h1 className="header-title">A Nuvem — Protótipo de Vigilância Legal com Dados Fictícios</h1>
      </div>

      <div className="content-grid">
        <div className="panel">
          <h3 className="panel-title">Simulador de Câmeras</h3>
          <div className="form-row">
            <select className="select-input" value={form.imageType} onChange={e=>setForm({...form, imageType:e.target.value})}>
              <option value="vehicle">Veículo</option>
              <option value="person">Pessoa</option>
            </select>
            <select className="select-input" value={form.cameraId} onChange={e=>setForm({...form, cameraId:e.target.value})}>
              {cameras.map(c => (<option key={c.id} value={c.id}>{c.name}</option>))}
            </select>
          </div>
          <div className="form-row">
            <input className="input-text" placeholder={form.imageType === 'vehicle' ? 'Referencia da imagem/placa (opcional)' : 'Referencia da imagem/nome (opcional)'} value={form.imageRef} onChange={e=>setForm({...form, imageRef:e.target.value})} />
            <button className="primary-btn" onClick={simulatePass}>Registrar Passagem (Simulado)</button>
          </div>
          <div className="form-row">
            <input className="input-text" placeholder={selectedTrack.type === 'vehicle' ? 'Placa para relatório' : 'ID da pessoa para relatório'} value={selectedTrack.refId} onChange={e=>setSelectedTrack({...selectedTrack, refId:e.target.value})} />
            <button className="secondary-btn" onClick={()=>loadTrack(selectedTrack.type, selectedTrack.refId)}>Gerar Relatório</button>
          </div>
          <div className="map-wrap">
            <svg viewBox="0 0 100 100" className="map-svg">
              <defs>
                <marker id="arrow" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto" markerUnits="strokeWidth">
                  <path d="M0,0 L0,6 L6,3 z" fill="#007bff" />
                </marker>
              </defs>
              <rect x="1" y="1" width="98" height="98" fill="#f1f5f9" stroke="#e2e8f0" />
              {mapData.map((p, i) => (
                <g key={i}>
                  <circle cx={p.x} cy={p.y} r="1.8" fill="#ef4444" />
                  <text x={p.x + 2} y={p.y - 1} fontSize="3" fill="#334155">{p.id}</text>
                </g>
              ))}
              {mapData.map((p, i) => (i > 0 ? (
                <line key={'l'+i} x1={mapData[i-1].x} y1={mapData[i-1].y} x2={p.x} y2={p.y} stroke="#007bff" strokeWidth="0.8" markerEnd="url(#arrow)" />
              ) : null))}
            </svg>
          </div>
        </div>

        <div className="panel">
          <h3 className="panel-title">Fila de Alertas</h3>
          <div className="form-row">
            <select className="select-input" value={statusFilter} onChange={e=>{setStatusFilter(e.target.value);}}>
              <option value="pending">Pendentes</option>
              <option value="active">Ativos</option>
              <option value="rejected">Rejeitados</option>
              <option value="all">Todos</option>
            </select>
            <button className="secondary-btn" onClick={fetchAlerts}>Atualizar</button>
          </div>
          <table className="table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Tipo</th>
                <th>Ref</th>
                <th>Motivo</th>
                <th>Status</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {alerts.map(a => (
                <tr key={a.id}>
                  <td>{a.id.slice(0,8)}...</td>
                  <td>{a.type}</td>
                  <td>{a.refId}</td>
                  <td>{a.reason}</td>
                  <td>
                    {a.status === 'pending' && <span className="badge badge-pending">Pendente</span>}
                    {a.status === 'active' && <span className="badge badge-active">Ativo</span>}
                    {a.status === 'rejected' && <span className="badge badge-rejected">Rejeitado</span>}
                  </td>
                  <td>
                    <div className="row-actions">
                      <button className="primary-btn" disabled={a.status !== 'pending'} onClick={()=>approve(a.id)}>Aprovar</button>
                      <button className="secondary-btn" disabled={a.status !== 'pending'} onClick={()=>reject(a.id)}>Rejeitar</button>
                    </div>
                  </td>
                </tr>
              ))}
              {!alerts.length && (
                <tr><td colSpan="6">Sem alertas</td></tr>
              )}
            </tbody>
          </table>
          <div style={{marginTop:8}}>
            <strong>Resumo:</strong> Pendentes {summary.pending} • Ativos {summary.active} • Rejeitados {summary.rejected}
          </div>
        </div>

        <div className="panel">
          <h3 className="panel-title">Logs de Auditoria (Simulados)</h3>
          <div className="audit-list">
            {audit.map(a => (
              <div key={a.id} className="audit-item">{a.time} | {a.actor} | {a.action} | {JSON.stringify(a.details)}</div>
            ))}
            {!audit.length && <div className="audit-item">Sem logs</div>}
          </div>
        </div>
      </div>
    </div>
  );
}
