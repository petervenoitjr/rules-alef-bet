#!/usr/bin/env python3
"""Build ALEF-BET RULES.
dist/sketch.js       one-file p5 web-editor build: SETTINGS, then the AHAD kits, then the game
dist/index.html      self-contained page (p5 2.3.4 from jsdelivr, everything else inline)
dist/test.html       same page, but loads the local p5 copy (for offline checks)
"""
import pathlib, subprocess, sys
root = pathlib.Path(__file__).parent
dist = root / 'dist'; dist.mkdir(exist_ok=True)
parts = [root / 'settings.js', root / 'letter-data.js', root / 'kits/dot-ui.js', root / 'kits/dot-rig.js', root / 'kits/ahad-feel.js', root / 'game.js']
src = '\n\n'.join(p.read_text() for p in parts)
(dist / 'sketch.js').write_text(src)

# p5-editor preflight: brace any loop that is not inside a block (loop-protect safe)
subprocess.run(['node', str(root / 'brace_loops.js'), str(dist / 'sketch.js')], check=True)
src = (dist / 'sketch.js').read_text()

head = '''<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no">
<title>Alef-Bet Rules</title>
<link href="https://fonts.googleapis.com/css2?family=Exo+2:wght@200;300;400;500&family=Frank+Ruhl+Libre:wght@400;500&family=Noto+Serif+Hebrew:wght@400;500&display=swap" rel="stylesheet">
<style>:root{color-scheme:dark}html,body{margin:0;height:100%;background:#03060f;overflow:hidden;display:flex;align-items:center;justify-content:center}canvas{display:block}</style>
<script src="P5SRC"></script>
</head><body>
<script>
'''
tail = '\n</script>\n</body></html>\n'
safe = src.replace('</script', '<\\/script')
(dist / 'index.html').write_text(head.replace('P5SRC', 'https://cdn.jsdelivr.net/npm/p5@2.3.4/lib/p5.min.js') + safe + tail)
(dist / 'test.html').write_text(head.replace('P5SRC', '../node_modules/p5/lib/p5.min.js') + safe + tail)
art = """<title>Alef-Bet Rules</title>
<link href="https://fonts.googleapis.com/css2?family=Exo+2:wght@200;300;400;500&family=Frank+Ruhl+Libre:wght@400;500&family=Noto+Serif+Hebrew:wght@400;500&display=swap" rel="stylesheet">
<style>:root{color-scheme:dark;--bg:#03060f}html,body{height:100%;margin:0;background:var(--bg);overflow:hidden}body{display:flex;align-items:center;justify-content:center}canvas{display:block}</style>
<script src="https://cdn.jsdelivr.net/npm/p5@2.3.4/lib/p5.min.js"></script>
<script>
""" + safe + "\n</script>\n"
(dist / 'alef-bet-rules.html').write_text(art)
print('built', len(src), 'chars')
