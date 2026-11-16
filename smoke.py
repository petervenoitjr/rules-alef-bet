import asyncio, sys, pathlib
from playwright.async_api import async_playwright
root = pathlib.Path(__file__).parent
shots = root / 'shots'; shots.mkdir(exist_ok=True)

async def main():
    errs = []
    async with async_playwright() as p:
        b = await p.chromium.launch(args=['--autoplay-policy=no-user-gesture-required'])
        pg = await b.new_page(viewport={'width': 540, 'height': 960})
        pg.on('pageerror', lambda e: errs.append('pageerror: ' + str(e)))
        pg.on('console', lambda m: errs.append('console: ' + m.text) if m.type == 'error' and 'fonts.g' not in m.text and 'ERR_' not in m.text else None)
        await pg.goto('file://' + str(root / 'dist/test.html'))
        await pg.wait_for_function('window.ALEF && typeof draw === "function"', timeout=15000)
        await pg.wait_for_timeout(1200)
        async def snap(name):
            await pg.wait_for_timeout(450); await pg.screenshot(path=str(shots / (name + '.png')))
        E = pg.evaluate
        assert await E('ALEF.scene') == 'title'; await snap('01-title')
        await E('ALEF.go("howto")'); await snap('02-howto')
        await E('ALEF.go("debug")'); await snap('03-debug')
        # board fairness across all levels
        bad = await E('''(() => { const out = []; for (let lv = 1; lv <= 40; lv++) { let p = 0; for (let i = 0; i < 50; i++) { if (ALEF.board(lv).perfect) p++; } out.push(lv + ':' + p + "/50"); } return out.join(' '); })()''')
        print('perfect boards per level:', bad)
        # timeless run
        await E('ALEF.start("timeless", 1)'); assert await E('ALEF.scene') == 'announce'; await snap('04-announce-L1')
        await E('ALEF.begin()'); assert await E('ALEF.scene') == 'play'; await pg.wait_for_timeout(700); await snap('05-play-L1')
        # play every level to the end, one wrong tap per level to exercise the miss path + auto hint
        for lv in range(1, 41):
            if lv > 1:
                assert await E('ALEF.scene') == 'announce', ('expected announce', lv, await E('ALEF.scene'))
                if lv in (4, 11, 23, 31, 35): await snap('06-announce-L%02d' % lv)
                await E('ALEF.begin()'); await pg.wait_for_timeout(300)
            g = await E('({lv: ALEF.G.level, n: ALEF.G.rules.length, ph: ALEF.G.phase})')
            assert g['lv'] == lv, g
            await E('ALEF.tapWrong()'); await E('ALEF.tapWrong()')
            if lv in (8, 27):
                await pg.wait_for_timeout(250); await snap('07-play-L%02d-wrong-hint' % lv)
            n = 0
            while await E('ALEF.scene') == 'play' and await E('ALEF.G.clearT') < 0:
                ok = await E('ALEF.tapValid()'); n += 1
                assert ok, ('no valid tile', lv, await E('ALEF.G.phase'))
                if lv == 9 and n == 6: await pg.wait_for_timeout(120); await snap('08-play-L09-combo')
                assert n < 40
            await pg.wait_for_timeout(1000)
            assert await E('ALEF.scene') == 'clear', (lv, await E('ALEF.scene'))
            if lv in (1, 10, 21): await snap('09-clear-L%02d' % lv)
            await E('ALEF.next()')
        assert await E('ALEF.scene') == 'win'; await snap('10-win')
        met = await E('Object.keys(ALEF.met).length'); print('letters met after a full run:', met)
        await E('ALEF.book()'); await snap('14-book')
        for i in (0, 13, 17, 20):
            await E('ALEF.card(%d)' % i); await snap('15-card-%02d' % i)
        await E('ALEF.go("title")'); await snap('01b-title-after')
        print('facts shown:', await E('ALEF.facts.length'))
        # pause screen + toggles
        await E('ALEF.start("timeless", 5)'); await E('ALEF.begin()'); await pg.wait_for_timeout(500)
        await pg.mouse.click(505, 37); await pg.wait_for_timeout(200)
        assert await E('ALEF.paused') is True; await snap('11-pause')
        await pg.mouse.click(270, 296); await pg.wait_for_timeout(200)          # RESUME
        assert await E('ALEF.paused') is False
        # a real tile click through the canvas
        sc0 = await E('ALEF.G.score')
        pos = await E('(() => { const t = ALEF.G.tiles.find(t => t.alive); const S = 112, g = 12, x0 = (540 - (4*S + 3*g)) / 2; return [x0 + t.col*(S+g) + S/2, 300 + t.row*(S+g) + S/2]; })()')
        await pg.mouse.click(pos[0], pos[1]); await pg.wait_for_timeout(100)
        assert await E('ALEF.G.score') != sc0 or await E('ALEF.G.mistakes') > 0, 'tile click did nothing'
        # challenge: clock runs out
        await E('ALEF.start("challenge", 1)'); await E('ALEF.begin()'); await pg.wait_for_timeout(600); await snap('12-challenge')
        await E('ALEF.G.time = 0.3'); await pg.wait_for_timeout(700)
        assert await E('ALEF.scene') == 'over', await E('ALEF.scene')
        await pg.wait_for_timeout(900); await snap('13-timeup')
        await b.close()
    print('\n'.join(errs) if errs else 'NO PAGE ERRORS')
    return 1 if errs else 0

sys.exit(asyncio.run(main()))
