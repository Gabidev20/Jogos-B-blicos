# Meu Jogo Bíblico

Plataforma web de estudo bíblico para **crianças (Kids)** e **adolescentes (Teens)**, com
questionário e seis jogos montados a partir do conteúdo exato de cada material.

**Fonte exclusiva do conteúdo:** o site oficial **jw.org**
- *Aprenda com as Histórias da Bíblia* (símbolo `lfb`) — **103 histórias** já carregadas
- *Seja Feliz para Sempre! — Um Curso da Bíblia para Você* (símbolo `lff`) — **60 lições** já carregadas
- **+ qualquer artigo ou vídeo do jw.org** que você colar pelo link

---

## Como abrir

Abra o terminal nesta pasta e rode:

```bash
python servidor.py
```

O navegador abre sozinho em `http://localhost:8321`.

Esse é o modo completo: além de servir o site, o `servidor.py` é quem consegue **ler as
páginas do jw.org** para gerar perguntas a partir de um link. Por segurança, o navegador
não deixa uma página ler o conteúdo de outro site, então essa leitura acontece aqui, no
seu computador.

Dois cliques em `index.html` também funcionam, mas aí o campo de link só reconhece as
lições dos dois livros — para qualquer outro endereço você precisa colar o texto à mão.

Não há instalação, build nem dependências — só o Python 3 (qualquer versão 3.x). Para usar
outra porta: `python servidor.py 9000`.

---

## O que o site faz

### 1. Biblioteca pronta (163 lições)
Os dois livros já vêm carregados e indexados por seção/parte. Ao abrir a **Lição X**,
os sete jogos usam **exclusivamente** o conteúdo da Lição X — a chave `lfb-<n>` / `lff-<n>`
amarra título, texto base, perguntas, palavras-chave e pares ao número da lição.

### 2. Link do jw.org → questionário e jogos sobre aquele assunto
Cole o endereço de **qualquer** artigo, matéria de revista, lição de livro ou vídeo do
jw.org. O campo aceita **apenas** o domínio oficial `jw.org` (e subdomínios como
`wol.jw.org`); qualquer outro site mostra um alerta vermelho explicando o motivo.

O que acontece depois:

1. Se o link for de uma das **163 lições já carregadas**, o site abre o banco de
   perguntas pronto — ele foi conferido uma a uma, então vale mais do que gerar na hora.
   (Ainda assim existe o botão *Prefiro gerar do texto da página*.)
2. Se for **qualquer outra página**, o site lê o texto dela e monta na hora de 10 a 15
   perguntas, as frases de Verdadeiro/Falso, as palavras-chave, os pares da memória, os
   balões e as perguntas abertas — tudo sobre o assunto daquela página.
3. Em **vídeos**, o texto vem das legendas oficiais do próprio vídeo. Copie o link pelo
   botão *Compartilhar* do vídeo no jw.org (o endereço que tem `lank=pub-...`).

Nada é inventado: toda resposta certa é uma palavra ou um trecho que está mesmo no
material. Se a página tiver pouco texto (uma capa de vídeo, um índice), o site avisa e
oferece o campo **Colar o texto à mão** — o resultado é o mesmo.

Cada material gerado vira um item `web-1`, `web-2`… guardado neste aparelho, com botões
de **gerar as perguntas de novo** e **apagar**. Eles aparecem como um terceiro "livro"
na Biblioteca.

### 3. Sete modos de jogo por lição
| Jogo | O que usa |
|---|---|
| 🧭 Questionário | 10 perguntas de múltipla escolha, com correção imediata |
| ⚖️ Verdadeiro ou Falso | 6 frases com comentário explicativo |
| 🎈 Estourar Balão | balões que sobem com as alternativas; estoure a certa |
| 🧩 Jogo da Forca | 8 palavras-chave da lição, cada uma com dica |
| 🧠 Jogo da Memória | pares "palavra ↔ significado" (ou imagens que você colocar) |
| 🔍 Caça-Palavras | grade gerada na hora, 8 direções, com as palavras da lição |
| ✏️ Dissertativas | campo aberto + retorno imediato mostrando os pontos-chave |

### 4. Criador de Jogos (edição manual)
Botão **✏️ Criador de Jogos** dentro de cada lição. Abas para editar perguntas,
alternativas (marcando a correta), frases de V/F, palavras e dicas, perguntas abertas,
balões e pares da memória — inclusive **enviando suas próprias imagens** (até 900 KB) ou
colando emojis. Botões **Salvar** e **↺ Restaurar original** por aba. As edições ficam
guardadas por lição e nunca afetam as outras.

### 5. Estudantes
Cadastro completo (criar, editar, excluir) com **nome, idade, faixa (Kids/Teens),
cor favorita e emoji**. Ao escolher o perfil ativo no topo, o site inteiro muda de cor,
o placar passa a ser daquele estudante e as mensagens de parabéns usam o nome e o emoji
dele.

---

## Estrutura dos arquivos

```
index.html
servidor.py                     serve o site e lê as páginas do jw.org
assets/
  css/app.css                 identidade visual "Vitral" (tema claro e escuro)
  js/
    core.js                   armazenamento, perfis, tema, rotas, utilidades
    catalog.js                livros, índice de lições, validação de links do jw.org
    gerador.js                monta perguntas e jogos a partir do texto de uma página
    games.js                  os sete jogos
    ui.js                     telas (biblioteca, lição, jogo, criador, estudantes)
    data/
      lfb-a.js … lfb-d.js     histórias 1-26, 27-52, 53-78, 79-103
      lff-a.js … lff-d.js     lições 1-15, 16-30, 31-45, 46-60
```

### Formato de uma lição (arquivos em `assets/js/data/`)

```js
{n: 5, t: "A arca de Noé", v: "Mateus 24:37",
 s: "Resumo curto da lição.",
 q:  [["Pergunta", "RESPOSTA CERTA", "errada", "errada", "errada"], …],
 vf: [["Frase", 1, "Comentário quando a pessoa erra"], …],   // 1 = verdadeiro, 0 = falso
 w:  [["PALAVRA", "dica da palavra"], …],                    // maiúsculas, 3 a 13 letras
 d:  [["Pergunta aberta", "ponto 1|ponto 2|ponto 3"], …]}
```

A **resposta certa é sempre a primeira** da lista; o site embaralha as alternativas a cada
partida. Para acrescentar ou corrigir conteúdo, basta editar esses arquivos (ou usar o
Criador de Jogos dentro do site).

Se você editar algum arquivo e o navegador continuar mostrando a versão antiga, troque
`?v=2` por `?v=3` nas tags `<script>` e `<link>` do `index.html`.

---

## Privacidade

A **única** conexão externa é com o próprio jw.org, e só quando você cola um link e pede
para gerar. Nenhum dado seu sai daqui: perfis, placares, materiais gerados e edições
ficam no `localStorage` do navegador, apenas neste aparelho.

---

Este site é uma ferramenta de estudo pessoal e **não substitui** a leitura das publicações
originais no jw.org.
