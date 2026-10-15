/* ===========================================================
   audio.js — os sons do site.

   Os sons são criados na hora pelo próprio navegador (Web Audio),
   então não há nenhum arquivo de áudio para baixar: funciona
   offline e não pesa no carregamento.

   Uso:   MJB.som('certo')
   O estudante liga e desliga pelo botão 🔊 do topo, e a escolha
   fica guardada neste aparelho.
   =========================================================== */
(function (global) {
  'use strict';

  var MJB = global.MJB;

  var ctx = null;          // AudioContext, criado no primeiro toque
  var master = null;
  var indisponivel = false;

  function ligado() { return MJB.state.som !== false; }
  MJB.somLigado = ligado;

  /** O navegador só deixa tocar som depois de um clique do usuário. */
  function garantir() {
    if (indisponivel) return null;
    if (ctx) {
      if (ctx.state === 'suspended' && ctx.resume) ctx.resume();
      return ctx;
    }
    var AC = global.AudioContext || global.webkitAudioContext;
    if (!AC) { indisponivel = true; return null; }
    try {
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = 0.2;
      master.connect(ctx.destination);
    } catch (e) {
      indisponivel = true;
      ctx = null;
    }
    return ctx;
  }

  /* ---------------- tijolinhos ---------------- */

  function nota(freq, atraso, dur, tipo, vol) {
    if (!ctx) return;
    var t = ctx.currentTime + (atraso || 0);
    var osc = ctx.createOscillator();
    var g = ctx.createGain();
    osc.type = tipo || 'triangle';
    osc.frequency.setValueAtTime(freq, t);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, vol || 0.5), t + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(g); g.connect(master);
    osc.start(t);
    osc.stop(t + dur + 0.03);
  }

  function deslize(de, para, atraso, dur, tipo, vol) {
    if (!ctx) return;
    var t = ctx.currentTime + (atraso || 0);
    var osc = ctx.createOscillator();
    var g = ctx.createGain();
    osc.type = tipo || 'sine';
    osc.frequency.setValueAtTime(de, t);
    osc.frequency.exponentialRampToValueAtTime(para, t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, vol || 0.4), t + 0.015);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(g); g.connect(master);
    osc.start(t);
    osc.stop(t + dur + 0.03);
  }

  /** Chiado curto — serve de estouro de balão e de chacoalhar do dado. */
  function ruido(atraso, dur, vol, corte) {
    if (!ctx) return;
    var t = ctx.currentTime + (atraso || 0);
    var quadros = Math.max(1, Math.floor(ctx.sampleRate * dur));
    var buf = ctx.createBuffer(1, quadros, ctx.sampleRate);
    var dados = buf.getChannelData(0);
    for (var i = 0; i < quadros; i++) dados[i] = (Math.random() * 2 - 1) * (1 - i / quadros);
    var src = ctx.createBufferSource();
    src.buffer = buf;
    var filtro = ctx.createBiquadFilter();
    filtro.type = 'lowpass';
    filtro.frequency.value = corte || 2200;
    var g = ctx.createGain();
    g.gain.value = vol || 0.4;
    src.connect(filtro); filtro.connect(g); g.connect(master);
    src.start(t);
  }

  /* ---------------- o repertório ---------------- */

  var SONS = {
    clique: function () { nota(520, 0, 0.055, 'triangle', 0.33); },
    escolhe: function () { nota(680, 0, 0.07, 'triangle', 0.36); },

    certo: function () {
      nota(659, 0, 0.10, 'triangle', 0.5);
      nota(880, 0.085, 0.18, 'triangle', 0.45);
    },
    erro: function () {
      nota(247, 0, 0.13, 'sawtooth', 0.26);
      nota(185, 0.11, 0.22, 'sawtooth', 0.22);
    },

    virar: function () { nota(430, 0, 0.05, 'sine', 0.3); nota(640, 0.045, 0.07, 'sine', 0.26); },
    par: function () { nota(784, 0, 0.09, 'sine', 0.42); nota(1047, 0.08, 0.15, 'sine', 0.36); },
    estouro: function () { ruido(0, 0.09, 0.5, 2400); nota(300, 0, 0.05, 'square', 0.2); },
    letra: function () { nota(600, 0, 0.05, 'square', 0.22); },
    achou: function () { deslize(520, 980, 0, 0.18, 'triangle', 0.4); },

    dado: function () {
      for (var k = 0; k < 8; k++) ruido(k * 0.052, 0.035, 0.3, 3200);
      nota(520, 0.44, 0.12, 'triangle', 0.4);
    },
    passo: function () { nota(500, 0, 0.06, 'square', 0.26); },
    avanca: function () { [523, 659, 784].forEach(function (f, k) { nota(f, k * 0.07, 0.14, 'triangle', 0.42); }); },
    volta: function () { [523, 415, 311].forEach(function (f, k) { nota(f, k * 0.08, 0.16, 'triangle', 0.38); }); },
    estrela: function () { [784, 988, 1319].forEach(function (f, k) { nota(f, k * 0.06, 0.13, 'sine', 0.4); }); },
    vez: function () { nota(392, 0, 0.09, 'triangle', 0.33); nota(523, 0.08, 0.13, 'triangle', 0.33); },

    vitoria: function () {
      [523, 659, 784, 1047].forEach(function (f, k) { nota(f, k * 0.11, 0.32, 'triangle', 0.45); });
      [1319, 1568].forEach(function (f, k) { nota(f, 0.46 + k * 0.1, 0.4, 'sine', 0.3); });
    },
    fim: function () { [440, 392, 330].forEach(function (f, k) { nota(f, k * 0.12, 0.3, 'triangle', 0.36); }); }
  };

  /** Toca um som pelo nome. Silencioso se o estudante desligou o áudio. */
  function som(nome) {
    if (!ligado() || !SONS[nome]) return;
    if (!garantir()) return;
    try { SONS[nome](); } catch (e) { /* som nunca pode quebrar o jogo */ }
  }
  MJB.som = som;

  /* ---------------- botão de ligar/desligar ---------------- */

  function pintarBotaoSom() {
    var icone = document.querySelector('[data-som-icon]');
    var botao = document.getElementById('btnSom');
    if (icone) icone.textContent = ligado() ? '🔊' : '🔇';
    if (botao) {
      botao.setAttribute('aria-pressed', ligado() ? 'true' : 'false');
      botao.setAttribute('title', ligado() ? 'Desligar os sons' : 'Ligar os sons');
    }
  }
  MJB.pintarBotaoSom = pintarBotaoSom;

  function alternarSom() {
    MJB.state.som = !ligado();
    MJB.save();
    pintarBotaoSom();
    if (ligado()) { garantir(); som('escolhe'); }
    MJB.toast(ligado() ? 'Sons ligados 🔊' : 'Sons desligados 🔇');
  }
  MJB.alternarSom = alternarSom;

  /* ---------------- som de clique em todo o site ---------------- */

  var CLICAVEIS = '.btn,.tab,.chip,.icon-btn,.gamecard,.lesson-item,.bookcard,.student,.option,.tf-btn';

  function ligarCliqueGlobal() {
    document.addEventListener('pointerdown', function (ev) {
      if (!ligado()) return;
      var alvo = ev.target.closest ? ev.target.closest(CLICAVEIS) : null;
      if (!alvo || alvo.disabled) return;
      if (alvo.hasAttribute('data-sem-som')) return;      // o jogo toca o som dele
      som(alvo.classList.contains('option') || alvo.classList.contains('tf-btn')
        ? 'escolhe' : 'clique');
    }, true);
  }
  MJB.ligarCliqueGlobal = ligarCliqueGlobal;

})(window);
