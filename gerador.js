/* ===========================================================
   gerador.js — monta perguntas e jogos a partir do texto de
   qualquer artigo ou vídeo do jw.org.

   Entra:  { title, subtitle, kind, url, blocks:[{tag,text}] }
   Sai:    { ok, lesson:{ t, v, s, q, vf, w, d, pop } }

   Tudo acontece no próprio navegador, em cima do texto que o
   servidor local leu da página. Nenhuma pergunta é inventada:
   toda alternativa correta é uma palavra ou trecho que está
   mesmo no material.
   =========================================================== */
(function (global) {
  'use strict';

  var MJB = global.MJB;
  var fold = MJB.fold;
  var shuffle = MJB.shuffle;

  /* =========================================================
     listas de apoio
     ========================================================= */

  var STOP = ('a as o os um uma uns umas de do da dos das em no na nos nas por pelo pela ' +
    'pelos pelas para com sem sob sobre entre ate apos desde contra ao aos num numa dum duma ' +
    'e ou mas porem contudo todavia entao assim logo pois porque porquanto embora ' +
    'que quem qual quais quando onde como quanto cujo cuja quais ' +
    'ele ela eles elas eu tu voce voces nos vos me te se lhe lhes mim ti si ' +
    'meu minha meus minhas teu tua teus tuas seu sua seus suas nosso nossa nossos nossas ' +
    'dele dela deles delas este esta estes estas esse essa esses essas aquele aquela ' +
    'aqueles aquelas isso isto aquilo ' +
    'ser sendo sido sou somos sao eh foi foram era eram sera serao seja sejam fosse ' +
    'estar esta estao estava estavam esteve estive estiver ' +
    'ter tem tinha tinham teve tiveram tera terao tenha tenham tendo ' +
    'haver ha havia houve havera fazer faz fez fazem faziam feito ' +
    'poder pode podem podia podiam pudesse dever deve devem devia ' +
    'ir vai vao ia iam vir vem vinha dar da dao dava ver ve veem via saber sabe sabem ' +
    'querer quer querem queria dizer diz dizem disse disseram ' +
    'nao sim tambem ja ainda so apenas mesmo mesma muito muita muitos muitas mais menos ' +
    'bem mal melhor pior todo toda todos todas outro outra outros outras algum alguma ' +
    'alguns algumas nenhum nenhuma cada qualquer varios varias tanto tanta tantos tantas ' +
    'la ali aqui ai agora hoje ontem amanha sempre nunca depois antes durante enquanto ' +
    'talvez quase cerca vez vezes coisa coisas pessoa pessoas forma formas maneira maneiras ' +
    'modo parte partes lado lugar tempo ano anos dia dias hora horas ' +
    'artigo materia material video licao licoes pagina paginas texto assunto exemplo ' +
    'exemplos ponto pontos caso casos tipo tipos ideia ideias ' +
    'ver veja vejam leia leiam assista assistam note notem imagine imaginem ' +
    'capitulo versiculo publicacao revista').split(/\s+/);

  var STOPSET = {};
  STOP.forEach(function (w) { STOPSET[w] = 1; });

  var LIVROS = ('Gênesis Êxodo Levítico Números Deuteronômio Josué Juízes Rute Samuel Reis ' +
    'Crônicas Esdras Neemias Ester Jó Salmo Salmos Provérbios Eclesiastes Cântico ' +
    'Isaías Jeremias Lamentações Ezequiel Daniel Oseias Joel Amós Obadias Jonas Miqueias ' +
    'Naum Habacuque Sofonias Ageu Zacarias Malaquias Mateus Marcos Lucas João Atos ' +
    'Romanos Coríntios Gálatas Efésios Filipenses Colossenses Tessalonicenses Timóteo ' +
    'Tito Filêmon Hebreus Tiago Pedro Judas Apocalipse Revelação').split(' ');

  var RE_VERSO = new RegExp(
    '((?:[1-3]\\s?)?(?:' + LIVROS.join('|') + ')\\.?\\s+\\d{1,3}:\\d{1,3}(?:-\\d{1,3})?)', 'g');

  var ABREV = ('sr sra srta dr dra prof profa av ex cap vs pag pag num vol sec ed fig ap jr ' +
    'etc obs ref art').split(' ');

  /* =========================================================
     texto → frases
     ========================================================= */

  /** Corta um parágrafo em frases, respeitando abreviações e números. */
  function emFrases(texto) {
    var out = [], buf = '', i, ch, seguinte, ultima;
    for (i = 0; i < texto.length; i++) {
      ch = texto.charAt(i);
      buf += ch;
      if (ch !== '.' && ch !== '!' && ch !== '?' && ch !== '…') continue;
      while (i + 1 < texto.length && '”"’\')]»'.indexOf(texto.charAt(i + 1)) !== -1) {
        buf += texto.charAt(++i);
      }
      seguinte = texto.charAt(i + 1);
      if (seguinte && !/\s/.test(seguinte)) continue;           // 3.16, www.jw.org
      ultima = buf.trim().split(/\s+/).pop().replace(/[.!?…"”'’)\]]+$/, '');
      if (ABREV.indexOf(fold(ultima)) !== -1) continue;
      if (ultima.length <= 1) continue;                          // inicial isolada
      out.push(buf.trim());
      buf = '';
    }
    if (buf.trim()) out.push(buf.trim());
    return out;
  }

  /** Tira citações entre parênteses, referências no fim e marcas de nota. */
  function limparFrase(s) {
    s = String(s || '');
    s = s.replace(/\([^)]*\d{1,3}:\d{1,3}[^)]*\)/g, ' ');       // (Salmo 2:8, 9)
    s = s.replace(/\s*[—–]\s*[^—–.;]*\d{1,3}:\d{1,3}[^.]*\.?\s*$/, '.');
    s = s.replace(/\s\*/g, '');
    s = s.replace(/^[\s^*•·]+/, '');                            // marcas de nota de rodapé
    s = s.replace(/^par[áa]grafos?\s+\d+[\s.:-]*/i, '');
    s = s.replace(/^([A-ZÀ-Þ][A-ZÀ-Þ0-9\s]{3,30}):\s*/, '');    // "O PROBLEMA: ..."
    s = s.replace(/\s{2,}/g, ' ').trim();
    return s;
  }

  /** Raiz aproximada da palavra — serve para não repetir e não colidir. */
  function raizDe(p) {
    var f = fold(p).replace(/[^a-z]/g, '');
    return f.replace(/(coes|oes|aes|ais|eis|ens|res|ns|es|s)$/, '').slice(0, 6);
  }

  /** Ordena candidatos a alternativa errada pelos mais parecidos com a certa. */
  function porSemelhanca(certa, lista) {
    var c = fold(certa);
    return lista.slice().sort(function (a, b) { return nota(b) - nota(a); });
    function nota(x) {
      var f = fold(x), n = -Math.abs(f.length - c.length);
      if (f.charAt(f.length - 1) === c.charAt(c.length - 1)) n += 3;
      if (/^\d+$/.test(f) === /^\d+$/.test(c)) n += 1;
      return n;
    }
  }

  function soMaiusculas(s) { return !/[a-zà-ÿ]/.test(s); }

  /* =========================================================
     leitura do material
     ========================================================= */

  function ler(doc) {
    var blocos = (doc.blocks || []).filter(function (b) {
      return b.text && !(soMaiusculas(b.text) && b.text.length < 70);
    });

    var brutoTudo = blocos.map(function (b) { return b.text; }).join('\n');

    var titulos = blocos.filter(function (b) { return b.tag !== 'p' && b.tag !== 'li'; })
      .map(function (b) { return limparFrase(b.text).replace(/[.:]+$/, ''); })
      .filter(function (t) { return t.length > 3 && t.length < 90; });

    var frases = [];
    blocos.forEach(function (b) {
      if (b.tag !== 'p' && b.tag !== 'li') return;
      emFrases(b.text).forEach(function (f) {
        var limpa = limparFrase(f);
        if (limpa.length >= 25) frases.push(limpa);
      });
    });

    // tira frases repetidas
    var vistas = {}, unicas = [];
    frases.forEach(function (f) {
      var k = fold(f).replace(/[^a-z0-9]/g, '');
      if (vistas[k]) return;
      vistas[k] = 1;
      unicas.push(f);
    });

    return {
      titulo: (doc.title || '').trim() || 'Material do jw.org',
      subtitulo: (doc.subtitle || '').trim(),
      tipo: doc.kind === 'video' ? 'video' : 'artigo',
      url: doc.url || '',
      titulos: titulos,
      frases: unicas,
      versos: versosDe(brutoTudo),
      chars: brutoTudo.length
    };
  }

  function versosDe(texto) {
    var achados = String(texto).match(RE_VERSO) || [];
    var vistos = {}, out = [];
    achados.forEach(function (v) {
      v = v.replace(/\s+/g, ' ').trim();
      if (vistos[v]) return;
      vistos[v] = 1;
      out.push(v);
    });
    return out;
  }

  /* =========================================================
     termos: nomes próprios, números e palavras-chave
     ========================================================= */

  function palavrasDe(frase) {
    return frase.split(/[^0-9A-Za-zÀ-ÿ'’-]+/).filter(Boolean);
  }

  function ehNomeProprio(p) {
    return /^[A-ZÀ-Þ][a-zà-ÿ'’]{2,}$/.test(p);     // sem formas do tipo "Arrepende-te"
  }

  function coletar(doc) {
    var nomes = {}, numeros = {}, termos = {};

    doc.frases.forEach(function (frase) {
      var ps = palavrasDe(frase), i, p, f;
      for (i = 0; i < ps.length; i++) {
        p = ps[i];
        f = fold(p);

        if (/^\d{1,4}$/.test(p) && !(p.length === 1)) {
          numeros[p] = (numeros[p] || 0) + 1;
        }
        if (i > 0 && ehNomeProprio(p) && LIVROS.indexOf(p) === -1 && !STOPSET[f]) {
          nomes[p] = (nomes[p] || 0) + 1;
        }
        if (f.length >= 4 && f.length <= 15 && !STOPSET[f] && !/\d/.test(f) && !ehNomeProprio(p)) {
          if (!termos[f]) termos[f] = { texto: p.toLowerCase(), n: 0 };
          termos[f].n++;
        }
      }
    });

    var listaNomes = Object.keys(nomes)
      .map(function (k) { return { texto: k, n: nomes[k], tipo: 'nome' }; })
      .sort(function (a, b) { return b.n - a.n || a.texto.localeCompare(b.texto); });

    var listaNumeros = Object.keys(numeros)
      .map(function (k) { return { texto: k, n: numeros[k], tipo: 'numero' }; })
      .sort(function (a, b) { return b.n - a.n; });

    // em material curto o critério afrouxa, senão não sai pergunta nenhuma
    var curto = doc.chars < 2500;
    var listaTermos = Object.keys(termos)
      .map(function (k) { return { texto: termos[k].texto, n: termos[k].n, tipo: 'termo' }; })
      .filter(function (t) {
        return curto ? (t.n >= 1 && t.texto.length >= 5) : (t.n >= 2 || t.texto.length >= 7);
      })
      .sort(function (a, b) { return b.n - a.n || b.texto.length - a.texto.length; });

    return { nomes: listaNomes, numeros: listaNumeros, termos: listaTermos };
  }

  /* =========================================================
     auxiliares de montagem
     ========================================================= */

  function encurtar(s, max) {
    s = String(s).trim();
    if (s.length <= max) return s;
    var corte = s.slice(0, max);
    var esp = corte.lastIndexOf(' ');
    return (esp > max * 0.6 ? corte.slice(0, esp) : corte).replace(/[\s,;:.]+$/, '') + '…';
  }

  function contem(frase, palavra) {
    return new RegExp('(^|[^0-9A-Za-zÀ-ÿ])' + escapeRe(palavra) + '([^0-9A-Za-zÀ-ÿ]|$)')
      .test(frase);
  }

  function escapeRe(s) { return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

  /** A frase vai entre aspas na pergunta; se ela já tiver aspas soltas, tira. */
  function paraCitar(frase) {
    var abre = (frase.match(/“/g) || []).length;
    var fecha = (frase.match(/”/g) || []).length;
    if (abre !== fecha) frase = frase.replace(/[“”]/g, '');
    return frase.replace(/\s{2,}/g, ' ').trim();
  }

  function trocar(frase, palavra, por) {
    return frase.replace(
      new RegExp('(^|[^0-9A-Za-zÀ-ÿ])' + escapeRe(palavra) + '([^0-9A-Za-zÀ-ÿ]|$)'),
      '$1' + por + '$2');
  }

  /** Quatro alternativas distintas, com a certa na frente. */
  function alternativas(certa, candidatos, frase) {
    var usados = {}, raizes = {}, out = [certa];
    usados[fold(certa)] = 1;
    raizes[raizDe(certa)] = 1;
    var lista = porSemelhanca(certa, candidatos);
    for (var i = 0; i < lista.length && out.length < 4; i++) {
      var c = String(lista[i]).trim();
      if (!c || usados[fold(c)] || raizes[raizDe(c)]) continue;
      if (frase && contem(frase, c)) continue;          // não pode estar na própria frase
      if (frase && new RegExp(escapeRe(raizDe(c)), 'i').test(fold(frase))) continue;
      usados[fold(c)] = 1;
      raizes[raizDe(c)] = 1;
      out.push(c);
    }
    return out.length === 4 ? out : null;
  }

  /* =========================================================
     perguntas de múltipla escolha
     ========================================================= */

  var ABERTURAS = [
    'Complete a frase do material: ',
    'Segundo o material, complete: ',
    'Qual palavra completa esta frase? ',
    'De acordo com o que você leu, complete: '
  ];

  function fazerQuiz(doc, T) {
    var itens = [], usadas = {}, feitas = {};

    /* 1 — assunto do material */
    if (doc.titulos.length >= 3) {
      var opts = alternativas(doc.titulo, shuffle(doc.titulos).filter(function (t) {
        return fold(t) !== fold(doc.titulo);
      }), null);
      if (opts) {
        itens.push({ peso: 1, linha: ['Qual é o título do material que você estudou?'].concat(opts) });
      }
    }

    /* 2 — texto bíblico citado */
    if (doc.versos.length) {
      var falsos = versosFalsos(doc.versos, 3);
      if (falsos.length === 3) {
        itens.push({
          peso: 2,
          linha: ['Qual destes textos bíblicos aparece no material?', doc.versos[0]].concat(falsos)
        });
      }
    }

    var nomesFortes = T.nomes.filter(function (n) { return n.n >= 2; });
    if (nomesFortes.length < 4) nomesFortes = T.nomes;
    var limiteNomes = Math.max(0, Math.min(8, T.nomes.length - 3));

    /* 3 a 5 — lacunas.
       A primeira rodada usa cada frase uma vez só. Se o material for curto e
       ainda faltarem perguntas, uma segunda rodada abre outra lacuna nas mesmas
       frases (palavra diferente), e essas entram no fim da lista. */
    lacunas(0);
    if (itens.length < 12) lacunas(10);

    function lacunas(extra) {
      var limite = extra ? 2 : 1;

      /* números (datas, quantidades) */
      T.numeros.slice(0, 10).forEach(function (num) {
        var frase = melhorFrase(doc.frases, num.texto, usadas, limite, 9, 28);
        if (!frase || feitas[frase + ' ' + num.texto]) return;
        var outros = T.numeros.filter(function (n) { return n.texto !== num.texto; })
          .map(function (n) { return n.texto; }).concat(numerosVizinhos(num.texto));
        var opts = alternativas(num.texto, outros, frase);
        if (!opts) return;
        marcar(usadas, feitas, frase, num.texto);
        itens.push({
          peso: 3 + extra,
          linha: ['Que número completa a frase? “' +
                  paraCitar(trocar(frase, num.texto, '______')) + '”'].concat(opts)
        });
      });

      /* nomes próprios */
      T.nomes.slice(0, 22).forEach(function (nome) {
        if (contar(itens, 4 + extra) >= limiteNomes) return;
        var frase = melhorFrase(doc.frases, nome.texto, usadas, limite, 8, 30);
        if (!frase || feitas[frase + ' ' + nome.texto]) return;
        var outros = nomesFortes.filter(function (n) { return n.texto !== nome.texto; })
          .map(function (n) { return n.texto; });
        var opts = alternativas(nome.texto, shuffle(outros), frase);
        if (!opts) return;
        marcar(usadas, feitas, frase, nome.texto);
        itens.push({
          peso: 4 + extra,
          linha: [aberturaPara(itens.length) + '“' +
                  paraCitar(trocar(frase, nome.texto, '______')) + '”'].concat(opts)
        });
      });

      /* palavras-chave */
      T.termos.slice(0, 30).forEach(function (t) {
        var frase = melhorFrase(doc.frases, t.texto, usadas, limite, 8, 28);
        if (!frase || feitas[frase + ' ' + t.texto]) return;
        var outros = T.termos.filter(function (x) { return x.texto !== t.texto; })
          .map(function (x) { return x.texto; });
        var opts = alternativas(t.texto, shuffle(outros), frase);
        if (!opts) return;
        marcar(usadas, feitas, frase, t.texto);
        itens.push({
          peso: 5 + extra,
          linha: [aberturaPara(itens.length) + '“' +
                  paraCitar(trocar(frase, t.texto, '______')) + '”'].concat(opts)
        });
      });
    }

    itens.sort(function (a, b) { return a.peso - b.peso; });

    // mantém variedade: no máximo 8 perguntas do mesmo tipo
    var porPeso = {}, saida = [];
    itens.forEach(function (it) {
      porPeso[it.peso] = (porPeso[it.peso] || 0) + 1;
      if (porPeso[it.peso] <= 8 && saida.length < 15) saida.push(it.linha);
    });
    if (saida.length < 12) {
      itens.forEach(function (it) {
        if (saida.length < 12 && saida.indexOf(it.linha) === -1) saida.push(it.linha);
      });
    }
    return saida.slice(0, 15);
  }

  function contar(itens, peso) {
    var n = 0;
    for (var i = 0; i < itens.length; i++) if (itens[i].peso === peso) n++;
    return n;
  }

  /** Registra que a frase já foi usada — e com qual palavra, para não repetir
      exatamente a mesma lacuna na segunda rodada. */
  function marcar(usadas, feitas, frase, palavra) {
    usadas[frase] = (usadas[frase] || 0) + 1;
    feitas[frase + ' ' + palavra] = 1;
  }

  function aberturaPara(i) { return ABERTURAS[i % ABERTURAS.length]; }

  /** Escolhe a frase mais clara que contém a palavra. */
  function melhorFrase(frases, palavra, usadas, limite, minP, maxP) {
    var melhor = null, melhorN = 1e9;
    for (var i = 0; i < frases.length; i++) {
      var f = frases[i];
      if ((usadas[f] || 0) >= limite || f.indexOf('?') !== -1) continue;
      if (!contem(f, palavra)) continue;
      var n = f.split(/\s+/).length;
      if (n < minP || n > maxP) continue;
      if (f.length > 210) continue;
      if (n < melhorN) { melhor = f; melhorN = n; }
    }
    return melhor;
  }

  function numerosVizinhos(num) {
    var n = parseInt(num, 10), out = [];
    if (isNaN(n)) return out;
    [2, 3, 7, 12].forEach(function (d) {
      var a = n + d, b = n - d;
      if (a > 0) out.push(String(a));
      if (b > 0) out.push(String(b));
    });
    return shuffle(out);
  }

  function versosFalsos(reais, quantos) {
    var conjunto = {}, out = [];
    reais.forEach(function (v) { conjunto[fold(v)] = 1; });
    var tentativas = 0;
    while (out.length < quantos && tentativas++ < 300) {
      var livro = LIVROS[Math.floor(Math.random() * LIVROS.length)];
      var cap = 1 + Math.floor(Math.random() * 30);
      var ver = 1 + Math.floor(Math.random() * 25);
      var ref = livro + ' ' + cap + ':' + ver;
      if (conjunto[fold(ref)]) continue;
      conjunto[fold(ref)] = 1;
      out.push(ref);
    }
    return out;
  }

  /* =========================================================
     verdadeiro ou falso
     ========================================================= */

  /* Verbos em que dá para encaixar um "não" sem quebrar a frase. */
  var VERBOS = ('é|são|foi|foram|era|eram|será|serão|está|estão|estava|estavam|tem|têm|' +
    'tinha|tinham|pode|podem|podia|podiam|vai|vão|deve|devem|devia|precisa|precisam|' +
    'quer|querem|fica|ficam|existe|existem|vive|vivem|faz|fazem|fez|dá|dão|traz|trazem|' +
    'permite|permitem|ensina|ensinam|mostra|mostram|ajuda|ajudam|acontece|acontecem|' +
    'depende|dependem|serve|servem|significa|significam|inclui|incluem|garante|garantem');
  var RE_VERBO = new RegExp('(^|[^0-9A-Za-zÀ-ÿ])(' + VERBOS + ')([^0-9A-Za-zÀ-ÿ])');

  var NUM_ESCRITOS = ('dois três quatro cinco seis sete oito nove dez onze doze treze ' +
    'catorze quinze dezesseis vinte trinta quarenta cinquenta sessenta cem mil').split(' ');

  var RE_ATRIBUICAO = /^(Disse|Diz|Dizia|Falou|Explicou|Contou|Afirmou|Comentou|Segundo|De acordo)\b/;

  function fazerVF(doc, T) {
    var boas = doc.frases.filter(function (f) {
      var n = f.split(/\s+/).length;
      return n >= 8 && n <= 26 && f.length <= 190 && f.indexOf('?') === -1 &&
        /^[A-ZÀ-Þ“]/.test(f) && /[.!]$/.test(f) &&
        !/^(E|Mas|Ou|Por isso|Então|Assim|Isso|Isto|Ele|Ela|Eles|Elas)\b/.test(f) &&
        !RE_ATRIBUICAO.test(f);
    });
    if (boas.length < 4) return [];

    var verdadeiras = [], falsas = [], i;

    for (i = 0; i < boas.length && (verdadeiras.length < 5 || falsas.length < 5); i++) {
      var f = boas[i];
      var mentira = versaoFalsa(f, T);
      if (mentira && falsas.length <= verdadeiras.length) {
        falsas.push([mentira, 0, 'Na verdade o material diz: “' + encurtar(f, 150) + '”']);
      } else if (verdadeiras.length < 5) {
        verdadeiras.push([f, 1, 'Essa frase está no material, do jeitinho que você leu.']);
      }
    }

    if (!verdadeiras.length || !falsas.length) return [];

    // intercala para não ficar um bloco de V seguido de um bloco de F
    var itens = [];
    for (i = 0; i < Math.max(verdadeiras.length, falsas.length); i++) {
      if (verdadeiras[i]) itens.push(verdadeiras[i]);
      if (falsas[i]) itens.push(falsas[i]);
    }
    return itens.length >= 4 ? itens.slice(0, 10) : [];
  }

  /**
   * Transforma uma frase verdadeira numa falsa sem inventar assunto novo:
   * ou troca um número pelo outro, ou nega o verbo principal.
   */
  function versaoFalsa(frase, T) {
    // 1) número escrito por extenso (seis evidências -> nove evidências)
    for (var i = 0; i < NUM_ESCRITOS.length; i++) {
      if (!contem(frase, NUM_ESCRITOS[i])) continue;
      var outro = NUM_ESCRITOS[(i + 3) % NUM_ESCRITOS.length];
      return trocar(frase, NUM_ESCRITOS[i], outro);
    }

    // 2) número em algarismos (1914 -> 1917)
    for (var k = 0; k < T.numeros.length; k++) {
      var n = T.numeros[k].texto;
      if (!contem(frase, n)) continue;
      var alvo = String(parseInt(n, 10) + (parseInt(n, 10) > 50 ? 7 : 3));
      return trocar(frase, n, alvo);
    }

    // 3) nega o verbo principal
    if (/\b(n[ãa]o|nunca|jamais|nenhum|nenhuma|nem)\b/i.test(fold(frase))) return null;
    var m = frase.match(RE_VERBO);
    if (!m) return null;
    return frase.replace(RE_VERBO, '$1não $2$3');
  }

  /* =========================================================
     palavras-chave (forca, caça-palavras e memória)
     ========================================================= */

  function fazerPalavras(doc, T) {
    var saida = [], raizes = {};
    var candidatos = T.nomes.concat(T.termos).sort(function (a, b) { return b.n - a.n; });

    candidatos.forEach(function (c) {
      if (saida.length >= 12) return;
      var limpo = MJB.gridWord(c.texto);
      if (limpo.length < 3 || limpo.length > 13) return;
      var r = raizDe(limpo);
      if (raizes[r]) return;                       // evita BRACO e BRACOS juntos
      var dica = dicaPara(doc, c);
      if (!dica) return;                           // sem dica de verdade, não entra
      raizes[r] = 1;
      saida.push([limpo, dica]);
    });

    return saida;
  }

  /** Dica = a própria frase do material com a palavra escondida. */
  function dicaPara(doc, termo) {
    var frase = melhorFrase(doc.frases, termo.texto, {}, 1, 5, 26);
    if (!frase) return null;
    var mascarada = paraCitar(trocar(frase, termo.texto, '______')).replace(/[.!?]+$/, '');
    if (mascarada.indexOf('______') === -1) return null;
    return encurtar(mascarada, 88);
  }

  /* =========================================================
     perguntas dissertativas
     ========================================================= */

  function fazerDissertativas(doc, T) {
    var saida = [];
    var chavesGerais = T.termos.slice(0, 3).map(function (t) { return t.texto; });
    if (chavesGerais.length < 3) {
      chavesGerais = chavesGerais.concat(T.nomes.slice(0, 3).map(function (n) { return n.texto; }));
    }
    chavesGerais = chavesGerais.slice(0, 3);

    // perguntas que o próprio material faz
    var frases = doc.frases;
    for (var i = 0; i < frases.length && saida.length < 3; i++) {
      var f = frases[i];
      if (f.indexOf('?') === -1) continue;
      var n = f.split(/\s+/).length;
      if (n < 5 || n > 22) continue;
      if (/^(e voc[êe]|o que voc[êe] acha)/i.test(f)) continue;

      var seguintes = frases.slice(i + 1, i + 3).join(' ');
      var chaves = chavesDe(seguintes, T);
      if (chaves.length < 2) continue;
      saida.push([f.replace(/^[^A-Za-zÀ-ÿ]+/, ''), chaves.join('|'),
        'Essa pergunta está no próprio material.']);
    }

    if (chavesGerais.length >= 2) {
      saida.push(['Explique com suas palavras o que este material ensina sobre “' +
        encurtar(doc.titulo, 60) + '”.', chavesGerais.join('|')]);
    }
    if (doc.versos.length) {
      saida.push(['O material cita ' + doc.versos[0] +
        '. O que esse texto bíblico tem a ver com o assunto?',
        chavesGerais.slice(0, 2).concat([doc.versos[0].split(' ')[0]]).join('|')]);
    }
    saida.push(['Cite uma coisa que você aprendeu aqui e como pode usar isso na sua vida.',
      chavesGerais.join('|')]);

    return saida.slice(0, 5);
  }

  function chavesDe(texto, T) {
    var f = fold(texto), chaves = [];
    T.termos.forEach(function (t) {
      if (chaves.length >= 3) return;
      if (f.indexOf(t.texto) !== -1) chaves.push(t.texto);
    });
    T.nomes.forEach(function (n) {
      if (chaves.length >= 3) return;
      if (f.indexOf(fold(n.texto)) !== -1) chaves.push(n.texto);
    });
    return chaves;
  }

  /* =========================================================
     balões (só perguntas com alternativas curtas)
     ========================================================= */

  function fazerBaloes(q) {
    var saida = [];
    q.forEach(function (linha) {
      if (saida.length >= 8) return;
      var curtas = linha.slice(1).every(function (o) { return String(o).length <= 24; });
      if (!curtas) return;
      saida.push(linha.slice(0));
    });
    return saida.length >= 4 ? saida : [];
  }

  /* =========================================================
     entrada principal
     ========================================================= */

  function gerar(docBruto) {
    var doc = ler(docBruto);
    var T = coletar(doc);

    var q = fazerQuiz(doc, T);
    var w = fazerPalavras(doc, T);
    var vf = fazerVF(doc, T);
    var d = fazerDissertativas(doc, T);
    var pop = fazerBaloes(q);

    if (q.length < 10 || w.length < 5) {
      return {
        ok: false,
        reason: 'curto',
        chars: doc.chars,
        titulo: doc.titulo,
        perguntas: q.length,
        palavras: w.length
      };
    }

    var resumo = doc.subtitulo && doc.subtitulo.length >= 40
      ? encurtar(doc.subtitulo, 230)
      : encurtar(doc.frases[0] || '', 230);

    return {
      ok: true,
      lesson: {
        t: doc.titulo,
        v: doc.versos[0] || '',
        s: resumo,
        q: q,
        vf: vf,
        w: w,
        d: d,
        pop: pop.length ? pop : null,
        source: doc.url,
        kind: doc.tipo,
        versos: doc.versos.slice(0, 8)
      }
    };
  }

  /** Mesmo gerador, a partir de texto colado à mão. */
  function gerarDeTexto(titulo, texto, url) {
    var blocos = String(texto).split(/\n+/).map(function (linha) {
      return { tag: 'p', text: linha.trim() };
    }).filter(function (b) { return b.text.length > 2; });
    return gerar({ title: titulo, subtitle: '', kind: 'artigo', url: url || '', blocks: blocos });
  }

  MJB.Gerador = { gerar: gerar, gerarDeTexto: gerarDeTexto, ler: ler, coletar: coletar };

})(window);
