# TumoPlay Core — Especificação de implementação (para Claude Code)

> Este documento é a especificação completa e autoritativa. Implementa **todos** os ficheiros descritos, com código real e executável — nada de pseudocódigo ou exemplos parciais.
> Começa por apresentar uma breve arquitetura da solução (máx. ~20 linhas) e depois implementa.
> Quando este documento e o teu instinto divergirem, segue o documento. Quando algo não estiver especificado, escolhe a opção mais simples para um principiante e regista a decisão na secção "Notas de implementação" do README.

---

## 0. Contexto

O **TumoPlay Core** é uma biblioteca JavaScript para laboratórios de programação no TUMO (centro de tecnologias criativas), para estudantes dos 12 aos 18 anos **sem conhecimentos prévios de programação**. Cada laboratório tem 12 horas, distribuídas por três manhãs, e ensina os fundamentos de JavaScript através de jogos 2D simples.

Projetos futuros (**NÃO implementar agora**): Pixel Quest (aventura 2D), Traffic Simulator (trânsito com semáforos), Space Invaders (arcade). A API deve servir estes três casos, mas nesta fase entregamos apenas:

1. A biblioteca `tumoplay.js`.
2. O **TumoPlay Playground**, um jogo de teste.
3. Um exemplo mínimo (jogador que se move).
4. O README em português europeu.

### Princípio central

A biblioteca esconde a parte técnica (DOM, Canvas API, event listeners, `requestAnimationFrame`, coordenadas, matemática das colisões). **A biblioteca não implementa a lógica dos jogos.** Os estudantes continuam a escrever as suas próprias variáveis, funções, condições, loops e arrays. Na dúvida entre "a biblioteca faz isto" e "o estudante escreve isto", escolhe o estudante, exceto quando se trata de um detalhe técnico do browser.

---

## 1. Requisitos técnicos (obrigatórios)

| Requisito | Detalhe |
|---|---|
| Linguagem | JavaScript vanilla moderno (ES2020), sem TypeScript |
| Renderização | HTML5 Canvas 2D |
| Dependências | Zero. Sem frameworks, sem npm, sem Node.js, sem bundlers, sem CDNs |
| Execução | Abrir `index.html` diretamente no browser (`file://`) **ou** através de um servidor local simples. Ambos têm de funcionar |
| Formato da biblioteca | Um único ficheiro `tumoplay.js`, carregado com `<script>` normal (sem `type="module"`), que expõe **um único** objeto global `window.TumoPlay` |
| Editores | VS Code, CodePen, JSFiddle, StackBlitz (colar o conteúdo de `tumoplay.js` no painel de JS antes do código do jogo tem de funcionar) |
| Comentários no código | Inglês |
| Mensagens de erro/aviso para o estudante | Português europeu, amigáveis, com prefixo `TumoPlay:` (ex.: `TumoPlay: chama createGame() antes de createSprite().`) |
| Documentação | Português europeu |
| Poluição global | Apenas `TumoPlay`. Tudo o resto fica dentro de uma IIFE |

Não uses ES modules: o requisito de "ficheiro único que funciona em editores online e com `file://`" é mais importante. A separação em módulos é lógica, dentro do ficheiro (ver secção 3).

---

## 2. Decisões de design (já tomadas — não alterar)

Estas decisões resolvem ambiguidades do pedido original. Respeita-as.

### 2.1 Ciclo de jogo com passo fixo (fixed timestep)

O pedido exige ao mesmo tempo que isto funcione:

```js
onUpdate(function (deltaTime) {
  player.move(2, 0);
});
```

**e** que "o movimento não dependa da velocidade do computador". Com um ciclo ingénuo baseado em `requestAnimationFrame`, um ecrã de 120 Hz fazia o jogador andar ao dobro da velocidade de um ecrã de 60 Hz.

**Solução:** o motor usa um **passo fixo de 60 atualizações por segundo** com acumulador:

1. Cada frame do `requestAnimationFrame` mede o tempo real decorrido e soma-o a um acumulador.
2. Enquanto o acumulador for ≥ 1/60 s, executa **uma** atualização lógica e subtrai 1/60 s.
3. Limitar a 5 atualizações por frame (evita a "espiral da morte" quando o separador volta de segundo plano). Se o tempo real decorrido for > 250 ms, descartar o excesso.
4. Depois das atualizações, desenha **uma** vez.

Consequências:

| Conceito | Valor |
|---|---|
| Atualizações por segundo | Sempre 60, independentemente do monitor ou do computador |
| `deltaTime` passado ao callback | Em **segundos**, sempre `1/60` (≈ 0.0167). Está disponível para quem quiser usá-lo (ex.: temporizadores), mas não é necessário para movimento |
| `sprite.move(2, 0)` dentro de `onUpdate` | Move 2 px por atualização = 120 px/s em qualquer computador |
| `speedX` / `speedY` | Em **píxeis por atualização** (a mesma unidade de `move`) |

Isto mantém o modelo mental simples para principiantes ("2 píxeis de cada vez") e cumpre o requisito.

### 2.2 Os sprites aplicam a sua velocidade automaticamente

Em cada atualização, **antes** de chamar os callbacks de `onUpdate`, o motor faz `x += speedX` e `y += speedY` em cada sprite ativo. Não há ressaltos, gravidade, nem limites automáticos: isso é lógica de jogo e fica com o estudante (o Playground mostra o ressalto do inimigo com `if`).

Ordem de uma atualização:

1. Aplicar `speedX`/`speedY` a todos os sprites.
2. Processar temporizadores de `delay` que expiraram.
3. Chamar os callbacks de `onKey` (teclas mantidas premidas).
4. Chamar os callbacks de `onUpdate(deltaTime)`.
5. Limpar o estado de "acabou de ser premida/largada" do teclado.

### 2.3 Desenho imediato dentro de um motor com passo fixo

`drawRect`, `drawCircle`, `drawText` e `drawImage` podem ser chamados dentro de `onUpdate`. Como pode haver 0, 1 ou várias atualizações por frame, **não desenham diretamente no canvas**: adicionam um comando a uma **fila de desenho**.

1. No início de cada atualização, a fila é esvaziada.
2. Ao renderizar, o motor reproduz a fila da **última** atualização.
3. Se forem chamados fora de `onUpdate` (por exemplo, no topo do script), os comandos ficam na fila até à próxima atualização. Se o jogo estiver parado, ficam visíveis até ao próximo `clearCanvas()`/`clear()`.

**Ordem de renderização por frame (camadas, de baixo para cima):**

| Camada | Conteúdo |
|---|---|
| 1 | Cor de fundo (`background`) |
| 2 | Comandos de desenho da fila (`drawRect`, `drawCircle`, `drawText`, `drawImage`), pela ordem em que foram chamados — é o "cenário" |
| 3 | Sprites visíveis, pela ordem de criação |
| 4 | HUD (pontuação e vidas), se ativado |
| 5 | Mensagem (`showMessage`), se ativa |

Documentar no README: "o que desenhas com `draw…` fica por trás dos sprites".

### 2.4 `stopGame()` pausa a lógica, não o desenho

O ciclo de `requestAnimationFrame` corre sempre depois de `createGame`. `startGame()`/`stopGame()` ligam e desligam **apenas as atualizações** (passos 1–5 da secção 2.2). A renderização continua, para que `showMessage("Game Over")` chamado depois de `stopGame()` apareça. Ao retomar com `startGame()`, o acumulador é reiniciado (sem "saltos").

### 2.5 `clear()` versus `clearCanvas()`

| Função | Efeito |
|---|---|
| `clearCanvas()` | Esvazia a fila de comandos de desenho. Não toca em sprites, pontuação, callbacks |
| `clear()` | Repõe o **mundo** para um reinício: remove todos os sprites, cancela todos os `delay` pendentes, esvazia a fila de desenho, esconde a mensagem, põe a pontuação a 0, esconde o HUD e liberta as teclas. **Mantém** os callbacks registados (`onUpdate`, `onKey…`) e o estado ligado/desligado do jogo |

Manter os callbacks em `clear()` é essencial: permite um reinício com `clear()` + recriar objetos, sem registar tudo de novo.

### 2.6 Sistema de coordenadas

Origem (0, 0) no canto superior esquerdo; x cresce para a direita, y cresce para baixo.

| Elemento | O que `x, y` representa |
|---|---|
| Sprite (qualquer forma) | Canto superior esquerdo do retângulo |
| `drawRect` | Canto superior esquerdo |
| `drawCircle` | **Centro** do círculo (convenção habitual; documentar com uma nota bem visível) |
| `drawText` | Canto superior esquerdo do texto (`textBaseline = "top"`) por omissão |
| `drawImage` | Canto superior esquerdo |

### 2.7 Pequena extensão permitida: `shape` nos sprites

Os sprites aceitam uma opção `shape`: `"rect"` (por omissão) ou `"circle"`. Um sprite `"circle"` desenha um círculo inscrito no seu retângulo (`width`/`height`; se forem diferentes, desenha uma elipse). As colisões continuam a ser AABB (retângulo). Serve para as moedas parecerem moedas. **Não acrescentes outras extensões** (sem imagens nos sprites, sem rotação, sem animações, sem física, sem som, sem cenas).

### 2.8 Normalização de teclas

A biblioteca aceita nomes de teclas tolerantes e normaliza-os para uma forma canónica:

| O estudante escreve | Tecla |
|---|---|
| `"ArrowUp"`, `"arrowup"`, `"up"` | Seta para cima (idem `Down`/`Left`/`Right`) |
| `"Space"`, `"space"`, `" "` | Barra de espaços |
| `"Enter"`, `"enter"` | Enter |
| `"a"`, `"A"`, `"KeyA"` | Letra A (todas as letras, sem distinção de maiúsculas) |
| `"0"`…`"9"`, `"Digit1"` | Dígitos (extra barato, permitido) |
| `"Escape"`, `"Shift"` | Aceitar se o browser as reportar; não é obrigatório documentar |

Implementação: usar `event.code` como fonte principal (independente do layout e de maiúsculas, Caps Lock ou Shift) e mapear para nomes canónicos. Um nome de tecla desconhecido gera **um** aviso na consola (uma vez por nome), em português.

Comportamento do browser:

1. `preventDefault()` em setas e espaço **apenas** quando o foco não está num `input`, `textarea`, `select` ou elemento `contenteditable` (para não estragar formulários nem o painel dos editores online).
2. Ignorar `event.repeat` para `onKeyDown`.
3. Em `window` `blur`, libertar todas as teclas (evita teclas "presas" quando se muda de janela).

### 2.9 Onde aparece o canvas

`createGame` procura um elemento com `id="tumoplay"`. Se existir, coloca o canvas lá dentro; se não, faz `append` ao `body`. O canvas tem resolução interna fixa (`width` × `height`), mas o CSS aplicado pela biblioteca (inline, mínimo) é `max-width: 100%; height: auto; display: block;` para ser adaptável a ecrãs mais pequenos sem distorcer. A opção `title`, se for fornecida, define `document.title`.

O canvas recebe `tabindex="0"` e foco ao ser clicado (útil em editores online com iframes), mas os eventos de teclado são ouvidos em `window` para funcionar sem clicar.

### 2.10 HUD opcional

Pontuação e vidas só aparecem no canvas depois de o estudante chamar `setScore`, `addScore` ou `setLives` pela primeira vez. Um jogo que nunca chama estas funções não mostra HUD nenhum. Estilo: texto branco com sombra, fonte monoespaçada/arcade do sistema (`"Courier New", monospace`, em negrito), pontuação no canto superior esquerdo ("Pontos: 3") e vidas no canto superior direito como corações `♥` repetidos (com fallback para "Vidas: 3" se `lives > 10`).

`showMessage(text)` desenha um painel semitransparente escuro centrado, com o texto grande; suporta `\n` para várias linhas. `hideMessage()` remove-o.

### 2.11 `delay` usa tempo de jogo

`delay(ms, callback)` conta em tempo de jogo (soma de `deltaTime` das atualizações), por isso **pausa** com `stopGame()` e é cancelado por `clear()`. Devolve um id numérico; expõe também `cancelDelay(id)` (mínimo necessário para não deixar temporizadores órfãos — documentar como função "extra").

### 2.12 Exemplo adicional

O pedido lista 5 ficheiros, mas também pede um exemplo mínimo adicional. Fica num sexto ficheiro: `exemplo-basico.html` (HTML + script inline, carrega `tumoplay.js`).

---

## 3. Arquitetura interna de `tumoplay.js`

Um único ficheiro, uma IIFE, com secções claramente marcadas por comentários de bloco. Cada "módulo" é um objeto ou closure privada. Ordem:

| # | Módulo | Responsabilidade |
|---|---|---|
| 1 | `Utils` | `random`, `randomInt`, validação de argumentos, avisos amigáveis (`warnOnce`), `clamp` interno |
| 2 | `Renderer` | Contexto 2D, fila de comandos de desenho, cache de imagens, desenho por camadas |
| 3 | `SpriteManager` | Classe `Sprite`, lista de sprites, criar/remover/listar, aplicar velocidades |
| 4 | `InputManager` | Listeners de teclado, normalização, estado premido/acabado de premir/largado, callbacks |
| 5 | `CollisionManager` | AABB, `checkCollision`, `checkCollisionWithList` |
| 6 | `Timers` | `delay`, `cancelDelay`, processamento por tempo de jogo |
| 7 | `GameUI` | Pontuação, vidas, mensagem, desenho do HUD |
| 8 | `GameEngine` | `createGame`, ciclo fixo, `startGame`, `stopGame`, `clear`, orquestração |
| 9 | API pública | `window.TumoPlay = Object.freeze({ … })` com todas as funções públicas |

Cada função pública tem um comentário JSDoc curto em inglês (`@param`, `@returns`). O ficheiro final deve ficar legível por um formador: alvo indicativo de 600–900 linhas, sem truques.

Proteção contra uso errado: chamar qualquer função que dependa do jogo antes de `createGame()` gera um erro claro em português. Chamar `createGame()` duas vezes substitui o jogo anterior (remove o canvas antigo, para o ciclo antigo e limpa o estado), com um aviso.

---

## 4. API pública (contrato)

Todas as funções são acessíveis como `TumoPlay.nome(...)`.

### A. Inicialização

| Função | Comportamento |
|---|---|
| `createGame(options)` | Cria o canvas e inicia o ciclo de renderização. `options`: `width` (omissão 600), `height` (omissão 400), `background` (cor CSS, omissão `"#111111"`), `title` (string, opcional). Não começa as atualizações: é preciso `startGame()`. Devolve `undefined` |
| `startGame()` | Liga as atualizações. Idempotente |
| `stopGame()` | Desliga as atualizações (o desenho continua). Idempotente |
| `clear()` | Repõe o mundo (ver 2.5) |
| `isRunning()` | Extra mínimo: devolve `true`/`false`. Útil para `if` no código do estudante |

Expor também, só para leitura, `TumoPlay.width` e `TumoPlay.height` (getters) para o estudante poder escrever `TumoPlay.width - player.width` em vez de números mágicos.

### B. Desenho

| Função | Comportamento |
|---|---|
| `drawRect(x, y, width, height, color)` | Retângulo preenchido. `color` com omissão `"white"` |
| `drawCircle(x, y, radius, color)` | Círculo preenchido, `x, y` = centro |
| `drawText(text, x, y, options)` | `options` opcionais: `size` (px, omissão 20), `color` (omissão `"white"`), `font` (omissão `"Courier New, monospace"`), `align` (`"left"` / `"center"` / `"right"`, omissão `"left"`), `bold` (boolean). Converte `text` com `String(text)` (permite números) |
| `drawImage(image, x, y, width, height)` | `image` pode ser um URL (string) ou um `HTMLImageElement`. URLs são carregados e guardados em cache; enquanto não carregam, não desenha nada (sem erro). Se `width`/`height` forem omitidos, usa o tamanho natural |
| `clearCanvas()` | Ver 2.5 |

Cores: qualquer formato CSS (`"red"`, `"#ff0"`, `"#ff0000"`, `"rgb(…)"`, `"hsl(…)"`). Passar a string diretamente ao `fillStyle`.

### C. Sprites

`createSprite(options)` devolve um objeto `Sprite`. Opções e propriedades (todas públicas e alteráveis diretamente, ex.: `player.x = 10`):

| Propriedade | Omissão |
|---|---|
| `x` | 0 |
| `y` | 0 |
| `width` | 32 |
| `height` | 32 |
| `color` | `"white"` |
| `visible` | `true` |
| `speedX` | 0 |
| `speedY` | 0 |
| `shape` | `"rect"` (ou `"circle"`) |
| `name` | `""` (opcional, só para ajudar a depurar e no `toString`) |

Métodos (todos devolvem o próprio sprite, para permitir encadeamento — mas os exemplos para principiantes **não** usam encadeamento):

| Método | Comportamento |
|---|---|
| `move(dx, dy)` | `x += dx; y += dy` |
| `setPosition(x, y)` | Define a posição |
| `setColor(color)` | Define a cor |
| `show()` / `hide()` | `visible = true/false` |
| `remove()` | Igual a `removeSprite(this)` |

Funções do gestor:

| Função | Comportamento |
|---|---|
| `createSprite(options)` | Cria e regista o sprite (passa a ser desenhado automaticamente) |
| `removeSprite(sprite)` | Remove-o do motor e marca `sprite.removed = true`. Remover duas vezes não dá erro. **Não** o remove dos arrays do estudante (isso é lógica do estudante, demonstrada no Playground) |
| `getSprites()` | Devolve uma **cópia** do array de sprites ativos |

Remover sprites durante uma atualização tem de ser seguro (iterar sobre uma cópia ou remover de forma diferida).

### D. Teclado

| Função | Comportamento |
|---|---|
| `onKey(key, callback)` | Chama `callback()` **em cada atualização** enquanto a tecla estiver premida (movimento contínuo) |
| `onKeyDown(key, callback)` | Chama `callback()` **uma vez** quando a tecla é premida (ignora repetição automática) |
| `onKeyUp(key, callback)` | Chama `callback()` **uma vez** quando a tecla é largada |
| `isKeyPressed(key)` | `true` se a tecla estiver premida neste momento |

`onKeyDown`/`onKeyUp` disparam no próprio evento do browser **mesmo com o jogo parado** (necessário para "carrega em Enter para recomeçar"). `onKey` só corre durante as atualizações. Várias funções podem ser registadas para a mesma tecla.

### E. Atualização

| Função | Comportamento |
|---|---|
| `onUpdate(callback)` | Regista uma função chamada 60 vezes por segundo enquanto o jogo está ligado, com `deltaTime` em segundos. Podem existir várias; correm pela ordem de registo |

Erros dentro de callbacks do estudante: apanhar com `try/catch`, mostrar na consola com `console.error("TumoPlay: erro dentro de onUpdate:", err)` e **parar o jogo** (`stopGame`), para não inundar a consola com 60 erros por segundo. Aplicar o mesmo aos callbacks de teclado e de `delay`.

### F. Colisões

| Função | Comportamento |
|---|---|
| `checkCollision(a, b)` | `true` se os retângulos se sobrepõem (AABB, estrito: tocar só na aresta **não** conta). Devolve `false` se algum estiver invisível, removido, ou for `null`/`undefined`, ou se `a === b` |
| `checkCollisionWithList(sprite, list)` | Devolve o **primeiro** sprite de `list` que colide com `sprite`, ou `null`. Ignora elementos inválidos ou removidos |

Devolver o sprite (e não `true`) permite ao estudante fazer `let coin = checkCollisionWithList(player, coins); if (coin) { … }` — documentar este padrão.

### G. Tempo e aleatoriedade

| Função | Comportamento |
|---|---|
| `random(min, max)` | Decimal em `[min, max)`. Se `min > max`, troca-os |
| `randomInt(min, max)` | Inteiro em `[min, max]` (**inclui ambos os limites**). Arredonda os limites para dentro (`ceil(min)`, `floor(max)`). Se `min > max`, troca-os |
| `delay(ms, callback)` | Ver 2.11. Devolve um id |
| `cancelDelay(id)` | Cancela; ids inválidos são ignorados |

### H. Interface de jogo

| Função | Comportamento |
|---|---|
| `setScore(value)` / `addScore(value)` / `getScore()` | Pontuação numérica (omissão de `addScore`: 1). Ativa o HUD |
| `setLives(value)` / `getLives()` | Vidas; valores negativos ficam em 0. `setLives` ativa o HUD |
| `showMessage(text)` / `hideMessage()` | Mensagem central (ver 2.10) |

Não existe `addLives`/`loseLife`: o estudante escreve `setLives(getLives() - 1)`, o que é pedagógico de propósito.

---

## 5. Ficheiros a entregar

```
tumo-play/
├── index.html           # Página do Playground
├── tumoplay.js          # Biblioteca TumoPlay Core
├── style.css            # Visual do Playground
├── game.js              # Lógica do Playground (código "do estudante")
├── exemplo-basico.html  # Exemplo mínimo: criar e mover um jogador
└── README.md            # Documentação em português europeu
```

Mais nenhum ficheiro no entregável. Nada de `package.json`, `node_modules`, configuração de lint, etc.

### 5.1 `index.html`

`lang="pt-PT"`, `meta viewport`, título "TumoPlay Playground". Estrutura:

1. Cabeçalho com o logótipo em texto "TUMO**PLAY**" e o subtítulo "Playground".
2. Uma "moldura arcade" com o `<div id="tumoplay"></div>` onde o canvas é inserido.
3. Uma barra de controlos com um botão **"Reiniciar"** (`id="restart-button"`) e uma linha de ajuda: "Setas para mover · Apanha 10 moedas · Foge do inimigo vermelho · Enter também reinicia".
4. Scripts no fim do `body`, por esta ordem: `tumoplay.js`, depois `game.js`.

Sem fontes externas (nada de Google Fonts).

### 5.2 `style.css`

Estilo arcade, moderno e colorido, adequado a 12–18 anos:

| Elemento | Indicação |
|---|---|
| Fundo da página | Escuro (ex.: `#0d0d1a`) com um gradiente radial subtil |
| Paleta | Ciano neon, magenta, amarelo, em fundo escuro; usar variáveis CSS (`--neon-cyan`, etc.) |
| Moldura do canvas | Borda arredondada, `box-shadow` com brilho neon |
| Canvas | Centrado; adaptável (`max-width: 100%`); com `image-rendering: pixelated` |
| Botão | Grande, legível, com estados `:hover`, `:active` e `:focus-visible` |
| Tipografia | Pilha de fontes do sistema, monoespaçada para títulos |
| Responsivo | Funciona de ~360 px de largura até desktop, sem scroll horizontal |
| Acessibilidade | Contraste suficiente; respeitar `prefers-reduced-motion` em animações decorativas |

### 5.3 `game.js` — TumoPlay Playground

**Este ficheiro é material didático.** Deve parecer código que um formador escreveria à frente da turma: claro, comentado (em inglês, como o resto do código, mas com comentários que expliquem o *porquê*), dividido em secções numeradas, sem abstrações avançadas. Usar `let`/`const`, funções declaradas com `function nome() {}`, `for` clássico ou `for…of` em arrays. **Nada de classes, arrow functions encadeadas, `map`/`filter`/`reduce`, destructuring, operadores ternários aninhados ou optional chaining.** Usar sempre o prefixo `TumoPlay.` (explícito é melhor para principiantes).

Regras do jogo:

1. Cenário 600 × 400, fundo escuro.
2. Jogador: quadrado azul (`#3b82f6` ou semelhante), 32 × 32, posição inicial guardada em variáveis (`START_X`, `START_Y`), por exemplo no canto inferior esquerdo.
3. Movimento com setas usando `TumoPlay.onKey` (ou `isKeyPressed` dentro de `onUpdate`; escolher **um** estilo e explicar no comentário). Velocidade numa variável `playerSpeed = 4`.
4. O jogador **não pode sair do ecrã**: lógica com `if` escrita no `game.js`.
5. Um array `coins` com 5 moedas amarelas (`shape: "circle"`, 20 × 20) em posições aleatórias (`randomInt`), criadas por uma função `createCoin()` chamada dentro de um loop `for`. Evitar criar moedas por cima do jogador (repetir o sorteio, com um `while` simples e um limite de tentativas).
6. Ao tocar numa moeda: remover o sprite (`coin.remove()`), removê-lo do array `coins` (com `indexOf` + `splice`, explicado no comentário), `addScore(1)` e criar uma moeda nova.
7. Inimigo vermelho (32 × 32) com `speedX`/`speedY` aleatórios (sinal aleatório, magnitude 2–3), que ressalta nas paredes com `if` no `game.js` (invertendo a velocidade e corrigindo a posição para dentro do ecrã). Começa longe do jogador.
8. Ao tocar no inimigo: perde uma vida (`setLives(getLives() - 1)`) e volta à posição inicial. Para evitar perder várias vidas de seguida, uma invulnerabilidade curta (~1 s) implementada com uma variável boolean `isInvincible` + `TumoPlay.delay`, e o jogador a piscar (alternar `show`/`hide` ou a cor) durante esse tempo. É lógica do estudante e mostra `delay` em ação.
9. Pontuação 10: `stopGame()` + `showMessage("VITÓRIA!\nCarrega em Reiniciar ou Enter")`.
10. Vidas 0: `stopGame()` + `showMessage("GAME OVER\nCarrega em Reiniciar ou Enter")`.
11. Reiniciar (botão **e** tecla Enter via `onKeyDown`): função `resetGame()` que faz `TumoPlay.clear()`, repõe as variáveis (`coins = []`, etc.), recria jogador, moedas e inimigo, `setScore(0)`, `setLives(3)`, `hideMessage()`, `startGame()`. O mesmo `resetGame()` é usado para o arranque inicial (uma única fonte de verdade). Os callbacks `onUpdate`/`onKey…` são registados **uma vez**, fora de `resetGame()` — explicar no comentário porquê (`clear()` mantém-nos).
12. Depois de clicar em "Reiniciar", chamar `button.blur()`, para que a barra de espaços/Enter não volte a "clicar" no botão.
13. Desenhar algo com a API de desenho, para a demonstrar: por exemplo, uma grelha subtil ou estrelas de fundo com `drawRect`/`drawCircle` num loop (posições geradas uma vez com `random` e guardadas num array), e um `drawText` pequeno com "Moedas: X/10" ou o nome do jogo no fundo.

Cobertura pedagógica obrigatória — o `game.js` deve conter um comentário curto a marcar onde aparece cada conceito (ex.: `// CONCEPT: array`):

| Conceito | Onde |
|---|---|
| Variáveis de estado | `score`/`lives` via API, `isInvincible`, `playerSpeed`, `START_X` |
| Funções | `createCoin`, `resetGame`, `loseLife`, `keepPlayerOnScreen` |
| Funções com parâmetros | Ex.: `createCoin(color)` ou `placeRandomly(sprite)`, `isNearPlayer(x, y, minDistance)` |
| if/else | Limites do ecrã, vitória/derrota, invencibilidade |
| Arrays | `coins`, `stars` |
| Loops | Criar moedas, percorrer moedas para colisões, desenhar estrelas |
| Eventos de teclado | Setas, Enter |
| Colisões | Moedas (`checkCollisionWithList`) e inimigo (`checkCollision`) |
| Números aleatórios | Posições das moedas, velocidade do inimigo, estrelas |

### 5.4 `exemplo-basico.html`

Um único HTML com, no máximo, ~25 linhas de JavaScript inline: `createGame`, um `createSprite` azul, `onKey` nas quatro setas a chamar `player.move(...)`, `startGame()`. Sem CSS externo (um `<style>` mínimo para centrar e escurecer o fundo). Comentários curtos que um estudante do primeiro dia percebe. É o exemplo que se projeta na primeira manhã.

---

## 6. README.md (português europeu)

Tom: claro, caloroso, direto, a pensar em formadores **e** estudantes. Usar "tu". Português europeu (ecrã, ficheiro, utilizador, carregar numa tecla, guardar, telemóvel — nunca "tela", "arquivo", "usuário", "salvar"). Estrutura obrigatória:

1. **O que é o TumoPlay** — 1–2 parágrafos + filosofia ("a biblioteca trata da parte técnica, tu escreves o jogo").
2. **Como executar o projeto** — abrir `index.html` com duplo clique; alternativa com servidor local (extensão Live Server do VS Code; `python -m http.server` como opção para quem já tem Python, sem a tornar obrigatória).
3. **Como utilizar a biblioteca** — o esqueleto mínimo de um jogo (HTML + script).
4. **Lista de funções disponíveis** — tabela-resumo agrupada por módulo (A–H).
5. **Referência detalhada** — cada função com descrição, parâmetros e um exemplo curto e executável.
6. **Exemplos de utilização** — padrões comuns: mover com setas, impedir de sair do ecrã, apanhar objetos de um array, inimigo que ressalta, temporizador, reiniciar.
7. **Como criar um novo jogo** — passo a passo, a partir de uma cópia de `exemplo-basico.html`.
8. **Como utilizar no VS Code** — abrir pasta, Live Server, consola do browser (F12) para ver erros.
9. **Como utilizar num editor online** — CodePen, JSFiddle e StackBlitz: colar o conteúdo de `tumoplay.js` no início do painel de JavaScript (ou num ficheiro à parte no StackBlitz) e o código do jogo a seguir; nota sobre clicar na pré-visualização se as teclas não responderem.
10. **Exemplos de código para principiantes** — 4 a 6 mini-desafios progressivos (ex.: "muda a cor do jogador quando carregas em Espaço", "faz o inimigo acelerar a cada 5 pontos").
11. **Coordenadas e unidades** — diagrama ASCII do sistema de coordenadas; explicar que `move(2, 0)` = 2 píxeis por atualização, 60 atualizações por segundo; nota sobre `drawCircle` usar o centro.
12. **Erros comuns** — esquecer `startGame()`, ordem dos `<script>`, `randomInt` incluir os limites, remover o sprite mas não do array.
13. **Notas de implementação** — decisões tomadas (resumo da secção 2 deste documento) e limitações conhecidas.

---

## 7. Qualidade e testes

### 7.1 Testes automáticos (durante o desenvolvimento, fora do entregável)

Se o ambiente tiver um browser headless disponível (ex.: Playwright já instalado), usa-o para abrir `index.html` e `exemplo-basico.html` e verificar a consola. Se não houver, cria um ficheiro **temporário** `_tests.html` que carrega `tumoplay.js` e corre asserções simples, mostrando os resultados na página e na consola; corre-o se puderes e **apaga-o** antes de terminar (ou move-o para fora de `tumo-play/`). Nunca instales dependências no projeto.

Casos mínimos a cobrir:

| Área | Verificação |
|---|---|
| Arranque | `createGame` cria exatamente um canvas com as dimensões certas; segunda chamada substitui o primeiro |
| Ciclo | `startGame` faz correr `onUpdate`; `stopGame` para-o; `startGame` retoma sem salto de tempo; `deltaTime ≈ 1/60` |
| Independência de framerate | Simular frames de 8 ms e de 33 ms durante 1 s de tempo real → ~60 atualizações em ambos os casos |
| Sprites | Criar, `move`, `setPosition`, `hide`/`show`, `remove`; `getSprites` devolve uma cópia; remover durante `onUpdate` não rebenta |
| Velocidade | `speedX = 2` → +120 px após 60 atualizações |
| Colisões | Sobreposição → true; só tocar na aresta → false; invisível/removido → false; `checkCollisionWithList` devolve o sprite certo ou `null` |
| Aleatoriedade | `randomInt(1, 3)` em 10 000 sorteios produz 1, 2 e 3 e nada fora; `random(5, 5)` = 5; limites trocados funcionam |
| Teclado | Eventos sintéticos `keydown`/`keyup` com `code`: `isKeyPressed`, `onKeyDown` uma só vez com `repeat`, `onKeyUp`, `onKey` contínuo; normalização (`"a"`, `"A"`, `"KeyA"`, `"up"`); `preventDefault` nas setas; não faz `preventDefault` com foco num input; `blur` liberta teclas |
| Delay | Dispara após o tempo de jogo certo; pausa com `stopGame`; `clear` e `cancelDelay` cancelam |
| UI | `setScore`/`addScore`/`getScore`; `setLives(-1)` → 0; HUD invisível até à primeira chamada |
| `clear()` | Remove sprites e delays, repõe pontuação, mantém callbacks |
| Erros | Callback que lança uma exceção → um `console.error` e jogo parado (não 60 por segundo) |
| Globais | Depois de carregar `tumoplay.js`, a única nova global é `TumoPlay` |

### 7.2 Verificação do Playground

1. Abre sem erros na consola, por `file://` e por servidor local.
2. Setas movem o jogador; a página não faz scroll.
3. O jogador não sai do ecrã.
4. Há sempre 5 moedas; apanhar uma soma 1 ponto e cria outra.
5. O inimigo ressalta nas paredes; tocar-lhe tira uma vida, faz voltar ao início e dá ~1 s de invencibilidade a piscar.
6. 10 pontos → mensagem de vitória e jogo parado; 0 vidas → Game Over e jogo parado.
7. Botão e Enter reiniciam e repõem **tudo** (pontos 0, vidas 3, 5 moedas novas, inimigo novo, sem moedas "fantasma" de jogos anteriores, sem callbacks duplicados — ex.: a velocidade do jogador não duplica após vários reinícios).
8. Layout correto a 360 px, 768 px e 1440 px de largura.

### 7.3 Critérios de "feito"

Todos os ficheiros da secção 5 existem e estão completos; os testes da secção 7.1 passam; a checklist 7.2 foi verificada; zero erros e zero avisos na consola no uso normal; zero dependências externas; README completo com as 13 secções. No fim, apresenta um resumo curto: ficheiros criados, como foi testado, e qualquer limitação conhecida.

---

## 8. Fora do âmbito (não fazer)

Os três jogos completos; som; imagens/spritesheets nos sprites; animações por frames; rotação/escala; física (gravidade, atrito); cenas/níveis; câmara/scroll; rato/toque; gamepad; guardar dados (`localStorage`); TypeScript; testes com framework; ES modules; minificação.
