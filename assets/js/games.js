/* ===========================================================
   games.js — os sete jogos.
   Cada jogo recebe (host, ctx) e desenha tudo dentro de host.
   ctx = { c: conteúdo resolvido, L: lição, done: fn(acertos, total) }
   =========================================================== */
(function (global) {
  'use strict';

  var MJB = global.MJB;
  var el = MJB.el, esc = MJB.esc, shuffle = MJB.shuffle, fold = MJB.fold;

  var Games = MJB.Games = {};

  /* ---------------- peças comuns ---------------- */

  function playbar(host, game, extra) {
    var bar = el('div', { class: 'playbar' });
    bar.innerHTML =
      '<span class="playbar__title"><span aria-hidden="true">' + game.emoji + '</span>' + esc(game.name) + '</span>' +
      '<span class="playbar__stats"></span>';
    host.appendChild(bar);
    var stats = bar.querySelector('.playbar__stats');
    (extra || []).forEach(function (s) {
      stats.appendChild(el('span', { class: 'stat', id: s.id }, s.label + ' <b>' + s.value + '</b>'));
    });
    return {
      set: function (id, value) {
        var n = bar.querySelector('#' + id + ' b');
        if (n) n.textContent = value;
      }
    };
  }

  function progress(host) {
    var wrap = el('div', { class: 'progressbar' }, '<i style="width:0%"></i>');
    host.appendChild(wrap);
    var bar = wrap.querySelector('i');
    return function (done, total) { bar.style.width = (total ? (done / total) * 100 : 0) + '%'; };
  }

  function stars(pct) {
    var n = pct >= 90 ? 3 : pct >= 70 ? 2 : pct >= 40 ? 1 : 0;
    return '⭐'.repeat(n) + '☆'.repeat(3 - n);
  }

  /** Tela final compartilhada por todos os jogos. */
  function finish(host, ctx, score, total, note) {
    var pct = total ? Math.round((score / total) * 100) : 0;
    var good = pct >= 70;
    var s = MJB.activeStudent();
    MJB.saveScore(ctx.L.id, ctx.game.id, score, total);
    if (good) MJB.confetti(s ? s.color : null);

    host.innerHTML = '';
    var box = el('div', { class: 'panel result' });
    box.innerHTML =
      '<div class="result__emoji" aria-hidden="true">' + (s ? esc(s.emoji) : (good ? '🎉' : '🌱')) + '</div>' +
      '<h2>' + esc(MJB.cheer(good)) + '</h2>' +
      '<div class="result__score">' + score + ' / ' + total + '</div>' +
      '<div class="stars" aria-label="' + pct + ' por cento">' + stars(pct) + '</div>' +
      (note ? '<p class="lead">' + esc(note) + '</p>' : '') +
      '<div class="row" style="justify-content:center">' +
      '<button class="btn" type="button" data-again>Jogar de novo</button>' +
      '<a class="btn btn--ghost" href="#/licao/' + ctx.L.id + '">Voltar para a lição</a>' +
      '</div>';
    host.appendChild(box);
    box.querySelector('[data-again]').addEventListener('click', function () {
      host.innerHTML = '';
      Games[ctx.game.id](host, ctx);
    });
  }

  /* =========================================================
     1. Questionário (múltipla escolha)
     ========================================================= */
  Games.quiz = function (host, ctx) {
    var rows = shuffle(ctx.c.q);
    if (!rows.length) return semConteudo(host, ctx);
    var i = 0, score = 0;

    var bar = playbar(host, ctx.game, [
      { id: 'stQ', label: 'Pergunta', value: '1/' + rows.length },
      { id: 'stA', label: 'Acertos', value: '0' }
    ]);
    var setProgress = progress(host);
    var slot = el('div'); host.appendChild(slot);

    function draw() {
      if (i >= rows.length) return finish(host, ctx, score, rows.length);
      bar.set('stQ', (i + 1) + '/' + rows.length);
      setProgress(i, rows.length);

      var row = rows[i];
      var right = row[1];
      var opts = shuffle(row.slice(1).filter(function (x) { return x !== '' && x !== undefined; }));

      slot.innerHTML = '';
      var card = el('div', { class: 'qcard' });
      card.innerHTML =
        '<div class="qcard__n">Pergunta ' + (i + 1) + ' de ' + rows.length + '</div>' +
        '<h3 class="qcard__q">' + esc(row[0]) + '</h3>' +
        '<div class="options"></div>';
      slot.appendChild(card);

      var box = card.querySelector('.options');
      opts.forEach(function (text, k) {
        var b = el('button', { class: 'option', type: 'button' },
          '<span class="option__k" aria-hidden="true">' + 'ABCDE'[k] + '</span><span>' + esc(text) + '</span>');
        b.addEventListener('click', function () { answer(b, text === right, right, box, card); });
        box.appendChild(b);
      });
    }

    function answer(btn, correct, right, box, card) {
      var all = box.querySelectorAll('.option');
      for (var k = 0; k < all.length; k++) {
        all[k].disabled = true;
        var label = all[k].lastChild.textContent;
        if (label === right) all[k].classList.add('is-right');
      }
      if (!correct) btn.classList.add('is-wrong');
      if (correct) score++;
      bar.set('stA', String(score));

      var fb = el('div', { class: 'feedback ' + (correct ? 'feedback--ok' : 'feedback--bad') },
        correct ? '✅ Isso mesmo!' : '📘 A resposta certa é: <strong>' + esc(right) + '</strong>');
      card.appendChild(fb);

      var next = el('button', { class: 'btn btn--block', type: 'button' },
        i + 1 >= rows.length ? 'Ver resultado' : 'Próxima pergunta →');
      next.addEventListener('click', function () { i++; draw(); });
      card.appendChild(next);
      next.focus();
    }

    draw();
  };

  /* =========================================================
     2. Verdadeiro ou Falso
     ========================================================= */
  Games.vf = function (host, ctx) {
    var rows = shuffle(ctx.c.vf);
    if (!rows.length) return semConteudo(host, ctx);
    var i = 0, score = 0;

    var bar = playbar(host, ctx.game, [
      { id: 'stF', label: 'Frase', value: '1/' + rows.length },
      { id: 'stA', label: 'Acertos', value: '0' }
    ]);
    var setProgress = progress(host);
    var slot = el('div'); host.appendChild(slot);

    function draw() {
      if (i >= rows.length) return finish(host, ctx, score, rows.length);
      bar.set('stF', (i + 1) + '/' + rows.length);
      setProgress(i, rows.length);

      var row = rows[i];
      var truth = !!row[1];

      slot.innerHTML = '';
      var card = el('div', { class: 'qcard' });
      card.innerHTML =
        '<div class="qcard__n">Frase ' + (i + 1) + ' de ' + rows.length + '</div>' +
        '<h3 class="qcard__q">' + esc(row[0]) + '</h3>' +
        '<div class="tf-actions">' +
        '<button class="tf-btn tf-true" type="button" data-v="1"><span aria-hidden="true">✅</span>Verdadeiro</button>' +
        '<button class="tf-btn tf-false" type="button" data-v="0"><span aria-hidden="true">❌</span>Falso</button>' +
        '</div>';
      slot.appendChild(card);

      var btns = card.querySelectorAll('.tf-btn');
      for (var k = 0; k < btns.length; k++) {
        (function (b) {
          b.addEventListener('click', function () {
            var pick = b.getAttribute('data-v') === '1';
            for (var j = 0; j < btns.length; j++) btns[j].disabled = true;
            var ok = pick === truth;
            if (ok) score++;
            bar.set('stA', String(score));
            var fb = el('div', { class: 'feedback ' + (ok ? 'feedback--ok' : 'feedback--bad') },
              ok ? '✅ Certo! Essa frase é <strong>' + (truth ? 'verdadeira' : 'falsa') + '</strong>.'
                 : '📘 Na verdade essa frase é <strong>' + (truth ? 'verdadeira' : 'falsa') + '</strong>.' +
                   (row[2] ? ' ' + esc(row[2]) : ''));
            card.appendChild(fb);
            var next = el('button', { class: 'btn btn--block', type: 'button' },
              i + 1 >= rows.length ? 'Ver resultado' : 'Próxima frase →');
            next.addEventListener('click', function () { i++; draw(); });
            card.appendChild(next);
            next.focus();
          });
        })(btns[k]);
      }
    }

    draw();
  };

  /* =========================================================
     3. Estourar Balão
     ========================================================= */
  Games.balao = function (host, ctx) {
    var rounds = shuffle(MJB.balloonRounds(ctx.c)).slice(0, 10);
    if (!rounds.length) return semConteudo(host, ctx);
    var i = 0, score = 0, timers = [];
    var COLORS = ['#E5468E', '#2F4BD8', '#12A47A', '#F2762E', '#8257E6', '#12AFC9', '#E8A600'];

    var bar = playbar(host, ctx.game, [
      { id: 'stR', label: 'Rodada', value: '1/' + rounds.length },
      { id: 'stA', label: 'Acertos', value: '0' }
    ]);
    var setProgress = progress(host);
    var head = el('div', { class: 'qcard' }); host.appendChild(head);
    var arena = el('div', { class: 'balloon-arena' }); host.appendChild(arena);
    host.appendChild(el('p', { class: 'muted' },
      'Toque no balão que traz a resposta certa antes que ele saia da tela.'));

    function clearTimers() { timers.forEach(clearTimeout); timers = []; }

    function draw() {
      clearTimers();
      if (i >= rounds.length) { arena.remove(); head.remove(); return finish(host, ctx, score, rounds.length); }
      bar.set('stR', (i + 1) + '/' + rounds.length);
      setProgress(i, rounds.length);

      var r = rounds[i];
      head.innerHTML = '<div class="qcard__n">Rodada ' + (i + 1) + ' de ' + rounds.length + '</div>' +
        '<h3 class="qcard__q">' + esc(r.q) + '</h3>';
      arena.innerHTML = '';

      var items = shuffle([{ t: r.right, ok: true }].concat(
        r.wrong.slice(0, 3).map(function (w) { return { t: w, ok: false }; })));

      var answered = false;
      items.forEach(function (item, k) {
        var b = el('button', { class: 'balloon', type: 'button',
          'aria-label': 'Balão: ' + item.t });
        var color = COLORS[(k + i) % COLORS.length];
        b.innerHTML =
          '<span class="balloon__body" style="background:' + color + ';color:' + color + '" aria-hidden="true">' +
          esc(emojiFor(item.t, k)) + '</span>' +
          '<span class="balloon__txt">' + esc(item.t) + '</span>';
        var span = 88 / Math.max(items.length, 1);
        b.style.left = (4 + k * (92 / items.length) + Math.random() * (span * 0.25)) + '%';
        b.style.animationDuration = (9 + Math.random() * 3) + 's';
        b.style.animationDelay = (k * 0.45) + 's';
        b.addEventListener('click', function () {
          if (answered) return;
          answered = true;
          b.classList.add('is-pop');
          resolve(item.ok, r.right);
        });
        arena.appendChild(b);
      });

      // se ninguém estourar, a rodada termina sozinha
      timers.push(setTimeout(function () {
        if (!answered) { answered = true; resolve(false, r.right); }
      }, 13500));
    }

    function resolve(ok, right) {
      if (ok) score++;
      bar.set('stA', String(score));
      var fb = el('div', { class: 'feedback ' + (ok ? 'feedback--ok' : 'feedback--bad') },
        ok ? '✅ Estourou o balão certo!' : '📘 O balão certo era: <strong>' + esc(right) + '</strong>');
      head.appendChild(fb);
      var next = el('button', { class: 'btn btn--block', type: 'button' },
        i + 1 >= rounds.length ? 'Ver resultado' : 'Próxima rodada →');
      next.addEventListener('click', function () { i++; draw(); });
      head.appendChild(next);
      timers.push(setTimeout(function () { next.focus(); }, 60));
    }

    var FACES = ['🍀', '🌈', '🐝', '🌻'];
    function emojiFor(text, k) {
      // se o usuário colou um emoji curto como alternativa, ele vira a figura do balão
      var chars = Array.from ? Array.from(String(text)) : String(text).split('');
      if (chars.length && chars.length <= 2 && !/[a-zA-Z0-9]/.test(String(text))) return String(text);
      var t = fold(text);
      if (/jeova|deus/.test(t)) return '⭐';
      if (/jesus|cristo/.test(t)) return '🌟';
      if (/anjo/.test(t)) return '🕊️';
      if (/agua|mar|rio|chuva|diluvio/.test(t)) return '💧';
      if (/arca|barco|navio/.test(t)) return '⛵';
      if (/animal|animais|leao|leoes|jumenta|ovelha|pomba|peixe/.test(t)) return '🐑';
      if (/arvore|fruta|jardim|planta|semente/.test(t)) return '🌳';
      if (/rei|reino|coroa|trono/.test(t)) return '👑';
      if (/livro|biblia|escrit|carta|rolo/.test(t)) return '📖';
      if (/oracao|orar|ora\b/.test(t)) return '🙏';
      if (/casa|templo|tabernaculo|muro|cidade/.test(t)) return '🏠';
      if (/pao|comida|comer|banquete|refeicao/.test(t)) return '🍞';
      if (/estrela|ceu|sol|lua/.test(t)) return '✨';
      if (/coragem|forte|forca|guerra|soldado|exercito/.test(t)) return '🛡️';
      if (/amor|amigo|amizade|familia|coracao/.test(t)) return '💚';
      return FACES[k % FACES.length];
    }

    draw();
  };

  /* =========================================================
     4. Jogo da Forca
     ========================================================= */
  Games.forca = function (host, ctx) {
    var pool = ctx.c.w.filter(function (x) { return MJB.gridWord(x[0]).length >= 3; });
    if (!pool.length) return semConteudo(host, ctx);
    var rounds = shuffle(pool).slice(0, 6);
    var i = 0, score = 0;

    var bar = playbar(host, ctx.game, [
      { id: 'stW', label: 'Palavra', value: '1/' + rounds.length },
      { id: 'stA', label: 'Acertos', value: '0' },
      { id: 'stE', label: 'Erros', value: '0/6' }
    ]);
    var setProgress = progress(host);
    var slot = el('div'); host.appendChild(slot);

    var ALPHA = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

    function draw() {
      if (i >= rounds.length) return finish(host, ctx, score, rounds.length);
      bar.set('stW', (i + 1) + '/' + rounds.length);
      setProgress(i, rounds.length);

      var original = rounds[i][0];
      var clue = rounds[i][1];
      var plain = fold(original).toUpperCase();          // sem acento, com espaços
      var misses = 0, found = {}, over = false;

      slot.innerHTML = '';
      var card = el('div', { class: 'qcard' });
      card.innerHTML =
        '<div class="qcard__n">Palavra ' + (i + 1) + ' de ' + rounds.length + '</div>' +
        '<div class="hang">' + gallows(0) +
        '<p class="lead" style="text-align:center"><strong>Dica:</strong> ' + esc(clue) + '</p>' +
        '<div class="hang__word"></div><div class="keys"></div></div>';
      slot.appendChild(card);

      var svgBox = card.querySelector('[data-gallows]');
      var wordBox = card.querySelector('.hang__word');
      var keyBox = card.querySelector('.keys');

      function paintWord() {
        wordBox.innerHTML = '';
        for (var k = 0; k < original.length; k++) {
          var ch = plain[k];
          if (!/[A-Z]/.test(ch)) {
            wordBox.appendChild(el('span', { class: 'hang__ltr is-space' }, ch === ' ' ? '' : esc(original[k])));
          } else {
            var on = found[ch] || over;
            wordBox.appendChild(el('span', { class: 'hang__ltr' + (on ? ' is-on' : '') },
              on ? esc(original[k]) : ''));
          }
        }
      }

      function solved() {
        for (var k = 0; k < plain.length; k++) {
          if (/[A-Z]/.test(plain[k]) && !found[plain[k]]) return false;
        }
        return true;
      }

      ALPHA.forEach(function (letter) {
        var b = el('button', { class: 'key', type: 'button' }, letter);
        b.addEventListener('click', function () {
          if (over || b.disabled) return;
          b.disabled = true;
          if (plain.indexOf(letter) !== -1) {
            found[letter] = true;
            b.classList.add('is-hit');
            paintWord();
            if (solved()) { score++; bar.set('stA', String(score)); endRound(true); }
          } else {
            misses++;
            b.classList.add('is-miss');
            bar.set('stE', misses + '/6');
            svgBox.innerHTML = gallowsInner(misses);
            if (misses >= 6) endRound(false);
          }
        });
        keyBox.appendChild(b);
      });

      function endRound(win) {
        over = true;
        paintWord();
        var keys = keyBox.querySelectorAll('.key');
        for (var k = 0; k < keys.length; k++) keys[k].disabled = true;
        var fb = el('div', { class: 'feedback ' + (win ? 'feedback--ok' : 'feedback--bad') },
          win ? '✅ Você descobriu a palavra!' : '📘 A palavra era: <strong>' + esc(original) + '</strong>');
        card.appendChild(fb);
        var next = el('button', { class: 'btn btn--block', type: 'button' },
          i + 1 >= rounds.length ? 'Ver resultado' : 'Próxima palavra →');
        next.addEventListener('click', function () { i++; bar.set('stE', '0/6'); draw(); });
        card.appendChild(next);
        next.focus();
      }

      paintWord();
    }

    function gallows(n) {
      return '<svg viewBox="0 0 200 220" role="img" aria-label="Boneco da forca">' +
        '<g stroke="var(--ink-2)" stroke-width="7" stroke-linecap="round" fill="none">' +
        '<path d="M20 205h100M45 205V20h75M120 20v26"/></g>' +
        '<g data-gallows>' + gallowsInner(n) + '</g></svg>';
    }
    function gallowsInner(n) {
      var p = '';
      var S = 'stroke="var(--accent)" stroke-width="7" stroke-linecap="round" fill="none"';
      if (n > 0) p += '<circle cx="120" cy="66" r="20" ' + S + '></circle>';
      if (n > 1) p += '<path d="M120 86v54" ' + S + '></path>';
      if (n > 2) p += '<path d="M120 100 90 126" ' + S + '></path>';
      if (n > 3) p += '<path d="M120 100l30 26" ' + S + '></path>';
      if (n > 4) p += '<path d="M120 140l-26 42" ' + S + '></path>';
      if (n > 5) p += '<path d="M120 140l26 42" ' + S + '></path>';
      return p;
    }

    draw();
  };

  /* =========================================================
     5. Jogo da Memória
     ========================================================= */
  Games.memoria = function (host, ctx) {
    var pairs = MJB.memoryPairs(ctx.c);
    if (!pairs.length) return semConteudo(host, ctx);
    pairs = shuffle(pairs).slice(0, 8);

    var cards = [];
    pairs.forEach(function (p, idx) {
      cards.push({ pair: idx, face: p[0] });
      cards.push({ pair: idx, face: p[1] });
    });
    cards = shuffle(cards);

    var moves = 0, matched = 0, open = [], lock = false;

    var bar = playbar(host, ctx.game, [
      { id: 'stP', label: 'Pares', value: '0/' + pairs.length },
      { id: 'stM', label: 'Jogadas', value: '0' }
    ]);
    var setProgress = progress(host);
    host.appendChild(el('p', { class: 'muted' }, 'Vire duas cartas e encontre os pares que combinam.'));

    var grid = el('div', { class: 'mem-grid' });
    host.appendChild(grid);

    cards.forEach(function (card, idx) {
      var b = el('button', { class: 'mem-card', type: 'button', 'aria-label': 'Carta ' + (idx + 1) });
      b.innerHTML =
        '<span class="mem-card__in">' +
        '<span class="mem-face mem-back" aria-hidden="true">📖</span>' +
        '<span class="mem-face mem-front">' + faceHtml(card.face) + '</span>' +
        '</span>';
      b.addEventListener('click', function () { flip(b, card); });
      grid.appendChild(b);
    });

    function faceHtml(face) {
      if (face && typeof face === 'object' && face.kind === 'img' && face.v) {
        return '<img src="' + esc(face.v) + '" alt="">';
      }
      var v = face && typeof face === 'object' ? face.v : face;
      var txt = String(v === undefined || v === null ? '' : v);
      var big = txt.length <= 3;
      return '<span' + (big ? ' style="font-size:2rem"' : '') + '>' + esc(txt) + '</span>';
    }

    function flip(btn, card) {
      if (lock || btn.classList.contains('is-open') || btn.classList.contains('is-done')) return;
      btn.classList.add('is-open');
      open.push({ btn: btn, card: card });
      if (open.length < 2) return;

      moves++;
      bar.set('stM', String(moves));
      lock = true;
      var a = open[0], b = open[1];

      if (a.card.pair === b.card.pair && a.btn !== b.btn) {
        setTimeout(function () {
          a.btn.classList.add('is-done'); b.btn.classList.add('is-done');
          a.btn.disabled = true; b.btn.disabled = true;
          matched++;
          bar.set('stP', matched + '/' + pairs.length);
          setProgress(matched, pairs.length);
          open = []; lock = false;
          if (matched === pairs.length) {
            var perfect = Math.max(0, pairs.length * 2 - (moves - pairs.length));
            setTimeout(function () {
              finish(host, ctx, pairs.length, pairs.length,
                'Você encontrou todos os pares em ' + moves + ' jogadas.' +
                (moves <= pairs.length + 2 ? ' Memória de elefante!' : ''));
            }, 620);
          }
        }, 420);
      } else {
        setTimeout(function () {
          a.btn.classList.remove('is-open'); b.btn.classList.remove('is-open');
          open = []; lock = false;
        }, 850);
      }
    }
  };

  /* =========================================================
     6. Caça-Palavras
     ========================================================= */
  Games.caca = function (host, ctx) {
    var words = ctx.c.w
      .map(function (x) { return { plain: MJB.gridWord(x[0]), label: x[0], clue: x[1] }; })
      .filter(function (x) { return x.plain.length >= 3 && x.plain.length <= 13; });

    // remove duplicadas mantendo a ordem
    var seen = {}, list = [];
    words.forEach(function (w) { if (!seen[w.plain]) { seen[w.plain] = 1; list.push(w); } });
    list = shuffle(list).slice(0, 9);
    if (!list.length) return semConteudo(host, ctx);

    var longest = list.reduce(function (m, w) { return Math.max(m, w.plain.length); }, 0);
    var size = Math.min(15, Math.max(10, longest + 2));
    var built = buildGrid(list, size);
    var grid = built.grid, placed = built.placed;

    var bar = playbar(host, ctx.game, [
      { id: 'stW', label: 'Achadas', value: '0/' + placed.length }
    ]);
    var setProgress = progress(host);
    host.appendChild(el('p', { class: 'muted' },
      'Arraste sobre as letras (ou toque na primeira e depois na última) para marcar a palavra.'));

    var wrap = el('div', { class: 'ws-wrap' });
    var gridEl = el('div', { class: 'ws-grid', style: 'grid-template-columns:repeat(' + size + ',minmax(22px,1fr))' });
    var listEl = el('div', { class: 'ws-words' });
    wrap.appendChild(gridEl); wrap.appendChild(listEl);
    host.appendChild(wrap);

    var cells = [];
    for (var r = 0; r < size; r++) {
      for (var c = 0; c < size; c++) {
        var cell = el('div', { class: 'ws-cell', 'data-r': r, 'data-c': c, role: 'gridcell' }, grid[r][c]);
        gridEl.appendChild(cell);
        cells.push(cell);
      }
    }
    function at(r, c) { return gridEl.children[r * size + c]; }

    placed.forEach(function (p, idx) {
      listEl.appendChild(el('div', { class: 'ws-word', 'data-w': idx },
        '<span aria-hidden="true">🔍</span><span>' + esc(p.label) + '</span>'));
    });

    var anchor = null, dragging = false, foundCount = 0;

    function clearSel() {
      for (var k = 0; k < cells.length; k++) cells[k].classList.remove('is-sel');
    }

    function lineBetween(a, b) {
      var dr = b.r - a.r, dc = b.c - a.c;
      var len = Math.max(Math.abs(dr), Math.abs(dc));
      if (len === 0) return [{ r: a.r, c: a.c }];
      if (dr !== 0 && dc !== 0 && Math.abs(dr) !== Math.abs(dc)) return null;
      var sr = dr === 0 ? 0 : dr / Math.abs(dr);
      var sc = dc === 0 ? 0 : dc / Math.abs(dc);
      var out = [];
      for (var k = 0; k <= len; k++) out.push({ r: a.r + sr * k, c: a.c + sc * k });
      return out;
    }

    function paintSel(line) {
      clearSel();
      if (!line) return;
      line.forEach(function (p) { at(p.r, p.c).classList.add('is-sel'); });
    }

    function tryLine(line) {
      clearSel();
      if (!line || line.length < 2) return false;
      var text = line.map(function (p) { return grid[p.r][p.c]; }).join('');
      var rev = text.split('').reverse().join('');
      for (var k = 0; k < placed.length; k++) {
        if (placed[k].done) continue;
        if (placed[k].plain === text || placed[k].plain === rev) {
          placed[k].done = true;
          line.forEach(function (p) { at(p.r, p.c).classList.add('is-found'); });
          var chip = listEl.querySelector('[data-w="' + k + '"]');
          if (chip) { chip.classList.add('is-found'); chip.firstChild.textContent = '✅'; }
          foundCount++;
          bar.set('stW', foundCount + '/' + placed.length);
          setProgress(foundCount, placed.length);
          if (foundCount === placed.length) {
            setTimeout(function () { finish(host, ctx, placed.length, placed.length); }, 500);
          }
          return true;
        }
      }
      return false;
    }

    function coordsFrom(target) {
      if (!target || !target.classList || !target.classList.contains('ws-cell')) return null;
      return { r: +target.getAttribute('data-r'), c: +target.getAttribute('data-c') };
    }

    gridEl.addEventListener('pointerdown', function (ev) {
      var p = coordsFrom(ev.target);
      if (!p) return;
      ev.preventDefault();
      dragging = true;
      anchor = p;
      paintSel([p]);
    });

    gridEl.addEventListener('pointermove', function (ev) {
      if (!dragging || !anchor) return;
      var t = document.elementFromPoint(ev.clientX, ev.clientY);
      var p = coordsFrom(t);
      if (!p) return;
      paintSel(lineBetween(anchor, p));
    });

    function release(ev) {
      if (!dragging || !anchor) return;
      dragging = false;
      var t = ev.clientX !== undefined ? document.elementFromPoint(ev.clientX, ev.clientY) : null;
      var p = coordsFrom(t);
      if (p && (p.r !== anchor.r || p.c !== anchor.c)) {
        tryLine(lineBetween(anchor, p));
        anchor = null;
      } else {
        // toque simples: guarda a âncora para o próximo toque fechar a palavra
        paintSel([anchor]);
      }
    }
    gridEl.addEventListener('pointerup', release);
    gridEl.addEventListener('pointercancel', function () { dragging = false; });

    gridEl.addEventListener('click', function (ev) {
      var p = coordsFrom(ev.target);
      if (!p || !anchor) return;
      if (p.r === anchor.r && p.c === anchor.c) return;
      var line = lineBetween(anchor, p);
      if (line) { tryLine(line); anchor = null; }
    });

    /** Coloca as palavras no tabuleiro em 8 direções e preenche o resto. */
    function buildGrid(words, n) {
      var g = [], r, c;
      for (r = 0; r < n; r++) { g.push([]); for (c = 0; c < n; c++) g[r].push(''); }

      var DIRS = [[0, 1], [1, 0], [1, 1], [-1, 1], [0, -1], [-1, 0], [-1, -1], [1, -1]];
      var ok = [];

      words.sort(function (a, b) { return b.plain.length - a.plain.length; });

      words.forEach(function (w) {
        var tries = 0, done = false;
        while (tries < 260 && !done) {
          tries++;
          var d = DIRS[Math.floor(Math.random() * DIRS.length)];
          var sr = Math.floor(Math.random() * n);
          var sc = Math.floor(Math.random() * n);
          var er = sr + d[0] * (w.plain.length - 1);
          var ec = sc + d[1] * (w.plain.length - 1);
          if (er < 0 || er >= n || ec < 0 || ec >= n) continue;
          var fits = true;
          for (var k = 0; k < w.plain.length; k++) {
            var cur = g[sr + d[0] * k][sc + d[1] * k];
            if (cur && cur !== w.plain[k]) { fits = false; break; }
          }
          if (!fits) continue;
          for (var j = 0; j < w.plain.length; j++) g[sr + d[0] * j][sc + d[1] * j] = w.plain[j];
          ok.push({ plain: w.plain, label: w.label, clue: w.clue, done: false });
          done = true;
        }
      });

      var FILL = 'AAAEEEIIOOUURRSSTTNNMMLLCCDDPPGBVFHJZQXK';
      for (r = 0; r < n; r++) for (c = 0; c < n; c++) {
        if (!g[r][c]) g[r][c] = FILL[Math.floor(Math.random() * FILL.length)];
      }
      return { grid: g, placed: ok };
    }
  };

  /* =========================================================
     7. Perguntas Dissertativas
     ========================================================= */
  Games.escrita = function (host, ctx) {
    var rows = shuffle(ctx.c.d);
    if (!rows.length) return semConteudo(host, ctx);
    var i = 0, score = 0;

    var bar = playbar(host, ctx.game, [
      { id: 'stQ', label: 'Pergunta', value: '1/' + rows.length },
      { id: 'stA', label: 'Boas respostas', value: '0' }
    ]);
    var setProgress = progress(host);
    var slot = el('div'); host.appendChild(slot);

    function draw() {
      if (i >= rows.length) {
        return finish(host, ctx, score, rows.length,
          'Nas perguntas com resposta escrita, o mais importante é explicar com suas próprias palavras.');
      }
      bar.set('stQ', (i + 1) + '/' + rows.length);
      setProgress(i, rows.length);

      var row = rows[i];
      var keys = String(row[1] || '').split('|').map(function (s) { return s.trim(); }).filter(Boolean);

      slot.innerHTML = '';
      var card = el('div', { class: 'qcard' });
      card.innerHTML =
        '<div class="qcard__n">Pergunta ' + (i + 1) + ' de ' + rows.length + '</div>' +
        '<h3 class="qcard__q">' + esc(row[0]) + '</h3>' +
        '<div class="field">' +
        '<label for="essa' + i + '">Escreva a sua resposta</label>' +
        '<textarea class="textarea" id="essa' + i + '" placeholder="Responda com suas palavras..."></textarea>' +
        '</div>' +
        '<button class="btn" type="button" data-send>Conferir minha resposta</button>';
      slot.appendChild(card);

      var ta = card.querySelector('textarea');
      ta.focus();
      card.querySelector('[data-send]').addEventListener('click', function () { check(card, ta, keys, row); });
    }

    function check(card, ta, keys, row) {
      var answer = fold(ta.value);
      if (answer.replace(/\s/g, '').length < 3) {
        MJB.toast('Escreva um pouquinho mais antes de conferir.', 'bad');
        ta.focus();
        return;
      }
      var hit = [], miss = [];
      keys.forEach(function (k) {
        var parts = fold(k).split(/\s+/).filter(Boolean);
        var found = parts.every(function (p) { return answer.indexOf(p.slice(0, Math.max(4, p.length - 2))) !== -1; });
        (found ? hit : miss).push(k);
      });

      var ratio = keys.length ? hit.length / keys.length : 1;
      var good = ratio >= 0.5;
      if (good) score++;
      bar.set('stA', String(score));

      ta.readOnly = true;
      card.querySelector('[data-send]').remove();

      var fb = el('div', { class: 'feedback ' + (good ? 'feedback--ok' : 'feedback--bad') });
      fb.innerHTML =
        '<p>' + (good
          ? '✅ Boa! Sua resposta tocou nos pontos principais.'
          : '📘 Compare com a lição: sua resposta ainda deixou pontos importantes de fora.') + '</p>' +
        '<p style="margin-top:8px"><strong>Pontos que a lição destaca:</strong></p>' +
        '<div class="ess-hits" style="margin-top:6px">' +
        hit.map(function (k) { return '<span class="pill pill--ok">✓ ' + esc(k) + '</span>'; }).join('') +
        miss.map(function (k) { return '<span class="pill pill--miss">+ ' + esc(k) + '</span>'; }).join('') +
        '</div>' +
        (row[2] ? '<p style="margin-top:10px">' + esc(row[2]) + '</p>' : '');
      card.appendChild(fb);

      var next = el('button', { class: 'btn btn--block', type: 'button' },
        i + 1 >= rows.length ? 'Ver resultado' : 'Próxima pergunta →');
      next.addEventListener('click', function () { i++; draw(); });
      card.appendChild(next);
      next.focus();
    }

    draw();
  };

  /* ---------------- conteúdo ausente ---------------- */

  function semConteudo(host, ctx) {
    host.innerHTML = '';
    var box = el('div', { class: 'empty' });
    box.innerHTML =
      '<span class="empty__emoji" aria-hidden="true">🌱</span>' +
      '<p><strong>Este jogo ainda não tem conteúdo nesta lição.</strong></p>' +
      '<p>Abra o Criador de Jogos e adicione as perguntas ou palavras que você quiser.</p>' +
      '<p style="margin-top:14px"><a class="btn btn--ghost" href="#/editor/' + ctx.L.id + '">Abrir o Criador de Jogos</a></p>';
    host.appendChild(box);
  }

})(window);
