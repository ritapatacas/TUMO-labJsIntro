# TumoPlay Core

A tiny JavaScript library for making 2D games in TUMO programming labs.

```
tumo-play/
├── README.md                  ← you are here
├── lib/
│   └── tumoplay.js            ← the library (one single file)
├── playground/
│   ├── index.html             ← the test game "TumoPlay Playground"
│   ├── style.css
│   ├── game.js                ← the game code (written the way a student would write it)
│   └── exemplo-basico.html    ← the simplest example: a square that moves
└── tests/
    ├── tests.html             ← automatic library tests (open in the browser)
    └── run_tests.py           ← runs everything in a headless browser (instructors only)
```

> The library's messages to students (errors, warnings, HUD, Playground texts) are in European Portuguese, because the labs are taught in Portuguese.

---

## 1. What is TumoPlay

TumoPlay is a library for learning JavaScript by making games. It draws on the screen, listens to the keyboard, measures time and detects collisions: all the boring, technical browser stuff.

**The library handles the technical part, you write the game.** TumoPlay doesn't know what a coin, an enemy or a level is. The game rules (when you win, when you lose, what happens when you pick up a coin) are yours to write, with variables, functions, `if`, loops and arrays. That's how you learn to program.

---

## 2. How to run the project

**Simplest way:** open the `playground` folder and double-click `index.html`. The game opens in the browser. Nothing to install.

**With a local server (optional):**

- In VS Code, install the **Live Server** extension, right-click `index.html` and choose **Open with Live Server**.
- If you already have Python, open a terminal in the `tumo-play` folder and type `python -m http.server`. Then open `http://localhost:8000/playground/` in the browser. (Python is not required.)

---

## 3. How to use the library

This is the minimal skeleton of a game:

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>My game</title>
</head>
<body>
  <div id="tumoplay"></div>   <!-- the game appears here -->

  <script src="../lib/tumoplay.js"></script>   <!-- 1st the library -->
  <script>
    // 2nd your game
    TumoPlay.createGame({ width: 600, height: 400 });

    let player = TumoPlay.createSprite({ x: 50, y: 50, color: "#3b82f6" });

    TumoPlay.onKey("ArrowRight", function () {
      player.move(3, 0);
    });

    TumoPlay.startGame();
  </script>
</body>
</html>
```

The order is always: **create the game → create things → say what happens → start**.

---

## 4. List of available functions

Always write `TumoPlay.` before the name (for example `TumoPlay.createGame(...)`).

| Group | Functions |
|---|---|
| **A. Setup** | `createGame`, `startGame`, `stopGame`, `clear`, `isRunning`, `width`, `height` |
| **B. Drawing** | `drawRect`, `drawCircle`, `drawText`, `drawImage`, `clearCanvas` |
| **C. Sprites** | `createSprite`, `removeSprite`, `getSprites` and, on each sprite: `move`, `setPosition`, `setColor`, `show`, `hide`, `remove` |
| **D. Keyboard** | `onKey`, `onKeyDown`, `onKeyUp`, `isKeyPressed` |
| **E. Update** | `onUpdate` |
| **F. Collisions** | `checkCollision`, `checkCollisionWithList` |
| **G. Time and randomness** | `random`, `randomInt`, `delay`, `cancelDelay` (extra) |
| **H. Game UI** | `setScore`, `addScore`, `getScore`, `setLives`, `getLives`, `showMessage`, `hideMessage` |

---

## 5. Detailed reference

### A. Setup

**`createGame(options)`** creates the game area (the *canvas*). If the page has an element with `id="tumoplay"`, the game appears inside it; otherwise at the end of the page.

| Option | Default | Meaning |
|---|---|---|
| `width` | 600 | Width in pixels |
| `height` | 400 | Height in pixels |
| `background` | `"#111111"` | Background colour |
| `title` | — | Browser tab title |

```js
TumoPlay.createGame({ width: 800, height: 450, background: "navy", title: "Pixel Quest" });
```

**`startGame()`** gets the game going: `onUpdate`, `onKey`, speeds and `delay` start working.

**`stopGame()`** pauses the game. The screen keeps being drawn, so a message like "Game Over" still shows.

```js
TumoPlay.stopGame();
TumoPlay.showMessage("PAUSE");
```

**`clear()`** wipes the world to start over: sprites, pending `delay`s, drawings, message, score and lives. It does **not** remove the functions registered with `onUpdate` and `onKey…`.

**`isRunning()`** returns `true` if the game is running.

```js
if (TumoPlay.isRunning()) {
  TumoPlay.stopGame();
} else {
  TumoPlay.startGame();
}
```

**`TumoPlay.width`** and **`TumoPlay.height`** give the game size, so you don't write "magic" numbers:

```js
player.x = TumoPlay.width - player.width;   // against the right edge
```

### B. Drawing

> **Important:** what you draw with `draw…` sits **behind** the sprites, and drawings are cleared at every update. To keep something on screen, draw it **inside `onUpdate`**.

**`drawRect(x, y, width, height, color)`** draws a rectangle (`x, y` = top-left corner).

```js
TumoPlay.drawRect(0, 380, 600, 20, "green");   // ground
```

**`drawCircle(x, y, radius, color)`** draws a circle. ⚠️ Here `x, y` is the circle's **centre**.

```js
TumoPlay.drawCircle(300, 200, 50, "yellow");   // sun in the middle of the screen
```

**`drawText(text, x, y, options)`** writes text. Numbers work too.

| Option | Default |
|---|---|
| `size` | 20 |
| `color` | `"white"` |
| `font` | `"Courier New, monospace"` |
| `align` | `"left"` (also `"center"` or `"right"`) |
| `bold` | `false` |

With `align: "center"`, `x` becomes the **middle** of the text.

```js
TumoPlay.drawText("Level 1", 300, 20, { size: 30, color: "cyan", align: "center", bold: true });
```

**`drawImage(image, x, y, width, height)`** draws an image from a URL or an image element. While it loads, nothing is drawn (no error). Without `width`/`height`, it uses the original size.

```js
TumoPlay.drawImage("background.png", 0, 0, 600, 400);
```

**`clearCanvas()`** clears the `draw…` drawings. It doesn't touch sprites.

Colours: `"red"`, `"#ff0000"`, `"#f00"`, `"rgb(255, 0, 0)"` or `"hsl(0, 100%, 50%)"`.

### C. Sprites

A **sprite** is a game object (player, coin, enemy...). Once created, it is drawn automatically.

**`createSprite(options)`**

| Property | Default | Meaning |
|---|---|---|
| `x`, `y` | 0 | Top-left corner |
| `width`, `height` | 32 | Size |
| `color` | `"white"` | Colour |
| `visible` | `true` | Whether it shows |
| `speedX`, `speedY` | 0 | Pixels it moves on its own each update |
| `shape` | `"rect"` | `"rect"` (rectangle) or `"circle"` |
| `name` | `""` | A name to help you debug |

You can change properties directly:

```js
let coin = TumoPlay.createSprite({ x: 100, y: 50, width: 20, height: 20, color: "gold", shape: "circle" });
coin.x = 200;
coin.speedY = 1;   // the coin falls slowly
```

Methods on each sprite:

| Method | What it does |
|---|---|
| `sprite.move(dx, dy)` | Moves `dx` right and `dy` down |
| `sprite.setPosition(x, y)` | Jumps to the position |
| `sprite.setColor(color)` | Changes the colour |
| `sprite.show()` / `sprite.hide()` | Shows / hides |
| `sprite.remove()` | Removes the sprite from the game |

**`removeSprite(sprite)`** does the same as `sprite.remove()`. Afterwards `sprite.removed` is `true`.

**`getSprites()`** returns a list (copy) of all sprites in the game.

```js
console.log("There are " + TumoPlay.getSprites().length + " sprites in the game");
```

### D. Keyboard

Accepted key names: `"ArrowUp"`, `"ArrowDown"`, `"ArrowLeft"`, `"ArrowRight"` (or `"up"`, `"down"`, `"left"`, `"right"`), `"Space"`, `"Enter"`, letters (`"a"` or `"A"`) and digits (`"1"`).

**`onKey(key, callback)`** calls the function **on every update** while the key is held. Ideal for movement.

```js
TumoPlay.onKey("ArrowLeft", function () {
  player.move(-4, 0);
});
```

**`onKeyDown(key, callback)`** calls the function **once** when you press the key. Works even with the game stopped.

```js
TumoPlay.onKeyDown("Space", function () {
  player.setColor("orange");
});
```

**`onKeyUp(key, callback)`** calls the function **once** when you release the key.

**`isKeyPressed(key)`** returns `true` if the key is held right now.

```js
TumoPlay.onUpdate(function () {
  if (TumoPlay.isKeyPressed("Shift")) {
    playerSpeed = 8;
  } else {
    playerSpeed = 4;
  }
});
```

### E. Update

**`onUpdate(callback)`** registers a function that runs **60 times per second** while the game is running. It receives `deltaTime` (one update's duration in seconds, always ≈ 0.0167), but you usually don't need it.

```js
TumoPlay.onUpdate(function (deltaTime) {
  if (player.x > TumoPlay.width) {
    player.x = 0;
  }
});
```

If there's an error inside this function, TumoPlay shows it in the console **once** and stops the game.

### F. Collisions

**`checkCollision(a, b)`** returns `true` if the two sprites overlap (just touching an edge doesn't count). Hidden or removed sprites never collide.

```js
if (TumoPlay.checkCollision(player, enemy)) {
  TumoPlay.setLives(TumoPlay.getLives() - 1);
}
```

**`checkCollisionWithList(sprite, list)`** searches an array and returns **the sprite** you touched, or `null`:

```js
let coin = TumoPlay.checkCollisionWithList(player, coins);
if (coin) {
  coin.remove();
  TumoPlay.addScore(1);
}
```

### G. Time and randomness

**`random(min, max)`** returns a decimal number between `min` (included) and `max` (excluded).

**`randomInt(min, max)`** returns a whole number between `min` and `max`, **including both**.

```js
let die = TumoPlay.randomInt(1, 6);   // 1, 2, 3, 4, 5 or 6
```

**`delay(ms, callback)`** calls the function after `ms` milliseconds of game time. If the game stops, the time stops too. Returns a number (the id).

```js
TumoPlay.delay(2000, function () {
  TumoPlay.hideMessage();
});
```

**`cancelDelay(id)`** (extra) cancels a `delay`.

```js
let timer = TumoPlay.delay(5000, explode);
TumoPlay.cancelDelay(timer);   // it won't explode after all
```

### H. Game UI

Score and lives only appear on screen after you first use `setScore`, `addScore` or `setLives`.

| Function | What it does |
|---|---|
| `setScore(value)` | Sets the score |
| `addScore(value)` | Adds to the score (no value adds 1) |
| `getScore()` | Returns the score |
| `setLives(value)` | Sets lives (never below 0) |
| `getLives()` | Returns lives |
| `showMessage(text)` | Shows a message in the middle of the screen (`\n` = new line) |
| `hideMessage()` | Hides the message |

```js
TumoPlay.setLives(TumoPlay.getLives() - 1);
if (TumoPlay.getLives() === 0) {
  TumoPlay.stopGame();
  TumoPlay.showMessage("GAME OVER\nPress Enter");
}
```

---

## 6. Usage examples

**Move with the arrows**

```js
let speed = 4;
TumoPlay.onKey("ArrowUp", function () { player.move(0, -speed); });
TumoPlay.onKey("ArrowDown", function () { player.move(0, speed); });
TumoPlay.onKey("ArrowLeft", function () { player.move(-speed, 0); });
TumoPlay.onKey("ArrowRight", function () { player.move(speed, 0); });
```

**Keep on screen**

```js
TumoPlay.onUpdate(function () {
  if (player.x < 0) {
    player.x = 0;
  }
  if (player.x > TumoPlay.width - player.width) {
    player.x = TumoPlay.width - player.width;
  }
});
```

**Pick up objects from an array**

```js
let coins = [];
for (let i = 0; i < 5; i++) {
  let coin = TumoPlay.createSprite({
    x: TumoPlay.randomInt(0, 580), y: TumoPlay.randomInt(0, 380),
    width: 20, height: 20, color: "gold", shape: "circle"
  });
  coins.push(coin);
}

TumoPlay.onUpdate(function () {
  let coin = TumoPlay.checkCollisionWithList(player, coins);
  if (coin) {
    coin.remove();                          // off the screen
    coins.splice(coins.indexOf(coin), 1);   // out of the array
    TumoPlay.addScore(1);
  }
});
```

**Bouncing enemy**

```js
let enemy = TumoPlay.createSprite({ x: 300, y: 100, color: "red", speedX: 3, speedY: 2 });

TumoPlay.onUpdate(function () {
  if (enemy.x < 0 || enemy.x > TumoPlay.width - enemy.width) {
    enemy.speedX = -enemy.speedX;
  }
  if (enemy.y < 0 || enemy.y > TumoPlay.height - enemy.height) {
    enemy.speedY = -enemy.speedY;
  }
});
```

**Timer**

```js
TumoPlay.showMessage("Get ready!");
TumoPlay.delay(1500, function () {
  TumoPlay.hideMessage();
});
```

**Restart**

```js
function resetGame() {
  TumoPlay.clear();
  coins = [];
  player = TumoPlay.createSprite({ x: 30, y: 30, color: "#3b82f6" });
  TumoPlay.setScore(0);
  TumoPlay.setLives(3);
  TumoPlay.startGame();
}

// Register callbacks only ONCE, outside resetGame()!
TumoPlay.onKeyDown("Enter", function () {
  resetGame();
});

resetGame();
```

---

## 7. How to create a new game

1. Copy `playground/exemplo-basico.html` and give it a new name, e.g. `playground/my-game.html`. (If you put it in another folder, fix the path in `<script src="../lib/tumoplay.js">`.)
2. Open it in the browser and check the blue square moves with the arrows.
3. Change the player's size, colour and speed.
4. Add a `TumoPlay.onUpdate(function () { ... })` with your game's rules.
5. Create more sprites (coins, enemies) and keep them in variables or arrays.
6. Use `checkCollision` to know when they touch.
7. Add the score (`addScore`) and an end message (`showMessage`).
8. Save and reload the page (F5) after each change.

When the script gets big, move it to its own `.js` file, like `playground/game.js`.

---

## 8. Using it in VS Code

1. **File → Open Folder…** and choose the `tumo-play` folder.
2. Install the **Live Server** extension (squares icon on the left, search "Live Server").
3. Right-click your `.html` → **Open with Live Server**. Each time you save, the page reloads.
4. To see errors, open the **browser console** with **F12** (or `Cmd + Option + J` on Mac) and pick the **Console** tab. TumoPlay messages start with `TumoPlay:`.

---

## 9. Using it in an online editor

**CodePen / JSFiddle**

1. In the **HTML** panel, write `<div id="tumoplay"></div>`.
2. In the **JS** panel, paste **all** of `lib/tumoplay.js` at the top.
3. Below it, write your game code.

**StackBlitz** ("Static" / HTML project)

1. Create a `tumoplay.js` file and paste the contents of `lib/tumoplay.js` into it.
2. In `index.html`, load `<script src="tumoplay.js"></script>` first, then your game script.

> If the keys don't respond, **click once on the game preview**. The preview lives in another "window" inside the page and needs focus.

---

## 10. Beginner code challenges

From easiest to hardest. Start from `exemplo-basico.html`.

1. **Colour on Space:** when you press Space, the player turns orange. When you release it, back to blue. *(Hint: `onKeyDown` and `onKeyUp`.)*
2. **Turbo:** while you hold Shift, the player moves twice as fast. *(Hint: `isKeyPressed` inside `onUpdate`.)*
3. **Wrap around:** when the player leaves on the right, they appear on the left. *(Hint: `if (player.x > TumoPlay.width)`.)*
4. **Single coin:** create a coin at a random position. When you catch it, you get 1 point and it jumps elsewhere. *(Hint: `randomInt` and `setPosition`.)*
5. **Faster enemy:** in the Playground, make the enemy speed up a little every 5 points. *(Hint: `getScore() % 5 === 0`.)*
6. **Clock:** give the player 30 seconds. When time is up, show "TIME!" and stop the game. *(Hint: add up `deltaTime` in a variable, or use `delay`.)*

---

## 11. Coordinates and units

```
(0,0) ───────────── x grows to the right ─────────►  (600,0)
  │
  │     (x, y) ┌──────────┐
  │            │  sprite  │  height
  │            └──────────┘
  │               width
  y grows
  downwards
  │
  ▼
(0,400)                                             (600,400)
```

- (0, 0) is the **top-left corner**. To go **down**, `y` **increases**.
- The `x, y` of a sprite, `drawRect`, `drawText` or `drawImage` is its **top-left corner**.
- ⚠️ In `drawCircle`, `x, y` is the circle's **centre**.
- `move(2, 0)` moves **2 pixels per update**. There are always **60 updates per second** on any computer, so `move(2, 0)` = 120 pixels per second. The same goes for `speedX` and `speedY`.

---

## 12. Common mistakes

| Problem | Cause | Fix |
|---|---|---|
| Nothing moves | You forgot `startGame()` | Call `TumoPlay.startGame()` at the end |
| `TumoPlay is not defined` | `<script>` tags in the wrong order, or wrong path | `tumoplay.js` first, then your game. Check the path `../lib/tumoplay.js` |
| `TumoPlay: chama createGame() antes de…` | You created sprites before creating the game | `createGame()` must come first |
| Sometimes you get one number too many | `randomInt(0, 600)` **includes** 600 | Use `randomInt(0, 600 - sprite.width)` |
| You pick up "ghost" coins | You removed the sprite but not from the array | `coin.remove()` **and** `coins.splice(coins.indexOf(coin), 1)` |
| A drawing flashes and disappears | You drew outside `onUpdate` | Drawings are cleared every update: draw inside `onUpdate` |
| After restarting, the player is faster | You registered `onKey` inside `resetGame()` | Register callbacks only once, outside `resetGame()` |
| Keys don't respond (online editor) | The preview has no focus | Click on the game |

---

## 13. Implementation notes

For instructors and the curious:

- **Fixed step:** the engine always does 60 updates per second using a time accumulator (max 5 per frame; gaps over 250 ms are dropped). So speed is the same on a 60 Hz or 120 Hz screen, and `deltaTime` is always 1/60.
- **Order of each update:** apply `speedX`/`speedY` → finished `delay`s → `onKey` → `onUpdate` → clear "just pressed" state.
- **Draw queue:** `draw…` doesn't draw immediately. It stores a command, and the queue is emptied at the start of each update. Layers: background → drawings → sprites → HUD → message.
- **`stopGame()`** pauses only the logic. Drawing continues, so messages appear.
- **`clear()`** resets the world but keeps callbacks. **`clearCanvas()`** only clears drawings.
- **Keyboard:** listened to on `window` and normalised from `event.code` (independent of Caps Lock and keyboard layout). Arrows and space don't scroll the page, except while typing in a text field. Switching windows releases all keys.
- **Collisions:** rectangles (AABB), even for `"circle"` sprites.
- **Errors in callbacks:** shown once in the console and the game stops.
- **Extra decisions** (not specified, chosen for simplicity):
  - Library, Playground and tests live in separate folders (`lib/`, `playground/`, `tests/`). The Playground loads `../lib/tumoplay.js`.
  - In the Playground, the player blinks by changing colour (not with `hide()`), because a hidden sprite doesn't collide and couldn't pick up coins.
  - A cancelled or invalid `delay` id is simply ignored.
  - Calling `createGame()` twice replaces the previous game, including its callbacks.
  - In `showMessage`, the first line is bigger than the rest (title + instructions).
- **Tests:** `tests/tests.html` runs 52 checks in the browser, replacing the browser clock with a manual one so results are always the same. `tests/run_tests.py` (Python + Playwright, optional, instructors only) runs those tests and also plays the Playground automatically, via `file://` and a local server, at 360, 768 and 1440 px wide.
- **Known limitations:** no sound, sprite images, animations, rotation, physics, scenes, mouse/touch or gamepad (on purpose, at this stage). The HUD is always on top, so avoid placing important objects in the top 40 pixels.
