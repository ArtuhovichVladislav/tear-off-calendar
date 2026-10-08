#!/usr/bin/env python3
"""Регрессионные проверки отрывного календаря в headless Chromium.

Запуск (после python3 build.py):
    pip install playwright && playwright install chromium
    python3 tests/regression.py            # скриншоты кладутся в tests/out/

Скрипт обращается к глобальным переменным страницы (tp, sag, P, W, H, mode, plan, PLANS…):
в calendar.js они объявлены на верхнем уровне классического <script>, поэтому видны из evaluate().
"""
import asyncio
from pathlib import Path
from playwright.async_api import async_playwright

ROOT = Path(__file__).resolve().parent.parent
PAGE = (ROOT / "dist" / "tear-calendar.html").as_uri()
OUT = Path(__file__).resolve().parent / "out"
OUT.mkdir(exist_ok=True)

failures: list[str] = []


def check(cond: bool, msg: str):
    print(("  ok   " if cond else "  FAIL ") + msg)
    if not cond:
        failures.append(msg)


async def open_page(b, scheme="light", w=900, h=900):
    pg = await b.new_page(viewport={"width": w, "height": h}, color_scheme=scheme)
    errs: list[str] = []
    pg.on("pageerror", lambda e: errs.append(str(e)))
    await pg.goto(PAGE)
    await pg.evaluate("localStorage.clear()")
    await pg.goto(PAGE)
    await pg.wait_for_timeout(1500)
    return pg, errs


async def corner(pg):
    box = await pg.locator("#pad").bounding_box()
    return box, box["x"] + box["width"] - 8, box["y"] + box["height"] - 8


async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch()

        print("1. Загиб уголка без отрыва")
        pg, errs = await open_page(b)
        box, x, y = await corner(pg)
        await pg.mouse.move(x, y); await pg.mouse.down()
        for _ in range(14):
            x -= 12; y -= 14; await pg.mouse.move(x, y); await pg.wait_for_timeout(16)
        check(await pg.evaluate("tp") == 0, "загиб вверх-влево не рвёт перфорацию")
        await pg.screenshot(path=str(OUT / "1-curl.png"))
        await pg.mouse.up(); await pg.wait_for_timeout(1000)
        check(await pg.evaluate("[P.x, P.y].join() === [Cpt().x, Cpt().y].join()"), "уголок пружиной вернулся на место")

        print("2. Постепенный отрыв и отпускание на полпути")
        box, x, y = await corner(pg)
        await pg.mouse.move(x, y); await pg.mouse.down()
        for _ in range(16):
            y += 10; await pg.mouse.move(x, y); await pg.wait_for_timeout(10)
        part = await pg.evaluate("tp / W")
        check(0.3 < part < 0.97, f"разрыв частичный ({part:.2f})")
        await pg.mouse.up(); await pg.wait_for_timeout(800)
        check(abs(await pg.evaluate("tp / W") - part) < 1e-6, "после отпускания лист остался надорванным, не оторвался сам")
        await pg.screenshot(path=str(OUT / "2-partial.png"))

        print("3. Дорыв руками, лист в руке, бросок")
        title = await pg.evaluate("document.title")
        box, x, y = await corner(pg)
        await pg.mouse.move(x, y); await pg.mouse.down()
        for _ in range(30):
            y += 8; await pg.mouse.move(x, y); await pg.wait_for_timeout(16)
        check(await pg.evaluate("mode") == "held", "полностью оторванный лист остался в руке")
        await pg.wait_for_timeout(500)
        check(await pg.evaluate("heldFlyer.unfold === 1 && heldFlyer.sheet.flapWrap.style.display === 'none'"),
              "оторванный лист распрямился, загиба больше нет")
        check(await pg.evaluate("heldFlyer.sheet.el.style.filter.includes('drop-shadow')"), "у оторванного листа своя тень")
        await pg.mouse.up(); await pg.wait_for_timeout(1500)
        check(await pg.evaluate("document.title") != title, "дата переключилась")
        check(await pg.evaluate("flyers.length") == 0, "улетевший лист удалён из DOM")
        check(not errs, f"нет ошибок JS {errs}")
        await pg.close()

        print("4. Все сценарии кнопки «Оторвать»")
        pg, errs = await open_page(b, w=760, h=860)
        n = await pg.evaluate("PLANS.length")
        for i in range(n):
            t0 = await pg.evaluate("document.title")
            await pg.evaluate(f"(() => {{ corner = 1; P = Cpt(); plan = PLANS[{i}](); mode = 'auto';"
                              f" stiffness = plan.stiff ?? 260; autoStart = performance.now(); }})()")
            dur = await pg.evaluate("plan.dur")
            await pg.wait_for_timeout(int(dur * 0.7))
            await pg.screenshot(path=str(OUT / f"4-plan{i}.png"))
            await pg.wait_for_timeout(int(dur * 0.3) + 3000)
            check(await pg.evaluate("document.title") != t0 and await pg.evaluate("mode") == "idle",
                  f"сценарий {i} доводит отрыв до конца")
        check(not errs, f"нет ошибок JS {errs}")
        await pg.close()

        print("5. Возврат листа: уголок никогда не проскакивает за край")
        pg, errs = await open_page(b, w=600, h=760)
        bad = await pg.evaluate("""() => new Promise(res => {
          let bad = 0; const t0 = performance.now(); const btn = document.getElementById('btnBack');
          btn.click(); setTimeout(() => btn.click(), 120); setTimeout(() => btn.click(), 240);
          (function f() {
            if ((corner === 1 && P.x > W + 0.01) || (corner === -1 && P.x < -0.01) || P.y > H + 0.01) bad++;
            if (performance.now() - t0 < 1500) requestAnimationFrame(f); else res(bad);
          })();
        })""")
        check(bad == 0, f"кадров с уголком за краем: {bad}")
        check(not errs, f"нет ошибок JS {errs}")
        await pg.close()

        print("6. Высокий загиб лежит поверх переплёта (тёмная тема)")
        pg, errs = await open_page(b, scheme="dark")
        box, x, y = await corner(pg)
        await pg.mouse.move(x, y); await pg.mouse.down()
        for _ in range(10):
            y += 7; await pg.mouse.move(x, y); await pg.wait_for_timeout(16)
        for _ in range(30):
            x -= 3; y -= 20; await pg.mouse.move(x, y); await pg.wait_for_timeout(16)
        check(await pg.evaluate("sheet.flapWrap.parentElement.id") == "flaps", "загиб в слое #flaps (над переплётом)")
        await pg.screenshot(path=str(OUT / "6-high-fold.png"))
        await pg.mouse.up()
        await pg.close()

        print("7. Начали тянуть вниз — дальше вбок лист рвётся, а не загибается")
        pg, errs = await open_page(b)
        box, x, y = await corner(pg)
        await pg.mouse.move(x, y); await pg.mouse.down()
        for _ in range(6):
            y += 5; await pg.mouse.move(x, y); await pg.wait_for_timeout(16)
        tp_down = await pg.evaluate("tp")
        fold = 0.0
        for _ in range(16):
            x -= 10; await pg.mouse.move(x, y); await pg.wait_for_timeout(16)
            fold = max(fold, await pg.evaluate("dist(P, Cpt())"))
        check(await pg.evaluate("dragKind") == "pull", "жест распознан как отрыв вниз")
        check(fold < 1, f"лист не загнулся при движении вбок (max {fold:.2f}px)")
        check(await pg.evaluate("tp") > tp_down + 20, "движение вбок продолжает рвать перфорацию")
        await pg.screenshot(path=str(OUT / "7-pull-sideways.png"))
        await pg.mouse.up()
        check(not errs, f"нет ошибок JS {errs}")
        await pg.close()

        print("8. Надорвали, отпустили, схватили снова — рвётся дальше сразу")
        pg, errs = await open_page(b)
        box, x, y = await corner(pg)
        await pg.mouse.move(x, y); await pg.mouse.down()
        for _ in range(40):
            if await pg.evaluate("tp / W") > 0.75: break
            y += 6; await pg.mouse.move(x, y); await pg.wait_for_timeout(16)
        await pg.mouse.up(); await pg.wait_for_timeout(900)
        part = await pg.evaluate("tp / W")
        check(0.6 < part < 0.97, f"лист надорван и висит ({part:.2f})")
        check(await pg.evaluate("sheetsLayer.style.filter.includes('drop-shadow')"), "у провисшего листа видна тень по краю")
        await pg.screenshot(path=str(OUT / "8-hanging.png"))
        box, x, y = await corner(pg)
        await pg.mouse.move(x, y); await pg.mouse.down()
        for _ in range(4):
            y += 6; await pg.mouse.move(x, y); await pg.wait_for_timeout(16)
        grown = await pg.evaluate("mode === 'held' || tp / W")
        for _ in range(16):
            y += 6; await pg.mouse.move(x, y); await pg.wait_for_timeout(16)
        check(grown is True or grown > part, "разрыв продолжился в первые 24 px движения")
        check(await pg.evaluate("mode") == "held", "лист дорван руками")
        await pg.mouse.up(); await pg.wait_for_timeout(1500)
        check(not errs, f"нет ошибок JS {errs}")
        await pg.close()

        await b.close()

    print("\nИтог:", "всё в порядке" if not failures else f"{len(failures)} провал(ов)")
    raise SystemExit(1 if failures else 0)


asyncio.run(main())
