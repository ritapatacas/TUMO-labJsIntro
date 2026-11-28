// TumoPlay Playground (complete version)
// Collect as many coins as you can, avoid the red enemy. You have 3 lives.
// Every coin makes the enemy a little faster.
//
// The explanations are inside "Notes" regions. In VS Code, fold them all with
// Cmd+K Cmd+8 (Ctrl+K Ctrl+8), unfold with Cmd+K Cmd+9.


// ---------------------------------------------------------------------
// 1. Settings and state
// ---------------------------------------------------------------------

// #region Notes
// CONCEPT: variables. The first ones never change during the game,
// the "state" ones change while we play.
// playerSpeed is in pixels per update (60 updates per second).
// coins is an ARRAY: all the coins on screen.
// isInvincible is true for ~1 second after being hit.
// blinkCounter counts updates, used to make the player blink.
// #endregion
let width = 600;
let height = 400;

let color = {
  blue: "#3b82f6",
  red: "#ef4444",
  yellow: "#ffd60a",
  lightYellow: "#ffe14d",
  white: "white",
  night: "#0b0b1e",
  star: "rgba(255, 255, 255, 0.6)"
};

let START_X = 30;
let START_Y = height - 62;
let COINS_ON_SCREEN = 5;
let ENEMY_SPEED_UP = 0.3;

let playerSpeed = 4;
let player = null;
let enemy = null;
let coins = [];
let isInvincible = false;
let blinkCounter = 0;


// ---------------------------------------------------------------------
// 2. Create the game
// ---------------------------------------------------------------------

Game.setup.createGame({
  width: width,
  height: height,
  background: color.night,
  title: "TumoPlay Playground"
});


// ---------------------------------------------------------------------
// 3. Background stars
// ---------------------------------------------------------------------

// #region Notes
// CONCEPT: array + random numbers + loop.
// We choose the star positions ONCE and keep them in an array.
// If we picked new random positions every update, the stars would flicker.
// Drawings are cleared at every update, so we draw the stars every time.
// #endregion
let stars = [];

for (let i = 0; i < 40; i++) {
  let star = {
    x: random(0, width),
    y: random(0, height),
    size: random(0.5, 1.8)
  };
  stars.push(star);
}

function drawBackground() {
  for (let star of stars) {
    Game.draw.circle(star.x, star.y, star.size, color.star);
  }

  let coinsText = "Moedas: " + Game.ui.getScore();
  Game.draw.text(coinsText, width / 2, height - 26, {
    size: 16,
    color: color.lightYellow,
    align: "center"
  });
}


// ---------------------------------------------------------------------
// 4. Helper functions
// ---------------------------------------------------------------------

// #region Notes
// isNearPlayer: function with parameters + return value.
//   Is the point (x, y) closer to the player than minDistance?
// placeRandomly: puts a sprite in a random place that is not on top of
//   the player. The while loop has a limit (20 tries), so it can never
//   run forever. y starts at 40 to keep away from the HUD and the text.
// #endregion
function isNearPlayer(x, y, minDistance) {
  let distanceX = Math.abs(x - player.x);
  let distanceY = Math.abs(y - player.y);
  return distanceX < minDistance && distanceY < minDistance;
}

function placeRandomly(sprite) {
  let x = randomInt(0, width - sprite.width);
  let y = randomInt(40, height - sprite.height - 30);
  let tries = 0;

  while (isNearPlayer(x, y, 80) && tries < 20) {
    x = randomInt(0, width - sprite.width);
    y = randomInt(40, height - sprite.height - 30);
    tries = tries + 1;
  }

  sprite.setPosition(x, y);
}

function createCoin() {
  let coin = Game.createSprite({
    width: 20,
    height: 20,
    color: color.yellow,
    shape: "circle",
    name: "coin"
  });
  placeRandomly(coin);
  coins.push(coin);
}

// #region Notes
// Random speed between 2 and 3, going left or right (and up or down) at random.
// #endregion
function createEnemy() {
  enemy = Game.createSprite({
    x: width - 80,
    y: 50,
    width: 32,
    height: 32,
    color: color.red,
    name: "enemy"
  });

  enemy.speedX = random(2, 3);
  enemy.speedY = random(2, 3);
  if (randomInt(0, 1) === 0) {
    enemy.speedX = -enemy.speedX;
  }
  if (randomInt(0, 1) === 0) {
    enemy.speedY = -enemy.speedY;
  }
}

function keepPlayerOnScreen() {
  if (player.x < 0) {
    player.x = 0;
  }
  if (player.x > width - player.width) {
    player.x = width - player.width;
  }
  if (player.y < 0) {
    player.y = 0;
  }
  if (player.y > height - player.height) {
    player.y = height - player.height;
  }
}

// #region Notes
// The library moves the enemy using speedX/speedY.
// Bouncing is game logic, so we write it ourselves.
// #endregion
function bounceEnemy() {
  if (enemy.x < 0) {
    enemy.x = 0;
    enemy.speedX = -enemy.speedX;
  } else if (enemy.x > width - enemy.width) {
    enemy.x = width - enemy.width;
    enemy.speedX = -enemy.speedX;
  }

  if (enemy.y < 0) {
    enemy.y = 0;
    enemy.speedY = -enemy.speedY;
  } else if (enemy.y > height - enemy.height) {
    enemy.y = height - enemy.height;
    enemy.speedY = -enemy.speedY;
  }
}

// #region Notes
// 1) coin.remove() takes it off the screen (the library stops drawing it).
// 2) The library does not know about our "coins" array, so we also remove
//    it from there: indexOf finds the position, splice(position, 1)
//    removes exactly one element at that position.
// 3) A new coin (we always keep 5 coins on screen) and the enemy gets faster.
// #endregion
function collectCoin(coin) {
  coin.remove();

  let index = coins.indexOf(coin);
  if (index !== -1) {
    coins.splice(index, 1);
  }

  Game.ui.addScore(1);

  createCoin();
  speedUpEnemy();
}

// #region Notes
// The enemy keeps its direction (the sign of the speed) but gets a bit
// faster: we add ENEMY_SPEED_UP to the absolute value of each speed.
// Math.sign gives -1 or 1, so it works for both directions.
// #endregion
function speedUpEnemy() {
  enemy.speedX = enemy.speedX + Math.sign(enemy.speedX) * ENEMY_SPEED_UP;
  enemy.speedY = enemy.speedY + Math.sign(enemy.speedY) * ENEMY_SPEED_UP;
}

// #region Notes
// Losing a life: back to the start; if no lives are left, game over.
// Otherwise a short invincibility, so one touch does not take several lives.
// #endregion
function loseLife() {
  Game.ui.setLives(Game.ui.getLives() - 1);
  player.setPosition(START_X, START_Y);

  if (Game.ui.getLives() <= 0) {
    Game.setup.stopGame();
    Game.showMessage("GAME OVER\nCarrega em Enter");
    return;
  }

  isInvincible = true;
  blinkCounter = 0;
  Game.more.delay(1000, function () {
    isInvincible = false;
    player.setColor(color.blue);
  });
}

// #region Notes
// While invincible, switch between two colours every 6 updates.
// We change the colour instead of hiding the player, because hidden
// sprites do not collide and the player could not catch coins.
// #endregion
function blinkPlayer() {
  if (isInvincible) {
    blinkCounter = blinkCounter + 1;
    if (blinkCounter % 12 < 6) {
      player.setColor(color.white);
    } else {
      player.setColor(color.blue);
    }
  }
}


// ---------------------------------------------------------------------
// 5. Start / restart
// ---------------------------------------------------------------------

// #region Notes
// One single function to start AND restart: a single source of truth.
// Game.setup.clear() removes sprites, delays, message and score.
// #endregion
function resetGame() {
  Game.setup.clear();

  coins = [];
  isInvincible = false;
  blinkCounter = 0;

  player = Game.createSprite({
    x: START_X,
    y: START_Y,
    width: 32,
    height: 32,
    color: color.blue,
    name: "player"
  });

  for (let i = 0; i < COINS_ON_SCREEN; i++) {
    createCoin();
  }

  createEnemy();

  Game.ui.setScore(0);
  Game.ui.setLives(3);
  Game.ui.hideMessage();
  Game.startGame();
}


// ---------------------------------------------------------------------
// 6. Keyboard
// ---------------------------------------------------------------------

// #region Notes
// onKey runs on EVERY update while the key is held down: smooth movement.
// onKeyDown runs once per press, even when the game is stopped.
//
// IMPORTANT: we register the callbacks only ONCE, here, outside resetGame().
// Game.setup.clear() keeps them, so registering them inside resetGame()
// would add a copy at every restart and the player would get faster and faster.
// #endregion
Game.onKey({
  up: function () {
    player.move(0, -playerSpeed);
  },
  down: function () {
    player.move(0, playerSpeed);
  },
  left: function () {
    player.move(-playerSpeed, 0);
  },
  right: function () {
    player.move(playerSpeed, 0);
  }
});

Game.keys.onDown("Enter", function () {
  resetGame();
});


// ---------------------------------------------------------------------
// 7. Game loop (60 times per second)
// ---------------------------------------------------------------------

// #region Notes
// checkCollisionWithList goes through the array for us (a loop inside)
// and gives back the coin we touched, or null.
// #endregion
Game.onUpdate(function (deltaTime) {
  drawBackground();
  keepPlayerOnScreen();
  bounceEnemy();
  blinkPlayer();

  let coin = Game.more.checkCollisionWithList(player, coins);
  if (coin) {
    collectCoin(coin);
  }

  if (Game.more.isRunning() && !isInvincible && Game.checkCollision(player, enemy)) {
    loseLife();
  }
});


// ---------------------------------------------------------------------
// 8. Go!
// ---------------------------------------------------------------------

resetGame();
