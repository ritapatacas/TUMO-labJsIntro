// Starting point: fill in the empty functions to build your game.

let color = { blue: "#3b82f6", red: "#ef4444", yellow: "#ffd60a", night: "#000000" };

Game.setup.createGame({ background: color.night });

console.log(Game)

// Create your sprites here (the player, coins, enemies...).
function start() {
  Game.setup.clear();

  Game.player = Game.createSprite({ color: color.blue });

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
Game.keys.onDown("Enter", start);

// Runs 60 times per second: check collisions, move things, win or lose.
Game.onUpdate(function () {
});

start();


