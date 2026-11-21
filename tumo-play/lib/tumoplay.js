/*
 * TumoPlay Core
 * A tiny 2D game library for TUMO JavaScript labs.
 *
 * The library hides the browser-specific details (DOM, Canvas API, event
 * listeners, requestAnimationFrame, collision maths). It does NOT implement
 * game logic: students write their own variables, functions, conditions,
 * loops and arrays.
 *
 * Load with a normal <script> tag. Exposes a single global: window.TumoPlay
 */
(function () {
  "use strict";

  /* ======================================================================
   * 1. Utils
   * ====================================================================== */

  const PREFIX = "TumoPlay: ";
  const warnedMessages = new Set();

  // Print a friendly warning only once per distinct message.
  function warnOnce(message) {
    if (warnedMessages.has(message)) return;
    warnedMessages.add(message);
    console.warn(PREFIX + message);
  }

  function fail(message) {
    throw new Error(PREFIX + message);
  }

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function isNumber(value) {
    return typeof value === "number" && Number.isFinite(value);
  }

  // Warn (once) when a numeric argument is not a number.
  function checkNumber(value, argName, fnName) {
    if (!isNumber(value)) {
      warnOnce(fnName + "(): \"" + argName + "\" devia ser um número, mas recebi " + JSON.stringify(value) + ".");
      return false;
    }
    return true;
  }

  function checkFunction(value, fnName) {
    if (typeof value !== "function") {
      fail(fnName + "() precisa de uma função como último argumento.");
    }
  }

  function random(min, max) {
    if (min > max) { const t = min; min = max; max = t; }
    return min + Math.random() * (max - min);
  }

  function randomInt(min, max) {
    if (min > max) { const t = min; min = max; max = t; }
    const low = Math.ceil(min);
    const high = Math.floor(max);
    if (low > high) return low; // e.g. randomInt(1.2, 1.8)
    return low + Math.floor(Math.random() * (high - low + 1));
  }

  /* ======================================================================
   * Shared engine state (filled by createGame)
   * ====================================================================== */

  const STEP = 1 / 60;          // fixed update step, in seconds
  const MAX_UPDATES_PER_FRAME = 5;
  const MAX_FRAME_TIME = 0.25;  // seconds

  let game = null;              // { canvas, ctx, width, height, background }

  function requireGame(fnName) {
    if (!game) fail("chama createGame() antes de " + fnName + "().");
  }

  // Run a student callback safely. On error: log once and stop the game,
  // so the console is not flooded with 60 errors per second.
  function safeCall(label, fn, args) {
    try {
      fn.apply(null, args || []);
      return true;
    } catch (err) {
      console.error(PREFIX + "erro dentro de " + label + ":", err);
      Engine.stop();
      return false;
    }
  }

  /* ======================================================================
   * 2. Renderer
   * ====================================================================== */

  const Renderer = {
    queue: [],              // draw commands of the latest update
    images: new Map(),      // url -> HTMLImageElement

    push(command) {
      this.queue.push(command);
    },

    clearQueue() {
      this.queue = [];
    },

    getImage(source) {
      if (typeof source !== "string") return source;
      let img = this.images.get(source);
      if (!img) {
        img = new Image();
        img.addEventListener("error", function () {
          warnOnce("não consegui carregar a imagem \"" + source + "\". Confirma o caminho.");
        });
        img.src = source;
        this.images.set(source, img);
      }
      return img;
    },

    drawCommand(ctx, cmd) {
      ctx.save();
      if (cmd.type === "rect") {
        ctx.fillStyle = cmd.color;
        ctx.fillRect(cmd.x, cmd.y, cmd.width, cmd.height);
      } else if (cmd.type === "circle") {
        ctx.fillStyle = cmd.color;
        ctx.beginPath();
        ctx.arc(cmd.x, cmd.y, Math.max(0, cmd.radius), 0, Math.PI * 2);
        ctx.fill();
      } else if (cmd.type === "text") {
        ctx.fillStyle = cmd.color;
        ctx.font = (cmd.bold ? "bold " : "") + cmd.size + "px " + cmd.font;
        ctx.textAlign = cmd.align;
        ctx.textBaseline = "top";
        ctx.fillText(cmd.text, cmd.x, cmd.y);
      } else if (cmd.type === "image") {
        const img = this.getImage(cmd.image);
        if (img && img.complete && img.naturalWidth > 0) {
          const w = isNumber(cmd.width) ? cmd.width : img.naturalWidth;
          const h = isNumber(cmd.height) ? cmd.height : img.naturalHeight;
          ctx.drawImage(img, cmd.x, cmd.y, w, h);
        }
      }
      ctx.restore();
    },

    drawSprite(ctx, sprite) {
      ctx.fillStyle = sprite.color;
      if (sprite.shape === "circle") {
        ctx.beginPath();
        ctx.ellipse(
          sprite.x + sprite.width / 2, sprite.y + sprite.height / 2,
          Math.abs(sprite.width / 2), Math.abs(sprite.height / 2),
          0, 0, Math.PI * 2
        );
        ctx.fill();
      } else {
        ctx.fillRect(sprite.x, sprite.y, sprite.width, sprite.height);
      }
    },

    // Draw one frame, layer by layer (bottom to top).
    render() {
      if (!game) return;
      const ctx = game.ctx;
      // Layer 1: background
      ctx.fillStyle = game.background;
      ctx.fillRect(0, 0, game.width, game.height);
      // Layer 2: queued draw commands ("scenery")
      for (const cmd of this.queue) this.drawCommand(ctx, cmd);
      // Layer 3: visible sprites, in creation order
      for (const sprite of SpriteManager.sprites) {
        if (sprite.visible) this.drawSprite(ctx, sprite);
      }
      // Layers 4 and 5: HUD and message
      GameUI.drawHud(ctx);
      GameUI.drawMessage(ctx);
    },
  };

  function drawRect(x, y, width, height, color) {
    requireGame("drawRect");
    checkNumber(x, "x", "drawRect"); checkNumber(y, "y", "drawRect");
    Renderer.push({ type: "rect", x: x, y: y, width: width, height: height, color: color || "white" });
  }

  function drawCircle(x, y, radius, color) {
    requireGame("drawCircle");
    checkNumber(x, "x", "drawCircle"); checkNumber(radius, "radius", "drawCircle");
    Renderer.push({ type: "circle", x: x, y: y, radius: radius, color: color || "white" });
  }

  function drawText(text, x, y, options) {
    requireGame("drawText");
    const o = options || {};
    Renderer.push({
      type: "text",
      text: String(text),
      x: x,
      y: y,
      size: isNumber(o.size) ? o.size : 20,
      color: o.color || "white",
      font: o.font || "Courier New, monospace",
      align: o.align === "center" || o.align === "right" ? o.align : "left",
      bold: Boolean(o.bold),
    });
  }

  function drawImage(image, x, y, width, height) {
    requireGame("drawImage");
    if (typeof image !== "string" && !(image instanceof HTMLImageElement)) {
      warnOnce("drawImage() precisa de um URL (texto) ou de uma imagem.");
      return;
    }
    Renderer.getImage(image); // start loading as early as possible
    Renderer.push({ type: "image", image: image, x: x, y: y, width: width, height: height });
  }

  function clearCanvas() {
    requireGame("clearCanvas");
    Renderer.clearQueue();
  }

  /* ======================================================================
   * 3. SpriteManager
   * ====================================================================== */

  class Sprite {
    constructor(options) {
      const o = options || {};
      this.x = isNumber(o.x) ? o.x : 0;
      this.y = isNumber(o.y) ? o.y : 0;
      this.width = isNumber(o.width) ? o.width : 32;
      this.height = isNumber(o.height) ? o.height : 32;
      this.color = o.color || "white";
      this.visible = o.visible === undefined ? true : Boolean(o.visible);
      this.speedX = isNumber(o.speedX) ? o.speedX : 0;
      this.speedY = isNumber(o.speedY) ? o.speedY : 0;
      this.shape = o.shape === "circle" ? "circle" : "rect";
      this.name = o.name ? String(o.name) : "";
      this.removed = false;
      if (o.shape !== undefined && o.shape !== "rect" && o.shape !== "circle") {
        warnOnce("shape só pode ser \"rect\" ou \"circle\". Vou usar \"rect\".");
      }
    }

    /** @param {number} dx @param {number} dy @returns {Sprite} */
    move(dx, dy) {
      checkNumber(dx, "dx", "move"); checkNumber(dy, "dy", "move");
      this.x += dx;
      this.y += dy;
      return this;
    }

    /** @param {number} x @param {number} y @returns {Sprite} */
    setPosition(x, y) {
      checkNumber(x, "x", "setPosition"); checkNumber(y, "y", "setPosition");
      this.x = x;
      this.y = y;
      return this;
    }

    /** @param {string} color @returns {Sprite} */
    setColor(color) {
      this.color = color;
      return this;
    }

    /** @returns {Sprite} */
    show() { this.visible = true; return this; }

    /** @returns {Sprite} */
    hide() { this.visible = false; return this; }

    /** @returns {Sprite} */
    remove() { removeSprite(this); return this; }

    toString() {
      return "Sprite(" + (this.name || "sem nome") + " em " + this.x + ", " + this.y + ")";
    }
  }

  const SpriteManager = {
    sprites: [],

    add(sprite) { this.sprites.push(sprite); },

    remove(sprite) {
      const index = this.sprites.indexOf(sprite);
      if (index !== -1) this.sprites.splice(index, 1);
      sprite.removed = true;
    },

    removeAll() {
      for (const s of this.sprites) s.removed = true;
      this.sprites = [];
    },

    applySpeeds() {
      for (const s of this.sprites.slice()) {
        s.x += s.speedX;
        s.y += s.speedY;
      }
    },
  };

  /**
   * Create a sprite and register it (it is drawn automatically).
   * @param {object} [options] x, y, width, height, color, visible, speedX, speedY, shape, name
   * @returns {Sprite}
   */
  function createSprite(options) {
    requireGame("createSprite");
    if (options !== undefined && (options === null || typeof options !== "object")) {
      warnOnce("createSprite() recebe um objeto, por exemplo createSprite({ x: 10, y: 20 }).");
      options = {};
    }
    const sprite = new Sprite(options);
    SpriteManager.add(sprite);
    return sprite;
  }

  /** @param {Sprite} sprite */
  function removeSprite(sprite) {
    if (!(sprite instanceof Sprite)) {
      warnOnce("removeSprite() precisa de um sprite criado com createSprite().");
      return;
    }
    SpriteManager.remove(sprite);
  }

  /** @returns {Sprite[]} a copy of the active sprites */
  function getSprites() {
    return SpriteManager.sprites.slice();
  }

  /* ======================================================================
   * 4. InputManager
   * ====================================================================== */

  const KEY_ALIASES = {
    up: "ArrowUp", arrowup: "ArrowUp",
    down: "ArrowDown", arrowdown: "ArrowDown",
    left: "ArrowLeft", arrowleft: "ArrowLeft",
    right: "ArrowRight", arrowright: "ArrowRight",
    space: "Space", " ": "Space", spacebar: "Space",
    enter: "Enter", return: "Enter",
    escape: "Escape", esc: "Escape",
    shift: "Shift", shiftleft: "Shift", shiftright: "Shift",
  };

  const PREVENT_DEFAULT_KEYS = new Set(["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Space"]);

  // Turn whatever the student wrote ("up", "A", "KeyA", " ") into a canonical name.
  function normalizeKeyName(name) {
    if (typeof name !== "string" || name.length === 0) return null;
    if (name === " ") return "Space";
    const lower = name.toLowerCase();
    if (KEY_ALIASES[lower]) return KEY_ALIASES[lower];
    if (/^[a-z]$/.test(lower)) return "Key" + lower.toUpperCase();
    if (/^[0-9]$/.test(lower)) return "Digit" + lower;
    if (/^key[a-z]$/.test(lower)) return "Key" + lower.charAt(3).toUpperCase();
    if (/^digit[0-9]$/.test(lower)) return "Digit" + lower.charAt(5);
    return null;
  }

  // Canonical name of a browser keyboard event (event.code first).
  function keyFromEvent(event) {
    const code = event.code;
    if (code) {
      if (code === "ShiftLeft" || code === "ShiftRight") return "Shift";
      if (code === "NumpadEnter") return "Enter";
      if (/^Numpad[0-9]$/.test(code)) return "Digit" + code.charAt(6);
      return code;
    }
    return normalizeKeyName(event.key); // very old browsers / synthetic events
  }

  function isTypingTarget(element) {
    if (!element) return false;
    const tag = element.tagName;
    return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || Boolean(element.isContentEditable);
  }

  const InputManager = {
    pressed: new Set(),
    justPressed: new Set(),
    justReleased: new Set(),
    holdCallbacks: [],   // { key, callback }
    downCallbacks: [],
    upCallbacks: [],
    listening: false,

    register(list, key, callback, fnName) {
      checkFunction(callback, fnName);
      const canonical = normalizeKeyName(key);
      if (!canonical) {
        warnOnce("não conheço a tecla \"" + key + "\". Experimenta \"ArrowUp\", \"Space\", \"Enter\" ou uma letra como \"a\".");
        return;
      }
      list.push({ key: canonical, callback: callback });
    },

    fire(list, key, label) {
      for (const entry of list.slice()) {
        if (entry.key === key) {
          if (!safeCall(label, entry.callback)) return;
        }
      }
    },

    onKeyDown(event) {
      const key = keyFromEvent(event);
      if (!key) return;
      if (PREVENT_DEFAULT_KEYS.has(key) && !isTypingTarget(document.activeElement)) {
        event.preventDefault();
      }
      if (event.repeat || this.pressed.has(key)) return;
      this.pressed.add(key);
      this.justPressed.add(key);
      this.fire(this.downCallbacks, key, "onKeyDown");
    },

    onKeyUp(event) {
      const key = keyFromEvent(event);
      if (!key) return;
      if (!this.pressed.has(key)) return;
      this.pressed.delete(key);
      this.justReleased.add(key);
      this.fire(this.upCallbacks, key, "onKeyUp");
    },

    releaseAll() {
      this.pressed.clear();
      this.justPressed.clear();
      this.justReleased.clear();
    },

    // Step 3 of an update: continuous callbacks for held keys.
    runHoldCallbacks() {
      for (const entry of this.holdCallbacks.slice()) {
        if (this.pressed.has(entry.key)) {
          if (!safeCall("onKey", entry.callback)) return false;
        }
      }
      return true;
    },

    endUpdate() {
      this.justPressed.clear();
      this.justReleased.clear();
    },

    listen() {
      if (this.listening) return;
      this.listening = true;
      const self = this;
      window.addEventListener("keydown", function (e) { self.onKeyDown(e); });
      window.addEventListener("keyup", function (e) { self.onKeyUp(e); });
      window.addEventListener("blur", function () { self.releaseAll(); });
    },

    clearCallbacks() {
      this.holdCallbacks = [];
      this.downCallbacks = [];
      this.upCallbacks = [];
    },
  };

  /** Call callback on every update while key is held. @param {string} key @param {Function} callback */
  function onKey(key, callback) {
    InputManager.register(InputManager.holdCallbacks, key, callback, "onKey");
  }

  /** Call callback once when key is pressed. @param {string} key @param {Function} callback */
  function onKeyDown(key, callback) {
    InputManager.register(InputManager.downCallbacks, key, callback, "onKeyDown");
  }

  /** Call callback once when key is released. @param {string} key @param {Function} callback */
  function onKeyUp(key, callback) {
    InputManager.register(InputManager.upCallbacks, key, callback, "onKeyUp");
  }

  /** @param {string} key @returns {boolean} true if the key is held right now */
  function isKeyPressed(key) {
    const canonical = normalizeKeyName(key);
    if (!canonical) {
      warnOnce("não conheço a tecla \"" + key + "\".");
      return false;
    }
    return InputManager.pressed.has(canonical);
  }

  /* ======================================================================
   * 5. CollisionManager
   * ====================================================================== */

  function isCollidable(sprite) {
    return sprite instanceof Sprite && sprite.visible && !sprite.removed;
  }

  /**
   * Strict AABB overlap (touching edges does not count).
   * @param {Sprite} a @param {Sprite} b @returns {boolean}
   */
  function checkCollision(a, b) {
    if (a === b || !isCollidable(a) || !isCollidable(b)) return false;
    return a.x < b.x + b.width && a.x + a.width > b.x &&
           a.y < b.y + b.height && a.y + a.height > b.y;
  }

  /**
   * @param {Sprite} sprite @param {Sprite[]} list
   * @returns {Sprite|null} the first sprite of list that collides with sprite
   */
  function checkCollisionWithList(sprite, list) {
    if (!Array.isArray(list)) {
      warnOnce("checkCollisionWithList() precisa de um array como segundo argumento.");
      return null;
    }
    for (const other of list) {
      if (checkCollision(sprite, other)) return other;
    }
    return null;
  }

  /* ======================================================================
   * 6. Timers (game time)
   * ====================================================================== */

  const Timers = {
    list: [],    // { id, remaining (s), callback }
    nextId: 1,

    add(ms, callback) {
      const id = this.nextId++;
      this.list.push({ id: id, remaining: Math.max(0, ms) / 1000, callback: callback });
      return id;
    },

    cancel(id) {
      this.list = this.list.filter(function (t) { return t.id !== id; });
    },

    process(dt) {
      for (const t of this.list) t.remaining -= dt;
      const due = this.list.filter(function (t) { return t.remaining <= 1e-9; });
      if (due.length === 0) return true;
      this.list = this.list.filter(function (t) { return t.remaining > 1e-9; });
      for (const t of due) {
        if (!safeCall("delay", t.callback)) return false;
      }
      return true;
    },

    clearAll() { this.list = []; },
  };

  /**
   * Run callback after ms milliseconds of game time (pauses with stopGame).
   * @param {number} ms @param {Function} callback @returns {number} timer id
   */
  function delay(ms, callback) {
    requireGame("delay");
    checkNumber(ms, "ms", "delay");
    checkFunction(callback, "delay");
    return Timers.add(isNumber(ms) ? ms : 0, callback);
  }

  /** @param {number} id timer id returned by delay() */
  function cancelDelay(id) {
    Timers.cancel(id);
  }

  /* ======================================================================
   * 7. GameUI
   * ====================================================================== */

  const HUD_FONT = "\"Courier New\", monospace";

  const GameUI = {
    score: 0,
    lives: 0,
    hudVisible: false,
    message: null,

    reset() {
      this.score = 0;
      this.lives = 0;
      this.hudVisible = false;
      this.message = null;
    },

    drawHud(ctx) {
      if (!this.hudVisible) return;
      ctx.save();
      ctx.font = "bold 20px " + HUD_FONT;
      ctx.textBaseline = "top";
      ctx.fillStyle = "white";
      ctx.shadowColor = "rgba(0, 0, 0, 0.8)";
      ctx.shadowBlur = 4;
      ctx.shadowOffsetX = 2;
      ctx.shadowOffsetY = 2;
      ctx.textAlign = "left";
      ctx.fillText("Pontos: " + this.score, 12, 10);
      ctx.textAlign = "right";
      const livesText = this.lives > 10 ? "Vidas: " + this.lives : "♥".repeat(this.lives);
      ctx.fillText(livesText, game.width - 12, 10);
      ctx.restore();
    },

    drawMessage(ctx) {
      if (this.message === null) return;
      const lines = this.message.split("\n");
      const size = 30;
      const lineHeight = size * 1.3;
      ctx.save();
      ctx.font = "bold " + size + "px " + HUD_FONT;
      let maxWidth = 0;
      for (const line of lines) maxWidth = Math.max(maxWidth, ctx.measureText(line).width);
      const panelW = Math.min(game.width - 20, maxWidth + 60);
      const panelH = lines.length * lineHeight + 40;
      const px = (game.width - panelW) / 2;
      const py = (game.height - panelH) / 2;
      ctx.fillStyle = "rgba(0, 0, 0, 0.75)";
      ctx.fillRect(px, py, panelW, panelH);
      ctx.strokeStyle = "rgba(255, 255, 255, 0.6)";
      ctx.lineWidth = 2;
      ctx.strokeRect(px, py, panelW, panelH);
      ctx.fillStyle = "white";
      ctx.textAlign = "center";
      ctx.textBaseline = "top";
      for (let i = 0; i < lines.length; i++) {
        // Lines after the first one are smaller (instructions).
        if (i === 1) ctx.font = "bold " + Math.round(size * 0.6) + "px " + HUD_FONT;
        ctx.fillText(lines[i], game.width / 2, py + 20 + i * lineHeight + (i > 0 ? 6 : 0), panelW - 20);
      }
      ctx.restore();
    },
  };

  /** @param {number} value */
  function setScore(value) {
    checkNumber(value, "value", "setScore");
    GameUI.score = isNumber(value) ? value : 0;
    GameUI.hudVisible = true;
  }

  /** @param {number} [value=1] */
  function addScore(value) {
    if (value === undefined) value = 1;
    checkNumber(value, "value", "addScore");
    if (isNumber(value)) GameUI.score += value;
    GameUI.hudVisible = true;
  }

  /** @returns {number} */
  function getScore() { return GameUI.score; }

  /** @param {number} value negative values become 0 */
  function setLives(value) {
    checkNumber(value, "value", "setLives");
    GameUI.lives = isNumber(value) ? Math.max(0, Math.floor(value)) : 0;
    GameUI.hudVisible = true;
  }

  /** @returns {number} */
  function getLives() { return GameUI.lives; }

  /** @param {string} text supports "\n" for several lines */
  function showMessage(text) { GameUI.message = String(text); }

  function hideMessage() { GameUI.message = null; }

  /* ======================================================================
   * 8. GameEngine
   * ====================================================================== */

  const Engine = {
    running: false,
    accumulator: 0,
    lastTime: null,
    frameId: null,
    updateCallbacks: [],

    // Steps 1-5 of one fixed update (see the spec, section 2.2).
    update() {
      Renderer.clearQueue();
      SpriteManager.applySpeeds();
      if (!Timers.process(STEP)) return;
      if (!InputManager.runHoldCallbacks()) return;
      for (const callback of this.updateCallbacks.slice()) {
        if (!safeCall("onUpdate", callback, [STEP])) return;
      }
      InputManager.endUpdate();
    },

    frame(now) {
      this.frameId = window.requestAnimationFrame(this.boundFrame);
      if (this.lastTime === null) this.lastTime = now;
      const elapsed = clamp((now - this.lastTime) / 1000, 0, MAX_FRAME_TIME);
      this.lastTime = now;

      if (this.running) {
        this.accumulator += elapsed;
        let updates = 0;
        // The small epsilon avoids losing an update to floating-point error.
        while (this.running && this.accumulator >= STEP - 1e-9 && updates < MAX_UPDATES_PER_FRAME) {
          this.update();
          this.accumulator -= STEP;
          updates++;
        }
        if (updates === MAX_UPDATES_PER_FRAME) this.accumulator = 0; // drop the backlog
      }
      Renderer.render();
    },

    startLoop() {
      this.boundFrame = this.frame.bind(this);
      this.lastTime = null;
      this.frameId = window.requestAnimationFrame(this.boundFrame);
    },

    stopLoop() {
      if (this.frameId !== null) window.cancelAnimationFrame(this.frameId);
      this.frameId = null;
    },

    start() {
      if (this.running) return;
      this.running = true;
      this.accumulator = 0;
      this.lastTime = null; // no "jump" after a pause
    },

    stop() {
      this.running = false;
    },

    // Reset the world (keeps callbacks and running state).
    clearWorld() {
      SpriteManager.removeAll();
      Timers.clearAll();
      Renderer.clearQueue();
      GameUI.reset();
      InputManager.releaseAll();
    },
  };

  /**
   * Create the canvas and start the render loop (updates need startGame()).
   * @param {object} [options] width (600), height (400), background ("#111111"), title
   */
  function createGame(options) {
    const o = options || {};
    if (game) {
      warnOnce("createGame() foi chamado mais do que uma vez. O jogo anterior foi substituído.");
      Engine.stopLoop();
      Engine.stop();
      Engine.clearWorld();
      Engine.updateCallbacks = [];
      InputManager.clearCallbacks();
      if (game.canvas.parentNode) game.canvas.parentNode.removeChild(game.canvas);
      game = null;
    }

    const width = isNumber(o.width) && o.width > 0 ? Math.round(o.width) : 600;
    const height = isNumber(o.height) && o.height > 0 ? Math.round(o.height) : 400;

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    canvas.style.maxWidth = "100%";
    canvas.style.height = "auto";
    canvas.style.display = "block";
    canvas.setAttribute("tabindex", "0");
    canvas.addEventListener("click", function () { canvas.focus(); });

    const container = document.getElementById("tumoplay");
    (container || document.body).appendChild(canvas);

    if (typeof o.title === "string") document.title = o.title;

    game = {
      canvas: canvas,
      ctx: canvas.getContext("2d"),
      width: width,
      height: height,
      background: o.background || "#111111",
    };

    InputManager.listen();
    Engine.startLoop();
  }

  /** Turn updates on (idempotent). */
  function startGame() {
    requireGame("startGame");
    Engine.start();
  }

  /** Turn updates off; drawing continues (idempotent). */
  function stopGame() {
    requireGame("stopGame");
    Engine.stop();
  }

  /** Reset the world: sprites, delays, drawings, message, score, HUD, keys. */
  function clear() {
    requireGame("clear");
    Engine.clearWorld();
  }

  /** @returns {boolean} true if updates are running */
  function isRunning() {
    return Engine.running;
  }

  /** Register a function called 60 times per second. @param {Function} callback receives deltaTime (s) */
  function onUpdate(callback) {
    checkFunction(callback, "onUpdate");
    Engine.updateCallbacks.push(callback);
  }

  /* ======================================================================
   * 9. Public API
   * ====================================================================== */

  window.TumoPlay = Object.freeze({
    // A. Setup
    createGame: createGame,
    startGame: startGame,
    stopGame: stopGame,
    clear: clear,
    isRunning: isRunning,
    get width() { return game ? game.width : 0; },
    get height() { return game ? game.height : 0; },
    // B. Drawing
    drawRect: drawRect,
    drawCircle: drawCircle,
    drawText: drawText,
    drawImage: drawImage,
    clearCanvas: clearCanvas,
    // C. Sprites
    createSprite: createSprite,
    removeSprite: removeSprite,
    getSprites: getSprites,
    // D. Keyboard
    onKey: onKey,
    onKeyDown: onKeyDown,
    onKeyUp: onKeyUp,
    isKeyPressed: isKeyPressed,
    // E. Update
    onUpdate: onUpdate,
    // F. Collisions
    checkCollision: checkCollision,
    checkCollisionWithList: checkCollisionWithList,
    // G. Time and randomness
    random: random,
    randomInt: randomInt,
    delay: delay,
    cancelDelay: cancelDelay,
    // H. Game UI
    setScore: setScore,
    addScore: addScore,
    getScore: getScore,
    setLives: setLives,
    getLives: getLives,
    showMessage: showMessage,
    hideMessage: hideMessage,
  });
})();
