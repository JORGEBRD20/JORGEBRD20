import { useState, useEffect } from 'react';
import axios from 'axios';
import '../styles/globals.css';

export default function Home() {
  const api = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [user, setUser] = useState(null);
  const [message, setMessage] = useState('');
  const [recipient, setRecipient] = useState('');
  const [poll, setPoll] = useState([]);
  const [opened, setOpened] = useState(null);

  const sendOtp = async () => {
    await axios.post(`${api}/auth/send-otp`, { email, phone });
    alert('OTP enviado para MailHog (ambiente de teste)');
  };

  const verify = async () => {
    const res = await axios.post(`${api}/auth/verify-otp`, { email, code, displayName: email.split('@')[0] });
    setUser(res.data.user);
  };

  const sendMessage = async () => {
    if (!user) return alert('faça login primeiro');
    await axios.post(`${api}/messages/send`, { from: user.id, to: recipient, type: 'text', payload: { text: message } });
    alert('Mensagem enviada (ephemeral)');
  };

  const pollMessages = async () => {
    if (!user) return alert('faça login primeiro');
    const res = await axios.get(`${api}/messages/poll`, { params: { user: user.id } });
    setPoll(res.data.ids || []);
  };

  const openMessage = async (id) => {
    if (!user) return;
    const res = await axios.post(`${api}/messages/open`, { user: user.id, id });
    setOpened(res.data.message);
    // Start countdown handled by server TTL
  };

  useEffect(() => {
    if (!user) return;
    const t = setInterval(() => pollMessages(), 5000);
    return () => clearInterval(t);
  }, [user]);

  return (
    <div className="container">
      <h1 className="brand">VIO — Test UI</h1>
      {!user ? (
        <section className="card">
          <h2 className="title">Registro / Login</h2>
          <input className="input" placeholder="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          <input className="input" placeholder="phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
          <div className="row">
            <button className="btn" onClick={sendOtp}>Enviar OTP</button>
            <input className="input small" placeholder="código" value={code} onChange={(e) => setCode(e.target.value)} />
            <button className="btn" onClick={verify}>Verificar</button>
          </div>
        </section>
      ) : (
        <section className="card">
          <h2 className="title">Bem-vindo, {user.displayName || user.email}</h2>
          <p className="muted">Seu ID: {user.id}</p>
          <div className="field">
            <input className="input" placeholder="recipient id" value={recipient} onChange={(e) => setRecipient(e.target.value)} />
            <textarea className="input" placeholder="mensagem" value={message} onChange={(e) => setMessage(e.target.value)} />
            <button className="btn" onClick={sendMessage}>Enviar (autodestruição)</button>
          </div>
        </section>
      )}

      {user && (
        <section className="card">
          <h2 className="title">Caixa de entrada</h2>
          <button className="btn" onClick={pollMessages}>Atualizar</button>
          <ul className="list">
            {poll.map((id) => (
              <li key={id} className="list-item">
                <span>{id}</span>
                <button className="btn small" onClick={() => openMessage(id)}>Abrir (20s)</button>
              </li>
            ))}
          </ul>
          {opened && (
            <div className="opened">
              <h3 className="title">Mensagem de: {opened.message.from}</h3>
              <p>{opened.message.payload.text}</p>
              <p className="muted">Será apagada em ~20s</p>
            </div>
          )}
        </section>
      )}

      <footer className="foot">Ambiente de teste local. MailHog UI em http://localhost:8025</footer>
    </div>
  );
}
