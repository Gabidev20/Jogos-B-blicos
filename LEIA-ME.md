# Meu Jogo Bíblico

Plataforma web de estudo bíblico para **crianças (Kids)** e **adolescentes (Teens)**, com
questionários e seis jogos gerados a partir do conteúdo exato de cada lição.

**Fonte exclusiva do conteúdo:** publicações oficiais do **jw.org**
- *Aprenda com as Histórias da Bíblia* (símbolo `lfb`) — **103 histórias**
- *Seja Feliz para Sempre! — Um Curso da Bíblia para Você* (símbolo `lff`) — **60 lições**

---

## Como abrir

**Modo simples:** dê dois cliques em `index.html`.

**Modo recomendado** (evita bloqueios do navegador em arquivos locais) — abra o terminal
nesta pasta e rode:

```bash
python -m http.server 8321
```

Depois acesse `http://localhost:8321` no navegador.

Não há instalação, build nem dependências. Tudo funciona offline (só as fontes vêm da
internet; sem elas o site usa fontes do sistema e continua funcionando).

---

## O que o site faz

### 1. Biblioteca pronta (163 lições)
Os dois livros já vêm carregados e indexados por seção/parte. Ao abrir a **Lição X**,
os sete jogos usam **exclusivamente** o conteúdo da Lição X — a chave `lfb-<n>` / `lff-<n>`
amarra título, texto base, perguntas, palavras-chave e pares ao número da lição.

### 2. Link do jw.org
Cole o endereço de um artigo ou vídeo. O campo aceita **apenas** o domínio oficial
`jw.org` (e subdomínios como `wol.jw.org`); qualquer outro site mostra um alerta vermelho
explicando o motivo. Reconhecido o link, o site identifica a lição e gera o questionário
na hora. Se o endereço for do jw.org mas não bater com nenhuma lição, ele sugere as
lições mais parecidas em vez de adivinhar.

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
assets/
  css/app.css                 identidade visual "Vitral" (tema claro e escuro)
  js/
    core.js                   armazenamento, perfis, tema, rotas, utilidades
    catalog.js                livros, índice de lições, validação de links do jw.org
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
`?v=1` por `?v=2` nas tags `<script>` e `<link>` do `index.html`.

---

## Privacidade

Nada é enviado para a internet. Perfis, placares e edições ficam no `localStorage` do
navegador, apenas neste aparelho.

---

Este site é uma ferramenta de estudo pessoal e **não substitui** a leitura das publicações
originais no jw.org.
