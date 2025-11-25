// js/atendente.js (module)
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import {
  getFirestore, collection, query, where, orderBy,
  onSnapshot, doc, updateDoc, addDoc, serverTimestamp, getDoc
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

/* ---------------------- CONFIG — substitui se necessário --------------------- */
const firebaseConfig = {
  apiKey: "AIzaSyD-Jymhub4TY_gsIAfYnHBw6VoRDvHdfmY",
  authDomain: "fila-coordenacao.firebaseapp.com",
  projectId: "fila-coordenacao",
  storageBucket: "fila-coordenacao.firebasestorage.app",
  messagingSenderId: "302987735020",
  appId: "1:302987735020:web:af93f41a0210c98fd29ac9",
  measurementId: "G-DEYKDLMJ3E"
};
/* -------------------------------------------------------------------------- */

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

/* UI refs */
const atendSelect = document.getElementById('atendenteSelect');
const filaList = document.getElementById('filaList');
const filaQtd = document.getElementById('filaQtd');
const searchFila = document.getElementById('searchFila');
const minhaFilaList = document.getElementById('minhaFilaList');
const atendimentoList = document.getElementById('atendimentoList');
const attNome = document.getElementById('attNome');
const attStatus = document.getElementById('attStatus');
const btnVerMinhaFila = document.getElementById('btnVerMinhaFila');
const btnVoltarGeral = document.getElementById('btnVoltarGeral');
const historyList = document.getElementById('historyList');
const histQtd = document.getElementById('histQtd');

let currentAtendente = "";

/* Helper render */
function makeItemHTML(data, options = {}) {
  // data: doc data { nome, senha, curso, solicitacao, horario, atendente }
  const nome = data.nome || "—";
  const senha = data.senha || "—";
  const curso = data.curso ? ` • ${data.curso}` : "";
  const solicitacao = data.solicitacao ? ` • ${data.solicitacao}` : "";
  const horario = data.timestamp ? new Date(data.timestamp.seconds * 1000).toLocaleString() : (data.horario || '');
  return `
    <div class="item">
      <div class="avatar">${(nome.split(' ').slice(0,2).map(s=>s[0]||'').join('')).toUpperCase()}</div>
      <div class="info">
        <div class="name">${nome}</div>
        <div class="meta">Senha: ${senha}${curso}${solicitacao} <span style="margin-left:8px;color:#94a3b8;font-weight:600">${horario}</span></div>
      </div>
      <div class="actions">
        ${options.showCall ? `<button class="btn" data-id="${options.id}" data-action="call">Chamar</button>` : ''}
        ${options.showAttend ? `<button class="btn secondary" data-id="${options.id}" data-action="start">Iniciar</button>` : ''}
        ${options.showEnd ? `<button class="btn ghost" data-id="${options.id}" data-action="end">Encerrar</button>` : ''}
      </div>
    </div>
  `;
}

/* ------------------ Fila Geral (status = 'aguardando') ------------------- */
const filaRef = collection(db, "fila");
const qFila = query(filaRef, where("status", "==", "aguardando"), orderBy("timestamp", "asc"));

onSnapshot(qFila, (snap) => {
  const docs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  renderFilaGeral(docs);
});

function renderFilaGeral(docs) {
  const filtro = searchFila.value.trim().toLowerCase();
  const filtrados = docs.filter(d => {
    if (!filtro) return true;
    return (d.nome && d.nome.toLowerCase().includes(filtro)) || (String(d.senha||'').toLowerCase().includes(filtro));
  });
  filaList.innerHTML = filtrados.length ? filtrados.map(d => makeItemHTML(d, { id: d.id, showCall: true })).join('') : '<div class="muted">Nenhum aluno aguardando</div>';
  filaQtd.textContent = String(filtrados.length);
}

/* --------------- Ação: Chamar aluno (mover para em_atendimento com atendente null inicialmente) --------------- */
filaList.addEventListener('click', async (e) => {
  const btn = e.target.closest('button[data-action="call"]');
  if (!btn) return;
  const id = btn.dataset.id;
  if (!currentAtendente) {
    alert('Escolha seu nome no seletor de atendente antes de chamar um aluno.');
    return;
  }
  try {
    const docRef = doc(db, "fila", id);
    await updateDoc(docRef, {
      status: "em_atendimento",
      atendente: currentAtendente,
      chamadoTimestamp: serverTimestamp()
    });
    // opcional: notificação sonora ou visual poderia ser aqui
  } catch (err) {
    console.error(err);
    alert('Erro ao chamar aluno. Veja o console.');
  }
});

/* ------------------ Minha fila / Em atendimento (status = 'em_atendimento' and atendente = current) ------------------ */
function listenMinhaFila(atendente) {
  if (!atendente) {
    minhaFilaList.innerHTML = '<div class="muted">Selecione um atendente.</div>';
    atendimentoList.innerHTML = '<div class="muted">—</div>';
    return;
  }
  const qMy = query(filaRef, where("status", "==", "em_atendimento"), where("atendente", "==", atendente), orderBy("chamadoTimestamp", "asc"));
  // keep a snapshot to reflect both "em atendimento" and "minha fila"
  onSnapshot(qMy, (snap) => {
    const docs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    // separar entre em atendimento (que estejam com campo em_atendimento_atual ?) 
    // Para simplicidade: o primeiro será considerado "em atendimento" e o resto "minha fila"
    if (!docs.length) {
      atendimentoList.innerHTML = '<div class="muted">Nenhum em atendimento</div>';
      minhaFilaList.innerHTML = '<div class="muted">Sua fila está vazia</div>';
      return;
    }
    // Primeiro é o atual
    const atual = docs[0];
    const demais = docs.slice(1);
    atendimentoList.innerHTML = makeItemHTML(atual, { id: atual.id, showEnd: true });
    minhaFilaList.innerHTML = demais.length ? demais.map(d => makeItemHTML(d, { id: d.id, showEnd: true })).join('') : '<div class="muted">Sem mais na fila</div>';
  });
}

/* --------------- Encerrar atendimento -> mover para histórico --------------- */
[minhaFilaList, atendimentoList].forEach(listEl => {
  listEl.addEventListener('click', async (e) => {
    const btn = e.target.closest('button[data-action="end"]');
    if (!btn) return;
    const id = btn.dataset.id;
    try {
      const docRef = doc(db, "fila", id);
      const snap = await getDoc(docRef);
      if (!snap.exists()) return;
      const data = snap.data();
      // cria registro no historico
      await addDoc(collection(db, "historico"), {
        nome: data.nome || '',
        ra: data.ra || '',
        curso: data.curso || '',
        solicitacao: data.solicitacao || '',
        senha: data.senha || '',
        atendente: data.atendente || currentAtendente,
        chamadoTimestamp: data.chamadoTimestamp || serverTimestamp(),
        finalizadoTimestamp: serverTimestamp()
      });
      // atualiza o doc na fila para finalizado (pode ser removido opcionalmente)
      await updateDoc(docRef, { status: "finalizado", finalizadoTimestamp: serverTimestamp() });
    } catch (err) {
      console.error(err);
      alert('Erro ao encerrar atendimento.');
    }
  });
});

/* ------------------ Ouvir Histórico (ordenado por finalizadoTimestamp desc) ------------------ */
const histRef = collection(db, "historico");
const qHist = query(histRef, orderBy("finalizadoTimestamp", "desc"));

onSnapshot(qHist, (snap) => {
  const docs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  historyList.innerHTML = docs.length ? docs.slice(0,40).map(d => `
    <div class="item">
      <div class="avatar">${(d.nome||'').split(' ').slice(0,2).map(s=>s[0]||'').join('').toUpperCase()}</div>
      <div class="info">
        <div class="name">${d.nome}</div>
        <div class="meta">${d.senha || ''} • ${d.atendente || ''} • ${d.solicitacao || ''} <span style="margin-left:8px;color:#94a3b8">${d.finalizadoTimestamp ? new Date(d.finalizadoTimestamp.seconds*1000).toLocaleString() : ''}</span></div>
      </div>
    </div>
  `).join('') : '<div class="muted">Histórico vazio</div>';
  histQtd.textContent = String(docs.length);
});

/* ------------------ Seleção atendente e UI handlers ------------------ */
atendSelect.addEventListener('change', (e) => {
  currentAtendente = e.target.value;
  attNome.textContent = currentAtendente || '—';
  attStatus.textContent = currentAtendente ? 'Disponível' : 'Offline';
  // atualiza a escuta da fila do atendente
  listenMinhaFila(currentAtendente);
});

/* Buscar na fila */
searchFila.addEventListener('input', () => {
  // re-render da fila geral feita pelo listener
});

/* botões ver minha fila / voltar */
btnVerMinhaFila.addEventListener('click', () => {
  if (!currentAtendente) return alert('Escolha seu nome antes de ver a sua fila');
  // rolar a tela para minha fila
  document.querySelector('.highlight').scrollIntoView({behavior:'smooth'});
});
btnVoltarGeral.addEventListener('click', () => {
  window.scrollTo({top:0,behavior:'smooth'});
});

/* Logout (simples) */
document.getElementById('btnLogout').addEventListener('click', () => {
  atendSelect.value = '';
  atendSelect.dispatchEvent(new Event('change'));
});

/* Inicialização: define estado inicial em UI */
attNome.textContent = '—';
attStatus.textContent = 'Offline';
filaList.innerHTML = '<div class="muted">Carregando fila...</div>';
minhaFilaList.innerHTML = '<div class="muted">Selecione seu nome</div>';
