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
  var som = function (n) { if (MJB.som) MJB.som(n); };

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
    som(good ? 'vitoria' : 'fim');
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
      som(correct ? 'certo' : 'erro');
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
            som(ok ? 'certo' : 'erro');
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
          som('estouro');
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
      som(ok ? 'certo' : 'erro');
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
            som('letra');
            found[letter] = true;
            b.classList.add('is-hit');
            paintWord();
            if (solved()) { score++; bar.set('stA', String(score)); endRound(true); }
          } else {
            som('erro');
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
        som(win ? 'certo' : 'erro');
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
      som('virar');
      btn.classList.add('is-open');
      open.push({ btn: btn, card: card });
      if (open.length < 2) return;

      moves++;
      bar.set('stM', String(moves));
      lock = true;
      var a = open[0], b = open[1];

      if (a.card.pair === b.card.pair && a.btn !== b.btn) {
        setTimeout(function () {
          som('par');
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
          som('achou');
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
      som(good ? 'certo' : 'erro');
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

  /* =========================================================
     8. Jogo de Tabuleiro (2 a 4 jogadores)

     O caminho serpenteia por um céu ilustrado. O jogador da vez
     clica no dado e depois ARRASTA o próprio pino até a casa que
     o dado mandou. O que a casa faz está escrito nela mesma
     ("VOLTE 2", "JOGUE DE NOVO"...).
     ========================================================= */

  var CASAS = [
    { t: 'inicio' },
    { t: 'pergunta' }, { t: 'desafio' }, { t: 'avanca', n: 1 },
    { t: 'pergunta' }, { t: 'palavra' }, { t: 'volta', n: 1 },
    { t: 'desafio' }, { t: 'estrela' }, { t: 'pergunta' },
    { t: 'palavra' }, { t: 'volta', n: 2 }, { t: 'desafio' },
    { t: 'denovo' }, { t: 'avanca', n: 1 }, { t: 'palavra' },
    { t: 'desafio' }, { t: 'volta', n: 1 }, { t: 'pergunta' },
    { t: 'descanso' }, { t: 'palavra' }, { t: 'desafio' },
    { t: 'avanca', n: 2 }, { t: 'pergunta' }, { t: 'volta', n: 1 },
    { t: 'palavra' }, { t: 'estrela' }, { t: 'desafio' },
    { t: 'pergunta' }, { t: 'volta', n: 1 }, { t: 'denovo' },
    { t: 'chegada' }
  ];

  var TIPOS = {
    inicio:   { emoji: '🏁', cor: '#1B3A7A', nome: 'Início' },
    chegada:  { emoji: '🏆', cor: '#E8A600', nome: 'Chegada' },
    pergunta: { emoji: '🧭', cor: '#2F4BD8', nome: 'Pergunta da lição' },
    desafio:  { emoji: '⚡', cor: '#12AFC9', nome: 'Desafio rápido' },
    palavra:  { emoji: '🔤', cor: '#8257E6', nome: 'Palavra da lição' },
    avanca:   { emoji: '🚀', cor: '#12A47A', nome: 'Avance' },
    volta:    { emoji: '🐢', cor: '#E14B54', nome: 'Volte' },
    estrela:  { emoji: '⭐', cor: '#F2762E', nome: 'Estrela' },
    descanso: { emoji: '🌳', cor: '#5FA828', nome: 'Descanso' },
    denovo:   { emoji: '🔁', cor: '#E5468E', nome: 'Jogue de novo' }
  };

  var PINOS = ['🐢', '🦊', '🐧', '🐝', '🐨', '🦋', '🐬', '🌻'];

  /** O que vai escrito dentro da casa. */
  function rotuloDaCasa(casa) {
    switch (casa.t) {
      case 'inicio':   return 'INÍCIO';
      case 'chegada':  return 'FIM';
      case 'volta':    return 'VOLTE ' + casa.n;
      case 'avanca':   return 'AVANCE ' + casa.n;
      case 'estrela':  return 'ESTRELA';
      case 'descanso': return 'DESCANSE';
      case 'denovo':   return 'DE NOVO';
      default:         return '';
    }
  }

  /** Frase que aparece no cartão quando o pino para na casa. */
  function recadoDaCasa(casa) {
    switch (casa.t) {
      case 'volta':
        return casa.n === 1 ? 'Que pena, volte uma casa!' : 'Que pena, volte duas casas!';
      case 'avanca':
        return casa.n === 1 ? 'Boa! Avance uma casa.' : 'Que rapidez! Avance duas casas.';
      case 'estrela':  return 'Você achou uma estrela! ⭐';
      case 'descanso': return 'Lugar de descanso. Fique aqui e aproveite.';
      case 'denovo':   return 'Que sorte! Jogue o dado de novo.';
      case 'chegada':  return 'Você chegou!';
      case 'pergunta': return 'Casa de pergunta da lição.';
      case 'desafio':  return 'Desafio rápido: verdadeiro ou falso?';
      case 'palavra':  return 'Qual é a palavra da lição?';
      default:         return 'Início do caminho.';
    }
  }

  /* ---------------- o caminho em ziguezague ---------------- */

  /**
   * Devolve a posição (linha, coluna) de cada casa: corre na horizontal,
   * desce uma casa na ponta e volta para o outro lado. As sobras de cada
   * linha de curva ficam livres para os enfeites.
   */
  function caminho(total, cols) {
    var pos = [], r = 1, c = 1, dir = 1, k;
    while (pos.length < total) {
      for (k = 0; k < cols && pos.length < total; k++) {
        pos.push({ r: r, c: c });
        if (k < cols - 1) c += dir;
      }
      if (pos.length >= total) break;
      r += 1;
      pos.push({ r: r, c: c });            // a casa da curva
      if (pos.length >= total) break;
      r += 1;
      dir = -dir;
    }
    return pos;
  }

  /* ---------------- enfeites do céu ---------------- */

  function svgSol(oculos) {
    var raios = '', i;
    for (i = 0; i < 12; i++) {
      raios += '<rect x="56.5" y="1" width="7" height="17" rx="3.5" fill="#FFC93C" ' +
               'transform="rotate(' + (i * 30) + ' 60 60)"/>';
    }
    return '<svg viewBox="0 0 120 120">' + raios +
      '<circle cx="60" cy="60" r="34" fill="#FFD95A"/>' +
      (oculos
        ? '<g fill="#2B2449"><rect x="37" y="51" width="19" height="13" rx="6"/>' +
          '<rect x="64" y="51" width="19" height="13" rx="6"/><rect x="54" y="55" width="12" height="4"/></g>'
        : '<g fill="#2B2449"><circle cx="48" cy="55" r="4.2"/><circle cx="72" cy="55" r="4.2"/></g>') +
      '<path d="M47 70q13 13 26 0" stroke="#2B2449" stroke-width="4.2" fill="none" stroke-linecap="round"/>' +
      '<circle cx="39" cy="71" r="5" fill="#FF9EB5" opacity=".75"/>' +
      '<circle cx="81" cy="71" r="5" fill="#FF9EB5" opacity=".75"/></svg>';
  }

  function svgLua() {
    return '<svg viewBox="0 0 120 120">' +
      '<path d="M82 16a46 46 0 1 0 0 88 36 36 0 0 1 0-88z" fill="#FFD95A"/>' +
      '<g fill="#2B2449"><circle cx="50" cy="52" r="4.2"/><circle cx="72" cy="56" r="4.2"/></g>' +
      '<path d="M48 70q12 12 26 1" stroke="#2B2449" stroke-width="4.2" fill="none" stroke-linecap="round"/>' +
      '<circle cx="41" cy="68" r="5" fill="#FF9EB5" opacity=".7"/></svg>';
  }

  function svgNuvem() {
    return '<svg viewBox="0 0 140 100">' +
      '<g fill="#EAF4FF"><circle cx="43" cy="55" r="25"/><circle cx="76" cy="42" r="32"/>' +
      '<circle cx="106" cy="58" r="22"/><rect x="31" y="56" width="88" height="26" rx="13"/></g>' +
      '<g fill="#2B2449"><circle cx="63" cy="52" r="4.2"/><circle cx="90" cy="52" r="4.2"/></g>' +
      '<path d="M65 65q11 10 23 0" stroke="#2B2449" stroke-width="4.2" fill="none" stroke-linecap="round"/>' +
      '<circle cx="53" cy="63" r="5" fill="#FF9EB5" opacity=".7"/>' +
      '<circle cx="100" cy="63" r="5" fill="#FF9EB5" opacity=".7"/></svg>';
  }

  function svgArco() {
    var cores = ['#FF8FA3', '#FFC93C', '#8FE3A6', '#7FD4F5', '#C4A7F7'], s = '', i, x, raio;
    for (i = 0; i < cores.length; i++) {
      raio = 56 - i * 11;
      x = 14 + i * 11;
      s += '<path d="M' + x + ' 84a' + raio + ' ' + raio + ' 0 0 1 ' + (raio * 2) + ' 0" ' +
           'stroke="' + cores[i] + '" stroke-width="9" fill="none" stroke-linecap="round"/>';
    }
    return '<svg viewBox="0 0 140 92">' + s + '</svg>';
  }

  function svgEstrela() {
    return '<svg viewBox="0 0 100 100">' +
      '<path d="M50 7l12 28 30 3-23 20 7 29-26-16-26 16 7-29L8 38l30-3z" fill="#FFD95A"/>' +
      '<g fill="#2B2449"><circle cx="42" cy="46" r="3.4"/><circle cx="58" cy="46" r="3.4"/></g>' +
      '<path d="M42 57q8 8 16 0" stroke="#2B2449" stroke-width="3.4" fill="none" stroke-linecap="round"/></svg>';
  }

  var ENFEITES = [svgNuvem, function () { return svgSol(true); }, svgArco,
                  svgLua, function () { return svgSol(false); }, svgEstrela];

  Games.tabuleiro = function (host, ctx) {
    var temPergunta = ctx.c.q.length > 0;
    var temFrase = ctx.c.vf.length > 0;
    var palavras = ctx.c.w.filter(function (x) { return String(x[0]).length >= 3 && x[1]; });
    if (!temPergunta && !temFrase) return semConteudo(host, ctx);

    montarTimes();

    /* ---------------- 1) escolha dos jogadores ---------------- */

    function montarTimes() {
      host.innerHTML = '';
      playbar(host, ctx.game, []);

      var painel = el('div', { class: 'panel stack tab-setup' });
      painel.innerHTML =
        '<div class="eyebrow">Antes de começar</div>' +
        '<h2 style="font-size:1.3rem">Quem vai jogar?</h2>' +
        '<p class="muted">Escolha de 2 a 4 jogadores e a cor do pino de cada um. ' +
        'Vence quem chegar primeiro na bandeira. 🏆</p>';

      var linhaQtd = el('div', { class: 'row' });
      linhaQtd.appendChild(el('span', { class: 'muted' }, 'Jogadores:'));
      var qtd = 2;
      var botoesQtd = [];
      [2, 3, 4].forEach(function (n) {
        var b = el('button', { class: 'btn btn--ghost btn--sm', type: 'button' }, n + ' jogadores');
        b.addEventListener('click', function () {
          qtd = n;
          botoesQtd.forEach(function (x) { x.classList.remove('is-on'); });
          b.classList.add('is-on');
          pintarFichas();
        });
        botoesQtd.push(b);
        linhaQtd.appendChild(b);
      });
      botoesQtd[0].classList.add('is-on');
      painel.appendChild(linhaQtd);

      var fichas = el('div', { class: 'tab-fichas' });
      painel.appendChild(fichas);

      // começa com os estudantes cadastrados, se houver
      var alunos = MJB.students();
      var escolhas = [];
      for (var k = 0; k < 4; k++) {
        var aluno = alunos[k];
        escolhas.push({
          nome: aluno ? aluno.name : 'Jogador ' + (k + 1),
          cor: aluno ? aluno.color : MJB.COLORS[k].hex,
          pino: aluno && PINOS.indexOf(aluno.emoji) !== -1 ? aluno.emoji : PINOS[k]
        });
      }

      function pintarFichas() {
        fichas.innerHTML = '';
        for (var k = 0; k < qtd; k++) {
          (function (idx) {
            var e = escolhas[idx];
            var ficha = el('div', { class: 'tab-ficha', style: '--pc:' + e.cor });
            ficha.innerHTML =
              '<div class="tab-ficha__topo">' +
              '<span class="pino pino--grande" style="--pc:' + esc(e.cor) + '">' + esc(e.pino) + '</span>' +
              '<span class="eyebrow">Jogador ' + (idx + 1) + '</span>' +
              '</div>';

            var campo = el('div', { class: 'field' },
              '<label for="tabNome' + idx + '">Nome</label>');
            var entrada = el('input', {
              class: 'input', id: 'tabNome' + idx, maxlength: '18', value: e.nome
            });
            entrada.addEventListener('input', function () { e.nome = entrada.value; });
            campo.appendChild(entrada);
            ficha.appendChild(campo);

            ficha.appendChild(el('span', { class: 'eyebrow' }, 'Cor do pino'));
            var cores = el('div', { class: 'swatches' });
            MJB.COLORS.forEach(function (c) {
              var b = el('button', {
                class: 'swatch', type: 'button', style: 'background:' + c.hex,
                title: c.name, 'aria-label': c.name,
                'aria-pressed': c.hex === e.cor ? 'true' : 'false'
              });
              b.addEventListener('click', function () {
                e.cor = c.hex;
                pintarFichas();
              });
              cores.appendChild(b);
            });
            ficha.appendChild(cores);

            ficha.appendChild(el('span', { class: 'eyebrow' }, 'Bichinho do pino'));
            var pinos = el('div', { class: 'tab-pinos' });
            PINOS.forEach(function (p) {
              var b = el('button', {
                class: 'tab-pino' + (p === e.pino ? ' is-on' : ''), type: 'button',
                'aria-label': 'Pino ' + p
              }, p);
              b.addEventListener('click', function () { e.pino = p; pintarFichas(); });
              pinos.appendChild(b);
            });
            ficha.appendChild(pinos);

            fichas.appendChild(ficha);
          })(k);
        }
      }
      pintarFichas();

      var acao = el('div', { class: 'row' });
      var comecar = el('button', { class: 'btn btn--block', type: 'button' }, '🎲 Começar o jogo');
      comecar.addEventListener('click', function () {
        var usadas = {};
        for (var k = 0; k < qtd; k++) {
          if (usadas[escolhas[k].cor]) {
            MJB.toast('Dois jogadores estão com a mesma cor. Troque uma delas!', 'bad');
            return;
          }
          usadas[escolhas[k].cor] = 1;
        }
        var time = [];
        for (var j = 0; j < qtd; j++) {
          time.push({
            nome: String(escolhas[j].nome).trim() || ('Jogador ' + (j + 1)),
            cor: escolhas[j].cor, pino: escolhas[j].pino,
            pos: 0, estrelas: 0, acertos: 0, tentativas: 0
          });
        }
        jogar(time);
      });
      acao.appendChild(comecar);
      painel.appendChild(acao);
      host.appendChild(painel);
    }

    /* ---------------- 2) a partida ---------------- */

    function jogar(time) {
      var vez = 0;
      var ocupado = false;              // trava enquanto algo está acontecendo
      var destino = null;               // casa para onde o pino precisa ser arrastado
      var sorteQ = shuffle(ctx.c.q), iQ = 0;
      var sorteV = shuffle(ctx.c.vf), iV = 0;
      var sorteP = shuffle(palavras), iP = 0;

      host.innerHTML = '';
      var bar = playbar(host, ctx.game, [
        { id: 'tbVez', label: 'Vez de', value: time[0].nome },
        { id: 'tbCasa', label: 'Casa', value: '0' }
      ]);

      var placar = el('div', { class: 'tab-placar' });
      host.appendChild(placar);

      /* --- o cenário --- */

      var cena = el('div', { class: 'tab-cena' });
      cena.innerHTML =
        '<div class="tab-ceu" aria-hidden="true"></div>' +
        '<svg class="tab-morros" viewBox="0 0 400 90" preserveAspectRatio="none" aria-hidden="true">' +
        '<path d="M0 90V48q58-28 118-8t142-6 140 14v42z" fill="#2E9E6B" opacity=".9"/>' +
        '<path d="M0 90V64q72-20 132 2t148-4 120 10v18z" fill="#3FBE80"/></svg>';
      host.appendChild(cena);

      var board = el('div', { class: 'tab-board', role: 'group',
        'aria-label': 'Tabuleiro com ' + CASAS.length + ' casas' });
      cena.appendChild(board);

      var celulas = [];
      CASAS.forEach(function (casa, idx) {
        var T = TIPOS[casa.t];
        var rotulo = rotuloDaCasa(casa);
        var c = el('div', {
          class: 'casa casa--' + casa.t + (rotulo && casa.t !== 'inicio' && casa.t !== 'chegada'
            ? ' casa--acao' : ''),
          style: '--cc:' + T.cor, 'data-i': String(idx),
          title: recadoDaCasa(casa)
        });
        c.innerHTML =
          (casa.t === 'inicio' || casa.t === 'chegada'
            ? '<span class="casa__marco">' + esc(rotulo) + '</span>' +
              '<span class="casa__ico" aria-hidden="true">' + T.emoji + '</span>'
            : '<span class="casa__n">' + idx + '</span>' +
              (rotulo
                ? '<span class="casa__rot">' + esc(rotulo) + '</span>'
                : '<span class="casa__ico" aria-hidden="true">' + T.emoji + '</span>')) +
          '<span class="casa__pinos"></span>';
        celulas.push(c);
        board.appendChild(c);
      });

      var enfeites = [];

      function colunas() {
        var w = board.clientWidth || global.innerWidth || 900;
        return w >= 760 ? 7 : w >= 520 ? 5 : 4;
      }

      /** Posiciona as casas no ziguezague e espalha os enfeites nas sobras. */
      function arrumar() {
        if (!board.isConnected) {
          global.removeEventListener('resize', arrumar);
          return;
        }
        var cols = colunas();
        var pos = caminho(CASAS.length, cols);
        var linhas = 0, ocupadas = {}, i;

        board.style.setProperty('--cols', cols);
        for (i = 0; i < celulas.length; i++) {
          celulas[i].style.gridColumn = String(pos[i].c);
          celulas[i].style.gridRow = String(pos[i].r);
          ocupadas[pos[i].r + ':' + pos[i].c] = 1;
          if (pos[i].r > linhas) linhas = pos[i].r;
        }

        // sobras largas o bastante para caber um enfeite
        enfeites.forEach(function (e) { e.remove(); });
        enfeites = [];
        var vagas = [], r, c, inicio;
        for (r = 1; r <= linhas; r++) {
          inicio = null;
          for (c = 1; c <= cols + 1; c++) {
            if (c <= cols && !ocupadas[r + ':' + c]) {
              if (inicio === null) inicio = c;
            } else {
              if (inicio !== null && c - inicio >= 2) vagas.push({ r: r, de: inicio, ate: c - 1 });
              inicio = null;
            }
          }
        }
        // a tipografia das casas acompanha o tamanho real delas
        var larg = celulas[0].getBoundingClientRect().width;
        if (larg) board.style.setProperty('--casa', Math.round(larg) + 'px');

        vagas.sort(function (a, b) { return (b.ate - b.de) - (a.ate - a.de); });
        vagas.slice(0, Math.min(ENFEITES.length, cols >= 5 ? 6 : 3)).forEach(function (v, k) {
          var largura = Math.min(3, v.ate - v.de + 1);
          var dentro = v.de + Math.floor((v.ate - v.de + 1 - largura) / 2);
          var d = el('div', { class: 'tab-enfeite', 'aria-hidden': 'true' }, ENFEITES[k % ENFEITES.length]());
          d.style.gridRow = String(v.r);
          d.style.gridColumn = dentro + ' / span ' + largura;
          board.appendChild(d);
          enfeites.push(d);
        });
      }
      arrumar();
      global.addEventListener('resize', arrumar);

      /* --- pinos e placar --- */

      function pintarPinos() {
        celulas.forEach(function (c) {
          c.querySelector('.casa__pinos').innerHTML = '';
          c.classList.remove('is-atual', 'is-alvo');
          c.removeAttribute('role');
          c.removeAttribute('tabindex');
        });
        time.forEach(function (j, idx) {
          var alvo = celulas[Math.min(j.pos, celulas.length - 1)];
          var daVez = idx === vez;
          var p = el('span', {
            class: 'pino' + (daVez ? ' is-vez' : '') + (daVez && destino !== null ? ' is-pegavel' : ''),
            style: '--pc:' + j.cor, title: j.nome
          }, j.pino);
          if (daVez && destino !== null) {
            p.setAttribute('role', 'button');
            p.setAttribute('tabindex', '0');
            p.setAttribute('aria-label', 'Arraste o pino de ' + j.nome + ' até a casa ' + destino);
            p.addEventListener('pointerdown', function (ev) { pegarPino(ev, p, j); });
            p.addEventListener('keydown', function (ev) {
              if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); aterrissar(); }
            });
          }
          alvo.querySelector('.casa__pinos').appendChild(p);
        });
        celulas[Math.min(time[vez].pos, celulas.length - 1)].classList.add('is-atual');

        if (destino !== null) {
          var alvoCel = celulas[destino];
          alvoCel.classList.add('is-alvo');
          alvoCel.setAttribute('role', 'button');
          alvoCel.setAttribute('tabindex', '0');
        }
      }

      function pintarPlacar() {
        placar.innerHTML = '';
        time.forEach(function (j, idx) {
          var chip = el('div', {
            class: 'tab-jog' + (idx === vez ? ' is-vez' : ''), style: '--pc:' + j.cor
          });
          chip.innerHTML =
            '<span class="pino" style="--pc:' + esc(j.cor) + '">' + esc(j.pino) + '</span>' +
            '<span class="tab-jog__txt"><b>' + esc(j.nome) + '</b>' +
            '<small>casa ' + j.pos + ' · ' + j.estrelas + ' ⭐</small></span>';
          placar.appendChild(chip);
        });
      }

      /* --- arrastar o pino --- */

      function pegarPino(ev, pino, jogador) {
        if (destino === null || ocupado) return;
        ev.preventDefault();

        var fantasma = el('div', { class: 'pino pino--fantasma', style: '--pc:' + jogador.cor },
          jogador.pino);
        document.body.appendChild(fantasma);
        pino.classList.add('is-levando');
        board.classList.add('is-arrastando');
        var ultimoY = ev.clientY;
        var rolador = setInterval(function () {
          var vh = global.innerHeight || 800;
          if (ultimoY < 100) global.scrollBy(0, -16);
          else if (ultimoY > vh - 100) global.scrollBy(0, 16);
        }, 16);
        mover(ev.clientX, ev.clientY);

        function mover(x, y) {
          ultimoY = y;
          fantasma.style.left = x + 'px';
          fantasma.style.top = y + 'px';
          var sob = casaSob(x, y);
          celulas.forEach(function (c) { c.classList.remove('is-perto'); });
          if (sob && +sob.getAttribute('data-i') === destino) sob.classList.add('is-perto');
        }

        function aoMover(e) { mover(e.clientX, e.clientY); }

        function aoSoltar(e) {
          document.removeEventListener('pointermove', aoMover);
          document.removeEventListener('pointerup', aoSoltar);
          document.removeEventListener('pointercancel', aoSoltar);
          clearInterval(rolador);
          fantasma.remove();
          pino.classList.remove('is-levando');
          board.classList.remove('is-arrastando');
          celulas.forEach(function (c) { c.classList.remove('is-perto'); });

          var sob = casaSob(e.clientX, e.clientY);
          if (sob && +sob.getAttribute('data-i') === destino) aterrissar();
          else {
            som('erro');
            celulas[destino].classList.add('is-chamando');
            setTimeout(function () {
              if (celulas[destino]) celulas[destino].classList.remove('is-chamando');
            }, 900);
            MJB.toast('Solte o pino na casa ' + destino + ' — ela está piscando.', 'bad');
          }
        }

        document.addEventListener('pointermove', aoMover);
        document.addEventListener('pointerup', aoSoltar);
        document.addEventListener('pointercancel', aoSoltar);
      }

      function casaSob(x, y) {
        var alvo = document.elementFromPoint(x, y);
        return alvo && alvo.closest ? alvo.closest('.casa') : null;
      }

      /** O pino chegou na casa certa. */
      function aterrissar() {
        if (destino === null) return;
        var j = time[vez];
        var passos = Math.abs(destino - j.pos);
        j.pos = destino;
        destino = null;
        ocupado = true;

        for (var k = 0; k < passos; k++) {
          (function (n) { setTimeout(function () { som('passo'); }, n * 85); })(k);
        }
        pintarPinos();
        pintarPlacar();
        bar.set('tbCasa', String(j.pos));
        celulas[j.pos].classList.add('is-chegou');
        setTimeout(function () {
          if (celulas[j.pos]) celulas[j.pos].classList.remove('is-chegou');
          ocupado = false;
          parar();
        }, Math.max(380, passos * 85));
      }

      /** Move sozinho (efeito da casa), casa a casa. */
      function empurrar(quantas, depois) {
        var j = time[vez];
        var falta = Math.abs(quantas);
        var dir = quantas > 0 ? 1 : -1;
        ocupado = true;
        (function passo() {
          if (falta <= 0) { ocupado = false; return depois(); }
          j.pos = Math.max(0, Math.min(j.pos + dir, CASAS.length - 1));
          falta--;
          som('passo');
          pintarPinos();
          pintarPlacar();
          bar.set('tbCasa', String(j.pos));
          celulas[j.pos].scrollIntoView({ block: 'nearest', behavior: 'smooth' });
          setTimeout(passo, 260);
        })();
      }

      /* --- o dado --- */

      var acao = el('div', { class: 'tab-acao' });
      host.appendChild(acao);

      var PIPS = { 1: [4], 2: [0, 8], 3: [0, 4, 8], 4: [0, 2, 6, 8], 5: [0, 2, 4, 6, 8], 6: [0, 2, 3, 5, 6, 8] };

      function faceDado(n) {
        var pontos = PIPS[n] || PIPS[1], html = '';
        for (var i = 0; i < 9; i++) {
          html += '<i' + (pontos.indexOf(i) !== -1 ? ' class="on"' : '') + '></i>';
        }
        return html;
      }

      function telaDado(recado) {
        destino = null;
        acao.innerHTML = '';
        var caixa = el('div', { class: 'panel tab-turno' });
        caixa.innerHTML =
          '<p class="tab-turno__quem">É a vez de <b style="color:' + esc(time[vez].cor) + '">' +
          esc(time[vez].nome) + '</b> ' + esc(time[vez].pino) + '</p>' +
          (recado ? '<p class="muted">' + esc(recado) + '</p>' : '');

        var dado = el('button', {
          class: 'dado', type: 'button', 'data-sem-som': '1', 'aria-label': 'Jogar o dado'
        });
        dado.innerHTML = '<span class="dado__face">' + faceDado(1) + '</span>';
        dado.addEventListener('click', function () { rolar(dado); });
        caixa.appendChild(dado);
        caixa.appendChild(el('p', { class: 'muted tab-dica' }, 'Clique no dado para jogar'));
        acao.appendChild(caixa);
        pintarPinos();
      }

      function rolar(dado) {
        if (ocupado) return;
        ocupado = true;
        dado.disabled = true;
        dado.classList.add('is-rolando');
        som('dado');

        var voltas = 0;
        var face = dado.querySelector('.dado__face');
        var giro = setInterval(function () {
          face.innerHTML = faceDado(1 + Math.floor(Math.random() * 6));
          if (++voltas >= 9) {
            clearInterval(giro);
            var valor = 1 + Math.floor(Math.random() * 6);
            face.innerHTML = faceDado(valor);
            dado.classList.remove('is-rolando');
            ocupado = false;
            setTimeout(function () { pedirArraste(valor, dado); }, 300);
          }
        }, 55);
      }

      /** Depois do dado, o jogador arrasta o próprio pino. */
      function pedirArraste(valor, dado) {
        var j = time[vez];
        destino = Math.min(j.pos + valor, CASAS.length - 1);
        pintarPinos();

        var casaAlvo = celulas[destino];
        casaAlvo.onclick = function () { aterrissar(); };
        casaAlvo.onkeydown = function (ev) {
          if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); aterrissar(); }
        };

        var instrucao = el('div', { class: 'tab-arraste' });
        instrucao.innerHTML =
          '<span class="tab-arraste__dado">' + valor + '</span>' +
          '<span><b>Tirou ' + valor + '!</b> ' + esc(j.nome) +
          ', arraste o seu pino ' + esc(j.pino) + ' até a <b>casa ' + destino + '</b>.' +
          '<small>Prefere não arrastar? Toque direto na casa que está piscando.</small></span>';
        dado.disabled = true;
        acao.appendChild(instrucao);
        enquadrar(celulas[j.pos], casaAlvo);
      }

      /** Rola a página para o pino e a casa-alvo aparecerem juntos (se couberem). */
      function enquadrar(de, para) {
        var a = de.getBoundingClientRect(), b = para.getBoundingClientRect();
        var topo = Math.min(a.top, b.top), base = Math.max(a.bottom, b.bottom);
        var vh = global.innerHeight || 800;
        var margem = 110;                                 // espaço do cabeçalho fixo
        var alvoY;
        if (base - topo <= vh - margem * 2) alvoY = (topo + base) / 2 - vh / 2;   // cabe: centraliza os dois
        else alvoY = a.top - margem;                      // não cabe: mostra o pino, a rolagem do arraste faz o resto
        global.scrollBy(0, alvoY);
      }

      /* --- o que acontece ao parar --- */

      function parar() {
        var j = time[vez];
        var casa = CASAS[j.pos];
        celulas.forEach(function (c) { c.onclick = null; c.onkeydown = null; });
        pintarPinos();
        pintarPlacar();

        if (j.pos >= CASAS.length - 1) return venceu(j);

        switch (casa.t) {
          case 'volta':
            som('volta');
            return recado(casa, 'ruim', function () {
              empurrar(-casa.n, function () { parar(); });
            }, 'Volte o pino');
          case 'avanca':
            som('avanca');
            return recado(casa, 'bom', function () {
              empurrar(casa.n, function () { parar(); });
            }, 'Avance o pino');
          case 'estrela':
            som('estrela');
            j.estrelas++;
            pintarPlacar();
            return recado(casa, 'bom', passarVez, 'Passar a vez →');
          case 'descanso':
          case 'inicio':
            som('vez');
            return recado(casa, 'neutro', passarVez, 'Passar a vez →');
          case 'denovo':
            som('estrela');
            return recado(casa, 'bom', function () { telaDado('Você ganhou outra jogada!'); },
              '🎲 Jogar o dado de novo');
          default:
            return casaDePergunta(casa);
        }
      }

      /** Cartão com a frase da casa e um botão para seguir. */
      function recado(casa, tom, depois, rotulo) {
        acao.innerHTML = '';
        var T = TIPOS[casa.t];
        var caixa = el('div', { class: 'panel tab-recado tab-recado--' + tom });
        caixa.innerHTML =
          '<span class="tab-recado__ico" aria-hidden="true">' + T.emoji + '</span>' +
          '<h3>' + esc(recadoDaCasa(casa)) + '</h3>' +
          '<p class="muted">' + esc(time[vez].nome) + ' parou na casa ' + time[vez].pos + '.</p>';
        var b = el('button', { class: 'btn btn--block', type: 'button' }, rotulo);
        b.addEventListener('click', depois);
        caixa.appendChild(b);
        acao.appendChild(caixa);
        b.focus();
      }

      /** Casa de conteúdo: mostra a frase e o botão "Ver pergunta da lição". */
      function casaDePergunta(casa) {
        acao.innerHTML = '';
        var T = TIPOS[casa.t];
        var caixa = el('div', { class: 'panel tab-recado tab-recado--neutro' });
        caixa.innerHTML =
          '<span class="tab-recado__ico" aria-hidden="true">' + T.emoji + '</span>' +
          '<h3>' + esc(recadoDaCasa(casa)) + '</h3>' +
          '<p class="muted">' + esc(time[vez].nome) + ' parou na casa ' + time[vez].pos +
          '. Acertando, o pino anda mais uma casa e você ganha uma estrela.</p>';
        var b = el('button', { class: 'btn btn--block', type: 'button' },
          '🧭 Ver pergunta da lição');
        b.addEventListener('click', function () { perguntar(casa); });
        caixa.appendChild(b);
        acao.appendChild(caixa);
        b.focus();
      }

      function perguntar(casa) {
        var tipo = casa.t;
        if (tipo === 'desafio' && !temFrase) tipo = 'pergunta';
        if (tipo === 'palavra' && palavras.length < 4) tipo = temPergunta ? 'pergunta' : 'desafio';
        if (tipo === 'pergunta' && !temPergunta) tipo = 'desafio';

        acao.innerHTML = '';
        var card = el('div', { class: 'qcard' });
        acao.appendChild(card);

        if (tipo === 'desafio') return perguntaVF(card);
        if (tipo === 'palavra') return perguntaPalavra(card);
        return perguntaQuiz(card);
      }

      function perguntaQuiz(card) {
        var row = sorteQ[iQ % sorteQ.length]; iQ++;
        var certa = row[1];
        var opcoes = shuffle(row.slice(1).filter(function (x) { return x !== '' && x !== undefined; }));

        card.innerHTML =
          '<div class="qcard__n">Pergunta da lição · vez de ' + esc(time[vez].nome) + '</div>' +
          '<h3 class="qcard__q">' + esc(row[0]) + '</h3><div class="options"></div>';
        var box = card.querySelector('.options');
        opcoes.forEach(function (texto, k) {
          var b = el('button', { class: 'option', type: 'button' },
            '<span class="option__k" aria-hidden="true">' + 'ABCDE'[k] + '</span><span>' + esc(texto) + '</span>');
          b.addEventListener('click', function () {
            var todos = box.querySelectorAll('.option');
            for (var j = 0; j < todos.length; j++) {
              todos[j].disabled = true;
              if (todos[j].lastChild.textContent === certa) todos[j].classList.add('is-right');
            }
            if (texto !== certa) b.classList.add('is-wrong');
            responder(card, texto === certa,
              texto === certa ? '✅ Isso mesmo!' : '📘 A resposta certa é: <strong>' + esc(certa) + '</strong>');
          });
          box.appendChild(b);
        });
      }

      function perguntaVF(card) {
        var row = sorteV[iV % sorteV.length]; iV++;
        var verdade = !!row[1];

        card.innerHTML =
          '<div class="qcard__n">Desafio rápido · vez de ' + esc(time[vez].nome) + '</div>' +
          '<h3 class="qcard__q">' + esc(row[0]) + '</h3>' +
          '<div class="tf-actions">' +
          '<button class="tf-btn tf-true" type="button" data-v="1"><span aria-hidden="true">✅</span>Verdadeiro</button>' +
          '<button class="tf-btn tf-false" type="button" data-v="0"><span aria-hidden="true">❌</span>Falso</button>' +
          '</div>';

        var btns = card.querySelectorAll('.tf-btn');
        for (var k = 0; k < btns.length; k++) {
          (function (b) {
            b.addEventListener('click', function () {
              for (var j = 0; j < btns.length; j++) btns[j].disabled = true;
              var ok = (b.getAttribute('data-v') === '1') === verdade;
              responder(card, ok,
                (ok ? '✅ Certo! Essa frase é ' : '📘 Na verdade essa frase é ') +
                '<strong>' + (verdade ? 'verdadeira' : 'falsa') + '</strong>.' +
                (!ok && row[2] ? ' ' + esc(row[2]) : ''));
            });
          })(btns[k]);
        }
      }

      function perguntaPalavra(card) {
        var item = sorteP[iP % sorteP.length]; iP++;
        var certa = String(item[0]);
        var erradas = shuffle(palavras.filter(function (x) { return String(x[0]) !== certa; }))
          .slice(0, 3).map(function (x) { return String(x[0]); });
        var opcoes = shuffle([certa].concat(erradas));

        card.innerHTML =
          '<div class="qcard__n">Palavra da lição · vez de ' + esc(time[vez].nome) + '</div>' +
          '<h3 class="qcard__q">Qual palavra completa esta dica?<br><span class="tab-dica-palavra">' +
          esc(item[1]) + '</span></h3><div class="options"></div>';
        var box = card.querySelector('.options');
        opcoes.forEach(function (texto, k) {
          var b = el('button', { class: 'option', type: 'button' },
            '<span class="option__k" aria-hidden="true">' + 'ABCDE'[k] + '</span><span>' + esc(texto) + '</span>');
          b.addEventListener('click', function () {
            var todos = box.querySelectorAll('.option');
            for (var j = 0; j < todos.length; j++) {
              todos[j].disabled = true;
              if (todos[j].lastChild.textContent === certa) todos[j].classList.add('is-right');
            }
            if (texto !== certa) b.classList.add('is-wrong');
            responder(card, texto === certa,
              texto === certa ? '✅ É essa mesmo!' : '📘 A palavra certa é: <strong>' + esc(certa) + '</strong>');
          });
          box.appendChild(b);
        });
      }

      /** Resultado da pergunta: acertou anda mais uma casa e ganha estrela. */
      function responder(card, acertou, textoFeedback) {
        var j = time[vez];
        j.tentativas++;
        som(acertou ? 'certo' : 'erro');
        if (acertou) { j.acertos++; j.estrelas++; }
        pintarPlacar();

        var fb = el('div', { class: 'feedback ' + (acertou ? 'feedback--ok' : 'feedback--bad') });
        fb.innerHTML = textoFeedback +
          (acertou ? '<br>⭐ Uma estrela para ' + esc(j.nome) + ' — e o pino anda mais uma casa!' : '');
        card.appendChild(fb);

        var b = el('button', { class: 'btn btn--block', type: 'button' },
          acertou ? 'Andar uma casa →' : 'Passar a vez →');
        b.addEventListener('click', function () {
          b.disabled = true;
          if (!acertou) return passarVez();
          empurrar(1, function () {
            if (time[vez].pos >= CASAS.length - 1) return venceu(time[vez]);
            passarVez();
          });
        });
        card.appendChild(b);
        b.focus();
      }

      function passarVez() {
        vez = (vez + 1) % time.length;
        som('vez');
        bar.set('tbVez', time[vez].nome);
        bar.set('tbCasa', String(time[vez].pos));
        pintarPlacar();
        telaDado('');
      }

      /* --- fim de jogo --- */

      function venceu(vencedor) {
        ocupado = true;
        destino = null;
        som('vitoria');
        MJB.confetti(vencedor.cor);

        var feitas = 0, certas = 0;
        time.forEach(function (j) { feitas += j.tentativas; certas += j.acertos; });
        if (feitas) MJB.saveScore(ctx.L.id, ctx.game.id, certas, feitas);

        acao.innerHTML = '';
        var box = el('div', { class: 'panel result' });
        box.innerHTML =
          '<div class="result__emoji" aria-hidden="true">' + esc(vencedor.pino) + '</div>' +
          '<h2>' + esc(vencedor.nome) + ' chegou primeiro! 🏆</h2>' +
          '<div class="result__score" style="color:' + esc(vencedor.cor) + '">' +
          vencedor.estrelas + ' ⭐</div>';

        var tabela = el('div', { class: 'tab-final' });
        time.slice().sort(function (a, b) { return b.pos - a.pos || b.estrelas - a.estrelas; })
          .forEach(function (j, idx) {
            tabela.appendChild(el('div', { class: 'tab-final__linha', style: '--pc:' + j.cor },
              '<span class="pino" style="--pc:' + esc(j.cor) + '">' + esc(j.pino) + '</span>' +
              '<span class="grow"><b>' + (idx + 1) + 'º ' + esc(j.nome) + '</b>' +
              '<small>casa ' + j.pos + ' · ' + j.estrelas + ' estrela(s) · ' +
              j.acertos + ' de ' + j.tentativas + ' perguntas</small></span>'));
          });
        box.appendChild(tabela);

        var linha = el('div', { class: 'row', style: 'justify-content:center' });
        var denovo = el('button', { class: 'btn', type: 'button' }, '🎲 Jogar de novo');
        denovo.addEventListener('click', function () { Games.tabuleiro(host, ctx); });
        linha.appendChild(denovo);
        linha.appendChild(el('a', { class: 'btn btn--ghost', href: '#/licao/' + ctx.L.id },
          'Voltar para a lição'));
        box.appendChild(linha);
        acao.appendChild(box);
        box.scrollIntoView({ block: 'nearest' });
      }

      /* --- começa --- */
      pintarPinos();
      pintarPlacar();
      telaDado('Boa partida! Cada acerto vale uma estrela.');
    }
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
