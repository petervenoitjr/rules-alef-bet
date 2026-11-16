#!/usr/bin/env python3
"""Scripture audit for ALEF-BET RULES. Blocks delivery on any FAIL.
1. Every quotation written as "..." (Book c:v, KJV) in the built sketch must appear, word for word, in that KJV verse (majority of 4 copies).
2. Every PSALM119 entry: KJV text = majority reading; first Hebrew word begins with the entry's letter; Strong's number matches the WLC lemma.
3. Every verse rule in RULE_BATCHES points at the first verse of that letter's part."""
import json, re, sys, pathlib
here = pathlib.Path(__file__).parent
src = (here.parent / 'dist/sketch.js').read_text()
exec(open(here / 'extract.py').read().split("PS = wlc_book('Ps')")[0])   # reuse loaders (norm, kjv_copies, majority, wlc_book, first_letter)
PS = wlc_book('Ps')
fails, rows = [], []
for m in re.finditer(r'"([^"]{8,}?)"\s*\(Psalm (\d+):(\d+), KJV\)', src):
    q, c, v = m.group(1), int(m.group(2)), int(m.group(3))
    text = majority(kjv_copies(c, v))[0]
    ok = norm(q) in text
    rows.append(('PASS' if ok else 'FAIL', f'Psalm {c}:{v}', q[:60])); ok or fails.append(rows[-1])
data = json.loads(re.search(r'const PSALM119 = (\[.*?\]);', src).group(1))
for i, e in enumerate(data):
    text = majority(kjv_copies(119, e['from']))[0]
    w = PS[f"Ps.119.{e['from']}"][0]
    lemma = 'H' + re.sub(r'[^0-9]', '', re.sub(r'^([a-z]+/)+', '', w['lemma']).replace(' ', ''))
    ok = e['kjv'] == text and first_letter(e['firstWord']) == e['glyph'] and e['strongs'] == lemma and e['from'] == 8 * i + 1
    rows.append(('PASS' if ok else 'FAIL', f"Psalm 119:{e['from']} ({e['heading']})", e['kjv'][:60])); ok or fails.append(rows[-1])
# verse rules point at the first verse of their letter's part
names = re.findall(r"\['[^']+', '([A-Z]+)', \d+\]", src)[:22]
for m in re.finditer(r"type: 'letter', letter: '([A-Z]+)', verse: (\d+)", src):
    idx = names.index(m.group(1)); ok = int(m.group(2)) == 8 * idx + 1
    rows.append(('PASS' if ok else 'FAIL', f'rule {m.group(1)} -> Psalm 119:{m.group(2)}', 'first verse of the part' if ok else f'should be {8 * idx + 1}')); ok or fails.append(rows[-1])
for r in rows:
    print(' | '.join(r))
print(f'\n{len(rows)} checks: {len(rows) - len(fails)} PASS, {len(fails)} FAIL')
sys.exit(1 if fails else 0)
