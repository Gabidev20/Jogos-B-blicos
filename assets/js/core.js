/* ===========================================================
   core.js — armazenamento, perfis, tema, rotas e utilidades
   =========================================================== */
(function (global) {
  'use strict';

  var MJB = global.MJB = global.MJB || {};

  /* ---------------- armazenamento local ---------------- */

  var KEY = 'mjb:v1';

  var defaultState = {
    students: [],
    activeId: null,
    theme: null,          // null = segue o sistema
    progress: {},         // progress[studentId][lessonId][gameId] = {score, total, pct, at}
    custom: {}            // custom[lessonId] = { q:[], vf:[], w:[], d:[], pop:[], mem:[] }
  };

  function load() {
    try {
      var raw = global.localStorage.getItem(KEY);
      if (!raw) return JSON.parse(JSON.stringify(defaultState));
      var parsed = JSON.parse(raw);
      var out = JSON.parse(JSON.stringify(defaultState));
      Object.keys(defaultState).forEach(function (k) {
        if (parsed[k] !== undefined && parsed[k] !== null) out[k] = parsed[k];
      });
      return out;
    } catch (e) {
      return JSON.parse(JSON.stringify(defaultState));
    }
  }

  var state = load();
  MJB.state = state;

  var saveTimer = null;
  function save() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(function () {
      try { global.localStorage.setItem(KEY, JSON.stringify(state)); }
      catch (e) { MJB.toast('Não consegui salvar neste aparelho. Verifique o espaço do navegador.', 'bad'); }
    }, 120);
  }
  MJB.save = save;

  /* ---------------- utilidades ---------------- */

  function uid() {
    return 'e' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  }
  MJB.uid = uid;

  function esc(s) {
    return String(s === undefined || s === null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }
  MJB.esc = esc;

  /** Remove acentos e baixa a caixa — usado em buscas e correção de respostas. */
  function fold(s) {
    return String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  }
  MJB.fold = fold;

  function slug(s) {
    return fold(s).replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  }
  MJB.slug = slug;

  function shuffle(arr) {
    var a = arr.slice(), i, j, t;
    for (i = a.length - 1; i > 0; i--) {
      j = Math.floor(Math.random() * (i + 1));
      t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }
  MJB.shuffle = shuffle;

  function sample(arr, n) { return shuffle(arr).slice(0, n); }
  MJB.sample = sample;

  function el(tag, attrs, html) {
    var node = document.createElement(tag);
    if (attrs) Object.keys(attrs).forEach(function (k) {
      if (k === 'class') node.className = attrs[k];
      else if (k === 'style') node.setAttribute('style', attrs[k]);
      else if (k.slice(0, 2) === 'on') node.addEventListener(k.slice(2), attrs[k]);
      else if (attrs[k] !== null && attrs[k] !== undefined) node.setAttribute(k, attrs[k]);
    });
    if (html !== undefined) node.innerHTML = html;
    return node;
  }
  MJB.el = el;

  /* ---------------- cor ---------------- */

  var COLORS = [
    { name: 'Azul cobalto', hex: '#2F4BD8' },
    { name: 'Verde folha', hex: '#12A47A' },
    { name: 'Laranja pôr do sol', hex: '#F2762E' },
    { name: 'Rosa flamingo', hex: '#E5468E' },
    { name: 'Roxo uva', hex: '#8257E6' },
    { name: 'Vermelho maçã', hex: '#E14B54' },
    { name: 'Turquesa mar', hex: '#12AFC9' },
    { name: 'Amarelo girassol', hex: '#E8A600' },
    { name: 'Verde limão', hex: '#5FA828' },
    { name: 'Marrom cacau', hex: '#8A5A3B' }
  ];
  MJB.COLORS = COLORS;

  var EMOJIS = [
    '🙂', '😄', '🐨', '🦊', '🐢', '🐬', '🦋', '🐧', '🐝', '🦜',
    '🌻', '🌳', '🍀', '⭐', '🌈', '⚽', '🏀', '🚲', '📚', '✏️',
    '🎨', '🎵', '🧩', '🪁', '🍎', '🐳'
  ];
  MJB.EMOJIS = EMOJIS;

  function hexToRgb(hex) {
    var h = String(hex || '').replace('#', '');
    if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
    var n = parseInt(h, 16);
    if (isNaN(n)) return { r: 47, g: 75, b: 216 };
    return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
  }
  MJB.hexToRgb = hexToRgb;

  /** Luminância relativa (WCAG) — decide se o texto sobre a cor é branco ou escuro. */
  function luminance(hex) {
    var c = hexToRgb(hex);
    var f = function (v) { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
    return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b);
  }
  MJB.luminance = luminance;

  function onColor(hex) { return luminance(hex) > 0.45 ? '#241F3D' : '#FFFFFF'; }
  MJB.onColor = onColor;

  /* ---------------- estudantes ---------------- */

  function students() { return state.students; }
  MJB.students = students;

  function activeStudent() {
    if (!state.activeId) return null;
    for (var i = 0; i < state.students.length; i++) {
      if (state.students[i].id === state.activeId) return state.students[i];
    }
    return null;
  }
  MJB.activeStudent = activeStudent;

  function addStudent(data) {
    var s = {
      id: uid(),
      name: String(data.name || '').trim() || 'Estudante',
      age: data.age === '' || data.age === null || data.age === undefined ? null : Number(data.age),
      band: data.band || 'kids',
      color: data.color || COLORS[0].hex,
      emoji: data.emoji || EMOJIS[0],
      createdAt: Date.now()
    };
    state.students.push(s);
    if (!state.activeId) state.activeId = s.id;
    save(); applyAccent();
    return s;
  }
  MJB.addStudent = addStudent;

  function updateStudent(id, data) {
    var s = null, i;
    for (i = 0; i < state.students.length; i++) if (state.students[i].id === id) s = state.students[i];
    if (!s) return null;
    if (data.name !== undefined) s.name = String(data.name).trim() || s.name;
    if (data.age !== undefined) s.age = data.age === '' || data.age === null ? null : Number(data.age);
    if (data.band !== undefined) s.band = data.band;
    if (data.color !== undefined) s.color = data.color;
    if (data.emoji !== undefined) s.emoji = data.emoji;
    save(); applyAccent();
    return s;
  }
  MJB.updateStudent = updateStudent;

  function removeStudent(id) {
    state.students = state.students.filter(function (s) { return s.id !== id; });
    if (state.activeId === id) state.activeId = state.students.length ? state.students[0].id : null;
    delete state.progress[id];
    save(); applyAccent();
  }
  MJB.removeStudent = removeStudent;

  function setActive(id) {
    state.activeId = id;
    save(); applyAccent();
    document.dispatchEvent(new CustomEvent('mjb:profile'));
  }
  MJB.setActive = setActive;

  /** Aplica a cor favorita do estudante ativo como acento da interface. */
  function applyAccent() {
    var s = activeStudent();
    var hex = s ? s.color : '#2F4BD8';
    var root = document.documentElement;
    root.style.setProperty('--accent', hex);
    root.style.setProperty('--on-accent', onColor(hex));
    var c = hexToRgb(hex);
    root.style.setProperty('--accent-soft', 'rgba(' + c.r + ',' + c.g + ',' + c.b + ',.14)');

    var nameEl = document.getElementById('profileName');
    var emoEl = document.getElementById('profileEmoji');
    if (nameEl) nameEl.textContent = s ? s.name : 'Escolher estudante';
    if (emoEl) emoEl.textContent = s ? s.emoji : '🙂';
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', '#131228');
  }
  MJB.applyAccent = applyAccent;

  /* ---------------- progresso ---------------- */

  function saveScore(lessonId, gameId, score, total) {
    var sid = state.activeId || '_visitante';
    if (!state.progress[sid]) state.progress[sid] = {};
    if (!state.progress[sid][lessonId]) state.progress[sid][lessonId] = {};
    var pct = total > 0 ? Math.round((score / total) * 100) : 0;
    var prev = state.progress[sid][lessonId][gameId];
    state.progress[sid][lessonId][gameId] = {
      score: score, total: total, pct: pct, at: Date.now(),
      best: prev && prev.best > pct ? prev.best : pct
    };
    save();
  }
  MJB.saveScore = saveScore;

  function getScore(lessonId, gameId) {
    var sid = state.activeId || '_visitante';
    var p = state.progress[sid];
    if (!p || !p[lessonId]) return null;
    return p[lessonId][gameId] || null;
  }
  MJB.getScore = getScore;

  function lessonProgress(lessonId) {
    var sid = state.activeId || '_visitante';
    var p = state.progress[sid];
    if (!p || !p[lessonId]) return 0;
    return Object.keys(p[lessonId]).length;
  }
  MJB.lessonProgress = lessonProgress;

  /* ---------------- tema ---------------- */

  function applyTheme() {
    var root = document.documentElement;
    if (state.theme === 'dark' || state.theme === 'light') root.setAttribute('data-theme', state.theme);
    else root.removeAttribute('data-theme');
    var icon = document.querySelector('[data-theme-icon]');
    if (icon) icon.textContent = state.theme === 'dark' ? '☀' : state.theme === 'light' ? '☾' : '◐';
  }
  MJB.applyTheme = applyTheme;

  function cycleTheme() {
    state.theme = state.theme === null ? 'light' : state.theme === 'light' ? 'dark' : null;
    save(); applyTheme();
    MJB.toast(state.theme === null ? 'Tema do sistema' : state.theme === 'dark' ? 'Tema escuro' : 'Tema claro');
  }
  MJB.cycleTheme = cycleTheme;

  /* ---------------- toasts e modal ---------------- */

  function toast(msg, kind) {
    var stack = document.getElementById('toasts');
    if (!stack) return;
    var t = el('div', { class: 'toast' + (kind ? ' toast--' + kind : '') },
      '<span aria-hidden="true">' + (kind === 'ok' ? '✓' : kind === 'bad' ? '!' : '★') + '</span><span>' + esc(msg) + '</span>');
    stack.appendChild(t);
    setTimeout(function () {
      t.style.transition = 'opacity .3s ease, transform .3s ease';
      t.style.opacity = '0'; t.style.transform = 'translateY(12px)';
      setTimeout(function () { if (t.parentNode) t.parentNode.removeChild(t); }, 320);
    }, 2600);
  }
  MJB.toast = toast;

  var lastFocus = null;
  function openModal(title, node) {
    var m = document.getElementById('modal');
    lastFocus = document.activeElement;
    document.getElementById('modalTitle').textContent = title;
    var body = document.getElementById('modalBody');
    body.innerHTML = '';
    if (typeof node === 'string') body.innerHTML = node; else body.appendChild(node);
    m.hidden = false;
    var first = body.querySelector('input,select,textarea,button,[tabindex]');
    if (first) first.focus();
  }
  MJB.openModal = openModal;

  function closeModal() {
    var m = document.getElementById('modal');
    if (!m || m.hidden) return;
    m.hidden = true;
    document.getElementById('modalBody').innerHTML = '';
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }
  MJB.closeModal = closeModal;

  /* ---------------- confete ---------------- */

  function confetti(hex) {
    if (global.matchMedia && global.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    var base = hex || (activeStudent() ? activeStudent().color : '#2F4BD8');
    var palette = [base, '#FFB627', '#12A47A', '#8257E6', '#E14B54', '#12AFC9'];
    var wrap = el('div', { class: 'confetti', 'aria-hidden': 'true' });
    for (var i = 0; i < 70; i++) {
      var p = el('i');
      p.style.left = (Math.random() * 100) + 'vw';
      p.style.background = palette[i % palette.length];
      p.style.animationDuration = (1.6 + Math.random() * 1.7) + 's';
      p.style.animationDelay = (Math.random() * 0.5) + 's';
      p.style.width = (6 + Math.random() * 8) + 'px';
      p.style.height = (9 + Math.random() * 10) + 'px';
      wrap.appendChild(p);
    }
    document.body.appendChild(wrap);
    setTimeout(function () { if (wrap.parentNode) wrap.parentNode.removeChild(wrap); }, 4200);
  }
  MJB.confetti = confetti;

  /* ---------------- mensagens personalizadas ---------------- */

  var CHEERS = [
    'Mandou muito bem, {nome}!',
    'Isso aí, {nome}! Você está indo longe.',
    '{nome}, que memória boa!',
    'Parabéns, {nome}! Jeová gosta de quem se esforça.',
    'Show de bola, {nome}!',
    '{nome}, você caprichou nessa lição!'
  ];
  var TRYAGAIN = [
    'Quase lá, {nome}! Bora tentar de novo?',
    '{nome}, cada tentativa ensina um pouquinho.',
    'Não desanime, {nome}. Releia a lição e volte aqui!',
    '{nome}, o importante é continuar aprendendo.'
  ];

  function cheer(good) {
    var s = activeStudent();
    var nome = s ? s.name : 'estudante';
    var list = good ? CHEERS : TRYAGAIN;
    return list[Math.floor(Math.random() * list.length)].replace('{nome}', nome);
  }
  MJB.cheer = cheer;

  /* ---------------- rotas ---------------- */

  var routes = [];
  MJB.route = function (re, fn) { routes.push({ re: re, fn: fn }); };

  function currentHash() {
    var h = global.location.hash.replace(/^#/, '');
    if (!h || h === '/') return '/biblioteca';
    return h;
  }
  MJB.currentHash = currentHash;

  function go(path) {
    if (('#' + path) === global.location.hash) render();
    else global.location.hash = path;
  }
  MJB.go = go;

  function markTab(path) {
    var key = (path.split('/')[1] || 'biblioteca');
    if (key === 'licao' || key === 'jogar' || key === 'editor' || key === 'livro') key = 'biblioteca';
    var tabs = document.querySelectorAll('.tab');
    for (var i = 0; i < tabs.length; i++) {
      var t = tabs[i];
      if (t.getAttribute('data-tab') === key) t.setAttribute('aria-current', 'page');
      else t.removeAttribute('aria-current');
    }
  }

  var rendering = false;
  function render() {
    if (rendering) return;
    rendering = true;
    var path = currentHash();
    var main = document.getElementById('conteudo');
    main.innerHTML = '';
    markTab(path);
    var matched = false;
    for (var i = 0; i < routes.length; i++) {
      var m = path.match(routes[i].re);
      if (m) { matched = true; routes[i].fn(main, m); break; }
    }
    if (!matched && routes.length) routes[0].fn(main, [path]);
    rendering = false;
    if (!/^\/biblioteca$/.test(path)) global.scrollTo({ top: 0, behavior: 'instant' in document.body.style ? 'auto' : 'auto' });
  }
  MJB.render = render;

  /* ---------------- inicialização ---------------- */

  function boot() {
    applyTheme();
    applyAccent();

    document.getElementById('btnTheme').addEventListener('click', cycleTheme);
    document.getElementById('btnProfile').addEventListener('click', function () {
      if (MJB.showProfilePicker) MJB.showProfilePicker();
    });

    var modal = document.getElementById('modal');
    modal.addEventListener('click', function (ev) {
      if (ev.target.hasAttribute && ev.target.hasAttribute('data-close')) closeModal();
      if (ev.target.closest && ev.target.closest('[data-close]')) closeModal();
    });
    document.addEventListener('keydown', function (ev) {
      if (ev.key === 'Escape') closeModal();
    });

    global.addEventListener('hashchange', render);
    render();
  }
  MJB.boot = boot;

})(window);
