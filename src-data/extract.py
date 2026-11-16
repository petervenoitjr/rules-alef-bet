#!/usr/bin/env python3
"""Pull every Scripture fact the game shows, by program, from the WLC (openscriptures/morphhb) and four KJV copies.
Nothing here is typed from memory. Output: letters.json (per-letter Psalm 119 data) and checks.json (acrostic checks)."""
import json, re, sys, collections, xml.etree.ElementTree as ET, pathlib
here = pathlib.Path(__file__).parent
POINTS = re.compile('[֑-ׇ]')          # cantillation + vowel points + maqaf etc. (letters are U+05D0-05EA)
FINALS = {'ך': 'כ', 'ם': 'מ', 'ן': 'נ', 'ף': 'פ', 'ץ': 'צ'}
ORDER = [chr(c) for c in range(0x05D0, 0x05EB) if chr(c) not in FINALS]     # the 22 letters in order
assert len(ORDER) == 22

def wlc_book(name):
    root = ET.parse(here / f'wlc_{name}.xml').getroot()
    verses = {}
    for v in root.iter():
        if not v.tag.endswith('}verse'):
            continue
        words = []
        for w in v.iter():
            if w.tag.endswith('}w'):
                words.append({'text': (w.text or '').replace('/', ''), 'lemma': w.get('lemma', '')})
        verses[v.get('osisID')] = words
    return verses

def first_letter(word):
    for ch in POINTS.sub('', word):
        if 'א' <= ch <= 'ת':
            return FINALS.get(ch, ch)
    return None

# ---------- KJV: four copies ----------
def norm(s):
    s = re.sub(r'\s+', ' ', s).strip()
    s = re.sub(r' ([,.;:?!)])', r'\1', s)
    return s.replace('’', "'")
def kjv_copies(ch, vs):
    out = {}
    a = json.load(open(here / 'kjv_Psalms.json'))
    c = [x for x in a['chapters'] if str(x['chapter']) == str(ch)][0]
    out['aruljohn'] = norm([x for x in c['verses'] if str(x['verse']) == str(vs)][0]['text'])
    b = json.load(open(here / 'kjv3.json', encoding='utf-8-sig'))
    ps = [x for x in b if x['abbrev'] in ('ps', 'sl')][0]
    out['thiagobodruk'] = norm(ps['chapters'][ch - 1][vs - 1])
    d = json.load(open(here / 'kjv4.json'))
    bk = [x for x in d['books'] if x['name'].startswith('Psalm')][0]
    chp = [x for x in bk['chapters'] if int(x['chapter']) == ch][0]
    out['scrollmapper'] = norm([x for x in chp['verses'] if int(x['verse']) == vs][0]['text'])
    out['osis'] = norm(OSIS.get(f'Ps.{ch}.{vs}', ''))
    return out
def majority(d):
    cnt = collections.Counter(d.values()); best, n = cnt.most_common(1)[0]
    return best, n, {k: v for k, v in d.items() if v != best}

# OSIS: verse text (milestone style) + Psalm 119 letter headings
osis_raw = (here / 'eng-kjv.osis.xml').read_text(encoding='utf-8')
start = osis_raw.index('osisID="Ps.119.1"') - 2000; end = osis_raw.index('osisID="Ps.120.1"')
seg = osis_raw[start:end]
OSIS = {}
for m in re.finditer(r'<verse osisID="(Ps\.\d+\.\d+)" sID="[^"]+"[^>]*/>(.*?)<verse eID=', osis_raw[start - 400000 if start > 400000 else 0:end + 20000], re.S):
    OSIS[m.group(1)] = re.sub(r'<[^>]+>', '', m.group(2))
headings = [re.sub(r'\s+', ' ', h).strip().rstrip('.') for h in re.findall(r'<title type="psalm" canonical="true">([^<]*)</title>', seg)]
# the psalm's own title block precedes ALEPH; keep only the 22 letter headings (all caps single words)
headings = [h for h in headings if re.fullmatch(r'[A-Z]+', h)]
assert len(headings) == 22, headings

PS = wlc_book('Ps')
n119 = len([k for k in PS if k.startswith('Ps.119.')])
letters, problems = [], []
for i, L in enumerate(ORDER):
    v0 = 8 * i + 1
    firsts = [first_letter(PS[f'Ps.119.{v}'][0]['text']) for v in range(v0, v0 + 8)]
    all8 = all(f == L for f in firsts)
    if not all8:
        problems.append((L, firsts))
    w = PS[f'Ps.119.{v0}'][0]
    kj = kjv_copies(119, v0); text, votes, dissent = majority(kj)
    letters.append({'glyph': L, 'heading': headings[i], 'verses': [v0, v0 + 7], 'all8': all8,
                    'wlcFirstWord': POINTS.sub(lambda m: m.group(0), w['text']), 'wlcLemma': w['lemma'],
                    'kjv': text, 'kjvVotes': votes, 'kjvDissent': dissent})

def acrostic(book, ch, per=1, verses=None):
    V = wlc_book(book) if book != 'Ps' else PS
    keys = sorted([k for k in V if k.startswith(f'{book}.{ch}.')], key=lambda k: int(k.split('.')[-1]))
    if verses:
        keys = [k for k in keys if verses[0] <= int(k.split('.')[-1]) <= verses[1]]
    return [first_letter(V[k][0]['text']) for k in keys], len(keys)

checks = {'Ps119_verses_WLC': n119, 'Ps119_all_stanzas_ok': not problems, 'Ps119_problems': problems}
f, n = acrostic('Prov', 31, verses=(10, 31)); checks['Prov31_10_31'] = {'n': n, 'matches_order': f == ORDER}
for c in (1, 2, 4):
    f, n = acrostic('Lam', c); checks[f'Lam{c}'] = {'n': n, 'matches_order': f == ORDER, 'pe_before_ayin': f.index('פ') < f.index('ע') if 'פ' in f and 'ע' in f else None}
f, n = acrostic('Lam', 3); checks['Lam3'] = {'n': n, 'three_each': f == [x for x in ORDER for _ in range(3)], 'pe_before_ayin_pattern': f == [x for x in ([*ORDER[:16], ORDER[17], ORDER[16], *ORDER[18:]]) for _ in range(3)]}
f, n = acrostic('Ps', 145); checks['Ps145'] = {'n': n, 'letters_present': ''.join(sorted(set(f), key=ORDER.index)), 'missing': [x for x in ORDER if x not in f]}
(here / 'letters.json').write_text(json.dumps(letters, ensure_ascii=False, indent=1))
(here / 'checks.json').write_text(json.dumps(checks, ensure_ascii=False, indent=1))
print(json.dumps(checks, ensure_ascii=False))
for l in letters:
    print(l['glyph'], l['heading'], l['verses'], 'all8' if l['all8'] else 'NOT ALL 8', l['wlcFirstWord'], l['wlcLemma'], f"{l['kjvVotes']}/4", l['kjv'][:70], l['kjvDissent'] or '')

# ---------- the game's data file (generated; never edit by hand) ----------
ACCENTS = re.compile('[֑-ֽ֯׀׃-׆]')    # cantillation, meteg, paseq, sof pasuq: dropped for children; vowel points kept
LAM = wlc_book('Lam')
lam3 = [first_letter(LAM[f'Lam.3.{v}'][0]['text']) for v in range(1, 67)]
v1 = PS['Ps.145.1']
f145 = [first_letter(v1[2]['text'])] + [first_letter(PS[f'Ps.145.{v}'][0]['text']) for v in range(2, 22)]
checks['Lam3'] = {'n': 66, 'groups_of_3': all(len(set(lam3[i:i + 3])) == 1 for i in range(0, 66, 3)), 'pe_before_ayin': lam3.index('פ') < lam3.index('ע')}
checks['Ps145'] = {'n': len(f145), 'missing': [x for x in ORDER if x not in f145]}
sm_head = {}
d = json.load(open(here / 'kjv4.json')); bk = [x for x in d['books'] if x['name'].startswith('Psalm')][0]; c119 = [x for x in bk['chapters'] if int(x['chapter']) == 119][0]
for x in c119['verses']:
    m = re.match(r'\S+ ([A-Z]+)\. ', x['text'])
    if m: sm_head[int(x['verse'])] = m.group(1)
out = []
for l in letters:
    alt = sm_head.get(l['verses'][0])
    lemma = re.sub(r'^([a-z]+/)+', '', l['wlcLemma']).replace(' ', '')
    out.append({'glyph': l['glyph'], 'heading': l['heading'], 'headingAlt': alt if alt and alt != l['heading'] else '', 'from': l['verses'][0], 'to': l['verses'][1],
                'all8': l['all8'], 'firstWord': ACCENTS.sub('', l['wlcFirstWord']), 'strongs': 'H' + re.sub(r'[^0-9]', '', lemma), 'kjv': l['kjv']})
facts = {'ps119Verses': n119, 'ps119Ok': checks['Ps119_all_stanzas_ok'], 'prov31': checks['Prov31_10_31']['matches_order'],
         'lam1': checks['Lam1']['matches_order'], 'lam24PeAyin': checks['Lam2']['pe_before_ayin'] and checks['Lam4']['pe_before_ayin'],
         'lam3': checks['Lam3']['groups_of_3'] and checks['Lam3']['pe_before_ayin'], 'ps145NoNun': checks['Ps145']['missing'] == ['נ']}
js = ('// GENERATED by src-data/extract.py from the WLC (openscriptures/morphhb) and four KJV copies. Do not edit by hand: re-run extract.py.\n'
      '// PSALM119: one entry per letter (KJV heading, verses, first Hebrew word with vowel points, its Strong\'s number, the KJV first verse).\n'
      '// VERIFIED: acrostic facts checked by program; the game only shows a fact whose flag is true.\n'
      'const PSALM119 = ' + json.dumps(out, ensure_ascii=False) + ';\nconst VERIFIED = ' + json.dumps(facts) + ';\n')
(here.parent / 'letter-data.js').write_text(js)
print('facts', facts)
