/* ===========================================================
   ui.js — telas: biblioteca, lição, jogo, criador, estudantes, link
   =========================================================== */
(function (global) {
  'use strict';

  var MJB = global.MJB;
  var el = MJB.el, esc = MJB.esc;

  function h(tag, cls, html) { return el(tag, cls ? { class: cls } : null, html); }

  function breadcrumb(items) {
    var nav = el('nav', { class: 'row', 'aria-label': 'Você está em' });
    nav.style.gap = '6px';
    items.forEach(function (it, i) {
      if (i) nav.appendChild(el('span', { class: 'muted', 'aria-hidden': 'true' }, '›'));
      if (it.href) nav.appendChild(el('a', { class: 'muted', href: it.href, style: 'text-decoration:none' }, esc(it.label)));
      else nav.appendChild(el('span', { class: 'muted' }, esc(it.label)));
    });
    return nav;
  }

  /* =========================================================
     Seletor de estudante (modal)
     ========================================================= */
  MJB.showProfilePicker = function () {
    var box = h('div', 'stack');
    var list = MJB.students();

    if (!list.length) {
      box.appendChild(el('div', { class: 'empty' },
        '<span class="empty__emoji" aria-hidden="true">🌱</span>' +
        '<p><strong>Nenhum estudante cadastrado ainda.</strong></p>' +
        '<p>Cadastre o primeiro para o site usar o nome, a cor e o emoji dele.</p>'));
    } else {
      var grid = h('div', 'students');
      list.forEach(function (s) {
        var card = el('button', {
          class: 'student' + (s.id === MJB.state.activeId ? ' is-active' : ''),
          type: 'button', style: '--sc:' + s.color + ';text-align:left;cursor:pointer'
        });
        card.innerHTML =
          (s.id === MJB.state.activeId ? '<span class="student__badge">Ativo</span>' : '') +
          '<span class="student__av" aria-hidden="true">' + esc(s.emoji) + '</span>' +
          '<span class="student__name">' + esc(s.name) + '</span>' +
          '<span class="student__meta">' + esc(bandLabel(s)) + '</span>';
        card.addEventListener('click', function () {
          MJB.setActive(s.id);
          MJB.closeModal();
          MJB.toast('Agora é a vez de ' + s.name + '! ' + s.emoji, 'ok');
          MJB.render();
        });
        grid.appendChild(card);
      });
      box.appendChild(grid);
    }

    var act = h('div', 'row');
    var add = el('a', { class: 'btn', href: '#/estudantes' }, '➕ Cadastrar estudante');
    add.addEventListener('click', function () { MJB.closeModal(); });
    act.appendChild(add);
    if (list.length) {
      var clear = el('button', { class: 'btn btn--ghost', type: 'button' }, 'Jogar sem perfil');
      clear.addEventListener('click', function () {
        MJB.setActive(null); MJB.closeModal(); MJB.render();
      });
      act.appendChild(clear);
    }
    box.appendChild(act);
    MJB.openModal('Quem vai estudar agora?', box);
  };

  function bandLabel(s) {
    var b = s.band === 'teens' ? 'Teens' : 'Kids';
    return s.age ? b + ' · ' + s.age + ' anos' : b;
  }

  /* =========================================================
     Biblioteca
     ========================================================= */
  MJB.route(/^\/biblioteca$/, function (main) {
    var s = MJB.activeStudent();

    var hero = h('section', 'panel panel--glass');
    hero.innerHTML =
      '<div class="eyebrow">Fonte oficial: jw.org</div>' +
      '<h1 style="font-size:clamp(1.7rem,5.4vw,2.6rem);margin-top:10px">' +
      (s ? 'Oi, ' + esc(s.name) + '! ' + esc(s.emoji) + ' Qual lição vamos jogar hoje?'
         : 'Estudo da Bíblia que vira brincadeira') + '</h1>' +
      '<p class="lead" style="margin-top:10px">Escolha uma lição dos dois livros já carregados — ou cole o link de ' +
      'qualquer artigo ou vídeo do jw.org e o site lê aquela página e monta o questionário e os sete jogos ' +
      'sobre o assunto dela.</p>';

    var acts = h('div', 'row');
    acts.style.marginTop = '16px';
    acts.appendChild(el('a', { class: 'btn', href: '#/link' }, '🔗 Colar link do jw.org'));
    var lucky = el('button', { class: 'btn btn--ghost', type: 'button' }, '🎲 Lição surpresa');
    lucky.addEventListener('click', function () {
      var all = MJB.BY_BOOK.lfb.concat(MJB.BY_BOOK.lff);
      if (!all.length) return;
      MJB.go('/licao/' + all[Math.floor(Math.random() * all.length)].id);
    });
    acts.appendChild(lucky);
    hero.appendChild(acts);
    main.appendChild(hero);

    var sec = h('section', 'stack');
    sec.appendChild(el('div', { class: 'section-head' },
      '<div><div class="eyebrow">Biblioteca pronta</div><h2>Dois livros, ' +
      (MJB.BY_BOOK.lfb.length + MJB.BY_BOOK.lff.length) + ' lições indexadas' +
      (MJB.BY_BOOK.web.length
        ? ' + ' + MJB.BY_BOOK.web.length + ' material(is) seu(s)' : '') +
      '</h2></div>'));

    var books = h('div', 'books');
    var idsLivros = MJB.BY_BOOK.web.length ? ['lfb', 'lff', 'web'] : ['lfb', 'lff'];
    idsLivros.forEach(function (id) {
      var B = MJB.BOOKS[id];
      var done = countDone(id);
      var a = el('a', { class: 'bookcard', href: '#/livro/' + id, style: '--bc:' + B.color });
      a.innerHTML =
        '<span class="bookcard__spine" aria-hidden="true"></span>' +
        '<span class="bookcard__tag">' + esc(B.band) + ' · ' + esc(B.sym) + '</span>' +
        '<h3>' + esc(B.emoji) + ' ' + esc(B.short) + '</h3>' +
        '<p>' + esc(B.blurb) + '</p>' +
        '<span class="bookcard__meta">' +
        '<span><b>' + MJB.BY_BOOK[id].length + '</b>' + esc(B.unitPlural) + '</span>' +
        '<span><b>' + (MJB.BY_BOOK[id].length * 7) + '</b>jogos prontos</span>' +
        '<span><b>' + done + '</b>já jogadas</span>' +
        '</span>';
      books.appendChild(a);
    });
    sec.appendChild(books);
    main.appendChild(sec);

    // busca rápida em todo o catálogo
    var quick = h('section', 'panel stack');
    quick.innerHTML = '<div class="eyebrow">Busca rápida</div>' +
      '<h2 style="font-size:1.25rem">Procurar uma lição pelo nome, número ou tema</h2>';
    var input = el('input', { class: 'input', type: 'search', id: 'buscaGeral',
      placeholder: 'Ex.: Noé, Davi e Golias, oração, lição 27...' });
    quick.appendChild(input);
    var out = h('div', 'lessons');
    quick.appendChild(out);
    input.addEventListener('input', function () {
      var term = input.value.trim();
      out.innerHTML = '';
      if (term.length < 2) return;
      var found = MJB.searchLessons(term).slice(0, 12);
      if (!found.length) {
        out.appendChild(el('p', { class: 'muted' }, 'Nada encontrado com “' + esc(term) + '”.'));
        return;
      }
      found.forEach(function (L) { out.appendChild(lessonItem(L, true)); });
    });
    main.appendChild(quick);
  });

  function countDone(bookId) {
    var sid = MJB.state.activeId || '_visitante';
    var p = MJB.state.progress[sid] || {};
    var n = 0;
    Object.keys(p).forEach(function (k) { if (k.indexOf(bookId + '-') === 0) n++; });
    return n;
  }

  function lessonItem(L, showBook) {
    var B = MJB.BOOKS[L.book];
    var played = MJB.lessonProgress(L.id);
    var a = el('a', { class: 'lesson-item', href: '#/licao/' + L.id });
    a.innerHTML =
      '<span class="lesson-item__n">' + L.n + '</span>' +
      '<span class="grow"><span class="lesson-item__t">' + esc(L.title) + '</span>' +
      '<span class="lesson-item__sub">' + esc(showBook ? B.short : L.section) + '</span></span>' +
      (played ? '<span class="lesson-item__done" title="' + played + ' jogo(s) concluído(s)">' +
        (played >= 7 ? '🏅' : '⭐') + '</span>' : '');
    return a;
  }

  /* =========================================================
     Livro → lista de lições
     ========================================================= */
  MJB.route(/^\/livro\/(lfb|lff|web)$/, function (main, m) {
    var id = m[1], B = MJB.BOOKS[id];

    main.appendChild(breadcrumb([{ label: 'Biblioteca', href: '#/biblioteca' }, { label: B.short }]));

    var head = h('section', 'panel panel--glass');
    head.innerHTML =
      '<div class="eyebrow">' + esc(B.sym) + ' · jw.org</div>' +
      '<h1 style="font-size:clamp(1.5rem,4.6vw,2.2rem);margin-top:8px">' + esc(B.emoji) + ' ' + esc(B.title) + '</h1>' +
      '<p class="lead" style="margin-top:8px">' + esc(B.blurb) + '</p>' +
      (id === 'web'
        ? '<p style="margin-top:14px"><a class="btn btn--ghost btn--sm" href="#/link">🔗 Colar mais um link do jw.org</a></p>'
        : '<p style="margin-top:14px"><a class="btn btn--ghost btn--sm" target="_blank" rel="noopener" href="' +
          esc(MJB.bookUrl(id)) + '">Abrir a publicação no jw.org ↗</a></p>');
    main.appendChild(head);

    var tools = h('section', 'lesson-toolbar');
    var search = el('input', { class: 'input grow', type: 'search',
      id: 'buscaLivro', placeholder: 'Filtrar ' + B.unitPlural + ' deste livro...' });
    tools.appendChild(search);
    main.appendChild(tools);

    var body = h('section', 'stack');
    main.appendChild(body);

    function paint(term) {
      body.innerHTML = '';
      var found = MJB.searchLessons(term || '', id);
      if (!found.length) {
        body.appendChild(el('div', { class: 'empty' },
          '<span class="empty__emoji" aria-hidden="true">🔍</span><p>Nenhuma lição encontrada.</p>'));
        return;
      }
      if (term) {
        var grid = h('div', 'lessons');
        found.forEach(function (L) { grid.appendChild(lessonItem(L)); });
        body.appendChild(grid);
        return;
      }
      B.sections.forEach(function (sec) {
        var inSec = found.filter(function (L) { return L.n >= sec.from && L.n <= sec.to; });
        if (!inSec.length) return;
        var block = h('div', 'secblock');
        block.appendChild(el('h3', { class: 'secblock__title' },
          '<span>' + esc(sec.t) + '</span>'));
        var grid = h('div', 'lessons');
        inSec.forEach(function (L) { grid.appendChild(lessonItem(L)); });
        block.appendChild(grid);
        body.appendChild(block);
      });
    }

    search.addEventListener('input', function () { paint(search.value.trim()); });
    paint('');
  });

  /* =========================================================
     Lição → painel com os jogos
     ========================================================= */
  MJB.route(/^\/licao\/([a-z]+-\d+)$/, function (main, m) {
    var L = MJB.getLesson(m[1]);
    if (!L) return notFound(main);
    var B = MJB.BOOKS[L.book];
    var c = MJB.content(L.id);

    main.appendChild(breadcrumb([
      { label: 'Biblioteca', href: '#/biblioteca' },
      { label: B.short, href: '#/livro/' + L.book },
      { label: B.unit + ' ' + L.n }
    ]));

    var hero = h('section', 'lesson-hero');
    hero.innerHTML =
      '<div class="eyebrow">' + esc(B.unit) + ' ' + L.n + ' · ' + esc(L.section) + '</div>' +
      '<h1>' + esc(L.title) + '</h1>' +
      (L.summary ? '<p>' + esc(L.summary) + '</p>' : '') +
      '<div class="hero-tags">' +
      (L.verse ? '<span class="hero-tag">📖 ' + esc(L.verse) + '</span>' : '') +
      '<span class="hero-tag">🧭 ' + c.q.length + ' perguntas</span>' +
      '<span class="hero-tag">🔤 ' + c.w.length + ' palavras-chave</span>' +
      (MJB.isEdited(L.id) ? '<span class="hero-tag">✏️ conteúdo editado por você</span>' : '') +
      '<a class="hero-tag" target="_blank" rel="noopener" href="' + esc(MJB.lessonUrl(L)) + '">Ler no jw.org ↗</a>' +
      '</div>';
    main.appendChild(hero);

    var sec = h('section', 'stack');
    var headRow = el('div', { class: 'section-head' },
      '<div><div class="eyebrow">Seis jogos + questionário</div>' +
      '<h2>Tudo aqui usa só o conteúdo desta lição</h2></div>');
    var edit = el('a', { class: 'btn btn--ghost btn--sm', href: '#/editor/' + L.id }, '✏️ Criador de Jogos');
    headRow.appendChild(edit);
    sec.appendChild(headRow);

    // material vindo de um link: refazer as perguntas ou apagar
    if (L.book === 'web') {
      var gerRow = h('div', 'row');
      var reger = el('button', { class: 'btn btn--ghost btn--sm', type: 'button' },
        '🔄 Gerar as perguntas de novo');
      reger.addEventListener('click', function () { MJB.regerar(L); });
      var apagar = el('button', { class: 'btn btn--ghost btn--sm', type: 'button' },
        '🗑️ Apagar este material');
      apagar.addEventListener('click', function () { confirmarApagarWeb(L); });
      gerRow.appendChild(reger);
      gerRow.appendChild(apagar);
      sec.appendChild(gerRow);
    }

    var grid = h('div', 'games');
    MJB.GAMES.forEach(function (G) {
      var size = MJB.gameSize(c, G.id);
      var sc = MJB.getScore(L.id, G.id);
      var card = el('button', { class: 'gamecard', type: 'button', style: '--gc:' + G.color });
      card.innerHTML =
        '<span class="gamecard__ico" aria-hidden="true">' + G.emoji + '</span>' +
        '<h3>' + esc(G.name) + '</h3>' +
        '<p>' + esc(G.desc) + '</p>' +
        '<span class="gamecard__foot">' +
        '<span>' + (size ? size + ' itens' : 'sem conteúdo') + '</span>' +
        (sc ? '<span class="gamecard__score">· melhor ' + sc.best + '%</span>' : '') +
        '</span>';
      card.addEventListener('click', function () { MJB.go('/jogar/' + L.id + '/' + G.id); });
      grid.appendChild(card);
    });
    sec.appendChild(grid);
    main.appendChild(sec);

    // navegação entre lições
    var navRow = h('div', 'row');
    var prev = MJB.BY_BOOK[L.book].filter(function (x) { return x.n === L.n - 1; })[0];
    var next = MJB.BY_BOOK[L.book].filter(function (x) { return x.n === L.n + 1; })[0];
    if (prev) navRow.appendChild(el('a', { class: 'btn btn--ghost btn--sm', href: '#/licao/' + prev.id },
      '← ' + B.unit + ' ' + prev.n));
    navRow.appendChild(el('a', { class: 'btn btn--ghost btn--sm', href: '#/livro/' + L.book },
      'Todas as ' + B.unitPlural));
    if (next) navRow.appendChild(el('a', { class: 'btn btn--ghost btn--sm', href: '#/licao/' + next.id },
      B.unit + ' ' + next.n + ' →'));
    main.appendChild(navRow);
  });

  /* =========================================================
     Jogar
     ========================================================= */
  MJB.route(/^\/jogar\/([a-z]+-\d+)\/([a-z]+)$/, function (main, m) {
    var L = MJB.getLesson(m[1]);
    var G = MJB.game(m[2]);
    if (!L || !G || !MJB.Games[G.id]) return notFound(main);
    var c = MJB.content(L.id);

    main.appendChild(breadcrumb([
      { label: MJB.BOOKS[L.book].short, href: '#/livro/' + L.book },
      { label: MJB.BOOKS[L.book].unit + ' ' + L.n, href: '#/licao/' + L.id },
      { label: G.name }
    ]));

    var title = h('section', 'stack');
    title.innerHTML = '<div class="eyebrow">' + esc(L.title) + '</div>';
    main.appendChild(title);

    var stage = h('section', 'play');
    main.appendChild(stage);
    MJB.Games[G.id](stage, { c: c, L: L, game: G });
  });

  /* =========================================================
     Hub de jogos
     ========================================================= */
  MJB.route(/^\/jogos$/, function (main) {
    var head = h('section', 'panel panel--glass');
    head.innerHTML =
      '<div class="eyebrow">Criador de jogos</div>' +
      '<h1 style="font-size:clamp(1.5rem,4.6vw,2.2rem);margin-top:8px">Escolha o jogo e depois a lição</h1>' +
      '<p class="lead" style="margin-top:8px">Todo jogo é montado na hora com as perguntas, as palavras e os ' +
      'textos daquela lição específica — nada se mistura entre lições.</p>';
    main.appendChild(head);

    var grid = h('section', 'games');
    MJB.GAMES.forEach(function (G) {
      var card = el('button', { class: 'gamecard', type: 'button', style: '--gc:' + G.color });
      card.innerHTML =
        '<span class="gamecard__ico" aria-hidden="true">' + G.emoji + '</span>' +
        '<h3>' + esc(G.name) + '</h3><p>' + esc(G.desc) + '</p>' +
        '<span class="gamecard__foot"><span>Escolher lição →</span></span>';
      card.addEventListener('click', function () { pickLesson(G); });
      grid.appendChild(card);
    });
    main.appendChild(grid);
  });

  function pickLesson(G) {
    var box = h('div', 'stack');
    var input = el('input', { class: 'input', type: 'search', id: 'pickLesson',
      placeholder: 'Buscar lição por nome, número ou tema...' });
    box.appendChild(input);
    var out = h('div', 'lessons');
    box.appendChild(out);

    function paint(term) {
      out.innerHTML = '';
      var found = (term ? MJB.searchLessons(term) : MJB.BY_BOOK.lfb.concat(MJB.BY_BOOK.lff)).slice(0, 24);
      found.forEach(function (L) {
        var size = MJB.gameSize(MJB.content(L.id), G.id);
        var a = el('a', { class: 'lesson-item', href: '#/jogar/' + L.id + '/' + G.id });
        a.innerHTML =
          '<span class="lesson-item__n">' + L.n + '</span>' +
          '<span class="grow"><span class="lesson-item__t">' + esc(L.title) + '</span>' +
          '<span class="lesson-item__sub">' + esc(MJB.BOOKS[L.book].short) + ' · ' + size + ' itens</span></span>';
        a.addEventListener('click', function () { MJB.closeModal(); });
        out.appendChild(a);
      });
      if (!found.length) out.appendChild(el('p', { class: 'muted' }, 'Nada encontrado.'));
    }
    input.addEventListener('input', function () { paint(input.value.trim()); });
    paint('');
    MJB.openModal(G.emoji + ' ' + G.name + ' — escolha a lição', box);
  }

  /* =========================================================
     Link do jw.org  →  questionário e jogos sobre o tema do link
     ========================================================= */

  var API = 'api/extrair?url=';

  MJB.route(/^\/link$/, function (main) {
    var head = h('section', 'panel panel--glass');
    head.innerHTML =
      '<div class="eyebrow">Somente jw.org</div>' +
      '<h1 style="font-size:clamp(1.5rem,4.6vw,2.2rem);margin-top:8px">Cole o link do artigo ou vídeo</h1>' +
      '<p class="lead" style="margin-top:8px">Vale qualquer página do domínio oficial <strong>jw.org</strong>: ' +
      'artigo, matéria de revista, lição de livro ou vídeo. O site lê o texto daquela página e monta ' +
      'o questionário e os sete jogos em cima do assunto dela.</p>';
    main.appendChild(head);

    var form = h('section', 'panel stack');
    form.innerHTML =
      '<div class="field">' +
      '<label for="urlIn">Endereço do jw.org</label>' +
      '<input class="input" id="urlIn" type="url" inputmode="url" spellcheck="false" ' +
      'placeholder="https://www.jw.org/pt/...">' +
      '</div>';

    var actions = h('div', 'row');
    var go = el('button', { class: 'btn', type: 'button' }, '✨ Gerar questionário e jogos');
    var exemplo = el('button', { class: 'btn btn--ghost', type: 'button' }, 'Usar um exemplo');
    var colar = el('button', { class: 'btn btn--ghost', type: 'button' }, '📋 Colar o texto à mão');
    actions.appendChild(go); actions.appendChild(exemplo); actions.appendChild(colar);
    form.appendChild(actions);
    main.appendChild(form);

    var out = h('section', 'stack');
    main.appendChild(out);

    var input = form.querySelector('#urlIn');

    exemplo.addEventListener('click', function () {
      input.value = 'https://www.jw.org/pt/ensinos-biblicos/ciencia/teve-um-projeto/braco-polvo/';
      input.classList.remove('input--invalid', 'input--valid');
      input.focus();
    });
    colar.addEventListener('click', function () { formularioTexto(out, input.value.trim()); });

    input.addEventListener('input', function () {
      input.classList.remove('input--invalid', 'input--valid');
      if (!input.value.trim()) return;
      var r = MJB.checkUrl(input.value);
      input.classList.add(r.ok ? 'input--valid' : 'input--invalid');
    });
    input.addEventListener('keydown', function (ev) { if (ev.key === 'Enter') go.click(); });

    go.addEventListener('click', function () { processar(input, out, go); });

    // materiais já gerados em outras vezes
    if (MJB.BY_BOOK.web.length) main.appendChild(painelMeusMateriais());
  });

  /** Caminho principal: valida o domínio, lê a página e gera o material. */
  function processar(input, out, botao) {
    out.innerHTML = '';
    var r = MJB.checkUrl(input.value);

    if (!r.ok) {
      input.classList.add('input--invalid');
      input.focus();
      out.appendChild(avisoDominio(r));
      MJB.toast(r.reason === 'dominio' ? 'Somente links do jw.org' : 'Link inválido', 'bad');
      return;
    }

    input.classList.add('input--valid');

    // já gerei este mesmo endereço antes?
    var jaTem = MJB.webPorFonte(r.url);
    if (jaTem) {
      out.appendChild(el('div', { class: 'note note--ok' },
        '<span class="note__icon" aria-hidden="true">✅</span>' +
        '<span><strong>Este link já virou material aqui</strong>' +
        'Abrindo “' + esc(jaTem.title) + '”. Quer refazer as perguntas do zero? ' +
        'Use o botão “Gerar de novo” na página do material.</span>'));
      setTimeout(function () { MJB.go('/licao/' + jaTem.id); }, 700);
      return;
    }

    // o link aponta para uma lição dos dois livros já carregados?
    // nesse caso o banco de perguntas conferido vale mais do que gerar na hora
    var achada = MJB.matchUrl(r.url);
    if (achada.lesson) {
      out.appendChild(painelCatalogo(achada.lesson, r.url, out, botao, input));
      MJB.toast('Lição reconhecida no catálogo!', 'ok');
      return;
    }

    lerEGerar(r.url, out, botao);
  }

  /** Lê a página no jw.org e monta o material. */
  function lerEGerar(url, out, botao) {
    botao.disabled = true;
    var antes = botao.textContent;
    botao.textContent = '⏳ Lendo a página do jw.org...';
    out.appendChild(el('div', { class: 'note' },
      '<span class="note__icon" aria-hidden="true">📖</span>' +
      '<span><strong>Lendo o material no jw.org…</strong>' +
      'Estou abrindo a página, separando o texto e montando as perguntas. ' +
      'Em vídeos eu uso as legendas, então pode levar alguns segundos.</span>'));

    fetch(API + encodeURIComponent(url), { cache: 'no-store' })
      .then(function (resp) {
        if (resp.status === 404) throw new Error('sem-servidor');
        return resp.json();
      })
      .then(function (doc) {
        botao.disabled = false; botao.textContent = antes;
        out.innerHTML = '';
        if (!doc.ok) {
          out.appendChild(avisoLeitura(doc));
          formularioTexto(out, url);
          return;
        }
        gerarEAbrir(doc, out);
      })
      .catch(function (erro) {
        botao.disabled = false; botao.textContent = antes;
        out.innerHTML = '';
        out.appendChild(avisoSemServidor(erro));
        formularioTexto(out, url);
      });
  }

  /** Gera o material e leva o estudante direto para os jogos. */
  function gerarEAbrir(doc, out) {
    var res = MJB.Gerador.gerar(doc);

    if (!res.ok) {
      out.appendChild(el('div', { class: 'note note--warn' },
        '<span class="note__icon" aria-hidden="true">🧭</span>' +
        '<span><strong>Essa página tem pouco texto para virar um jogo</strong>' +
        'Consegui ' + res.perguntas + ' pergunta(s) — o mínimo é 10. Páginas que são só ' +
        'uma capa de vídeo costumam ser assim. Se for um vídeo, copie o link pelo botão ' +
        '<em>Compartilhar</em> do próprio vídeo no jw.org (ele traz as legendas). ' +
        'Ou cole o texto do material no campo abaixo.</span>'));
      formularioTexto(out, doc.url);
      return;
    }

    var L = MJB.salvarWeb(res.lesson);
    MJB.toast('Questionário e jogos gerados!', 'ok');
    MJB.confetti();
    out.appendChild(painelGerado(L));
  }

  /* ---------------- avisos ---------------- */

  function avisoDominio(r) {
    var msg, det;
    if (r.reason === 'vazio') {
      msg = 'Cole um link primeiro';
      det = 'O campo está vazio. Copie o endereço do artigo ou vídeo no jw.org e cole aqui.';
    } else if (r.reason === 'formato' || r.reason === 'protocolo') {
      msg = 'Esse texto não parece um endereço de site';
      det = 'Confira se o link começa com https:// e foi copiado inteiro.';
    } else {
      msg = 'Somente links do jw.org são aceitos';
      det = 'O endereço enviado é de “' + r.host + '”. Esta ferramenta trabalha exclusivamente com ' +
            'conteúdo do site oficial jw.org. Copie o link diretamente de jw.org e tente de novo.';
    }
    return el('div', { class: 'note note--bad' },
      '<span class="note__icon" aria-hidden="true">🚫</span>' +
      '<span><strong>' + esc(msg) + '</strong>' + esc(det) + '</span>');
  }

  function avisoLeitura(doc, url) {
    var det = doc.reason === 'http'
      ? 'O jw.org não encontrou essa página. Confira se o endereço está completo e ainda existe.'
      : doc.reason === 'rede'
        ? 'Não consegui chegar ao jw.org. Verifique sua conexão com a internet.'
        : 'Consegui abrir o endereço, mas não achei texto de artigo nele.';
    return el('div', { class: 'note note--warn' },
      '<span class="note__icon" aria-hidden="true">📡</span>' +
      '<span><strong>Não deu para ler essa página</strong>' + esc(det) +
      (doc.detail ? ' <small>(' + esc(String(doc.detail).slice(0, 120)) + ')</small>' : '') +
      '</span>');
  }

  function avisoSemServidor(erro) {
    var semServidor = String(erro && erro.message) === 'sem-servidor';
    return el('div', { class: 'note note--warn' },
      '<span class="note__icon" aria-hidden="true">🔌</span>' +
      '<span><strong>A leitura automática está desligada</strong>' +
      (semServidor
        ? 'O site está aberto sem o servidor de leitura. Feche esta janela, abra o terminal na pasta do projeto e rode <code>python servidor.py</code>. '
        : 'Não consegui falar com o servidor local. ') +
      'Enquanto isso, você pode colar o texto do material aqui embaixo — o resultado é o mesmo.</span>');
  }

  /* ---------------- colar o texto à mão ---------------- */

  function formularioTexto(out, url) {
    if (out.querySelector('[data-colar]')) {
      out.querySelector('[data-colar] textarea').focus();
      return;
    }
    var box = h('section', 'panel stack');
    box.setAttribute('data-colar', '1');
    box.innerHTML =
      '<div class="eyebrow">Sem internet? Sem problema</div>' +
      '<h2 style="font-size:1.25rem">Colar o texto do material</h2>' +
      '<p class="muted">Abra a página no jw.org, selecione o texto do artigo, copie e cole aqui. ' +
      'As perguntas saem do mesmo jeito.</p>' +
      '<div class="field"><label for="txTitulo">Título do material</label>' +
      '<input class="input" id="txTitulo" placeholder="Ex.: O incrível braço do polvo"></div>' +
      '<div class="field"><label for="txCorpo">Texto do artigo ou do vídeo</label>' +
      '<textarea class="textarea" id="txCorpo" rows="10" ' +
      'placeholder="Cole aqui os parágrafos do material..."></textarea></div>';

    var acao = h('div', 'row');
    var criar = el('button', { class: 'btn', type: 'button' }, '✨ Gerar com este texto');
    acao.appendChild(criar);
    box.appendChild(acao);
    out.appendChild(box);

    criar.addEventListener('click', function () {
      var t = box.querySelector('#txTitulo').value.trim();
      var corpo = box.querySelector('#txCorpo').value.trim();
      if (corpo.length < 400) {
        MJB.toast('Cole um texto maior — pelo menos uns 3 parágrafos.', 'bad');
        box.querySelector('#txCorpo').focus();
        return;
      }
      var res = MJB.Gerador.gerarDeTexto(t || 'Material do jw.org', corpo, url || '');
      if (!res.ok) {
        MJB.toast('Com esse texto saíram só ' + res.perguntas + ' perguntas. Cole um pouco mais.', 'bad');
        return;
      }
      var L = MJB.salvarWeb(res.lesson);
      MJB.toast('Questionário e jogos gerados!', 'ok');
      MJB.confetti();
      MJB.go('/licao/' + L.id);
    });
  }

  /* ---------------- painéis ---------------- */

  /** Prévia do que foi gerado, com atalho para cada jogo. */
  function painelGerado(L) {
    var c = MJB.content(L.id);
    var panel = h('section', 'panel stack');

    panel.innerHTML =
      '<div class="note note--ok" style="margin-bottom:4px">' +
      '<span class="note__icon" aria-hidden="true">✅</span>' +
      '<span><strong>Pronto! Material lido e transformado em jogo</strong>' +
      'Tudo abaixo saiu do texto desta página do jw.org.</span></div>' +
      '<div class="section-head"><div>' +
      '<div class="eyebrow">' + (L.kind === 'video' ? 'Vídeo do jw.org' : 'Artigo do jw.org') + '</div>' +
      '<h2>' + esc(L.title) + '</h2>' +
      '</div></div>' +
      '<div class="hero-tags">' +
      '<span class="hero-tag">🧭 ' + c.q.length + ' perguntas</span>' +
      '<span class="hero-tag">⚖️ ' + c.vf.length + ' frases V/F</span>' +
      '<span class="hero-tag">🔤 ' + c.w.length + ' palavras-chave</span>' +
      (L.verse ? '<span class="hero-tag">📖 ' + esc(L.verse) + '</span>' : '') +
      '</div>' +
      '<p class="muted">Prévia das perguntas. Você pode jogar assim ou ajustar tudo no Criador de Jogos.</p>';

    var ol = el('ol');
    ol.style.cssText = 'margin:0;padding-left:22px;display:flex;flex-direction:column;gap:7px';
    c.q.slice(0, 6).forEach(function (row) { ol.appendChild(el('li', null, esc(row[0]))); });
    if (c.q.length > 6) {
      ol.appendChild(el('li', { class: 'muted' }, 'e mais ' + (c.q.length - 6) + ' perguntas…'));
    }
    panel.appendChild(ol);

    var row = h('div', 'row');
    row.appendChild(el('a', { class: 'btn', href: '#/licao/' + L.id }, '🎲 Abrir os 7 jogos'));
    row.appendChild(el('a', { class: 'btn btn--ghost', href: '#/jogar/' + L.id + '/quiz' }, '🧭 Começar o questionário'));
    row.appendChild(el('a', { class: 'btn btn--ghost', href: '#/editor/' + L.id }, '✏️ Editar perguntas'));
    panel.appendChild(row);
    return panel;
  }

  /**
   * O link caiu numa lição dos livros já carregados. Esse banco de perguntas
   * foi conferido uma a uma, então ele vem primeiro — mas o estudante pode
   * pedir para gerar do texto da página mesmo assim.
   */
  function painelCatalogo(L, url, out, botao, input) {
    var B = MJB.BOOKS[L.book];
    var c = MJB.content(L.id);
    var panel = h('section', 'panel stack');

    panel.innerHTML =
      '<div class="note note--ok" style="margin-bottom:4px">' +
      '<span class="note__icon" aria-hidden="true">✅</span>' +
      '<span><strong>Este link é ' + esc(B.unit.toLowerCase()) + ' ' + L.n + ' de ' + esc(B.short) + '</strong>' +
      'Essa lição já está no site com as perguntas prontas e revisadas — melhores do que as que eu ' +
      'montaria na hora.</span></div>' +
      '<div class="section-head"><div>' +
      '<div class="eyebrow">Questionário pronto</div>' +
      '<h2>' + c.q.length + ' perguntas sobre “' + esc(L.title) + '”</h2>' +
      '</div></div>';

    var ol = el('ol');
    ol.style.cssText = 'margin:0;padding-left:22px;display:flex;flex-direction:column;gap:7px';
    c.q.slice(0, 5).forEach(function (row) { ol.appendChild(el('li', null, esc(row[0]))); });
    if (c.q.length > 5) {
      ol.appendChild(el('li', { class: 'muted' }, 'e mais ' + (c.q.length - 5) + ' perguntas…'));
    }
    panel.appendChild(ol);

    var row = h('div', 'row');
    row.appendChild(el('a', { class: 'btn', href: '#/licao/' + L.id }, '🎲 Abrir os 7 jogos'));
    row.appendChild(el('a', { class: 'btn btn--ghost', href: '#/jogar/' + L.id + '/quiz' }, '🧭 Começar o questionário'));
    var outro = el('button', { class: 'btn btn--ghost', type: 'button' },
      '🔁 Prefiro gerar do texto da página');
    outro.addEventListener('click', function () {
      out.innerHTML = '';
      lerEGerar(url, out, botao);
    });
    row.appendChild(outro);
    panel.appendChild(row);
    return panel;
  }

  /** Lista dos materiais que o usuário já gerou. */
  function painelMeusMateriais() {
    var sec = h('section', 'stack');
    sec.appendChild(el('div', { class: 'section-head' },
      '<div><div class="eyebrow">Já estão guardados aqui</div>' +
      '<h2>Meus materiais do jw.org (' + MJB.BY_BOOK.web.length + ')</h2></div>'));
    var grid = h('div', 'lessons');
    MJB.BY_BOOK.web.slice().reverse().forEach(function (L) {
      grid.appendChild(lessonItem(L, true));
    });
    sec.appendChild(grid);
    return sec;
  }

  /** Confirmação antes de apagar um material gerado. */
  function confirmarApagarWeb(L) {
    var box = h('div', 'stack');
    box.innerHTML =
      '<p>Apagar <strong>' + esc(L.title) + '</strong>?</p>' +
      '<p class="muted">As perguntas, os jogos e o placar deste material somem. ' +
      'Você pode colar o link de novo depois para gerar tudo outra vez.</p>';
    var row = h('div', 'row');
    var sim = el('button', { class: 'btn btn--danger', type: 'button' }, 'Apagar material');
    var nao = el('button', { class: 'btn btn--ghost', type: 'button' }, 'Cancelar');
    sim.addEventListener('click', function () {
      MJB.removerWeb(L.id);
      MJB.closeModal();
      MJB.toast('Material apagado.', 'ok');
      MJB.go('/link');
    });
    nao.addEventListener('click', function () { MJB.closeModal(); });
    row.appendChild(sim); row.appendChild(nao);
    box.appendChild(row);
    MJB.openModal('Apagar material', box);
  }

  /** Refaz as perguntas de um material gerado, lendo a página de novo. */
  MJB.regerar = function (L) {
    if (!L.source) { MJB.toast('Este material não guardou o endereço de origem.', 'bad'); return; }
    MJB.toast('Lendo a página de novo…');
    fetch(API + encodeURIComponent(L.source), { cache: 'no-store' })
      .then(function (r) { return r.json(); })
      .then(function (doc) {
        if (!doc.ok) throw new Error(doc.reason || 'leitura');
        var res = MJB.Gerador.gerar(doc);
        if (!res.ok) throw new Error('curto');
        MJB.salvarWeb(res.lesson);
        MJB.toast('Perguntas refeitas!', 'ok');
        MJB.render();
      })
      .catch(function () {
        MJB.toast('Não consegui reler agora. Confira se o servidor está rodando.', 'bad');
      });
  };

  /* =========================================================
     Estudantes (CRUD)
     ========================================================= */
  MJB.route(/^\/estudantes$/, function (main) {
    var head = h('section', 'panel panel--glass');
    head.innerHTML =
      '<div class="eyebrow">Perfis</div>' +
      '<h1 style="font-size:clamp(1.5rem,4.6vw,2.2rem);margin-top:8px">Quem estuda aqui</h1>' +
      '<p class="lead" style="margin-top:8px">Cadastre cada estudante com nome, idade, cor favorita e emoji. ' +
      'Ao escolher o perfil ativo, as cores do site, as mensagens de parabéns e o placar passam a ser dele.</p>';
    main.appendChild(head);

    var actions = h('div', 'row');
    var add = el('button', { class: 'btn', type: 'button' }, '➕ Novo estudante');
    add.addEventListener('click', function () { studentForm(null); });
    actions.appendChild(add);
    main.appendChild(actions);

    var list = MJB.students();
    if (!list.length) {
      main.appendChild(el('div', { class: 'empty' },
        '<span class="empty__emoji" aria-hidden="true">🌱</span>' +
        '<p><strong>Nenhum estudante cadastrado ainda.</strong></p>' +
        '<p>Cadastre o primeiro e o site inteiro ganha a cara dele.</p>'));
      return;
    }

    var grid = h('section', 'students');
    list.forEach(function (s) {
      var card = el('article', { class: 'student' + (s.id === MJB.state.activeId ? ' is-active' : ''),
        style: '--sc:' + s.color });
      var played = totalPlayed(s.id);
      card.innerHTML =
        (s.id === MJB.state.activeId ? '<span class="student__badge">Ativo</span>' : '') +
        '<span class="student__av" aria-hidden="true">' + esc(s.emoji) + '</span>' +
        '<h3 class="student__name">' + esc(s.name) + '</h3>' +
        '<p class="student__meta">' + esc(bandLabel(s)) + ' · ' + played + ' jogo(s) concluído(s)</p>';
      var acts = h('div', 'student__acts');

      if (s.id !== MJB.state.activeId) {
        var use = el('button', { class: 'btn btn--sm', type: 'button' }, 'Usar perfil');
        use.addEventListener('click', function () {
          MJB.setActive(s.id);
          MJB.toast('Agora é a vez de ' + s.name + '! ' + s.emoji, 'ok');
          MJB.render();
        });
        acts.appendChild(use);
      }
      var ed = el('button', { class: 'btn btn--ghost btn--sm', type: 'button' }, 'Editar');
      ed.addEventListener('click', function () { studentForm(s); });
      acts.appendChild(ed);

      var rm = el('button', { class: 'btn btn--ghost btn--sm', type: 'button' }, 'Excluir');
      rm.addEventListener('click', function () { confirmRemove(s); });
      acts.appendChild(rm);

      card.appendChild(acts);
      grid.appendChild(card);
    });
    main.appendChild(grid);
  });

  function totalPlayed(sid) {
    var p = MJB.state.progress[sid] || {};
    var n = 0;
    Object.keys(p).forEach(function (k) { n += Object.keys(p[k]).length; });
    return n;
  }

  function studentForm(existing) {
    var data = existing
      ? { name: existing.name, age: existing.age, band: existing.band, color: existing.color, emoji: existing.emoji }
      : { name: '', age: '', band: 'kids', color: MJB.COLORS[0].hex, emoji: MJB.EMOJIS[0] };

    var box = h('div', 'stack');
    box.innerHTML =
      '<div class="field"><label for="stName">Nome do estudante</label>' +
      '<input class="input" id="stName" type="text" maxlength="28" value="' + esc(data.name) + '" placeholder="Ex.: Ana"></div>' +
      '<div class="row">' +
      '<div class="field grow"><label for="stAge">Idade</label>' +
      '<input class="input" id="stAge" type="number" min="3" max="25" value="' + (data.age === null ? '' : esc(data.age)) + '" placeholder="Ex.: 9"></div>' +
      '<div class="field grow"><label for="stBand">Faixa etária</label>' +
      '<select class="select" id="stBand">' +
      '<option value="kids"' + (data.band === 'kids' ? ' selected' : '') + '>Kids (até 11 anos)</option>' +
      '<option value="teens"' + (data.band === 'teens' ? ' selected' : '') + '>Teens (12 anos ou mais)</option>' +
      '</select></div>' +
      '</div>' +
      '<div class="field"><label>Cor favorita</label><div class="swatches" id="stColors"></div></div>' +
      '<div class="field"><label>Emoji do estudante</label><div class="emoji-pick" id="stEmojis"></div></div>';

    var colorBox = box.querySelector('#stColors');
    MJB.COLORS.forEach(function (col) {
      var b = el('button', { class: 'swatch', type: 'button', title: col.name,
        'aria-label': col.name, 'aria-pressed': data.color === col.hex ? 'true' : 'false',
        style: 'background:' + col.hex });
      b.addEventListener('click', function () {
        data.color = col.hex;
        colorBox.querySelectorAll('.swatch').forEach(function (x) { x.setAttribute('aria-pressed', 'false'); });
        b.setAttribute('aria-pressed', 'true');
      });
      colorBox.appendChild(b);
    });

    var emojiBox = box.querySelector('#stEmojis');
    MJB.EMOJIS.forEach(function (e) {
      var b = el('button', { class: 'emoji-opt', type: 'button', 'aria-label': 'Emoji ' + e,
        'aria-pressed': data.emoji === e ? 'true' : 'false' }, e);
      b.addEventListener('click', function () {
        data.emoji = e;
        emojiBox.querySelectorAll('.emoji-opt').forEach(function (x) { x.setAttribute('aria-pressed', 'false'); });
        b.setAttribute('aria-pressed', 'true');
      });
      emojiBox.appendChild(b);
    });

    var row = h('div', 'row');
    var save = el('button', { class: 'btn', type: 'button' }, existing ? 'Salvar alterações' : 'Cadastrar');
    save.addEventListener('click', function () {
      var name = box.querySelector('#stName').value.trim();
      if (!name) {
        MJB.toast('Escreva o nome do estudante.', 'bad');
        box.querySelector('#stName').focus();
        return;
      }
      var payload = {
        name: name,
        age: box.querySelector('#stAge').value,
        band: box.querySelector('#stBand').value,
        color: data.color,
        emoji: data.emoji
      };
      if (existing) { MJB.updateStudent(existing.id, payload); MJB.toast('Perfil atualizado.', 'ok'); }
      else {
        var s = MJB.addStudent(payload);
        MJB.setActive(s.id);
        MJB.toast('Bem-vindo(a), ' + s.name + '! ' + s.emoji, 'ok');
        MJB.confetti(s.color);
      }
      MJB.closeModal();
      MJB.render();
    });
    row.appendChild(save);
    var cancel = el('button', { class: 'btn btn--ghost', type: 'button' }, 'Cancelar');
    cancel.addEventListener('click', MJB.closeModal);
    row.appendChild(cancel);
    box.appendChild(row);

    MJB.openModal(existing ? 'Editar ' + existing.name : 'Novo estudante', box);
  }

  function confirmRemove(s) {
    var box = h('div', 'stack');
    box.innerHTML = '<p>Quer mesmo excluir o perfil de <strong>' + esc(s.name) + '</strong>? ' +
      'O placar e as estrelas desse estudante também serão apagados deste aparelho.</p>';
    var row = h('div', 'row');
    var yes = el('button', { class: 'btn btn--danger', type: 'button' }, 'Excluir perfil');
    yes.addEventListener('click', function () {
      MJB.removeStudent(s.id);
      MJB.closeModal();
      MJB.toast('Perfil excluído.');
      MJB.render();
    });
    var no = el('button', { class: 'btn btn--ghost', type: 'button' }, 'Cancelar');
    no.addEventListener('click', MJB.closeModal);
    row.appendChild(yes); row.appendChild(no);
    box.appendChild(row);
    MJB.openModal('Excluir estudante', box);
  }

  /* =========================================================
     Criador de Jogos (editor)
     ========================================================= */
  var EDIT_PARTS = [
    { id: 'q', name: '🧭 Questionário' },
    { id: 'vf', name: '⚖️ Verdadeiro ou Falso' },
    { id: 'w', name: '🔤 Palavras (forca e caça)' },
    { id: 'd', name: '✏️ Dissertativas' },
    { id: 'pop', name: '🎈 Balões' },
    { id: 'mem', name: '🧠 Memória' }
  ];

  MJB.route(/^\/editor\/([a-z]+-\d+)$/, function (main, m) {
    var L = MJB.getLesson(m[1]);
    if (!L) return notFound(main);
    var B = MJB.BOOKS[L.book];

    main.appendChild(breadcrumb([
      { label: B.short, href: '#/livro/' + L.book },
      { label: B.unit + ' ' + L.n, href: '#/licao/' + L.id },
      { label: 'Criador de Jogos' }
    ]));

    var head = h('section', 'panel panel--glass');
    head.innerHTML =
      '<div class="eyebrow">Criador de Jogos · ' + esc(B.unit) + ' ' + L.n + '</div>' +
      '<h1 style="font-size:clamp(1.4rem,4.4vw,2rem);margin-top:8px">' + esc(L.title) + '</h1>' +
      '<p class="lead" style="margin-top:8px">Edite as perguntas, as palavras e os pares antes de jogar. ' +
      'As mudanças ficam salvas neste aparelho e valem só para esta lição.</p>';
    main.appendChild(head);

    var tabs = h('section', 'editor-tabs');
    main.appendChild(tabs);
    var panel = h('section', 'panel stack');
    main.appendChild(panel);

    var current = 'q';
    EDIT_PARTS.forEach(function (p) {
      var b = el('button', { class: 'etab', type: 'button', 'aria-pressed': p.id === current ? 'true' : 'false' }, p.name);
      b.addEventListener('click', function () {
        current = p.id;
        tabs.querySelectorAll('.etab').forEach(function (x) { x.setAttribute('aria-pressed', 'false'); });
        b.setAttribute('aria-pressed', 'true');
        paint();
      });
      tabs.appendChild(b);
    });

    function currentRows() {
      var c = MJB.content(L.id);
      if (current === 'pop') return (c.pop || MJB.balloonRounds(c).map(function (r) {
        return [r.q, r.right].concat(r.wrong);
      })).map(function (r) { return r.slice(); });
      if (current === 'mem') return (c.mem || MJB.memoryPairs(c)).map(function (p) {
        return [faceValue(p[0]), faceValue(p[1]), faceKind(p[0]), faceKind(p[1])];
      });
      return (c[current] || []).map(function (r) { return r.slice(); });
    }
    function faceValue(f) { return f && typeof f === 'object' ? f.v : f; }
    function faceKind(f) { return f && typeof f === 'object' && f.kind === 'img' ? 'img' : 'text'; }

    function paint() {
      panel.innerHTML = '';
      var rows = currentRows();

      var info = {
        q: 'Cada pergunta tem uma resposta certa (marcada) e as demais alternativas. Serve para o Questionário e para os Balões.',
        vf: 'Escreva a frase e marque se ela é verdadeira ou falsa. O comentário aparece depois da resposta.',
        w: 'Palavras-chave da lição e a dica de cada uma. Usadas no Jogo da Forca e no Caça-Palavras.',
        d: 'Perguntas abertas. Liste os pontos que a resposta deve tocar, separados por “|”.',
        pop: 'Balões personalizados. Cole emojis ou textos curtos nas alternativas — eles aparecem dentro do balão.',
        mem: 'Pares do Jogo da Memória. Cada linha vira duas cartas. Escolha texto ou imagem em cada carta.'
      }[current];

      panel.appendChild(el('div', { class: 'note' },
        '<span class="note__icon" aria-hidden="true">💡</span><span>' + esc(info) + '</span>'));

      var listEl = h('div', 'stack');
      panel.appendChild(listEl);
      rows.forEach(function (row, idx) { listEl.appendChild(rowEditor(row, idx, rows, listEl)); });

      var row = h('div', 'row');
      var add = el('button', { class: 'btn btn--ghost', type: 'button' }, '➕ Adicionar item');
      add.addEventListener('click', function () {
        rows.push(blankRow());
        listEl.appendChild(rowEditor(rows[rows.length - 1], rows.length - 1, rows, listEl));
      });
      var save = el('button', { class: 'btn', type: 'button' }, '💾 Salvar para esta lição');
      save.addEventListener('click', function () {
        var clean = collect(rows);
        if (!clean.length) { MJB.toast('Adicione pelo menos um item.', 'bad'); return; }
        MJB.saveCustom(L.id, current, clean);
        MJB.toast('Conteúdo salvo para esta lição.', 'ok');
        paint();
      });
      var reset = el('button', { class: 'btn btn--ghost', type: 'button' }, '↺ Restaurar original');
      reset.addEventListener('click', function () {
        MJB.resetCustom(L.id, current);
        MJB.toast('Conteúdo original restaurado.');
        paint();
      });
      row.appendChild(save); row.appendChild(add); row.appendChild(reset);
      row.appendChild(el('a', { class: 'btn btn--ghost', href: '#/licao/' + L.id }, 'Voltar para a lição'));
      panel.appendChild(row);
    }

    function blankRow() {
      if (current === 'q' || current === 'pop') return ['', '', '', '', ''];
      if (current === 'vf') return ['', 1, ''];
      if (current === 'w') return ['', ''];
      if (current === 'd') return ['', ''];
      if (current === 'mem') return ['', '', 'text', 'text'];
      return ['', ''];
    }

    function collect(rows) {
      var out = [];
      rows.forEach(function (r) {
        if (current === 'q' || current === 'pop') {
          if (!String(r[0]).trim() || !String(r[1]).trim()) return;
          out.push([r[0].trim(), r[1].trim()].concat(r.slice(2).map(function (x) {
            return String(x || '').trim();
          }).filter(Boolean)));
        } else if (current === 'vf') {
          if (!String(r[0]).trim()) return;
          out.push([r[0].trim(), r[1] ? 1 : 0, String(r[2] || '').trim()]);
        } else if (current === 'w') {
          if (!String(r[0]).trim()) return;
          out.push([r[0].trim(), String(r[1] || '').trim()]);
        } else if (current === 'd') {
          if (!String(r[0]).trim()) return;
          out.push([r[0].trim(), String(r[1] || '').trim()]);
        } else if (current === 'mem') {
          if (!String(r[0]).trim() || !String(r[1]).trim()) return;
          out.push([
            { kind: r[2] || 'text', v: String(r[0]).trim() },
            { kind: r[3] || 'text', v: String(r[1]).trim() }
          ]);
        }
      });
      return out;
    }

    function rowEditor(row, idx, rows, listEl) {
      var box = h('div', 'erow');
      var head = h('div', 'erow__head');
      head.innerHTML = '<span class="erow__n">' + (idx + 1) + '</span>';
      var del = el('button', { class: 'btn btn--ghost btn--sm', type: 'button', style: 'margin-left:auto' }, '🗑 Remover');
      del.addEventListener('click', function () {
        var i = rows.indexOf(row);
        if (i > -1) rows.splice(i, 1);
        box.remove();
        renumber(listEl);
      });
      head.appendChild(del);
      box.appendChild(head);

      function bind(node, i, transform) {
        node.addEventListener('input', function () {
          row[i] = transform ? transform(node.value) : node.value;
        });
      }

      if (current === 'q' || current === 'pop') {
        var qi = el('input', { class: 'input', type: 'text', value: row[0] || '',
          placeholder: 'Pergunta ou instrução' });
        bind(qi, 0);
        box.appendChild(qi);
        var opts = h('div', 'stack');
        for (var k = 1; k <= 4; k++) {
          (function (k) {
            var line = h('div', 'opt-line');
            var radio = el('input', { type: 'radio', name: 'right' + idx + current, 'aria-label': 'Resposta certa' });
            radio.checked = (k === 1);
            var inp = el('input', { class: 'input', type: 'text', value: row[k] || '',
              placeholder: k === 1 ? 'Resposta CERTA' : 'Alternativa errada ' + (k - 1) });
            radio.addEventListener('change', function () {
              // troca a alternativa marcada para a posição 1 (a correta)
              var tmp = row[1]; row[1] = row[k]; row[k] = tmp;
              paintRowInputs();
            });
            inp.addEventListener('input', function () { row[k] = inp.value; });
            line.appendChild(radio); line.appendChild(inp);
            opts.appendChild(line);
          })(k);
        }
        function paintRowInputs() {
          var inputs = opts.querySelectorAll('input[type="text"]');
          for (var k = 0; k < inputs.length; k++) inputs[k].value = row[k + 1] || '';
          var radios = opts.querySelectorAll('input[type="radio"]');
          for (var j = 0; j < radios.length; j++) radios[j].checked = (j === 0);
        }
        box.appendChild(opts);

      } else if (current === 'vf') {
        var fi = el('input', { class: 'input', type: 'text', value: row[0] || '', placeholder: 'Frase' });
        bind(fi, 0);
        box.appendChild(fi);
        var g = h('div', 'erow__grid');
        var sel = el('select', { class: 'select' },
          '<option value="1">Verdadeiro</option><option value="0">Falso</option>');
        sel.value = row[1] ? '1' : '0';
        sel.addEventListener('change', function () { row[1] = sel.value === '1' ? 1 : 0; });
        var comm = el('input', { class: 'input', type: 'text', value: row[2] || '',
          placeholder: 'Comentário depois da resposta (opcional)' });
        bind(comm, 2);
        g.appendChild(sel); g.appendChild(comm);
        box.appendChild(g);

      } else if (current === 'w') {
        var g2 = h('div', 'erow__grid');
        var wi = el('input', { class: 'input', type: 'text', value: row[0] || '', placeholder: 'PALAVRA' });
        var ci = el('input', { class: 'input', type: 'text', value: row[1] || '', placeholder: 'Dica da palavra' });
        bind(wi, 0); bind(ci, 1);
        g2.appendChild(wi); g2.appendChild(ci);
        box.appendChild(g2);

      } else if (current === 'd') {
        var di = el('input', { class: 'input', type: 'text', value: row[0] || '', placeholder: 'Pergunta aberta' });
        var ki = el('input', { class: 'input', type: 'text', value: row[1] || '',
          placeholder: 'Pontos esperados separados por | (ex.: obedecer | confiar em Jeová)' });
        bind(di, 0); bind(ki, 1);
        box.appendChild(di); box.appendChild(ki);

      } else if (current === 'mem') {
        var g3 = h('div', 'erow__grid');
        [0, 1].forEach(function (side) {
          var col = h('div', 'stack');
          var kindSel = el('select', { class: 'select' },
            '<option value="text">Texto</option><option value="img">Imagem</option>');
          kindSel.value = row[side + 2] || 'text';
          var vi = el('input', { class: 'input', type: 'text', value: row[side] || '',
            placeholder: side === 0 ? 'Carta A (texto, emoji ou link da imagem)' : 'Carta B (texto, emoji ou link da imagem)' });
          vi.addEventListener('input', function () { row[side] = vi.value; });
          kindSel.addEventListener('change', function () { row[side + 2] = kindSel.value; });

          var file = el('input', { type: 'file', accept: 'image/*', style: 'font-size:.8rem' });
          file.addEventListener('change', function () {
            var f = file.files && file.files[0];
            if (!f) return;
            if (f.size > 900000) { MJB.toast('Escolha uma imagem menor que 900 KB.', 'bad'); return; }
            var reader = new FileReader();
            reader.onload = function () {
              row[side] = reader.result;
              row[side + 2] = 'img';
              kindSel.value = 'img';
              vi.value = '(imagem carregada)';
              MJB.toast('Imagem adicionada à carta.', 'ok');
            };
            reader.readAsDataURL(f);
          });

          col.appendChild(kindSel); col.appendChild(vi); col.appendChild(file);
          g3.appendChild(col);
        });
        box.appendChild(g3);
      }

      return box;
    }

    function renumber(listEl) {
      var ns = listEl.querySelectorAll('.erow__n');
      for (var k = 0; k < ns.length; k++) ns[k].textContent = String(k + 1);
    }

    paint();
  });

  /* =========================================================
     404
     ========================================================= */
  function notFound(main) {
    main.appendChild(el('div', { class: 'empty' },
      '<span class="empty__emoji" aria-hidden="true">🧭</span>' +
      '<p><strong>Não encontrei essa página.</strong></p>' +
      '<p style="margin-top:12px"><a class="btn" href="#/biblioteca">Voltar para a biblioteca</a></p>'));
  }
  MJB.route(/^\/.*/, function (main) { notFound(main); });

  /* ---------------- start ---------------- */
  MJB.boot();

})(window);
