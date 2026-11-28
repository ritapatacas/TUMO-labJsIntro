// Game (MVP): collect coins and avoid the red enemy. Press Enter to restart.

let color = { blue: "#3b82f6", red: "#ef4444", yellow: "#ffd60a", night: "#000000" };

Game.setup.createGame({ background: color.night });

let speed = 4;
let enemy = null;
let coin = null;

function start() {
  Game.setup.clear();

  Game.player = Game.createSprite({ color: color.blue });
  coin = Game.createSprite({ width: 20, height: 20, color: color.yellow, shape: "circle" });
  enemy = Game.createSprite({ x: Game.size.width - 80, y: 50, color: color.red, speedX: 3, speedY: 2 });

  Game.ui.setScore(0);
  Game.ui.hideMessage();
  Game.startGame();
}

// Move the player with the arrow keys.
Game.onKey({
  up: function () { Game.player.move(0, -speed); },
  down: function () { Game.player.move(0, speed); },
  left: function () { Game.player.move(-speed, 0); },
  right: function () { Game.player.move(speed, 0); }
});

// Press Enter to restart.
Game.keys.onDown("Enter", start);

// Runs 60 times per second: check collisions, move things, win or lose.
Game.onUpdate(function () {
  // The enemy bounces on the walls.
  if (enemy.x < 0 || enemy.x > Game.size.width - enemy.width) {
    enemy.speedX = -enemy.speedX;
  }
  if (enemy.y < 0 || enemy.y > Game.size.height - enemy.height) {
    enemy.speedY = -enemy.speedY;
  }

  // Touch the coin: +1 point and the coin moves somewhere else.
  if (Game.checkCollision(Game.player, coin)) {
    Game.ui.addScore(1);
    coin.setPosition(randomInt(0, Game.size.width - coin.width), randomInt(0, Game.size.height - coin.height));
  }

  // Touch the enemy: game over.
  if (Game.more.isRunning() && Game.checkCollision(Game.player, enemy)) {
    Game.setup.stopGame();
    Game.showMessage("GAME OVER\nPress Enter");
  }
});

start();
