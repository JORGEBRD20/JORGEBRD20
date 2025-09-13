import React, { useEffect, useMemo, useRef, useState } from 'react';
import '../styles/roleta.css';

export default function RoletaDoBichoPage() {
  // Header animated messages
  const headerMessages = useMemo(() => [
    'ESSA É UMA CONTA TESTE',
    'ESSA PLATAFORMA ESTÁ EM FASE DE TESTE',
  ], []);
  const [headerIndex, setHeaderIndex] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setHeaderIndex((i) => (i + 1) % headerMessages.length), 3000);
    return () => clearInterval(t);
  }, [headerMessages.length]);

  // Auth state (in-memory demo)
  const [users, setUsers] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [loginOpen, setLoginOpen] = useState(false);
  const [registerOpen, setRegisterOpen] = useState(false);

  // Login/Register form state
  const [loginName, setLoginName] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  const [fullName, setFullName] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [pixKey, setPixKey] = useState('');
  const [phone, setPhone] = useState('');
  const [registerPassword, setRegisterPassword] = useState('');

  // Game state
  const animals = useMemo(() => [
    '🦁 Leão', '🐯 Tigre', '🐵 Macaco', '🦊 Raposa', '🐻 Urso', '🐘 Elefante',
    '🐱 Gato', '🐶 Cachorro', '🐢 Tartaruga', '🦓 Zebra', '🐦 Pássaro', '🦏 Rinoceronte'
  ], []);
  const [selectedAnimals, setSelectedAnimals] = useState([]);
  const [reelValues, setReelValues] = useState(['🐯 Tigre', '🦁 Leão', '🐵 Macaco']);
  const [isSpinning, setIsSpinning] = useState(false);

  const [balance, setBalance] = useState(0);
  const [earnings, setEarnings] = useState(0);
  const [errors, setErrors] = useState(0);
  const [consecutiveWins, setConsecutiveWins] = useState(0);

  const [resultMsg, setResultMsg] = useState('');
  const [statusMsg, setStatusMsg] = useState('');
  const [bonusMsg, setBonusMsg] = useState('');

  const [history, setHistory] = useState([]);
  const [previousResults, setPreviousResults] = useState([]);

  // Deposit section
  const [depositOpen, setDepositOpen] = useState(false);

  // Withdraw modal
  const [withdrawOpen, setWithdrawOpen] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [withdrawError, setWithdrawError] = useState('');

  // Audio
  const audioRef = useRef(null);

  function firstName(name) {
    const p = String(name || '').trim().split(/\s+/);
    return p[0] || '';
  }

  function toggleAnimal(animal) {
    setSelectedAnimals((prev) => {
      const has = prev.includes(animal);
      const next = has ? prev.filter((a) => a !== animal) : [...prev, animal];
      if (next.length > 3) return prev; // limit 3
      setResultMsg('');
      setBonusMsg('');
      return next;
    });
  }

  function shuffleArray(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function handleSpin() {
    if (isSpinning) return;
    if (selectedAnimals.length !== 3) return;
    if (balance < 4) {
      alert('Saldo insuficiente. Realize um depósito via Pix para continuar jogando.');
      return;
    }

    // Play sound
    if (audioRef.current) {
      try { audioRef.current.currentTime = 1; audioRef.current.play(); } catch {}
    }

    setIsSpinning(true);
    setStatusMsg('Roleta está girando aguarde...✋⏳');
    setResultMsg('');
    setBonusMsg('');

    const shuffled = shuffleArray(animals);
    const nextResults = [
      shuffled[Math.floor(Math.random() * shuffled.length)],
      shuffled[Math.floor(Math.random() * shuffled.length)],
      shuffled[Math.floor(Math.random() * shuffled.length)],
    ];

    // Simulate 8s spin animation
    setTimeout(() => {
      setReelValues(nextResults);

      let correctCount = 0;
      const matched = [];
      selectedAnimals.forEach((an) => {
        if (nextResults.includes(an)) { correctCount++; matched.push(an); }
      });

      if (correctCount > 0) {
        setConsecutiveWins((w) => {
          const n = w + 1;
          if (n % 3 === 0) {
            setBalance((b) => b + 5);
            setBonusMsg('Bônus: Você ganhou R$5 por 3 vitórias consecutivas! 🤩🎉🎉');
          }
          return n;
        });
        setEarnings((e) => e + correctCount * 5);
        setBalance((b) => b + correctCount * 5);
        setResultMsg(`Você acertou ${correctCount} animal${correctCount > 1 ? 's' : ''}!` + (matched.length ? `\n${matched.map(m=>`${m} - R$5`).join('\n')}` : ''));
      } else {
        setConsecutiveWins(0);
        setErrors((er) => er + 1);
        setBalance((b) => b - 5);
        setResultMsg('Não foi dessa vez.🥺 Tente novamente!');
      }

      const joined = nextResults.join(', ');
      setPreviousResults((prev) => {
        const arr = [...prev, joined];
        return arr.length > 5 ? arr.slice(arr.length - 5) : arr;
      });

      setHistory((h) => [{
        results: joined,
        profit: correctCount,
        time: new Date().toISOString(),
      }, ...h]);

      setStatusMsg('');
      setIsSpinning(false);
    }, 8000);
  }

  // Auth handlers
  function handleRegister(e) {
    e.preventDefault();
    const newUser = { fullName, birthDate, pixKey, phone, password: registerPassword };
    setUsers((u) => [...u, newUser]);
    setRegisterOpen(false);
    setLoginOpen(true);
    alert('Conta criada com sucesso!');
  }
  function handleLogin(e) {
    e.preventDefault();
    const user = users.find((u) => u.fullName === loginName && u.password === loginPassword);
    if (user) {
      setCurrentUser(user);
      setLoginOpen(false);
      setLoginName('');
      setLoginPassword('');
      alert(`Bem-vindo, ${user.fullName}`);
    } else {
      alert('Nome ou senha incorretos!');
    }
  }

  // Withdraw handlers
  function openWithdraw() {
    setWithdrawError('');
    setWithdrawAmount('');
    setWithdrawOpen(true);
  }
  function confirmWithdraw() {
    const amount = parseFloat(withdrawAmount);
    if (Number.isNaN(amount) || amount < 0.01) {
      setWithdrawError('ATENÇÃO!!! VOCÊ DEVE ADICIONAR O VALOR MÍNIMO DO SAQUE AUTOMÁTICO VIA PIX A PARTIR DE R$0,01.');
      return;
    }
    if (amount > balance) {
      setWithdrawError('SALDO INSUFICIENTE PARA REALIZAR O SAQUE.');
      return;
    }
    setBalance((b) => b - amount);
    alert(`Saque de R$${amount.toFixed(2)} realizado com sucesso!`);
    setWithdrawOpen(false);
  }

  return (
    <div className="roleta-page">
      {/* Top header animated message */}
      <div className="top-header">
        <span key={headerIndex} className="top-header-text fade-in">{headerMessages[headerIndex]}</span>
      </div>

      {/* Motivational marquee */}
      <div className="motivational-banner">
        <marquee behavior="scroll" direction="left" scrollAmount={3}>
          BEM-VINDO AO 🎰ROLETA DO BICHO🎰! AQUI, VOCÊ TEM A OPORTUNIDADE DE TESTAR SUA SORTE E GANHAR DINHEIRO! ACOMPANHE A EXPLICAÇÃO DE COMO FUNCIONA O JOGO E COMO VOCÊ PODE APOSTAR! 1. COMO JOGAR: • ESCOLHA 3 ANIMAIS DA LISTA DISPONÍVEL. CADA ANIMAL REPRESENTA UMA POSSIBILIDADE DE VITÓRIA. • APÓS SELECIONAR SEUS ANIMAIS, CLIQUE NO BOTÃO “GIRAR” PARA INICIAR O JOGO. • OS ROLOS COMEÇARÃO A GIRAR, MOSTRANDO UM ANIMAL ALEATÓRIO EM CADA UM DOS 3 ROLOS. • SE OS ANIMAIS NOS ROLOS CORRESPONDEREM AOS SEUS ANIMAIS SELECIONADOS, VOCÊ GANHARÁ UMA RECOMPENSA EM DINHEIRO! 2. ESTATÍSTICAS E HISTÓRICO: • NO RODAPÉ, VOCÊ VERÁ SEU SALDO ATUAL (VALOR DISPONÍVEL PARA SACAR), O NÚMERO DE ACERTOS E ERROS. • CADA APOSTA É REGISTRADA NO HISTÓRICO DE APOSTAS, ONDE VOCÊ PODE ACOMPANHAR TODOS OS SEUS GIROS E RESULTADOS. 3. FUNCIONALIDADES ADICIONAIS: • BÔNUS DE DEPÓSITO: AO DEPOSITAR R$100, VOCÊ GANHA R$10 DE BÔNUS PARA JOGAR MAIS! • RODA DE SORTE: CADA GIRO É UMA NOVA OPORTUNIDADE DE GANHAR! A CADA APOSTA, VOCÊ TEM A CHANCE DE ACERTAR E GANHAR PRÊMIOS INCRÍVEIS! 4. DICAS IMPORTANTES: • SELECIONE 3 ANIMAIS PARA MAXIMIZAR SUAS CHANCES DE VITÓRIA! • APOSTE COM SABEDORIA: O JOGO É BASEADO NA SORTE, MAS CADA APOSTA É UMA OPORTUNIDADE DE ALCANÇAR O PRÊMIO! 5. MOTIVAÇÃO PARA VOCÊ CONTINUAR JOGANDO: • O 🎰ROLETA DO BICHO🎰 ESTÁ CHEIO DE OPORTUNIDADES PARA GANHAR. LEMBRE-SE, O PRÓXIMO GIRO PODE SER O SEU GRANDE PRÊMIO! • NÃO DESISTA! A CADA APOSTA, VOCÊ ESTÁ MAIS PRÓXIMO DO SEU OBJETIVO DE ALCANÇAR A VITÓRIA! APOSTE AGORA E DESCUBRA SE VOCÊ É O PRÓXIMO GRANDE VENCEDOR!
        </marquee>
      </div>

      <div className="game-shell">
        <div className="casino-card">
          <h1 className="game-title">🎰ROLETA DO BICHO🎰</h1>

          {/* Auth actions */}
          <div className="auth-bar">
            <button className="action-button" onClick={() => setLoginOpen(true)}>
              {currentUser ? `Olá, ${firstName(currentUser.fullName)}!` : 'Login'}
            </button>
          </div>

          {/* Stats */}
          <div className="stats-row">
            <div className="stat-box" id="balance">Valor demonstrativo: R${balance.toFixed(2)}</div>
            <div className="stat-box" id="earnings">Acertos: {earnings}</div>
            <div className="stat-box" id="errors">Erros: {errors}</div>
          </div>

          {/* Slot machine */}
          <div className="slot-section">
            <div className="reels-row">
              {reelValues.map((r, i) => (
                <div key={i} className={isSpinning ? 'reel-box spin-animation' : 'reel-box'}>{r}</div>
              ))}
            </div>

            {/* Withdraw */}
            <div className="withdraw-wrapper">
              <button className="action-button" onClick={openWithdraw}>Sacar</button>
            </div>

            {/* Deposit */}
            <div className="deposit-wrapper">
              <button className="action-button" onClick={() => setDepositOpen((s) => !s)}>Depositar via PIX</button>
              {depositOpen && (
                <>
                  <div className="deposit-instructions">
                    <p>Deposite via PIX utilizando a chave: <b>0000000000000</b>.</p>
                    <p>O valor mínimo é <b>R$20</b>. Ao depositar <b>R$100</b>, você ganha <b>R$10</b> de bônus!</p>
                    <b>⬇Pix Copia e Cola⬇</b>
                    <p>VOCÊ ESTÁ USANDO UMA CONTA DE TESTE E OS DEPÓSITOS NÃO SÃO AUTORIZADOS.</p>
                  </div>
                  <div className="qr-image-box">
                    <img src="https://dev-clique-no-link.pantheonsite.io/wp-content/uploads/2024/11/Conta-teste.png" alt="QR Code" />
                  </div>
                </>
              )}
            </div>

            <p className="instruction-hint">SELECIONE SOMENTE 3 ANIMAIS POR VEZ E CLIQUE NO BOTÃO ABAIXO.</p>

            <button className="action-button" disabled={selectedAnimals.length !== 3 || isSpinning} onClick={handleSpin}>Girar</button>
            {statusMsg && <p className="status-text">{statusMsg}</p>}
            {resultMsg && (
              <p className={`result-text ${/Não foi/.test(resultMsg) ? 'error' : ''}`}>{resultMsg}</p>
            )}
            {bonusMsg && <p className="bonus-text">{bonusMsg}</p>}
          </div>

          {/* Animal selection */}
          <div className="animal-picker">
            <h2>Escolha 3 animais:</h2>
            <ul className="animal-list">
              {animals.map((a) => (
                <li key={a} className="animal-item">
                  <label className="animal-label">
                    <input
                      type="checkbox"
                      className="animal-checkbox"
                      checked={selectedAnimals.includes(a)}
                      onChange={() => toggleAnimal(a)}
                    />
                    <span>{a}</span>
                  </label>
                </li>
              ))}
            </ul>
          </div>

          {/* History */}
          <div className="history-panel">
            <h2>Histórico de Giros:</h2>
            <ul className="history-list">
              {history.map((h, idx) => (
                <li key={idx}>{new Date(h.time).toLocaleString()} | Resultado: {h.results} | Lucro: {h.profit}</li>
              ))}
            </ul>
          </div>

          {/* Footer note */}
          <p className="limits-note">O valor mínimo de depósito via Pix é R$20 | O valor mínimo de saque via Pix é R$50 | deposito acima de R$100 você ganha R$10 de bônus, Observação o bônus não pode ser sacado.</p>
        </div>
      </div>

      <footer className="footer-bar">
        <p>© 2024 🎰ROLETA DO BICHO🎰 Todos os direitos reservados.</p>
      </footer>

      {/* Audio */}
      <audio ref={audioRef} src="https://dev-clique-no-link.pantheonsite.io/wp-content/uploads/2024/11/Efeito-roleta.mp3" preload="auto" />

      {/* Login Modal */}
      {loginOpen && (
        <div className="modal-backdrop" onClick={() => setLoginOpen(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setLoginOpen(false)}>&times;</button>
            <h2>Login</h2>
            <form onSubmit={handleLogin} className="modal-form">
              <label htmlFor="loginName">Nome:</label>
              <input id="loginName" value={loginName} onChange={(e) => setLoginName(e.target.value)} required />
              <label htmlFor="loginPassword">Senha:</label>
              <input id="loginPassword" type="password" value={loginPassword} onChange={(e) => setLoginPassword(e.target.value)} required />
              <button type="submit" className="action-button">Entrar</button>
            </form>
            <p>Não tem uma conta? <button className="link-button" onClick={() => { setLoginOpen(false); setRegisterOpen(true); }}>Cadastre-se</button></p>
          </div>
        </div>
      )}

      {/* Register Modal */}
      {registerOpen && (
        <div className="modal-backdrop" onClick={() => setRegisterOpen(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setRegisterOpen(false)}>&times;</button>
            <h2>Cadastro</h2>
            <form onSubmit={handleRegister} className="modal-form">
              <label htmlFor="fullName">Nome Completo:</label>
              <input id="fullName" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
              <label htmlFor="birthDate">Data de Nascimento:</label>
              <input id="birthDate" type="date" value={birthDate} onChange={(e) => setBirthDate(e.target.value)} required />
              <label htmlFor="pixKey">Chave Pix:</label>
              <input id="pixKey" value={pixKey} onChange={(e) => setPixKey(e.target.value)} required />
              <label htmlFor="phone">Telefone:</label>
              <input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} required />
              <label htmlFor="registerPassword">Senha:</label>
              <input id="registerPassword" type="password" value={registerPassword} onChange={(e) => setRegisterPassword(e.target.value)} required />
              <button type="submit" className="action-button">Criar Conta</button>
            </form>
          </div>
        </div>
      )}

      {/* Withdraw Modal */}
      {withdrawOpen && (
        <div className="modal-backdrop" onClick={() => setWithdrawOpen(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setWithdrawOpen(false)}>&times;</button>
            <h2>Saque</h2>
            <p>Seu saldo atual é: <b>R${balance.toFixed(2)}</b></p>
            <label htmlFor="withdrawAmount">Digite o valor do saque:</label>
            <input id="withdrawAmount" type="number" min="0.01" step="0.01" value={withdrawAmount} onChange={(e) => setWithdrawAmount(e.target.value)} placeholder="Digite o valor" />
            {withdrawError && <p className="error-text">{withdrawError}</p>}
            <button className="action-button" onClick={confirmWithdraw}>Solicitar Saque</button>
          </div>
        </div>
      )}
    </div>
  );
}
