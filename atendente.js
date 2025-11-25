// js/atendente.js (Corrigido e otimizado)
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import {
  getFirestore, collection, query, where, orderBy,
  onSnapshot, doc, updateDoc, addDoc, serverTimestamp, getDoc
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

/* ---------------------- CONFIG --------------------- */
const firebaseConfig = {
  apiKey: "AIzaSyD-Jymhub4TY_gsIAfYnHBw6VoRDvHdfmY",
  authDomain: "fila-coordenacao.firebaseapp.com",
  projectId: "fila-coordenacao",
  storageBucket: "fila-coordenacao.firebasestorage.app",
  messagingSenderId: "302987735020",
  appId: "1:302987735020:web:af93f41a0210c98fd29ac9",
  measurementId: "G-DEYKDLMJ3E"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

/* ---------------------- UI Refs --------------------- */
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

/* ---------------------- Render Helper --------------------- */
function makeItemHTML(data, options = {}) {
  const nome = data.nome || "—";
  const senha = data.senha || "—";
  const curso = data.curso ? ` • ${data.curso}` : "";
  const solicitacao = data.solicitacao ? ` • ${data.solicitacao}` : "";

  const horario = data.createdAt
    ? new Date(data.createdAt.seconds * 1000).toLocaleString()
    : "";

  return `
    <div class="item">
      <div class="avatar">${(nome.split(' ').slice(0,2).map(s=>s[0]).join('')).toUpperCase()}</div>

      <div class="info">
        <div class="name">${nome}</div>
        <div class="meta">Senha: ${senha}${curso}${solicitacao}
          <span style="margin-left:8px;color:#94a3b8;font-weight:600">${horario}</span>
        </div>
      </div>

      <div class="actions">
        ${options.showCall ? `<button class="btn" data-id="${options.id}" data-action="call"
