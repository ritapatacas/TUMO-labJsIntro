// =====================================================================
// TumoPlay Playground
// Collect 10 coins, avoid the red enemy. You have 3 lives.
// This is "student code": everything here uses only TumoPlay + plain JS.
// =====================================================================


// ---------------------------------------------------------------------
// 1. Settings and state variables
// ---------------------------------------------------------------------

// CONCEPT: variables (constants that never change during the game)
const GAME_WIDTH = 600;
const GAME_HEIGHT = 400;
const START_X = 30;                 // player start position: bottom-left corner
const START_Y = GAME_HEIGHT - 62;
const COINS_ON_SCREEN = 5;
const COINS_TO_WIN = 10;
const PLAYER_COLOR = "#3b82f6";

// CONCEPT: state variables (they change while we play)
let playerSpeed = 4;                // pixels per update (60 updates per second)
let player = null;
let enemy = null;
let coins = [];                     // CONCEPT: array (all the coins on screen)
let isInvincible = false;           // true for ~1 second after being hit
let blinkCounter = 0;               // counts updates, used to make the player blink


// ---------------------------------------------------------------------
// 2. Create the game
// ---------------------------------------------------------------------

TumoPlay.createGame({
  width: GAME_WIDTH,
  height: GAME_HEIGHT,
  background: "#0b0b1e",
  title: "TumoPlay Playground"
});


// ---------------------------------------------------------------------
// 3. Background stars (drawn with the drawing API)
// ---------------------------------------------------------------------

// CONCEPT: array + random numbers
// We choose the star positions ONCE and keep them in an array.
// If we picked new random positions every update, the stars would flicker.
let stars = [];

// CONCEPT: loop
for (let i = 0; i < 40; i++) {
  let star = {
    x: TumoPlay.random(0, GAME_WIDTH),
    y: TumoPlay.random(0, GAME_HEIGHT),
    size: TumoPlay.random(0.5, 1.8)
  };
  stars.push(star);
}

function drawBackground() {
  // Drawings are cleared at every update, so we draw the stars every time.
  // CONCEPT: loop over an array
  for (const star of stars) {
    TumoPlay.drawCircle(star.x, star.y, star.size, "rgba(255, 255, 255, 0.6)");
  }

  let coinsText = "Moedas: " + TumoPlay.getScore() + "/" + COINS_TO_WIN;
  TumoPlay.drawText(coinsText, GAME_WIDTH / 2, GAME_HEIGHT - 26, {
    size: 16,
    color: "#ffe14d",
    align: "center"
  });
}


// ---------------------------------------------------------------------
// 4. Helper functions
// ---------------------------------------------------------------------

// CONCEPT: function with parameters + return value
// Is the point (x, y) closer to the player than minDistance?
function isNearPlayer(x, y, minDistance) {
  let distanceX = Math.abs(x - player.x);
  let distanceY = Math.abs(y - player.y);
  return distanceX < minDistance && distanceY < minDistance;
}

// CONCEPT: function with a parameter
// Put a sprite in a random place that is not on top of the player.
function placeRandomly(sprite) {
  let x = TumoPlay.randomInt(0, GAME_WIDTH - sprite.width);
  let y = TumoPlay.randomInt(40, GAME_HEIGHT - sprite.height - 30);   // keep away from the HUD and the text
  let tries = 0;

  // CONCEPT: while loop (with a limit, so it can never run forever)
  while (isNearPlayer(x, y, 80) && tries < 20) {
    x = TumoPlay.randomInt(0, GAME_WIDTH - sprite.width);
    y = TumoPlay.randomInt(40, GAME_HEIGHT - sprite.height - 30);
    tries = tries + 1;
  }

  sprite.setPosition(x, y);
}

// CONCEPT: function
function createCoin() {
  let coin = TumoPlay.createSprite({
    width: 20,
    height: 20,
    color: "#ffd60a",
    shape: "circle",
    name: "coin"
  });
  placeRandomly(coin);
  coins.push(coin);
}

function createEnemy() {
  enemy = TumoPlay.createSprite({
    x: GAME_WIDTH - 80,             // top-right corner: far from the player
    y: 50,
    width: 32,
    height: 32,
    color: "#ef4444",
    name: "enemy"
  });

  // CONCEPT: random numbers
  // Speed between 2 and 3, going left or right (and up or down) at random.
  enemy.speedX = TumoPlay.random(2, 3);
  enemy.speedY = TumoPlay.random(2, 3);
  if (TumoPlay.randomInt(0, 1) === 0) {
    enemy.speedX = -enemy.speedX;
  }
  if (TumoPlay.randomInt(0, 1) === 0) {
    enemy.speedY = -enemy.speedY;
  }
}

// CONCEPT: if/else (screen limits)
function keepPlayerOnScreen() {
  if (player.x < 0) {
    player.x = 0;
  }
  if (player.x > GAME_WIDTH - player.width) {
    player.x = GAME_WIDTH - player.width;
  }
  if (player.y < 0) {
    player.y = 0;
  }
  if (player.y > GAME_HEIGHT - player.height) {
    player.y = GAME_HEIGHT - player.height;
  }
}

// The library moves the enemy using speedX/speedY.
// Bouncing is game logic, so we write it ourselves.
function bounceEnemy() {
  if (enemy.x < 0) {
    enemy.x = 0;
    enemy.speedX = -enemy.speedX;
  } else if (enemy.x > GAME_WIDTH - enemy.width) {
    enemy.x = GAME_WIDTH - enemy.width;
    enemy.speedX = -enemy.speedX;
  }

  if (enemy.y < 0) {
    enemy.y = 0;
    enemy.speedY = -enemy.speedY;
  } else if (enemy.y > GAME_HEIGHT - enemy.height) {
    enemy.y = GAME_HEIGHT - enemy.height;
    enemy.speedY = -enemy.speedY;
  }
}

function collectCoin(coin) {
  // 1) Remove it from the screen (the library stops drawing it)...
  coin.remove();

  // 2) ...and ALSO from our own array. The library does not know about
  // our "coins" array, so we must do it. indexOf finds the position,
  // splice(position, 1) removes exactly one element at that position.
  let index = coins.indexOf(coin);
  if (index !== -1) {
    coins.splice(index, 1);
  }

  TumoPlay.addScore(1);

  // CONCEPT: if/else (victory)
  if (TumoPlay.getScore() >= COINS_TO_WIN) {
    TumoPlay.stopGame();
    TumoPlay.showMessage("VITÓRIA!\nCarrega em Reiniciar ou Enter");
  } else {
    createCoin();   // always keep 5 coins on screen
  }
}

// CONCEPT: function (losing a life)
function loseLife() {
  TumoPlay.setLives(TumoPlay.getLives() - 1);
  player.setPosition(START_X, START_Y);

  // CONCEPT: if/else (defeat)
  if (TumoPlay.getLives() <= 0) {
    TumoPlay.stopGame();
    TumoPlay.showMessage("GAME OVER\nCarrega em Reiniciar ou Enter");
    return;
  }

  // Short invincibility, so one touch does not take several lives.
  isInvincible = true;
  blinkCounter = 0;
  TumoPlay.delay(1000, function () {
    isInvincible = false;
    player.setColor(PLAYER_COLOR);
  });
}

// While invincible, switch between two colours every 6 updates.
// (We change the colour instead of hiding the player, because hidden
// sprites do not collide and the player could not catch coins.)
function blinkPlayer() {
  if (isInvincible) {
    blinkCounter = blinkCounter + 1;
    if (blinkCounter % 12 < 6) {
      player.setColor("white");
    } else {
      player.setColor(PLAYER_COLOR);
    }
  }
}


// ---------------------------------------------------------------------
// 5. Start / restart
// ---------------------------------------------------------------------

// One single function to start AND restart: a single source of truth.
function resetGame() {
  TumoPlay.clear();          // removes sprites, delays, message and score

  coins = [];
  isInvincible = false;
  blinkCounter = 0;

  player = TumoPlay.createSprite({
    x: START_X,
    y: START_Y,
    width: 32,
    height: 32,
    color: PLAYER_COLOR,
    name: "player"
  });

  // CONCEPT: loop (create the coins)
  for (let i = 0; i < COINS_ON_SCREEN; i++) {
    createCoin();
  }

  createEnemy();

  TumoPlay.setScore(0);
  TumoPlay.setLives(3);
  TumoPlay.hideMessage();
  TumoPlay.startGame();
}


// ---------------------------------------------------------------------
// 6. Keyboard
// ---------------------------------------------------------------------

// CONCEPT: keyboard events
// We use onKey: it runs on EVERY update while the key is held down,
// which gives smooth, continuous movement.
//
// IMPORTANT: we register the callbacks only ONCE, here, outside resetGame().
// TumoPlay.clear() keeps them, so registering them inside resetGame()
// would add a copy at every restart and the player would get faster and faster.
TumoPlay.onKey("ArrowUp", function () {
  player.move(0, -playerSpeed);
});
TumoPlay.onKey("ArrowDown", function () {
  player.move(0, playerSpeed);
});
TumoPlay.onKey("ArrowLeft", function () {
  player.move(-playerSpeed, 0);
});
TumoPlay.onKey("ArrowRight", function () {
  player.move(playerSpeed, 0);
});

// onKeyDown runs once per press, even when the game is stopped.
TumoPlay.onKeyDown("Enter", function () {
  resetGame();
});

let restartButton = document.getElementById("restart-button");
restartButton.addEventListener("click", function () {
  resetGame();
  // Remove focus from the button, so Space/Enter do not "click" it again.
  restartButton.blur();
});


// ---------------------------------------------------------------------
// 7. Game loop (60 times per second)
// ---------------------------------------------------------------------

TumoPlay.onUpdate(function (deltaTime) {
  drawBackground();
  keepPlayerOnScreen();
  bounceEnemy();
  blinkPlayer();

  // CONCEPT: collisions with an array.
  // checkCollisionWithList goes through the array for us (a loop inside)
  // and gives back the coin we touched, or null.
  let coin = TumoPlay.checkCollisionWithList(player, coins);
  if (coin) {
    collectCoin(coin);
  }

  // CONCEPT: collision between two sprites + if/else
  if (TumoPlay.isRunning() && !isInvincible && TumoPlay.checkCollision(player, enemy)) {
    loseLife();
  }
});


// ---------------------------------------------------------------------
// 8. Go!
// ---------------------------------------------------------------------

resetGame();
