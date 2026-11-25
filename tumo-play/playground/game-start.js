// Starting point: fill in the empty functions to build your game.

let width = 600;
let height = 400;

let color = { blue: "#3b82f6", red: "#ef4444", yellow: "#ffd60a", night: "#0b0b1e" };

Game.createGame({ width: width, height: height, background: color.night });

let playerX = 30;
let playerY = height - 60;
let playerWidth = 32;
let playerHeight = 32;

let player = null;

// Create your sprites here (the player, coins, enemies...).
function start() {
  Game.clear();

  player = Game.createSprite({ x: playerX, y: playerY, width: playerWidth, height: playerHeight, color: color.blue });

  Game.setScore(0);
  Game.startGame();
}

// Move the player with the arrow keys.
Game.onKey({
  up: function () {
  },
  down: function () {
  },
  left: function () {
  },
  right: function () {
  }
});

// Press Enter to restart.
Game.onKeyDown("Enter", start);

// Runs 60 times per second: check collisions, move things, win or lose.
Game.onUpdate(function () {
});

start();
