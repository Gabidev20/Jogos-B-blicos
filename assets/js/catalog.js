/* ===========================================================
   catalog.js — catálogo dos livros, índice de lições,
   validação de links do jw.org e resolução de conteúdo.
   =========================================================== */
(function (global) {
  'use strict';

  var MJB = global.MJB;

  /* ---------------- livros ---------------- */

  var BOOKS = {
    lfb: {
      id: 'lfb',
      title: 'Aprenda com as Histórias da Bíblia',
      short: 'Histórias da Bíblia',
      sym: 'lfb',
      unit: 'História',
      unitPlural: 'histórias',
      total: 103,
      color: '#2F4BD8',
      emoji: '📖',
      band: 'Kids',
      blurb: 'A história da humanidade, da criação ao Paraíso, contada em 103 histórias curtas — feita pensando nas crianças.',
      sections: [
        { n: 1, t: 'Criação', from: 1, to: 2 },
        { n: 2, t: 'De Adão até o Dilúvio', from: 3, to: 6 },
        { n: 3, t: 'Do Dilúvio até Jacó', from: 7, to: 13 },
        { n: 4, t: 'De José até o Mar Vermelho', from: 14, to: 22 },
        { n: 5, t: 'No deserto', from: 23, to: 28 },
        { n: 6, t: 'Os juízes', from: 29, to: 38 },
        { n: 7, t: 'Davi e Saul', from: 39, to: 43 },
        { n: 8, t: 'De Salomão até Elias', from: 44, to: 50 },
        { n: 9, t: 'De Eliseu até Josias', from: 51, to: 56 },
        { n: 10, t: 'De Jeremias até Neemias', from: 57, to: 67 },
        { n: 11, t: 'João Batista e Jesus', from: 68, to: 73 },
        { n: 12, t: 'A pregação de Jesus', from: 74, to: 86 },
        { n: 13, t: 'A última semana de Jesus na Terra', from: 87, to: 93 },
        { n: 14, t: 'O número de cristãos aumenta', from: 94, to: 103 }
      ]
    },
    lff: {
      id: 'lff',
      title: 'Seja Feliz para Sempre! — Um Curso da Bíblia para Você',
      short: 'Seja Feliz para Sempre!',
      sym: 'lff',
      unit: 'Lição',
      unitPlural: 'lições',
      total: 60,
      color: '#12A47A',
      emoji: '🌳',
      band: 'Teens',
      blurb: 'Um curso em 60 lições, dividido em 4 partes, que responde as grandes perguntas da vida usando a Bíblia.',
      sections: [
        { n: 1, t: 'Parte 1 — Conheça a Bíblia e o Autor dela', from: 1, to: 12 },
        { n: 2, t: 'Parte 2 — O que Deus fez por nós', from: 13, to: 33 },
        { n: 3, t: 'Parte 3 — O que Deus espera de quem serve a ele', from: 34, to: 47 },
        { n: 4, t: 'Parte 4 — Continue amando a Deus', from: 48, to: 60 }
      ]
    }
  };

  /* Livro virtual: guarda o que o usuário gerou colando um link do jw.org. */
  BOOKS.web = {
    id: 'web',
    title: 'Meus materiais do jw.org',
    short: 'Materiais do link',
    sym: 'link',
    unit: 'Material',
    unitPlural: 'materiais',
    total: 0,
    color: '#F2762E',
    emoji: '🔗',
    band: 'Kids e Teens',
    blurb: 'Artigos e vídeos do jw.org que você colou aqui. Cada um virou questionário e jogos.',
    sections: [{ n: 1, t: 'Gerados a partir de um link', from: 1, to: 99999 }]
  };
  MJB.BOOKS = BOOKS;

  /* ---------------- índice de lições ---------------- */

  var LESSONS = {};   // id -> lição
  var BY_BOOK = { lfb: [], lff: [], web: [] };
  MJB.LESSONS = LESSONS;
  MJB.BY_BOOK = BY_BOOK;

  function sectionOf(bookId, n) {
    var secs = BOOKS[bookId].sections;
    for (var i = 0; i < secs.length; i++) {
      if (n >= secs[i].from && n <= secs[i].to) return secs[i];
    }
    return secs[0];
  }
  MJB.sectionOf = sectionOf;

  /**
   * Registra um bloco de lições. Cada lição usa a forma compacta:
   *   { n, t, v, s, q:[[pergunta, correta, err, err, err]], vf:[[frase, 1|0]],
   *     w:[[PALAVRA, dica]], d:[[pergunta, "chave1|chave2|chave3"]] }
   */
  function registerLessons(bookId, list) {
    if (!BOOKS[bookId]) return;
    list.forEach(function (raw) {
      var id = bookId + '-' + raw.n;
      var sec = sectionOf(bookId, raw.n);
      var lesson = {
        id: id,
        book: bookId,
        n: raw.n,
        title: raw.t,
        verse: raw.v || '',
        summary: raw.s || '',
        section: sec.t,
        slug: MJB.slug(raw.t),
        q: raw.q || [],
        vf: raw.vf || [],
        w: raw.w || [],
        d: raw.d || [],
        pop: raw.pop || null,
        mem: raw.mem || null,
        source: raw.source || '',
        kind: raw.kind || '',
        createdAt: raw.createdAt || 0
      };
      LESSONS[id] = lesson;
      BY_BOOK[bookId].push(lesson);
    });
    BY_BOOK[bookId].sort(function (a, b) { return a.n - b.n; });
  }
  MJB.registerLessons = registerLessons;

  function getLesson(id) { return LESSONS[id] || null; }
  MJB.getLesson = getLesson;

  /* ---------------- materiais gerados a partir de um link ---------------- */

  /** Põe no catálogo tudo que já foi gerado em outras visitas. */
  function carregarWeb() {
    var salvos = MJB.state.web || [];
    if (!salvos.length) return;
    registerLessons('web', salvos);
  }
  MJB.carregarWeb = carregarWeb;

  /**
   * Guarda um material gerado e devolve a lição pronta para jogar.
   * O `id` (web-1, web-2, ...) amarra o material aos seus jogos, do mesmo
   * jeito que acontece com as lições dos livros.
   */
  function salvarWeb(gerado) {
    var salvos = MJB.state.web || (MJB.state.web = []);

    // mesmo endereço colado de novo: atualiza em vez de duplicar
    var existente = null;
    if (gerado.source) {
      existente = salvos.filter(function (x) { return x.source === gerado.source; })[0] || null;
    }

    var n = existente ? existente.n : proximoN(salvos);
    var bruto = {
      n: n,
      t: gerado.t, v: gerado.v, s: gerado.s,
      q: gerado.q, vf: gerado.vf, w: gerado.w, d: gerado.d,
      pop: gerado.pop || null, mem: gerado.mem || null,
      source: gerado.source || '', kind: gerado.kind || 'artigo',
      createdAt: Date.now()
    };

    if (existente) {
      salvos[salvos.indexOf(existente)] = bruto;
      var antiga = LESSONS['web-' + n];
      if (antiga) BY_BOOK.web.splice(BY_BOOK.web.indexOf(antiga), 1);
      delete LESSONS['web-' + n];
      resetCustom('web-' + n);
    } else {
      salvos.push(bruto);
    }

    registerLessons('web', [bruto]);
    MJB.save();
    return LESSONS['web-' + n];
  }
  MJB.salvarWeb = salvarWeb;

  function proximoN(salvos) {
    var max = 0;
    salvos.forEach(function (x) { if (x.n > max) max = x.n; });
    return max + 1;
  }

  function removerWeb(id) {
    var L = LESSONS[id];
    if (!L || L.book !== 'web') return;
    MJB.state.web = (MJB.state.web || []).filter(function (x) { return x.n !== L.n; });
    BY_BOOK.web.splice(BY_BOOK.web.indexOf(L), 1);
    delete LESSONS[id];
    resetCustom(id);
    MJB.save();
  }
  MJB.removerWeb = removerWeb;

  /** Material já gerado a partir exatamente deste endereço. */
  function webPorFonte(url) {
    for (var i = 0; i < BY_BOOK.web.length; i++) {
      if (BY_BOOK.web[i].source === url) return BY_BOOK.web[i];
    }
    return null;
  }
  MJB.webPorFonte = webPorFonte;

  /* ---------------- links oficiais ---------------- */

  function bookUrl(bookId) {
    return 'https://www.jw.org/finder?wtlocale=T&pub=' + BOOKS[bookId].sym + '&srcid=share';
  }
  MJB.bookUrl = bookUrl;

  function lessonUrl(lesson) {
    if (lesson.source) return lesson.source;
    var b = BOOKS[lesson.book];
    return 'https://www.jw.org/pt/busca/?q=' +
      encodeURIComponent(lesson.title + ' ' + b.short) + '&p=par';
  }
  MJB.lessonUrl = lessonUrl;

  /* ---------------- validação de link ---------------- */

  var STOP = ('de da do das dos a o as os e em no na nos nas um uma para por que com ' +
    'pt pub biblioteca livros publicacoes wol lp t r5 html htm finder busca docid ' +
    'jw org www https http index licao licoes seja json srcid share wtlocale par').split(' ');

  /**
   * Verifica se a URL é do domínio oficial jw.org.
   * Retorna { ok, reason, url, host }.
   */
  function checkUrl(input) {
    var raw = String(input || '').trim();
    if (!raw) return { ok: false, reason: 'vazio' };

    var withProto = /^[a-z][a-z0-9+.-]*:\/\//i.test(raw) ? raw : 'https://' + raw;
    var u;
    try { u = new URL(withProto); }
    catch (e) { return { ok: false, reason: 'formato', raw: raw }; }

    if (u.protocol !== 'http:' && u.protocol !== 'https:') {
      return { ok: false, reason: 'protocolo', raw: raw };
    }

    var host = u.hostname.toLowerCase().replace(/^www\./, '');
    var isJw = host === 'jw.org' || /\.jw\.org$/.test(u.hostname.toLowerCase());
    if (!isJw) return { ok: false, reason: 'dominio', host: u.hostname, raw: raw };

    return { ok: true, url: u.href, host: u.hostname };
  }
  MJB.checkUrl = checkUrl;

  /**
   * Tenta descobrir qual lição do catálogo corresponde a uma URL do jw.org.
   * Retorna { lesson, score, candidates:[...] }.
   */
  function matchUrl(href) {
    var u;
    try { u = new URL(href); } catch (e) { return { lesson: null, candidates: [] }; }

    var text = decodeURIComponent(u.pathname + ' ' + u.search).toLowerCase();
    var folded = MJB.fold(text);
    var tokens = folded.split(/[^a-z0-9]+/).filter(function (t) {
      return t && t.length > 2 && STOP.indexOf(t) === -1;
    });

    // pistas explícitas: símbolo da publicação e número da lição
    var bookHint = /\blfb\b|aprenda[a-z-]*histor|historias-da-biblia/.test(folded) ? 'lfb'
      : (/\blff\b|seja[a-z-]*feliz|feliz-para-sempre|curso-da-biblia/.test(folded) ? 'lff' : null);

    var numHint = null;
    var nm = folded.match(/licao[^0-9]{0,3}(\d{1,3})/) || folded.match(/\/(\d{1,3})\/(?=[a-z])/) ||
             folded.match(/historia[^0-9]{0,3}(\d{1,3})/);
    if (nm) numHint = parseInt(nm[1], 10);

    var scored = [];
    Object.keys(LESSONS).forEach(function (id) {
      var L = LESSONS[id];
      if (L.book === 'web') return;      // material gerado casa por endereço exato
      var titleTokens = MJB.fold(L.title).split(/[^a-z0-9]+/).filter(function (t) {
        return t && t.length > 2 && STOP.indexOf(t) === -1;
      });
      var hits = 0;
      titleTokens.forEach(function (t) { if (tokens.indexOf(t) !== -1) hits++; });
      var score = titleTokens.length ? (hits / titleTokens.length) * 10 : 0;
      if (bookHint === L.book) score += 2.5;
      if (bookHint && bookHint !== L.book) score -= 2.5;
      if (numHint !== null && numHint === L.n) score += bookHint ? 6 : 3;
      if (hits === 0 && numHint !== L.n) score -= 3;
      scored.push({ lesson: L, score: score, hits: hits });
    });

    scored.sort(function (a, b) { return b.score - a.score; });
    var top = scored[0];
    var confident = top && top.score >= 7;

    return {
      lesson: confident ? top.lesson : null,
      score: top ? Math.round(top.score * 10) / 10 : 0,
      candidates: scored.slice(0, 6).filter(function (s) { return s.score > 1.2; })
        .map(function (s) { return s.lesson; })
    };
  }
  MJB.matchUrl = matchUrl;

  /**
   * Busca livre no catálogo (usada pela biblioteca e pelo modo "tema livre").
   */
  function searchLessons(term, bookId) {
    var f = MJB.fold(term).trim();
    var pool = bookId ? (BY_BOOK[bookId] || []) : BY_BOOK.lfb.concat(BY_BOOK.lff, BY_BOOK.web);
    if (!f) return pool;
    var words = f.split(/\s+/).filter(Boolean);
    return pool.filter(function (L) {
      var hay = MJB.fold(L.title + ' ' + L.section + ' ' + L.summary + ' ' + L.n + ' ' +
        L.w.map(function (x) { return x[0] + ' ' + x[1]; }).join(' '));
      return words.every(function (w) { return hay.indexOf(w) !== -1; });
    });
  }
  MJB.searchLessons = searchLessons;

  /* ---------------- conteúdo resolvido (original + edições) ---------------- */

  /** Devolve o conteúdo efetivo da lição, aplicando as edições salvas pelo usuário. */
  function content(lessonId) {
    var L = LESSONS[lessonId];
    if (!L) return null;
    var c = MJB.state.custom[lessonId] || {};
    return {
      lesson: L,
      q: c.q || L.q,
      vf: c.vf || L.vf,
      w: c.w || L.w,
      d: c.d || L.d,
      pop: c.pop || L.pop || null,
      mem: c.mem || L.mem || null
    };
  }
  MJB.content = content;

  function isEdited(lessonId) {
    var c = MJB.state.custom[lessonId];
    return !!(c && Object.keys(c).length);
  }
  MJB.isEdited = isEdited;

  function saveCustom(lessonId, part, value) {
    if (!MJB.state.custom[lessonId]) MJB.state.custom[lessonId] = {};
    MJB.state.custom[lessonId][part] = value;
    MJB.save();
  }
  MJB.saveCustom = saveCustom;

  function resetCustom(lessonId, part) {
    if (!MJB.state.custom[lessonId]) return;
    if (part) delete MJB.state.custom[lessonId][part];
    else delete MJB.state.custom[lessonId];
    if (MJB.state.custom[lessonId] && !Object.keys(MJB.state.custom[lessonId]).length) {
      delete MJB.state.custom[lessonId];
    }
    MJB.save();
  }
  MJB.resetCustom = resetCustom;

  /* ---------------- material derivado para os jogos ---------------- */

  /** Palavras prontas para o caça-palavras: maiúsculas, sem acento e sem espaços. */
  function gridWord(w) {
    return MJB.fold(w).toUpperCase().replace(/[^A-Z]/g, '');
  }
  MJB.gridWord = gridWord;

  /** Pares do jogo da memória: usa os pares personalizados ou monta palavra + dica. */
  function memoryPairs(c) {
    if (c.mem && c.mem.length) return c.mem;
    return c.w.map(function (item) {
      return [{ kind: 'text', v: item[0] }, { kind: 'text', v: item[1] }];
    });
  }
  MJB.memoryPairs = memoryPairs;

  /** Rodadas do estoura-balão: usa os balões personalizados ou deriva do quiz. */
  function balloonRounds(c) {
    if (c.pop && c.pop.length) {
      return c.pop.map(function (row) {
        return { q: row[0], right: row[1], wrong: row.slice(2).filter(Boolean) };
      });
    }
    return c.q.map(function (row) {
      return { q: row[0], right: row[1], wrong: row.slice(2).filter(Boolean) };
    });
  }
  MJB.balloonRounds = balloonRounds;

  /* ---------------- definição dos jogos ---------------- */

  var GAMES = [
    { id: 'quiz', name: 'Questionário', emoji: '🧭', color: '#2F4BD8',
      desc: 'Perguntas de múltipla escolha sobre a lição, com correção na hora.' },
    { id: 'vf', name: 'Verdadeiro ou Falso', emoji: '⚖️', color: '#12AFC9',
      desc: 'Frases rápidas para decidir se estão certas ou erradas.' },
    { id: 'balao', name: 'Estourar Balão', emoji: '🎈', color: '#E5468E',
      desc: 'Estoure o balão que traz a resposta certa antes que ele suba.' },
    { id: 'forca', name: 'Jogo da Forca', emoji: '🧩', color: '#8257E6',
      desc: 'Descubra a palavra da lição pelas dicas, letra por letra.' },
    { id: 'memoria', name: 'Jogo da Memória', emoji: '🧠', color: '#12A47A',
      desc: 'Encontre os pares de palavras, textos e imagens da lição.' },
    { id: 'caca', name: 'Caça-Palavras', emoji: '🔍', color: '#F2762E',
      desc: 'Ache as palavras-chave escondidas no quadro de letras.' },
    { id: 'escrita', name: 'Perguntas Dissertativas', emoji: '✏️', color: '#E8A600',
      desc: 'Escreva a resposta com suas palavras e receba um retorno na hora.' }
  ];
  MJB.GAMES = GAMES;

  function game(id) {
    for (var i = 0; i < GAMES.length; i++) if (GAMES[i].id === id) return GAMES[i];
    return null;
  }
  MJB.game = game;

  /** Quantos itens cada jogo tem nesta lição (0 = indisponível). */
  function gameSize(c, gameId) {
    switch (gameId) {
      case 'quiz': return c.q.length;
      case 'vf': return c.vf.length;
      case 'balao': return balloonRounds(c).length;
      case 'forca': return c.w.length;
      case 'memoria': return memoryPairs(c).length;
      case 'caca': return c.w.filter(function (x) { return gridWord(x[0]).length >= 3; }).length;
      case 'escrita': return c.d.length;
    }
    return 0;
  }
  MJB.gameSize = gameSize;

})(window);
