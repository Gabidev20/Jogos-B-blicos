#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
servidor.py — servidor local do "Meu Jogo Bíblico".

Faz duas coisas ao mesmo tempo:

  1. serve os arquivos do site (igual ao `python -m http.server`);
  2. oferece o endereço  /api/extrair?url=...  que abre uma página do
     jw.org, separa o texto dela e devolve em JSON — assim o site pode
     montar perguntas sobre QUALQUER artigo ou vídeo do jw.org.

Por que isso é necessário: por segurança, o navegador não deixa uma
página ler o conteúdo de outro site (CORS). Então a leitura acontece
aqui, no seu próprio computador.

Privacidade: a única conexão externa é com o próprio jw.org. Nada do
que você estuda sai daqui.

Uso:
    python servidor.py           -> porta 8321
    python servidor.py 9000      -> outra porta
"""

import gzip
import io
import json
import os
import re
import ssl
import sys
import threading
import urllib.error
import urllib.parse
import urllib.request
import webbrowser
from html import unescape
from html.parser import HTMLParser
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

RAIZ = os.path.dirname(os.path.abspath(__file__))
PORTA_PADRAO = 8321

UA = ('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 '
      '(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36')


# --------------------------------------------------------------------------
# 1. segurança: somente jw.org
# --------------------------------------------------------------------------

def dominio_permitido(host):
    h = (host or '').lower().strip()
    return h == 'jw.org' or h.endswith('.jw.org')


# --------------------------------------------------------------------------
# 2. leitura da página
# --------------------------------------------------------------------------

def baixar(url, timeout=25):
    """Devolve (texto, content_type, url_final)."""
    req = urllib.request.Request(url, headers={
        'User-Agent': UA,
        'Accept': 'text/html,application/xhtml+xml,application/json;q=0.9,*/*;q=0.8',
        'Accept-Language': 'pt-BR,pt;q=0.9,en;q=0.5',
        'Accept-Encoding': 'gzip, identity',
    })
    ctx = ssl.create_default_context()
    with urllib.request.urlopen(req, timeout=timeout, context=ctx) as resp:
        bruto = resp.read()
        if (resp.headers.get('Content-Encoding') or '').lower() == 'gzip':
            try:
                bruto = gzip.GzipFile(fileobj=io.BytesIO(bruto)).read()
            except OSError:
                pass
        ctype = resp.headers.get('Content-Type') or ''
        m = re.search(r'charset=([\w-]+)', ctype, re.I)
        enc = m.group(1) if m else 'utf-8'
        try:
            texto = bruto.decode(enc, 'replace')
        except LookupError:
            texto = bruto.decode('utf-8', 'replace')
        return texto, ctype, resp.geturl()


# --------------------------------------------------------------------------
# 3. separação do texto dentro do HTML
# --------------------------------------------------------------------------

TAGS_IGNORADAS = {
    'script', 'style', 'noscript', 'svg', 'head', 'nav', 'footer', 'aside',
    'form', 'select', 'template', 'iframe', 'video', 'audio', 'button',
}

TAGS_BLOCO = {
    'p': 'p', 'h1': 'h1', 'h2': 'h2', 'h3': 'h3', 'h4': 'h3',
    'li': 'li', 'blockquote': 'p', 'dd': 'p', 'figcaption': 'p', 'summary': 'h3',
}

CLASSE_RUIM = re.compile(
    r'(?i)(jwac|contentNav|siteFeature|cookie|banner|share|social|related'
    r'|pagination|copyright|breadcrumb|toolbar|libraryHeader|todayNav'
    r'|articleNav|resultsNav|groupTOC|dropdown|skipLink|announcement)')


class Blocos(HTMLParser):
    """Recolhe parágrafos e títulos na ordem em que aparecem."""

    def __init__(self, filtrar_classe=True):
        HTMLParser.__init__(self, convert_charrefs=True)
        self.filtrar = filtrar_classe
        self.blocos = []
        self.pilha = []
        self.ignorar = 0
        self.tag_ignorada = None

    def handle_starttag(self, tag, attrs):
        tag = tag.lower()
        if self.ignorar:
            if tag == self.tag_ignorada:
                self.ignorar += 1
            return
        if tag in TAGS_IGNORADAS:
            self.ignorar, self.tag_ignorada = 1, tag
            return
        if self.filtrar:
            d = dict(attrs)
            marca = ' '.join([x for x in [d.get('class') or '', d.get('id') or ''] if x])
            if marca and CLASSE_RUIM.search(marca):
                self.ignorar, self.tag_ignorada = 1, tag
                return
        if tag in TAGS_BLOCO:
            self.pilha.append([TAGS_BLOCO[tag], []])
        elif tag == 'br' and self.pilha:
            self.pilha[-1][1].append(' ')

    def handle_endtag(self, tag):
        tag = tag.lower()
        if self.ignorar:
            if tag == self.tag_ignorada:
                self.ignorar -= 1
                if self.ignorar == 0:
                    self.tag_ignorada = None
            return
        if tag in TAGS_BLOCO and self.pilha:
            nome, partes = self.pilha.pop()
            texto = limpar(''.join(partes))
            if texto:
                self.blocos.append({'tag': nome, 'text': texto})

    def handle_data(self, data):
        if self.ignorar or not self.pilha:
            return
        self.pilha[-1][1].append(data)


def limpar(s):
    s = unescape(s or '')
    s = s.replace('­', '').replace('​', '')
    s = re.sub(r'[\s ]+', ' ', s)
    s = re.sub(r'\s*\+\s*(?=[.,;:)]|$)', '', s)
    s = re.sub(r'\[\s*\d+\s*\]', '', s)
    return s.strip()


def balancear(html, inicio):
    m = re.match(r'<([a-zA-Z0-9]+)', html[inicio:])
    if not m:
        return html[inicio:]
    tag = m.group(1).lower()
    nivel = 0
    for mm in re.finditer(r'<(/?)' + tag + r'\b[^>]*?(/?)>', html[inicio:], re.I):
        if mm.group(1):
            nivel -= 1
            if nivel <= 0:
                return html[inicio:inicio + mm.end()]
        elif not mm.group(2):
            nivel += 1
    return html[inicio:]


def fatiar_container(html):
    """Isola a parte principal da página, quando dá para reconhecer."""
    padroes = [
        r'<article[^>]*\bid\s*=\s*["\']article["\']',
        r'<div[^>]*\bid\s*=\s*["\']article["\']',
        r'<div[^>]*\bclass\s*=\s*["\'][^"\']*\barticle\b',
        r'<div[^>]*\bid\s*=\s*["\']content["\']',
        r'<article\b',
        r'<main\b',
    ]
    for pat in padroes:
        m = re.search(pat, html, re.I)
        if not m:
            continue
        trecho = balancear(html, m.start())
        if len(re.sub(r'<[^>]+>', '', trecho)) > 400:
            return trecho
    corpo = re.search(r'<body\b[^>]*>(.*)</body>', html, re.I | re.S)
    return corpo.group(1) if corpo else html


def meta(html, prop):
    p = re.escape(prop)
    for pat in (r'<meta[^>]+(?:property|name)\s*=\s*["\']' + p + r'["\'][^>]*\bcontent\s*=\s*["\']([^"\']*)',
                r'<meta[^>]+\bcontent\s*=\s*["\']([^"\']*)["\'][^>]*(?:property|name)\s*=\s*["\']' + p + r'["\']'):
        m = re.search(pat, html, re.I)
        if m:
            return limpar(m.group(1))
    return ''


ENTULHO = re.compile(
    r'(?i)^(compartilhar|baixar|imprimir|idioma|selecionar|mostrar mais|ver mais'
    r'|voltar|copyright|©|termos de uso|pol[ií]tica de privacidade|entrar'
    r'|sair|pesquisar|jw\.org|watch tower|assista ao v[ií]deo|\d+[:.]\d+)\s*$')

# texto institucional que aparece no rodapé de quase todo artigo
INSTITUCIONAL = re.compile(
    r'(?i)(sinta-se [àa] vontade para contatar|solicite (um )?estudo b[ií]blico'
    r'|pe[çc]a uma visita|entre em contato com as testemunhas de jeov[áa]'
    r'|dispon[ií]vel para download|todos os direitos reservados'
    r'|^\s*\^\s*par[áa]grafo)')


RODAPE = re.compile(
    r'(?i)^\s*(assuntos relacionados|achamos que voc[eê]|leia mais|veja tamb[ée]m'
    r'|explore mais|mais sobre|not[ae]s?$|refer[êe]ncias?$|compartilhe|publica[çc][õo]es'
    r'|conte[úu]do relacionado|outras mat[ée]rias|neste artigo)')


def despoluir(blocos):
    """Tira entulho de navegação e corta tudo depois da lista de 'relacionados'."""
    corte = len(blocos)
    for i, b in enumerate(blocos):
        if b['tag'] in ('h2', 'h3') and RODAPE.match(b['text']):
            corte = i
            break
    if corte >= 4:
        blocos = blocos[:corte]

    saida, vistos = [], set()
    for b in blocos:
        t = b['text']
        if len(t) < 3 or ENTULHO.match(t) or INSTITUCIONAL.search(t):
            continue
        chave = (b['tag'], t.lower())
        if chave in vistos:
            continue
        vistos.add(chave)
        saida.append(b)
    return saida


def extrair_html(html, url):
    principal = fatiar_container(html)

    p = Blocos(True)
    p.feed(principal)
    blocos = p.blocos
    if sum(len(b['text']) for b in blocos) < 350:
        p2 = Blocos(False)
        p2.feed(principal)
        if sum(len(b['text']) for b in p2.blocos) > sum(len(b['text']) for b in blocos):
            blocos = p2.blocos

    titulo = ''
    for b in blocos:
        if b['tag'] == 'h1':
            titulo = b['text']
            break
    if not titulo:
        titulo = meta(html, 'og:title')
    if not titulo:
        m = re.search(r'<h1[^>]*>(.*?)</h1>', html, re.I | re.S)
        if m:
            titulo = limpar(re.sub(r'<[^>]+>', ' ', m.group(1)))
    if not titulo:
        m = re.search(r'<title[^>]*>(.*?)</title>', html, re.I | re.S)
        titulo = limpar(m.group(1)) if m else ''
    titulo = re.sub(r'\s*[|—-]\s*JW\.ORG.*$', '', titulo, flags=re.I).strip()
    titulo = re.sub(r'^\d{1,3}\s+(?=[A-ZÀ-Þ“])', '', titulo)     # número da seção da revista

    blocos = [b for b in blocos if not (b['tag'] == 'h1' and b['text'] == titulo)]
    blocos = despoluir(blocos)

    return {
        'ok': True,
        'kind': 'artigo',
        'url': url,
        'title': titulo,
        'subtitle': meta(html, 'og:description'),
        'blocks': blocos,
        'chars': sum(len(b['text']) for b in blocos),
    }


# --------------------------------------------------------------------------
# 4. vídeos, áudios e cânticos
#    (a página é montada por JavaScript, então usamos a mesma API pública
#     que o próprio jw.org consulta)
# --------------------------------------------------------------------------

IDIOMA = {'pt': 'T', 'pt-br': 'T', 'en': 'E', 'es': 'S', 'fr': 'F', 'it': 'I',
          'de': 'X', 'ja': 'J', 'ko': 'KO', 'ru': 'U', 'zh-hans': 'CHS'}


def achar_lank(url):
    m = re.search(r'(pub-[A-Za-z0-9_-]{4,60})', url) or re.search(r'(docid-\d+)', url)
    return m.group(1) if m else None


def legendas_para_texto(vtt):
    """Transforma um arquivo de legendas (.vtt) no texto falado do vídeo."""
    linhas, anterior = [], None
    for linha in vtt.splitlines():
        linha = linha.strip()
        if (not linha or linha.startswith('WEBVTT') or linha.startswith('NOTE')
                or '-->' in linha or re.match(r'^\d+$', linha)):
            continue
        linha = re.sub(r'<[^>]+>', '', linha)
        linha = limpar(linha)
        if linha and linha != anterior:
            linhas.append(linha)
            anterior = linha
    texto = re.sub(r'\s+', ' ', ' '.join(linhas)).strip()

    # as legendas quebram no meio da frase: remonta em frases inteiras
    frases = re.split(r'(?<=[.!?…])\s+', texto)
    blocos, atual = [], []
    for f in frases:
        f = f.strip()
        if not f:
            continue
        atual.append(f)
        if len(' '.join(atual)) > 260:
            blocos.append({'tag': 'p', 'text': ' '.join(atual)})
            atual = []
    if atual:
        blocos.append({'tag': 'p', 'text': ' '.join(atual)})
    return blocos


def baixar_legendas(item):
    """Procura o arquivo de legendas do item e devolve os blocos de texto.

    O arquivo mora no CDN de mídia da própria organização (jw-cdn.org) e só é
    alcançado a partir de um item que já veio de um endereço do jw.org.
    """
    for arq in (item.get('files') or []):
        leg = arq.get('subtitles') or {}
        url = leg.get('url')
        if not url:
            continue
        try:
            vtt, _, _ = baixar(url, timeout=20)
        except Exception:
            continue
        blocos = legendas_para_texto(vtt)
        if blocos:
            return blocos
    return []


def achar_idioma(url):
    m = re.search(r'(?:^|//)[^/]*/([a-z]{2}(?:-[a-z]{2,4})?)/', url, re.I)
    if not m:
        m = re.search(r'#([a-z]{2}(?:-[a-z]{2,4})?)/', url, re.I)
    if m:
        return IDIOMA.get(m.group(1).lower(), 'T')
    return 'T'


def extrair_midia(url):
    lank = achar_lank(url)
    if not lank:
        return None
    tentativas = []
    for lang in [achar_idioma(url), 'T', 'E']:
        if lang not in tentativas:
            tentativas.append(lang)
    for lang in tentativas:
        api = ('https://b.jw-cdn.org/apis/mediator/v1/media-items/%s/%s'
               % (lang, urllib.parse.quote(lank)))
        try:
            bruto, _, _ = baixar(api, timeout=20)
            dados = json.loads(bruto)
        except Exception:
            continue
        itens = dados.get('media') or []
        if not itens:
            continue
        it = itens[0]
        blocos = []
        for pedaco in re.split(r'\n+', it.get('description') or ''):
            pedaco = limpar(pedaco)
            if len(pedaco) > 2:
                blocos.append({'tag': 'p', 'text': pedaco})
        blocos += baixar_legendas(it)          # o texto falado do vídeo
        return {
            'ok': True,
            'kind': 'video',
            'url': url,
            'title': limpar(it.get('title') or ''),
            'subtitle': limpar(it.get('primaryCategory') or ''),
            'blocks': blocos,
            'chars': sum(len(b['text']) for b in blocos),
        }
    return None


def extrair(url):
    midia = extrair_midia(url)

    pagina = None
    erro_pagina = None
    motivo = 'leitura'
    try:
        html, ctype, final = baixar(url)
        if 'json' not in (ctype or '').lower():
            pagina = extrair_html(html, final)
    except urllib.error.HTTPError as e:
        motivo = 'http'
        erro_pagina = 'O jw.org respondeu %s para esse endereço.' % e.code
    except urllib.error.URLError as e:
        motivo = 'rede'
        erro_pagina = str(e.reason)
    except Exception as e:
        erro_pagina = str(e)

    if midia and pagina:
        base = dict(midia if midia['chars'] >= pagina['chars'] else pagina)
        outra = pagina if base['kind'] == 'video' else midia
        base['title'] = base['title'] or outra['title'] or ''
        vistos = set(b['text'] for b in base['blocks'])
        base['blocks'] = base['blocks'] + [b for b in outra['blocks'] if b['text'] not in vistos]
        base['chars'] = sum(len(b['text']) for b in base['blocks'])
        return base
    if midia:
        return midia
    if pagina:
        return pagina
    return {'ok': False, 'reason': motivo, 'detail': erro_pagina or 'sem conteúdo'}


# --------------------------------------------------------------------------
# 5. servidor
# --------------------------------------------------------------------------

class Handler(SimpleHTTPRequestHandler):
    server_version = 'MeuJogoBiblico/1.0'

    def __init__(self, *a, **kw):
        kw['directory'] = RAIZ
        SimpleHTTPRequestHandler.__init__(self, *a, **kw)

    def do_GET(self):
        rota = self.path.split('?')[0]
        if rota == '/api/extrair':
            return self.api_extrair()
        if rota == '/api/ping':
            return self.responder({'ok': True, 'servidor': 'meu-jogo-biblico'})
        return SimpleHTTPRequestHandler.do_GET(self)

    def api_extrair(self):
        params = urllib.parse.parse_qs(urllib.parse.urlparse(self.path).query)
        url = (params.get('url') or [''])[0].strip()

        if not url:
            return self.responder({'ok': False, 'reason': 'vazio'}, 400)
        if not re.match(r'^https?://', url, re.I):
            url = 'https://' + url
        try:
            partes = urllib.parse.urlparse(url)
        except ValueError:
            return self.responder({'ok': False, 'reason': 'formato'}, 400)
        if not dominio_permitido(partes.hostname or ''):
            return self.responder({'ok': False, 'reason': 'dominio',
                                   'host': partes.hostname or ''}, 403)

        try:
            dados = extrair(url)
        except urllib.error.HTTPError as e:
            dados = {'ok': False, 'reason': 'http',
                     'detail': 'O jw.org respondeu %s para esse endereço.' % e.code}
        except urllib.error.URLError as e:
            dados = {'ok': False, 'reason': 'rede', 'detail': str(e.reason)}
        except Exception as e:
            dados = {'ok': False, 'reason': 'leitura', 'detail': str(e)}

        self.responder(dados, 200 if dados.get('ok') else 502)

    def responder(self, obj, status=200):
        corpo = json.dumps(obj, ensure_ascii=False).encode('utf-8')
        self.send_response(status)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Content-Length', str(len(corpo)))
        self.send_header('Cache-Control', 'no-store')
        self.end_headers()
        self.wfile.write(corpo)

    def log_message(self, fmt, *args):
        pass


def main():
    porta = PORTA_PADRAO
    if len(sys.argv) > 1:
        try:
            porta = int(sys.argv[1])
        except ValueError:
            pass

    for fluxo in (sys.stdout, sys.stderr):
        try:
            fluxo.reconfigure(encoding='utf-8')
        except Exception:
            pass

    servidor = ThreadingHTTPServer(('127.0.0.1', porta), Handler)
    endereco = 'http://localhost:%d' % porta
    print('')
    print('  Meu Jogo Biblico no ar:      %s' % endereco)
    print('  Leitura de links do jw.org:  ligada')
    print('  Para encerrar: Ctrl+C')
    print('')
    if '--sem-navegador' not in sys.argv:
        threading.Timer(1.0, lambda: webbrowser.open(endereco)).start()
    try:
        servidor.serve_forever()
    except KeyboardInterrupt:
        print('\n  Encerrado.\n')
        servidor.shutdown()


if __name__ == '__main__':
    main()
