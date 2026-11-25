// Collect coins and avoid the red enemy. Press Enter to restart.

let width = 600;
let height = 400;

let color = { blue: "#3b82f6", red: "#ef4444", yellow: "#ffd60a", night: "#0b0b1e" };

Game.createGame({ width: width, height: height, background: color.night });

let playerX = 30;
let playerY = height - 60;
let playerWidth = 32;
let playerHeight = 32;

let speed = 4;
let player = null;
let enemy = null;
let coin = null;

function start() {
  Game.clear();
  player = Game.createSprite({ x: playerX, y: playerY, width: playerWidth, height: playerHeight, color: color.blue });
  coin = Game.createSprite({ x: width / 2, y: height / 2, width: 20, height: 20, color: color.yellow, shape: "circle" });
  enemy = Game.createSprite({ x: width - 80, y: 50, width: 32, height: 32, color: color.red, speedX: 3, speedY: 2 });
  Game.setScore(0);
  Game.hideMessage();
  Game.startGame();
}

Game.onKey({
  up: function () { player.move(0, -speed); },
  down: function () { player.move(0, speed); },
  left: function () { player.move(-speed, 0); },
  right: function () { player.move(speed, 0); }
});
Game.onKeyDown("Enter", start);

Game.onUpdate(function () {
  // The enemy bounces on the walls.
  if (enemy.x < 0 || enemy.x > width - enemy.width) {
    enemy.speedX = -enemy.speedX;
  }
  if (enemy.y < 0 || enemy.y > height - enemy.height) {
    enemy.speedY = -enemy.speedY;
  }

  // Touch the coin: +1 point and the coin moves somewhere else.
  if (Game.checkCollision(player, coin)) {
    Game.addScore(1);
    coin.setPosition(Game.randomInt(0, width - coin.width), Game.randomInt(0, height - coin.height));
  }

  // Touch the enemy: game over.
  if (Game.isRunning() && Game.checkCollision(player, enemy)) {
    Game.stopGame();
    Game.showMessage("GAME OVER\nPress Enter");
  }
});

start();
