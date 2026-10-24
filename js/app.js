/* ===== Libras Bíblico — Vanilla JS ===== */
const $ = (s, r = document) => r.querySelector(s);
const app = $('#app');
let DB, termos = {};

/* ---------- Progresso (localStorage) ---------- */
const prog = {
  get: () => JSON.parse(localStorage.getItem('libras-prog') || '{}'),
  add(id) { const p = this.get(); p[id] = true; localStorage.setItem('libras-prog', JSON.stringify(p)); renderEstrelas(); },
};
const renderEstrelas = () => { $('#estrelas').textContent = '⭐ ' + Object.keys(prog.get()).length; };

/* ---------- Dados ---------- */
async function init() {
  DB = await (await fetch('data/termos.json')).json();
  const dp = DB.alfabeto.dactilologiaPath;
  [...DB.alfabeto.letras].forEach(l => DB.termos.push({
    id: 'letra-' + l.toLowerCase(), palavra: l, categoria: 'alfabeto', emoji: l,
    videoLibrasUrl: '', ilustracaoUrl: '', dactilologiaUrl: dp.replace('{l}', l.toLowerCase()),
  }));
  DB.termos.forEach(t => termos[t.id] = t);
  $('#btn-home').onclick = home;
  $('#painel-fechar').onclick = fecharPainel;
  renderEstrelas();
  home();
}

const termosDaFase = f => DB.termos.filter(t => f.categorias.includes(t.categoria));
const sortear = (arr, n) => [...arr].sort(() => Math.random() - .5).slice(0, n);

/* ---------- Mídia com fallback para emoji ---------- */
function midiaSinal(t, cls = 'w-full h-56 rounded-2xl') {
  if (t.videoLibrasUrl) return `<video src="${t.videoLibrasUrl}" class="${cls} object-cover bg-slate-200" autoplay loop muted playsinline
    onerror="this.outerHTML='<div class=\\'${cls} bg-slate-200 flex items-center justify-center text-7xl\\'>🤟</div>'"></video>`;
  return '';
}
function midiaIlustra(t, cls = 'w-full h-full') {
  const fb = `<div class='${cls} flex items-center justify-center text-7xl sm:text-8xl'>${t.emoji}</div>`;
  return t.ilustracaoUrl
    ? `<img src="${t.ilustracaoUrl}" alt="${t.palavra}" class="${cls} object-contain" onerror="this.outerHTML=\`${fb}\`">`
    : fb;
}
/* Palavra em caixa alta + tira de dactilologia (cada letra) */
function palavraDact(palavra) {
  const dp = DB.alfabeto.dactilologiaPath;
  const letras = [...palavra].map(c => {
    const base = c.normalize('NFD').replace(/[̀-ͯ]/g, '');
    if (!/[A-Z]/i.test(base)) return '';
    return `<div class="flex flex-col items-center w-14">
      <img src="${dp.replace('{l}', base.toLowerCase())}" class="w-14 h-14 object-contain" alt=""
        onerror="this.style.display='none'">
      <span class="text-2xl font-extrabold">${c}</span></div>`;
  }).join('');
  return `<div class="flex flex-wrap justify-center gap-1">${letras}</div>`;
}

/* ---------- Cartão Tríade: sinal + ilustração + palavra/dactilologia ---------- */
function triade(t) {
  const sinal = t.categoria === 'alfabeto'
    ? `<img src="${t.dactilologiaUrl}" class="w-full h-56 object-contain" alt="" onerror="this.outerHTML='<div class=\\'h-56 flex items-center justify-center text-8xl\\'>🤟</div>'">`
    : midiaSinal(t);
  return `<div class="space-y-3">
    <div class="rounded-2xl overflow-hidden border-4 border-sky-300">${sinal}</div>
    <div class="h-56 rounded-2xl border-4 border-amber-300 bg-white">${midiaIlustra(t)}</div>
    <div class="rounded-2xl border-4 border-emerald-300 bg-white p-3 text-center">
      <div class="text-5xl font-extrabold tracking-wide">${t.palavra}</div>
      ${t.categoria === 'alfabeto' ? '' : palavraDact(t.palavra)}
    </div></div>`;
}

/* ---------- Tela inicial: trilhas ---------- */
function home() {
  fecharPainel();
  $('#titulo').textContent = 'LIBRAS BÍBLICO';
  app.innerHTML = `<div class="grid grid-cols-2 gap-4">${DB.fases.map(f => `
    <button data-fase="${f.id}" class="btn ${f.cor} text-white rounded-3xl p-6 flex flex-col items-center gap-2 shadow-lg active:scale-95 transition">
      <span class="text-7xl">${f.icone}</span>
      <span class="text-3xl font-extrabold">${f.id}</span>
      <span class="text-lg font-bold">${f.titulo}</span>
    </button>`).join('')}</div>`;
  app.querySelectorAll('[data-fase]').forEach(b => b.onclick = () => fase(+b.dataset.fase));
}

/* ---------- Tela da fase: escolher aprender / quiz / arrastar ---------- */
function fase(id) {
  const f = DB.fases.find(x => x.id === id);
  $('#titulo').textContent = `${f.icone} ${f.titulo}`;
  if (f.brochura) return brochura();
  app.innerHTML = `
    <div class="grid grid-cols-3 gap-3 mb-6">
      <button id="m-aprender" class="btn rounded-2xl bg-sky-500 text-white text-5xl py-4" aria-label="Aprender">👀</button>
      <button id="m-quiz" class="btn rounded-2xl bg-amber-500 text-white text-5xl py-4" aria-label="Quiz">🎯</button>
      <button id="m-drag" class="btn rounded-2xl bg-emerald-500 text-white text-5xl py-4" aria-label="Arrastar">🧩</button>
    </div>
    <div id="fase-corpo"></div>`;
  $('#m-aprender').onclick = () => aprender(f);
  $('#m-quiz').onclick = () => quiz(f);
  $('#m-drag').onclick = () => arrastar(f);
  aprender(f);
}

function aprender(f) {
  const lista = termosDaFase(f);
  $('#fase-corpo').innerHTML = `<div class="grid grid-cols-2 sm:grid-cols-4 gap-3">${lista.map(t => `
    <button data-id="${t.id}" class="btn rounded-2xl bg-white border-4 border-slate-200 p-2 shadow active:scale-95">
      <div class="h-24 flex items-center justify-center">${midiaIlustra(t, 'h-24 w-full')}</div>
      <div class="text-xl font-extrabold">${t.palavra}</div></button>`).join('')}</div>`;
  app.querySelectorAll('[data-id]').forEach(b => b.onclick = () => abrirPainel(b.dataset.id));
}

/* ---------- Jogo 1: sinal → escolher ilustração ---------- */
function quiz(f) {
  const pool = termosDaFase(f);
  let fila = sortear(pool, Math.min(8, pool.length)), i = 0, acertos = 0;
  const alvoVisual = t => t.categoria === 'alfabeto'
    ? `<img src="${t.dactilologiaUrl}" class="h-56 mx-auto object-contain" alt="">` : midiaSinal(t, 'w-full h-56 rounded-2xl');

  function rodada() {
    if (i >= fila.length) return fim();
    const alvo = fila[i];
    const opcoes = sortear([alvo, ...sortear(pool.filter(t => t.id !== alvo.id), 2)], 3);
    $('#fase-corpo').innerHTML = `
      <div class="rounded-2xl border-4 border-sky-300 bg-white mb-4">${alvoVisual(alvo)}</div>
      <div class="grid grid-cols-3 gap-3">${opcoes.map(o => `
        <button data-op="${o.id}" class="btn h-40 sm:h-52 rounded-2xl bg-white border-4 border-slate-300 shadow transition">${
          o.categoria === 'alfabeto' ? `<span class="text-7xl font-extrabold">${o.palavra}</span>` : midiaIlustra(o)}</button>`).join('')}</div>`;
    app.querySelectorAll('[data-op]').forEach(b => b.onclick = () => {
      if (b.dataset.op === alvo.id) {
        b.classList.add('anim-ok'); acertos++; prog.add(alvo.id);
        mostrarFeedback('✅'); setTimeout(() => { i++; rodada(); }, 900);
      } else { b.classList.add('anim-erro'); mostrarFeedback('❌'); setTimeout(() => b.classList.remove('anim-erro'), 500); }
    });
  }
  const fim = () => $('#fase-corpo').innerHTML = `<div class="text-center py-10">
    <div class="text-9xl">${acertos >= fila.length * .7 ? '🏆' : '💪'}</div>
    <div class="text-5xl font-extrabold my-4">${acertos}/${fila.length}</div>
    <button id="again" class="btn rounded-2xl bg-emerald-500 text-white text-6xl px-10">🔁</button></div>`;
  rodada();
  document.addEventListener('click', e => e.target.id === 'again' && quiz(f), { once: true });
}

/* ---------- Jogo 2: arrastar PALAVRA → ilustração (pointer events: mouse + toque) ---------- */
function arrastar(f) {
  const set = sortear(termosDaFase(f), 4);
  let restantes = set.length;
  $('#fase-corpo').innerHTML = `
    <div class="grid grid-cols-2 gap-3 mb-6">${set.map(t => `
      <div data-slot="${t.id}" class="h-40 rounded-2xl bg-white border-4 border-dashed border-slate-300 flex items-center justify-center relative transition">
        ${t.categoria === 'alfabeto' ? `<img src="${t.dactilologiaUrl}" class="h-32 object-contain">` : midiaIlustra(t, 'h-32 w-full')}
        <span class="alvo-ok absolute inset-0 hidden items-center justify-center text-6xl bg-green-200/80 rounded-2xl font-extrabold"></span>
      </div>`).join('')}</div>
    <div class="flex flex-wrap justify-center gap-3 min-h-[80px]">${sortear(set, set.length).map(t => `
      <div data-chip="${t.id}" class="chip btn cursor-grab rounded-2xl bg-sky-500 text-white text-3xl font-extrabold px-6 py-4 shadow-lg flex items-center">${t.palavra}</div>`).join('')}</div>`;

  app.querySelectorAll('[data-chip]').forEach(chip => {
    chip.onpointerdown = e => {
      chip.setPointerCapture(e.pointerId);
      const x0 = e.clientX, y0 = e.clientY; chip.style.zIndex = 50; chip.style.position = 'relative';
      let sobre = null;
      chip.onpointermove = m => {
        chip.style.transform = `translate(${m.clientX - x0}px,${m.clientY - y0}px) scale(1.1)`;
        chip.hidden = true; const el = document.elementFromPoint(m.clientX, m.clientY); chip.hidden = false;
        sobre?.classList.remove('slot-over'); sobre = el?.closest('[data-slot]'); sobre?.classList.add('slot-over');
      };
      chip.onpointerup = () => {
        chip.onpointermove = chip.onpointerup = null; sobre?.classList.remove('slot-over');
        if (sobre && sobre.dataset.slot === chip.dataset.chip && !sobre.dataset.feito) {
          sobre.dataset.feito = 1; sobre.classList.add('anim-ok');
          const ok = $('.alvo-ok', sobre); ok.classList.replace('hidden', 'flex'); ok.textContent = termos[chip.dataset.chip].palavra;
          chip.remove(); prog.add(chip.dataset.chip); mostrarFeedback('✅');
          if (!--restantes) setTimeout(() => { mostrarFeedback('🏆'); arrastar(f); }, 1200);
        } else {
          if (sobre) { sobre.classList.add('anim-erro'); mostrarFeedback('❌'); setTimeout(() => sobre.classList.remove('anim-erro'), 500); }
          chip.style.transform = ''; // volta ao lugar
        }
      };
    };
  });
}

/* ---------- Fase 4: vídeos da brochura em Libras ---------- */
function brochura() {
  const V = DB.brochura.videos;
  app.innerHTML = `<div id="player" class="mb-4"></div>
    <div class="grid grid-cols-2 sm:grid-cols-3 gap-3">${V.map(v => `
      <button ${v.url ? `data-v="${v.url}" data-n="${v.n}"` : 'disabled title="Vídeo ainda não baixado"'} class="btn rounded-2xl ${v.url ? 'bg-emerald-600 active:scale-95' : 'bg-slate-300 opacity-60'} text-white p-4 shadow text-left">
        <span class="block text-4xl font-extrabold">${v.titulo.split(' — ')[0].replace('Lição ', '')}</span>
        <span class="block text-sm leading-tight">${v.titulo.split(' — ').slice(1).join(' — ')}</span></button>`).join('')}</div>`;
  app.querySelectorAll('[data-v]').forEach(b => b.onclick = () => {
    $('#player').innerHTML = `<video src="${b.dataset.v}" controls autoplay playsinline class="w-full rounded-2xl bg-black"></video>`;
    prog.add('video-' + b.dataset.n); scrollTo({ top: 0, behavior: 'smooth' });
  });
}

/* ---------- Painel lateral ---------- */
function abrirPainel(id) {
  $('#painel-corpo').innerHTML = triade(termos[id]);
  $('#painel').classList.remove('translate-x-full'); $('#painel').setAttribute('aria-hidden', 'false');
  prog.add(id);
}
function fecharPainel() { $('#painel').classList.add('translate-x-full'); $('#painel').setAttribute('aria-hidden', 'true'); $('#painel-corpo').innerHTML = ''; }

/* ---------- Feedback visual flutuante ---------- */
function mostrarFeedback(emoji) {
  const el = document.createElement('div');
  el.textContent = emoji;
  el.className = 'fixed inset-0 z-40 flex items-center justify-center text-[10rem] pointer-events-none';
  el.animate([{ opacity: 0, transform: 'scale(.5)' }, { opacity: 1, transform: 'scale(1.1)' }, { opacity: 0, transform: 'scale(1)' }], { duration: 800 });
  document.body.appendChild(el); setTimeout(() => el.remove(), 800);
}

init();
