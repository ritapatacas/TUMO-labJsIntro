"""Run TumoPlay tests in headless Chromium (Python Playwright).

Usage:  python3 tests/run_tests.py      (from the tumo-play folder)

1. Runs tests/tests.html (unit tests) and prints the results.
2. Opens the playground pages via file:// and via a local HTTP server,
   checks the console, and plays a few seconds of the Playground.
"""
import http.server
import pathlib
import sys
import threading

from playwright.sync_api import sync_playwright

ROOT = pathlib.Path(__file__).resolve().parent.parent
failures = 0


def report(name, ok, detail=""):
    global failures
    print(("PASS " if ok else "FAIL ") + name + (f" [{detail}]" if detail else ""))
    if not ok:
        failures += 1


def start_server():
    class QuietHandler(http.server.SimpleHTTPRequestHandler):
        def __init__(self, *a, **k):
            super().__init__(*a, directory=str(ROOT), **k)

        def log_message(self, *a):
            pass

    server = http.server.ThreadingHTTPServer(("127.0.0.1", 0), QuietHandler)
    threading.Thread(target=server.serve_forever, daemon=True).start()
    return server


def open_page(browser, url, width=1280):
    page = browser.new_page(viewport={"width": width, "height": 900})
    messages = []
    page.on("console", lambda m: messages.append((m.type, m.text)))
    page.on("pageerror", lambda e: messages.append(("error", str(e))))
    page.goto(url)
    page.wait_for_timeout(300)
    return page, messages


def problems(messages):
    return [m for m in messages if m[0] in ("error", "warning")]


def main():
    server = start_server()
    http_base = f"http://127.0.0.1:{server.server_address[1]}"
    file_base = ROOT.as_uri()

    with sync_playwright() as p:
        browser = p.chromium.launch()

        # 1. Unit tests
        page, messages = open_page(browser, f"{file_base}/tests/tests.html")
        for kind, text in messages:
            if text.startswith("FAIL"):
                report("unit: " + text[5:], False)
        summary = page.evaluate("window.__testSummary")
        report(f"unit tests ({summary['total'] - summary['failed']}/{summary['total']})", summary["failed"] == 0)
        page.close()

        # 2. Pages load without console errors/warnings (file:// and http://)
        for base in (file_base, http_base):
            for name in ("playground/index.html", "playground/exemplo-basico.html"):
                page, messages = open_page(browser, f"{base}/{name}")
                page.wait_for_timeout(500)
                report(f"console clean: {base.split(':')[0]} {name}", not problems(messages), problems(messages))
                page.close()

        # 3. Playground behaviour
        page, messages = open_page(browser, f"{http_base}/playground/index.html")
        info = page.evaluate("({ coins: coins.length, lives: TumoPlay.getLives(), score: TumoPlay.getScore(), running: TumoPlay.isRunning() })")
        report("playground starts with 5 coins, 3 lives, 0 points", info == {"coins": 5, "lives": 3, "score": 0, "running": True}, info)

        x0 = page.evaluate("player.x")
        page.keyboard.down("ArrowRight")
        page.wait_for_timeout(500)
        page.keyboard.up("ArrowRight")
        report("arrow moves player", page.evaluate("player.x") > x0)
        report("page does not scroll", page.evaluate("window.scrollY") == 0)

        page.keyboard.down("ArrowLeft")
        page.wait_for_timeout(1500)
        page.keyboard.up("ArrowLeft")
        report("player stays on screen", page.evaluate("player.x") == 0)

        # Collect a coin by placing it under the player.
        page.evaluate("coins[0].setPosition(player.x + 5, player.y + 5)")
        page.wait_for_timeout(100)
        info = page.evaluate("({ coins: coins.length, score: TumoPlay.getScore(), sprites: TumoPlay.getSprites().length })")
        report("coin gives 1 point and is replaced", info == {"coins": 5, "score": 1, "sprites": 7}, info)

        # Touch the enemy.
        page.evaluate("enemy.speedX = 0; enemy.speedY = 0; enemy.setPosition(player.x, player.y)")
        page.wait_for_timeout(100)
        info = page.evaluate("({ lives: TumoPlay.getLives(), inv: isInvincible, x: player.x })")
        report("enemy takes a life + invincibility + back to start", info["lives"] == 2 and info["inv"] and info["x"] == 30, info)
        page.evaluate("enemy.setPosition(500, 50)")
        page.wait_for_timeout(1300)
        report("invincibility ends after ~1 s", page.evaluate("isInvincible") is False)

        # Victory.
        page.evaluate("enemy.setPosition(500, 50); TumoPlay.setScore(9); coins[0].setPosition(player.x, player.y)")
        page.wait_for_timeout(100)
        report("10 points → game stops", page.evaluate("TumoPlay.isRunning()") is False)

        # Restart several times; speed must not double.
        for _ in range(3):
            page.keyboard.press("Enter")
            page.wait_for_timeout(50)
        page.click("#restart-button")
        page.wait_for_timeout(50)
        info = page.evaluate("({ coins: coins.length, lives: TumoPlay.getLives(), score: TumoPlay.getScore(), running: TumoPlay.isRunning(), sprites: TumoPlay.getSprites().length, focused: document.activeElement.id })")
        report("restart resets everything", info == {"coins": 5, "lives": 3, "score": 0, "running": True, "sprites": 7, "focused": ""}, info)
        page.evaluate("enemy.speedX = 0; enemy.speedY = 0; enemy.setPosition(500, 50); player.setPosition(100, 100)")
        x0 = page.evaluate("player.x")
        page.keyboard.down("ArrowRight")
        page.evaluate("new Promise(r => { let n = 0; TumoPlay.onUpdate(function () { n++; if (n === 30) r(); }); })")
        page.keyboard.up("ArrowRight")
        moved = page.evaluate("player.x") - x0
        report("speed does not double after restarts (~4 px/update)", 100 <= moved <= 140, moved)

        # Game over.
        page.evaluate("TumoPlay.setLives(1); isInvincible = false; enemy.setPosition(player.x, player.y)")
        page.wait_for_timeout(100)
        report("0 lives → game over", page.evaluate("TumoPlay.getLives() === 0 && !TumoPlay.isRunning()"))
        report("no console problems while playing", not problems(messages), problems(messages))
        page.close()

        # 4. Layout widths
        for width in (360, 768, 1440):
            page, _ = open_page(browser, f"{http_base}/playground/index.html", width)
            overflow = page.evaluate("document.documentElement.scrollWidth > window.innerWidth")
            report(f"no horizontal scroll at {width}px", not overflow)
            pass
            page.close()

        browser.close()
    server.shutdown()
    print("\nFAILURES:", failures)
    sys.exit(1 if failures else 0)


if __name__ == "__main__":
    main()
