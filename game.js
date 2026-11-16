// ============================================================================
// ALEF-BET RULES  --  the game.  Needs settings (above), then dot-ui.js, dot-rig.js, ahad-feel.js.
// Rules!-style: each level adds one rule; clear the newest rule's tiles first, then the rule before it, down to rule 1.
// ============================================================================

// ---------- the 22 letters: glyph, name, value (standard Hebrew number values) ----------
const LETTERS = [
  ['א', 'ALEF', 1], ['ב', 'BET', 2], ['ג', 'GIMEL', 3], ['ד', 'DALET', 4], ['ה', 'HE', 5], ['ו', 'VAV', 6],
  ['ז', 'ZAYIN', 7], ['ח', 'CHET', 8], ['ט', 'TET', 9], ['י', 'YOD', 10], ['כ', 'KAF', 20], ['ל', 'LAMED', 30],
  ['מ', 'MEM', 40], ['נ', 'NUN', 50], ['ס', 'SAMEKH', 60], ['ע', 'AYIN', 70], ['פ', 'PE', 80], ['צ', 'TSADI', 90],
  ['ק', 'QOF', 100], ['ר', 'RESH', 200], ['ש', 'SHIN', 300], ['ת', 'TAV', 400]
];
const FINAL_FORMS = { KAF: 'ך', MEM: 'ם', NUN: 'ן', PE: 'ף', TSADI: 'ץ' };   // the five letters with a final form
// sounds in modern Hebrew (what children hear today). Two sounds = with and without the dot (dagesh), or Shin / Sin
const LETTER_SOUNDS = { ALEF: [], BET: ['b', 'v'], GIMEL: ['g'], DALET: ['d'], HE: ['h'], VAV: ['v'], ZAYIN: ['z'], CHET: ['ch'], TET: ['t'], YOD: ['y'],
  KAF: ['k', 'kh'], LAMED: ['l'], MEM: ['m'], NUN: ['n'], SAMEKH: ['s'], AYIN: [], PE: ['p', 'f'], TSADI: ['ts'], QOF: ['k'], RESH: ['r'], SHIN: ['sh', 's'], TAV: ['t'] };
const SOUND_TEXT = { ALEF: 'Silent. It carries a vowel sound.', BET: 'B with a dot inside, V without it.', GIMEL: 'G, as in go.', DALET: 'D', HE: 'H', VAV: 'V',
  ZAYIN: 'Z', CHET: 'CH, as in Bach.', TET: 'T', YOD: 'Y', KAF: 'K with a dot inside, KH without it.', LAMED: 'L', MEM: 'M', NUN: 'N', SAMEKH: 'S',
  AYIN: 'Silent today. It carries a vowel sound.', PE: 'P with a dot inside, F without it.', TSADI: 'TS', QOF: 'K (written Q)', RESH: 'R',
  SHIN: 'SH with a dot on the right, S with a dot on the left.', TAV: 'T' };
const LETTER_INFO = {};
LETTERS.forEach((L, i) => { LETTER_INFO[L[1]] = { i, glyph: L[0], name: L[1], value: L[2], sounds: LETTER_SOUNDS[L[1]], soundText: SOUND_TEXT[L[1]], final: FINAL_FORMS[L[1]] || '', psalm: PSALM119[i] }; });
const soundLabel = (name) => { const s = LETTER_SOUNDS[name]; return s.length ? s.join(' / ').toUpperCase() : 'SILENT'; };
// "Did you know?" lines. Ones that need Scripture only show when src-data/extract.py verified them (VERIFIED flags).
const FACTS = [
  ['Hebrew is written and read from right to left.', true],
  ['The Alef-Bet has 22 letters. They are all consonants; vowels are small dots and dashes added around them.', true],
  ['Five letters change shape at the end of a word: KAF, MEM, NUN, PE and TSADI. These are the final forms.', true],
  ['Every letter is also a number. ALEF is 1, YOD is 10, QOF is 100 and TAV is 400.', true],
  ['Psalm 119 has 22 parts, one for each letter, with 8 verses in each part: 176 verses.', VERIFIED.ps119Ok && VERIFIED.ps119Verses === 176],
  ['In the Hebrew of Psalm 119, all 8 verses of each part begin with that part\'s letter.', VERIFIED.ps119Ok],
  ['Your KJV prints the letter names in Psalm 119: ALEPH, BETH, GIMEL and on to TAU.', VERIFIED.ps119Ok],
  ['Proverbs 31:10-31 is an Alef-Bet poem: 22 verses, ALEF to TAV in order.', VERIFIED.prov31],
  ['Lamentations 1 has 22 verses, one for each letter in order.', VERIFIED.lam1],
  ['Lamentations 3 has 66 verses: three verses for each letter.', VERIFIED.lam3],
  ['In Lamentations 2, 3 and 4, PE comes before AYIN.', VERIFIED.lam24PeAyin && VERIFIED.lam3],
  ['Psalm 145 is an Alef-Bet psalm, but in the Hebrew text there is no verse for NUN.', VERIFIED.ps145NoNun],
  ['ALEF and AYIN are silent letters today. Each one carries a vowel sound.', true],
  ['BET, KAF and PE have two sounds: with a dot inside they say B, K, P; without it V, KH, F.', true]
].filter((f) => f[1]).map((f) => f[0]);
const MET = {};                                 // letters the player has tapped correctly (their Letter Book)
let bookIdx = 0, bookBack = 'title', cardBack = 'book';
const TOTAL_LEVELS = RULE_BATCHES.reduce((s, b) => s + b.rules.length, 0);
const SAVE_KEY = 'alefbet_rules_v1';

let cnv = null, scene = 'title', sceneT = 0, howtoBack = 'title', paused = false, debugMode = 'timeless';
let G = null;                                   // the current run
let parts = [];                                 // little squares that fly off a cleared tile
let dotRig = null, titleRig = null;
const OPT = { sound: AUDIO_ON, values: DISPLAY_SHOW_VALUES, names: DISPLAY_SHOW_NAMES, glitch: DISPLAY_SCREEN_GLITCH };
const DBG = { ruleText: DEBUG_ON && DEBUG_SHOW_RULE_TEXT, infinite: DEBUG_ON && DEBUG_INFINITE_TIME, hitboxes: DEBUG_ON && DEBUG_SHOW_HITBOXES };
const BEST = { timeless: 0, challenge: 0, score: 0 };

// ---------- small helpers ----------
const pad2 = (n) => String(n).padStart(2, '0');
const randInt = (n) => Math.floor(Math.random() * n);
function shuffleArr(a) { for (let i = a.length - 1; i > 0; i--) { const j = randInt(i + 1), t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
function colKey(name) { const c = TILE_COLORS.find((q) => q[0] === name); return c ? TR[c[1]] : TR.cy; }
function findLetter(name) { return LETTERS.find((L) => L[1] === name); }
function groupOf(v) { return v < 10 ? 'ones' : v < 100 ? 'tens' : 'hundreds'; }
function hebTxt(s, x, y, size, col) { textFont(DISPLAY_HEBREW_FONT); textSize(size); try { textWeight(400); } catch (_) {} lspace(0); fill(col); noStroke(); textAlign(CENTER, CENTER); text(s, x, y); }
function goScene(s) { scene = s; sceneT = 0; }
function saveAll() { try { localStorage.setItem(SAVE_KEY, JSON.stringify({ best: BEST, opt: OPT, met: MET })); } catch (_) {} }
function loadAll() { try { const o = JSON.parse(localStorage.getItem(SAVE_KEY) || 'null'); if (o && o.best) { Object.assign(BEST, o.best); } if (o && o.opt) { Object.assign(OPT, o.opt); } if (o && o.met) { Object.assign(MET, o.met); } } catch (_) {} }

// ---------- rules ----------
function ruleMatch(r, t) {
  switch (r.type) {
    case 'seq': return true;
    case 'color': return t.color === r.color;
    case 'final': return !!FINAL_FORMS[t.name];
    case 'group': return groupOf(t.value) === r.group;
    case 'letter': return t.name === r.letter;
    case 'min': return t.value >= r.min;
    case 'sound': return LETTER_SOUNDS[t.name].includes(r.sound);
    case 'silent': return LETTER_SOUNDS[t.name].length === 0;
    case 'two': return LETTER_SOUNDS[t.name].length >= 2;
    case 'and': return r.parts.every((p) => ruleMatch(p, t));
    default: return false;
  }
}
function ruleSay(r) { return r.say || (r.verse ? 'Tap the letter that begins Psalm 119:' + r.verse + ' in Hebrew.' : ''); }
function verseOf(r) { if (r.type !== 'letter' || !r.verse) { return null; } const P = LETTER_INFO[r.letter].psalm; return P.from === r.verse ? P : null; }   // only the first verse of a part is in the data
function batchOf() { return RULE_BATCHES[G.info.batch]; }
function ruleColor(r) { if (r.type === 'color') { return r.color; } if (r.type === 'and') { const p = r.parts.find((q) => q.type === 'color'); return p ? p.color : null; } return null; }
function levelInfo(level) {
  let l = Math.max(1, Math.min(TOTAL_LEVELS, level));
  for (let b = 0; b < RULE_BATCHES.length; b++) { const n = RULE_BATCHES[b].rules.length; if (l <= n) { return { batch: b, n: l, rules: RULE_BATCHES[b].rules.slice(0, l) }; } l -= n; }
  return { batch: 0, n: 1, rules: RULE_BATCHES[0].rules.slice(0, 1) };
}

// ---------- the board: random tiles, then keep the fairest of many tries ----------
function needLetters(r, out) { if (r.type === 'letter') { out.push(r.letter); } if (r.type === 'and') { for (const p of r.parts) { needLetters(p, out); } } }
function randomBoard(rules) {
  const total = BOARD_COLS * BOARD_ROWS, counts = {}, picks = [], need = [];
  for (const r of rules) { needLetters(r, need); }
  for (const nm of need) { if (picks.length < total && Math.random() < 0.85) { picks.push(findLetter(nm)); counts[nm] = (counts[nm] || 0) + 1; } }
  let guard = 0;
  while (picks.length < total && guard < 2000) {
    guard++; const L = LETTERS[randInt(LETTERS.length)];
    if ((counts[L[1]] || 0) >= BOARD_MAX_COPIES) { continue; }
    counts[L[1]] = (counts[L[1]] || 0) + 1; picks.push(L);
  }
  shuffleArr(picks);
  return picks.map((L, i) => ({ glyph: L[0], name: L[1], value: L[2], color: TILE_COLORS[randInt(TILE_COLORS.length)][0], i, col: i % BOARD_COLS, row: Math.floor(i / BOARD_COLS), alive: true, pop: 0, dieT: -1, shakeT: 0 }));
}
function scoreBoard(tiles, rules) {      // higher = fairer: every rule above 1 has something to tap, and rule 1 still has tiles left
  let rest = tiles.slice(), s = 0, perfect = true;
  for (let k = rules.length - 1; k >= 1; k--) {
    const m = rest.filter((t) => ruleMatch(rules[k], t));
    if (m.length > 0) { s += 1000 - Math.abs(m.length - 2) * 15; } else { perfect = false; }
    rest = rest.filter((t) => !ruleMatch(rules[k], t));
  }
  if (rest.length >= BOARD_MIN_FOR_RULE1) { s += 1000; } else { perfect = false; s -= 300; }
  return { s, perfect };
}
function makeBoard(rules) {
  let best = null, bestS = -1e9, perfect = false;
  for (let a = 0; a < BOARD_TRIES; a++) {
    const tiles = randomBoard(rules), sc = scoreBoard(tiles, rules);
    if (sc.s > bestS) { best = tiles; bestS = sc.s; perfect = sc.perfect; }
    if (sc.perfect && a > 20) { break; }
  }
  // repair pass: recolor one tile at a time, keeping any change that does not make the board less fair
  for (let a = 0; a < BOARD_TRIES && !perfect; a++) {
    const t = best[randInt(best.length)], old = t.color;
    t.color = TILE_COLORS[randInt(TILE_COLORS.length)][0];
    const sc = scoreBoard(best, rules);
    if (sc.s >= bestS) { bestS = sc.s; perfect = sc.perfect; } else { t.color = old; }
  }
  return best;
}
function boardX0() { return (width - (BOARD_COLS * BOARD_TILE_SIZE + (BOARD_COLS - 1) * BOARD_TILE_GAP)) / 2; }
function tileCenter(t) { return { x: boardX0() + t.col * (BOARD_TILE_SIZE + BOARD_TILE_GAP) + BOARD_TILE_SIZE / 2, y: BOARD_TOP + t.row * (BOARD_TILE_SIZE + BOARD_TILE_GAP) + BOARD_TILE_SIZE / 2 }; }
function tileAt(x, y) { const h = CONTROLS_TILE_HITBOX / 2; return G.tiles.find((t) => { if (!t.alive) { return false; } const c = tileCenter(t); return Math.abs(x - c.x) <= h && Math.abs(y - c.y) <= h; }) || null; }
function aliveTiles() { return G.tiles.filter((t) => t.alive); }

// ---------- sound: tiny synthesized blips (WebAudio), started on the first tap ----------
const SND = { ctx: null, out: null };
function sndInit() {
  if (SND.ctx) { if (SND.ctx.state !== 'running') { try { SND.ctx.resume(); } catch (_) {} } return; }
  try { const AC = window.AudioContext || window.webkitAudioContext; if (!AC) { return; } SND.ctx = new AC(); SND.out = SND.ctx.createGain(); SND.out.gain.value = AUDIO_VOLUME; SND.out.connect(SND.ctx.destination); } catch (_) {}
}
function tone(f, dur, vol, type, delay, f2) {
  if (!OPT.sound || !SND.ctx || SND.ctx.state !== 'running') { return; }
  const c = SND.ctx, t0 = c.currentTime + (delay || 0), o = c.createOscillator(), g = c.createGain();
  o.type = type || 'triangle'; o.frequency.setValueAtTime(f, t0); if (f2) { o.frequency.exponentialRampToValueAtTime(f2, t0 + dur); }
  g.gain.setValueAtTime(0.0001, t0); g.gain.linearRampToValueAtTime(vol || 0.2, t0 + 0.006); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.connect(g); g.connect(SND.out); o.start(t0); o.stop(t0 + dur + 0.05);
}
const hz = (m) => 440 * Math.pow(2, (m - 69) / 12);
const SFX = {
  ui() { tone(1300, 0.05, 0.12, 'sine', 0, 1750); },
  good(k) { const m = 79 + [0, 2, 4, 7, 9, 12, 14, 16][Math.min(7, Math.max(0, k - 1))]; tone(hz(m), 0.12, 0.16, 'triangle'); tone(hz(m + 12), 0.08, 0.05, 'sine'); },
  wrong() { tone(220, 0.22, 0.13, 'sawtooth', 0, 95); },
  phase() { tone(hz(81), 0.09, 0.15, 'triangle'); tone(hz(88), 0.16, 0.15, 'triangle', 0.07); },
  clear() { [69, 73, 76, 81].forEach((m, i) => tone(hz(m), 0.45, 0.14, 'triangle', i * 0.1)); },
  jingle() { [[81, 0, 0.26], [83, 0.14, 0.26], [81, 0.28, 0.26], [86, 0.44, 1.3]].forEach((n) => tone(hz(n[0]), n[2], 0.17, 'triangle', n[1])); },   // the AHAD jingle: A - B - A - D
  big() { [69, 73, 76, 81, 85, 88].forEach((m, i) => tone(hz(m), 0.6, 0.13, 'triangle', i * 0.09)); [57, 64, 69, 73].forEach((m) => tone(hz(m), 1.8, 0.07, 'sine', 0.6)); },
  fail() { tone(230, 0.9, 0.15, 'sawtooth', 0, 45); }
};

// ---------- a run ----------
function newGame(mode, level) {
  G = { mode, level: 1, score: 0, time: PLAYER_START_TIME, mistakes: 0, levelMist: 0, phaseMist: 0, phase: 0, rules: [], info: null, tiles: [],
    hintT: 0, hints: 0, face: 'happy', faceT: 0, flashT: 0, clearT: -1, cleared: 0, newLetters: [] };
  paused = false; AhadFeel.combo.best = 0; startLevel(level || 1);
}
function startLevel(level) {
  G.level = level; G.info = levelInfo(level); G.rules = G.info.rules; G.tiles = makeBoard(G.rules);
  G.levelMist = 0; G.phaseMist = 0; G.hintT = 0; G.clearT = -1; G.newLetters = []; G.fact = FACTS[(level - 1) % FACTS.length]; G.phase = G.rules.length - 1; parts = [];
  goScene('announce');
}
function beginPlay() {
  if (scene !== 'announce') { return; }
  goScene('play'); paused = false;
  for (const t of G.tiles) { t.pop = -t.i * BOARD_POP_DELAY * 4; }
  enterPhase(G.rules.length - 1, true); SFX.jingle(); setFace('happy', 0);
}
function phaseHas(k) { const r = G.rules[k], a = aliveTiles(); if (r.type === 'seq') { return a.length > 0; } return a.some((t) => ruleMatch(r, t)); }
function enterPhase(k, first) {               // skips any rule with nothing left to tap (like Rules!)
  while (k > 0 && !phaseHas(k)) { k--; }
  G.phase = k; G.phaseMist = 0; G.hintT = 0; G.flashT = first ? 0 : 0.7;
}
function validTiles() {
  const a = aliveTiles(), r = G.rules[G.phase]; if (!r || !a.length) { return []; }
  if (r.type === 'seq') { const vals = a.map((t) => t.value), target = r.dir === 'low' ? Math.min(...vals) : Math.max(...vals); return a.filter((t) => t.value === target); }
  return a.filter((t) => ruleMatch(r, t));
}
function setFace(f, secs) { G.face = f; G.faceT = secs; }
function showHint(manual) { G.hintT = PLAYER_HINT_SECONDS; if (manual) { G.hints++; } setFace('content', 1.2); }
function tapTile(t) {
  if (G.clearT >= 0 || paused || scene !== 'play') { return; }
  const c = tileCenter(t);
  if (validTiles().includes(t)) {
    t.alive = false; t.dieT = 0; G.score += PLAYER_POINTS_CORRECT;
    if (!MET[t.name]) { MET[t.name] = true; G.newLetters.push(t.name); saveAll(); }
    if (G.mode === 'challenge') { G.time = Math.min(PLAYER_TIME_MAX, G.time + PLAYER_TIME_PER_CORRECT); }
    burst(c.x, c.y, colKey(t.color)); AhadFeel.comboAdd(c.x, c.y);
    const r = G.rules[G.phase];
    if (aliveTiles().length === 0) { boardCleared(); }
    else if (r.type !== 'seq' && !phaseHas(G.phase)) { enterPhase(G.phase - 1, false); SFX.phase(); }
  } else {
    t.shakeT = 0.35; G.mistakes++; G.levelMist++; G.phaseMist++; setFace('sad', 0.9); SFX.wrong();
    AhadFeel.shake(4); if (OPT.glitch) { AhadFeel.glitch(0.25); }
    if (AhadFeel.combo.t > 0) { AhadFeel.combo.t = 0.0001; }       // a wrong tap ends the streak
    if (G.mode === 'challenge' && !DBG.infinite) { G.time -= PLAYER_TIME_PENALTY; }
    if (G.mode === 'timeless' && G.phaseMist >= PLAYER_HINT_AFTER && G.hintT <= 0) { showHint(false); }
  }
}
function boardCleared() {
  G.clearT = 0; G.cleared++; G.score += PLAYER_POINTS_CLEAR; setFace('heart', 3); G.hintT = 0;
  const batchEnd = G.info.n === RULE_BATCHES[G.info.batch].rules.length;
  if (batchEnd) { AhadFeel.greatJob(); SFX.big(); } else { SFX.clear(); }
  recordBest(G.level);
}
function recordBest(levelDone) { BEST[G.mode] = Math.max(BEST[G.mode] || 0, levelDone); BEST.score = Math.max(BEST.score || 0, G.score); saveAll(); }
function nextLevel() { if (G.level >= TOTAL_LEVELS) { goScene('win'); } else { startLevel(G.level + 1); } }
function gameOver() { G.time = 0; recordBest(G.level - 1); SFX.fail(); goScene('over'); }
function updatePlay(dt) {
  if (G.faceT > 0) { G.faceT -= dt; }
  if (G.hintT > 0) { G.hintT -= dt; }
  if (G.flashT > 0) { G.flashT -= dt; }
  if (G.clearT >= 0) { G.clearT += dt; if (G.clearT > 0.8) { goScene('clear'); } return; }
  if (G.mode === 'challenge' && !DBG.infinite) { G.time -= dt; if (G.time <= 0) { gameOver(); } }
}

// ---------- particles ----------
function burst(x, y, col) { for (let i = 0; i < 12; i++) { const a = Math.random() * TWO_PI, s = 60 + Math.random() * 170; parts.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: 0.5, max: 0.5, col }); } }
function drawParts(dt) {
  for (const p of parts) { p.life -= dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= 0.92; p.vy *= 0.92; }
  parts = parts.filter((p) => p.life > 0); noStroke();
  for (const p of parts) { fill(rgba(hex7(p.col), p.life / p.max)); rect(p.x - 2, p.y - 2, 4, 4); }
}

// ---------- drawing: tiles ----------
function drawTile(t, x, y, s, a, wrong) {
  const col = wrong ? TR.red : colKey(t.color), h = s / 2, k = s / BOARD_TILE_SIZE;
  drawingContext.globalAlpha = a;
  stroke(col); strokeWeight(1.6); fill(3, 10, 30, 210); chamfer(x - h, y - h, s, s, 12 * k);
  stroke(rgba(hex7(col), 0.25)); strokeWeight(1); noFill(); corners(x - h + 6 * k, y - h + 6 * k, s - 12 * k, s - 12 * k, 10 * k);
  glow(col, 10); hebTxt(t.glyph, x, y - 4 * k, DISPLAY_GLYPH_SIZE * k, col); noGlow();
  if (OPT.values) { stroke(rgba(hex7(col), 0.55)); strokeWeight(1); fill(3, 10, 30, 230); chamfer(x - h + 7 * k, y - h + 7 * k, 34 * k, 17 * k, 4 * k); txt(String(t.value), x - h + 24 * k, y - h + 16 * k, 9 * k, col, CENTER, 400, 1); }
  if (OPT.names && !(G && batchOf().hideNames)) { txt(t.name, x + 1.5, y + h - 14 * k, 8 * k, rgba(hex7(col), 0.85), CENTER, 400, 3); }
  drawingContext.globalAlpha = 1;
}
function drawBoard(dt) {
  const S = BOARD_TILE_SIZE, hinting = scene === 'play' && G.hintT > 0 && PLAYER_HINT_SHOWS_TILES;
  for (const t of G.tiles) {
    if (t.pop < 1) { t.pop = Math.min(1, t.pop + dt * 4); }
    if (t.shakeT > 0) { t.shakeT -= dt; }
    let a = 1, k;
    if (!t.alive) {
      if (t.dieT < 0 || t.dieT >= 0.3) { continue; }
      t.dieT += dt; const d = Math.min(1, t.dieT / 0.3); k = 1 + d * 0.25; a = 1 - d;
    } else { const pk = Math.max(0, Math.min(1, t.pop)); k = pk * pk * (3 - 2 * pk); }
    if (k <= 0.01) { continue; }
    const c = tileCenter(t), sx = t.shakeT > 0 ? Math.sin(t.shakeT * 60) * 6 * (t.shakeT / 0.35) : 0;
    drawTile(t, c.x + sx, c.y, S * k, a, t.shakeT > 0);
  }
  if (hinting) { for (const t of validTiles()) { const c = tileCenter(t); focusBrackets(c.x, c.y, S * 0.5 + 2); } }
  if (DBG.hitboxes) { noFill(); stroke(255, 0, 0, 160); strokeWeight(1); for (const t of G.tiles) { if (t.alive) { const c = tileCenter(t); rect(c.x - CONTROLS_TILE_HITBOX / 2, c.y - CONTROLS_TILE_HITBOX / 2, CONTROLS_TILE_HITBOX, CONTROLS_TILE_HITBOX); } } }
}

// ---------- drawing: the play screen ----------
function drawHud(dt) {
  const live = scene === 'play' && !paused && G.clearT < 0;
  // top left: the clock (CHALLENGE) or the mode
  if (G.mode === 'challenge') { meter(18, 30, 176, Math.max(0, G.time), PLAYER_TIME_MAX, 'TIME'); }
  else { txt('MODE', 18, 14, 9, 'rgba(160,240,255,0.85)', LEFT, 400, 4); txt('TIMELESS', 18, 36, 18, TR.gn, LEFT, 200, 4); }
  // top centre: level and the rule stack progress
  const done = scene === 'play' || scene === 'clear' ? G.rules.length - 1 - G.phase + (G.clearT >= 0 ? 1 : 0) : 0;
  txt('LEVEL ' + pad2(G.level) + '  //  ' + batchOf().title, width / 2 + 2, 16, 9, 'rgba(25,227,255,0.55)', CENTER, 400, 5);
  pips(width / 2, 28, G.rules.length, done);
  // top right: score + pause
  counter(width - 66, 40, G.score, 'SCORE');
  pauseHex(width - 35, 37, live ? () => { paused = true; } : null);
  // the rule stack: one hex per rule, newest on the right
  txt('RULE STACK', 18, 78, 8, 'rgba(160,240,255,0.7)', LEFT, 400, 3);
  for (let k = 0; k < G.rules.length; k++) {
    const x = 120 + k * 40, y = 78, isDone = k > G.phase || G.clearT >= 0, active = k === G.phase && G.clearT < 0;
    const col = active ? TR.am : isDone ? TR.gn : 'rgba(25,227,255,0.45)';
    if (active) { glow(TR.am, 10 + 6 * Math.sin(DUI.t * 6)); }
    stroke(col); strokeWeight(active ? 1.8 : 1.2); fill(active ? 'rgba(255,185,56,0.14)' : 'rgba(3,10,30,0.6)'); hexagon(x, y, 14, HALF_PI); noGlow();
    txt(String(k + 1), x + 0.5, y + 0.5, 11, col, CENTER, 400, 0);
  }
  // DO-T and his panel
  const face = G.faceT > 0 ? G.face : (G.mode === 'challenge' && G.time < PLAYER_TIME_MAX * 0.2 ? 'strained' : 'happy');
  dotRig.update(dt, 0, 0, 2.5, {}); dotRig.draw(78, 192, DISPLAY_DOT_RADIUS, { face, tool: 'light', aim: 2.5, lightOn: true });
  const showText = G.hintT > 0 || DBG.ruleText, r = G.rules[G.phase], px = 150, pw = width - 168;
  const pcol = G.flashT > 0 && Math.sin(G.flashT * 20) > 0 ? TR.am : showText ? TR.vi : TR.cy;
  panel(px, 124, pw, 134, pcol);
  if (G.clearT >= 0) { txt('BOARD CLEAR', px + 22, 162, 10, TR.gn, LEFT, 400, 8); txt('GOOD WORK', px + 22, 200, 30, '#FFFFFF', LEFT, 200, 8); }
  else if (showText) {
    txt((G.hintT > 0 ? 'HINT  //  ' : '') + 'RULE ' + (G.phase + 1), px + 22, 150, 10, TR.vi, LEFT, 400, 6);
    wrapTxt(ruleSay(r), px + 22, 166, pw - 40, 16, '#FFFFFF', 21, LEFT, 300);
  } else {
    txt('NOW FOLLOW', px + 22, 150, 10, TR.cy2, LEFT, 400, 8);
    txt(DISPLAY_SHOW_RULE_NUMBER ? 'RULE ' + (G.phase + 1) : 'RULE ?', px + 22, 192, 34, '#FFFFFF', LEFT, 200, 10);
    txt(G.phase === 0 ? 'THE LAST RULE  //  CLEAR THE BOARD' : 'FROM MEMORY  //  THEN RULE ' + G.phase, px + 22, 232, 9, TR_SUB, LEFT, 400, 3);
  }
  // bottom: stats, hint, combo
  txt('TILES  ' + aliveTiles().length + '      MISSES  ' + G.levelMist, width / 2 + 2, 800, 10, TR_SUB, CENTER, 400, 4);
  if (G.mode === 'timeless') { uiBtn(40, 832, 180, 52, 'HINT', live ? () => showHint(true) : null, { col: TR.vi, size: 14 }); }
  else { txt('WRONG TAP  //  -' + PLAYER_TIME_PENALTY + ' SEC', 40, 858, 9, rgba(TR.red, 0.8), LEFT, 400, 3); }
  AhadFeel.drawCombo(width - 96, 846);
}
function drawGame(dt) {
  background(TR.bg); gridBack(30, 12);
  push(); AhadFeel.applyShake(); drawBoard(dt); drawParts(dt); pop();
  drawHud(dt);
}

// ---------- the NEW RULE card ----------
function drawExamples(r, y) {
  let ex = [];
  const soundRule = ['sound', 'silent', 'two'].includes(r.type);
  if (r.type === 'seq') { ex = (r.dir === 'low' ? ['ALEF', 'BET', 'GIMEL', 'DALET', 'HE'] : ['TAV', 'SHIN', 'RESH', 'QOF', 'TSADI']).map((nm) => [LETTER_INFO[nm], TR.cy]); }
  else if (r.type === 'color') { ex = ['ALEF', 'NUN', 'TAV'].map((nm) => [LETTER_INFO[nm], colKey(r.color)]); }
  else { const cn = ruleColor(r); ex = LETTERS.filter((L) => ruleMatch(r, { name: L[1], value: L[2], color: cn || 'CYAN' })).slice(0, 9).map((L) => [LETTER_INFO[L[1]], cn ? colKey(cn) : TR.cy]); }
  const s = 44, gap = 6, x0 = width / 2 - (ex.length * (s + gap) - gap) / 2;
  ex.forEach((e, i) => {
    const x = x0 + i * (s + gap); stroke(e[1]); strokeWeight(1.3); fill(3, 10, 30, 210); chamfer(x, y, s, s, 6);
    hebTxt(e[0].glyph, x + s / 2, y + s / 2 - 2, 26, e[1]);
    if (r.type !== 'color') { txt(soundRule ? soundLabel(e[0].name) : r.type === 'letter' ? e[0].name : String(e[0].value), x + s / 2 + 1, y + s + 11, 8, TR_SUB, CENTER, 400, 1); }
  });
  if (r.type === 'seq') { txt(r.dir === 'low' ? '1  >  2  >  3  ...' : '400  >  300  >  200  ...', width / 2 + 2, y + s + 30, 10, TR.cy2, CENTER, 400, 3); return y + s + 40; }
  return y + s + 24;
}
function drawAnnounce(dt) {
  background(TR.bg); gridBack(30);
  const r = G.rules[G.rules.length - 1], n = G.info.n, b = batchOf(), fresh = n === 1;
  txt((G.mode === 'challenge' ? 'CHALLENGE' : 'TIMELESS') + '  //  ' + b.title, width / 2 + 4, 46, 10, TR.cy2, CENTER, 400, 8);
  heading('LEVEL ' + pad2(G.level), 86);
  dotRig.update(dt, 0, 0, 2.5, {}); dotRig.draw(88, 222, 40, { face: fresh ? 'heart' : 'happy', tool: 'light', aim: 2.5, lightOn: true });
  // DO-T's line: the batch intro when a new stack starts, otherwise a Hebrew fact
  txt(fresh ? 'NEW STACK  //  ' + b.title : 'DID YOU KNOW?', 158, 182, 9, fresh ? TR.mg : TR.am, LEFT, 400, 5);
  wrapTxt(fresh ? b.intro : G.fact, 158, 196, width - 194, 13, TR_TXT, 18, LEFT, 300);
  const pBottom = Math.min(770, Math.max(560, (G.annEnd || 740) + 22));
  panel(36, 290, width - 72, pBottom - 290, TR.am);
  txt('NEW RULE', width / 2 + 4, 320, 11, TR.am, CENTER, 400, 8);
  glow(TR.am, 12); stroke(TR.am); strokeWeight(1.6); fill(3, 10, 30, 210); hexagon(width / 2, 366, 30, HALF_PI); noGlow();
  txt(String(n), width / 2 + 1, 367, 24, '#FFFFFF', CENTER, 200, 0);
  let y = wrapTxt(ruleSay(r).toUpperCase(), 66, 408, width - 132, 18, '#FFFFFF', 25, CENTER, 200);
  rule(width / 2, y + 6, 120);
  const P = verseOf(r);
  if (P) { y = wrapTxt('"' + P.kjv + '"', 70, y + 20, width - 140, 14, TR.cy2, 20, CENTER, 300); txt('PSALM 119:' + r.verse + '  (KJV)', width / 2 + 2, y + 8, 9, TR_SUB, CENTER, 400, 3); y += 18; }
  y = drawExamples(r, y + 20);
  const order = []; for (let k = n - 1; k >= 1; k--) { order.push(k); }
  const body = n === 1 ? 'Rule 1 always clears the whole board.' : 'Do this first. Then follow rule ' + order.join(', then rule ') + ', from memory.';
  G.annEnd = wrapTxt(body, 66, y + 2, width - 132, 13, TR_TXT, 19, CENTER, 300);
  uiBtn(width / 2 - 130, pBottom + 22, 260, 52, 'START', beginPlay, { col: TR.am, hot: true });
  uiBtn(width / 2 - 90, pBottom + 86, 180, 44, 'TITLE', () => goScene('title'), { size: 13 });
  txt('TAP START  //  OR PRESS ENTER', width / 2 + 2, pBottom + 152, 9, rgba(TR.cy, 0.5), CENTER, 400, 4);
}

// ---------- overlays: clear, pause, time up, win ----------
function statRows(rows, y) { for (const r of rows) { txt(r[0], width / 2 - 20, y, 11, TR_TXT, RIGHT, 400, 4); txt(r[1], width / 2 + 10, y, 16, r[2] || '#FFFFFF', LEFT, 200, 2); y += 34; } return y; }
function openCard(i, back) { bookIdx = i; cardBack = back; goScene('card'); }
function drawClear() {
  dim(215);
  const b = batchOf(), batchEnd = G.info.n === b.rules.length, last = G.level >= TOTAL_LEVELS;
  panel(36, 196, width - 72, 530, TR.gn);
  txt('LEVEL ' + pad2(G.level) + '  //  COMPLETE', width / 2 + 4, 232, 11, TR.gn, CENTER, 400, 8);
  txt('BOARD CLEAR', width / 2 + 4, 276, 30, '#FFFFFF', CENTER, 200, 8);
  rule(width / 2, 306, 120);
  let y = statRows([['RULES FOLLOWED', String(G.info.n), TR.gn], ['MISSES', String(G.levelMist), G.levelMist ? TR.am : TR.gn], ['SCORE', String(G.score), TR_GOLD], ['BEST STREAK', 'x' + AhadFeel.combo.best, TR.cy2]], 340);
  if (G.newLetters.length) {
    txt('NEW IN YOUR LETTER BOOK  //  TAP ONE', width / 2 + 4, y + 6, 9, TR.gn, CENTER, 400, 4);
    const list = G.newLetters.slice(0, 6), s = 56, gap = 8, x0 = width / 2 - (list.length * (s + gap) - gap) / 2;
    list.forEach((nm, i) => {
      const L = LETTER_INFO[nm], x = x0 + i * (s + gap);
      uiBtn(x, y + 22, s, s, '', () => openCard(L.i, 'clear'), { col: TR.gn });
      hebTxt(L.glyph, x + s / 2, y + 22 + s / 2 - 3, 30, '#FFFFFF'); txt(nm, x + s / 2 + 1, y + 22 + s + 10, 7, TR_SUB, CENTER, 400, 2);
    });
    if (G.newLetters.length > 6) { txt('+' + (G.newLetters.length - 6) + ' MORE IN THE BOOK', width / 2 + 2, y + 22 + s + 28, 9, TR_SUB, CENTER, 400, 3); }
  } else if (batchEnd && !last) {
    wrapTxt('You held ' + G.info.n + ' rules at once. Next, a new stack starts: ' + RULE_BATCHES[G.info.batch + 1].title + '.', 76, y + 4, width - 152, 13, TR_TXT, 19, CENTER, 300);
  }
  uiBtn(width / 2 - 130, 640, 260, 52, last ? 'FINISH' : 'NEXT RULE', nextLevel, { col: TR.am, hot: true });
  uiBtn(width / 2 - 140, 744, 132, 44, 'TITLE', () => goScene('title'), { size: 12 });
  uiBtn(width / 2 + 8, 744, 132, 44, 'LETTER BOOK', () => { bookBack = 'clear'; goScene('book'); }, { col: TR.vi, size: 11, ls: 3 });
}
function drawPause() {
  dim(232); gridBack(30); heading('PAUSED', 90);
  txt('LEVEL ' + pad2(G.level) + '  //  RULE STACK ' + G.info.n, width / 2 + 4, 190, 13, TR.am, CENTER, 300, 4);
  txt('SCORE  ' + G.score + '      MISSES  ' + G.mistakes, width / 2 + 2, 224, 11, TR_TXT, CENTER, 300, 3);
  const bx = width / 2 - 130;
  uiBtn(bx, 270, 260, 52, 'RESUME', () => { paused = false; }, { col: TR.cy });
  uiBtn(bx, 338, 260, 52, 'RESTART LEVEL', () => { paused = false; startLevel(G.level); }, { col: TR.am });
  uiBtn(bx, 406, 260, 52, 'HOW TO PLAY', () => { howtoBack = scene; goScene('howto'); }, { col: TR.gn });
  const tg = (x, y, label, key, after) => uiBtn(x, y, 125, 44, label + '  ' + (OPT[key] ? 'ON' : 'OFF'), () => { OPT[key] = !OPT[key]; if (after) { after(); } saveAll(); }, { col: OPT[key] ? TR.gn : TR_OFF, size: 11, ls: 3 });
  txt('SETTINGS', width / 2 + 4, 486, 9, 'rgba(160,240,255,0.7)', CENTER, 400, 5);
  tg(bx, 504, 'SOUND', 'sound'); tg(bx + 135, 504, 'VALUES', 'values');
  tg(bx, 558, 'NAMES', 'names'); tg(bx + 135, 558, 'GLITCH', 'glitch', () => AhadFeel.config({ glitch: OPT.glitch }));
  uiBtn(bx, 636, 260, 52, 'QUIT TO TITLE', () => { paused = false; goScene('title'); }, { col: TR.mg });
  txt('MADE BY PETER VENOIT, JR.  //  2026', width / 2 + 2, height - 30, 9, rgba(TR.am, 0.6), CENTER, 400, 4);
}
function drawOver(dt) {
  const k0 = Math.min(1, sceneT / 0.7), k = k0 * k0 * (3 - 2 * k0);
  if (sceneT < 0.9) { shutters(k, 'TIME UP'); return; }
  background(TR.bg); gridBack(30, 12);
  txt('CHALLENGE', width / 2 + 4, 110, 11, TR.red, CENTER, 400, 9);
  txt('TIME UP', width / 2 + 6, 164, 46, '#FFFFFF', CENTER, 200, 16);
  txt('REACHED LEVEL ' + pad2(G.level), width / 2 + 4, 214, 12, TR.am, CENTER, 400, 6);
  rule(width / 2, 240, 130);
  tickRing(width / 2, 380, 92); dotRig.update(dt, 0, 0, 0.6, {}); dotRig.draw(width / 2, 380, 58, { face: 'defeated', tool: 'light', aim: 0.6, lightOn: false });
  statRows([['BOARDS CLEARED', String(G.cleared), TR.gn], ['SCORE', String(G.score), TR_GOLD], ['BEST STREAK', 'x' + AhadFeel.combo.best, TR.cy2], ['BEST LEVEL', String(BEST.challenge), TR.am]], 540);
  uiBtn(width / 2 - 130, 712, 260, 52, 'TRY AGAIN', () => newGame('challenge', 1), { col: TR.am, hot: true });
  uiBtn(width / 2 - 90, 780, 180, 44, 'TITLE', () => goScene('title'), { size: 13 });
}
function drawWin(dt) {
  background(TR.bg); gridBack(30, 12);
  txt(G.mode === 'challenge' ? 'CHALLENGE' : 'TIMELESS', width / 2 + 4, 110, 11, TR.cy2, CENTER, 400, 9);
  txt('ALL ' + TOTAL_LEVELS + ' BOARDS', width / 2 + 6, 164, 38, '#FFFFFF', CENTER, 200, 12);
  txt('COMPLETE', width / 2 + 4, 212, 14, TR.am, CENTER, 400, 8);
  rule(width / 2, 238, 130);
  tickRing(width / 2, 376, 92); dotRig.update(dt, 0, 0, -0.6, {}); dotRig.draw(width / 2, 376, 58, { face: 'heart', tool: 'light', aim: -0.6, lightOn: true });
  const y = statRows([['SCORE', String(G.score), TR_GOLD], ['MISSES', String(G.mistakes), TR.am], ['BEST STREAK', 'x' + AhadFeel.combo.best, TR.cy2]], 536);
  wrapTxt('Every letter has a number and a place. Psalm 119 walks through all 22.', 70, y + 4, width - 140, 13, TR_TXT, 19, CENTER, 300);
  uiBtn(width / 2 - 130, 712, 260, 52, G.mode === 'challenge' ? 'PLAY AGAIN' : 'TRY CHALLENGE', () => newGame('challenge', 1), { col: TR.am, hot: true });
  uiBtn(width / 2 - 90, 780, 180, 44, 'TITLE', () => goScene('title'), { size: 13 });
}

// ---------- the Letter Book: all 22 letters, laid out right to left ----------
function drawBook() {
  background(TR.bg); gridBack(30); heading('LETTER BOOK', 80);
  const met = LETTERS.filter((L) => MET[L[1]]).length;
  txt(met + ' OF 22 LETTERS MET', width / 2 + 4, 158, 11, TR.am, CENTER, 400, 5);
  txt('<  READ RIGHT TO LEFT, LIKE HEBREW', width / 2 + 2, 182, 9, TR_SUB, CENTER, 400, 4);
  const cols = 5, s = 80, gap = 10, x0 = (width - (cols * s + (cols - 1) * gap)) / 2, y0 = 204;
  LETTERS.forEach((L, i) => {
    const c = i % cols, row = Math.floor(i / cols), x = x0 + (cols - 1 - c) * (s + gap), y = y0 + row * (s + gap), on = !!MET[L[1]];
    uiBtn(x, y, s, s, '', () => openCard(i, 'book'), { col: on ? TR.gn : 'rgba(25,227,255,0.4)' });
    hebTxt(L[0], x + s / 2, y + s / 2 - 7, 38, on ? '#FFFFFF' : rgba(TR.cy2, 0.45));
    txt(L[1], x + s / 2 + 1, y + s - 13, 7, on ? rgba(TR.gn, 0.9) : TR_SUB, CENTER, 400, 2);
  });
  wrapTxt('Tap a letter to open its card. A letter turns green when you tap it right in a game.', 60, 666, width - 120, 13, TR_TXT, 19, CENTER, 300);
  uiBtn(width / 2 - 90, 820, 180, 48, 'BACK', () => goScene(bookBack), { size: 14 });
}
// ---------- one letter's card ----------
function drawCard() {
  const L = LETTER_INFO[LETTERS[bookIdx][1]], P = L.psalm, met = !!MET[L.name];
  background(TR.bg); gridBack(30, 12);
  txt('LETTER ' + pad2(bookIdx + 1) + ' OF 22' + (met ? '  //  MET' : ''), width / 2 + 4, 40, 10, met ? TR.gn : TR.cy2, CENTER, 400, 8);
  const s = 140, x = width / 2 - s / 2, y = 62;
  stroke(TR.am); strokeWeight(1.6); fill(3, 10, 30, 220); chamfer(x, y, s, s, 16); stroke(rgba(TR.am, 0.25)); strokeWeight(1); noFill(); corners(x + 8, y + 8, s - 16, s - 16, 14);
  glow(TR.am, 14); hebTxt(L.glyph, width / 2, y + s / 2 - 6, 96, TR_GOLD); noGlow();
  txt(L.name, width / 2 + 6, 238, 30, '#FFFFFF', CENTER, 200, 10);
  const cw = (width - 72 - 20) / 3;
  [['SOUND', soundLabel(L.name)], ['VALUE', String(L.value)], ['FINAL FORM', L.final ? '' : 'NONE']].forEach((c, i) => {
    const cx = 36 + i * (cw + 10); stroke(rgba(TR.cy, 0.6)); strokeWeight(1.2); fill(3, 10, 30, 200); chamfer(cx, 268, cw, 56, 9);
    txt(c[0], cx + cw / 2 + 2, 284, 8, rgba(TR.cy2, 0.8), CENTER, 400, 3);
    if (i === 2 && L.final) { hebTxt(L.final, cx + cw / 2, 306, 26, TR_GOLD); } else { txt(c[1], cx + cw / 2 + 1, 306, 17, '#FFFFFF', CENTER, 200, 2); }
  });
  let yy = wrapTxt(L.soundText + '  (Modern Hebrew)', 40, 338, width - 80, 13, TR_TXT, 18, CENTER, 300);
  const mean = LETTER_NAME_MEANINGS[L.name];
  if (mean) { txt('NAME MEANING  //  TRADITIONAL READING', width / 2 + 3, yy + 8, 8, TR.am, CENTER, 400, 3); yy = wrapTxt(mean, 40, yy + 20, width - 80, 13, TR_TXT, 18, CENTER, 300); }
  // Psalm 119: this letter's part
  const py = Math.max(yy + 12, 382);
  panel(26, py, width - 52, Math.min(772, Math.max(py + 240, (window.cardEnd || 740) + 26)) - py, TR.cy);
  txt('PSALM 119:' + P.from + '-' + P.to, width / 2 + 4, py + 26, 11, TR.cy2, CENTER, 400, 6);
  txt('KJV HEADING:  ' + P.heading + (P.headingAlt ? '   (SOME COPIES: ' + P.headingAlt + ')' : ''), width / 2 + 2, py + 46, 8, TR_SUB, CENTER, 400, 3);
  let vy = py + 64;
  if (P.all8) { vy = wrapTxt('In the Hebrew, all 8 verses of this part begin with ' + L.name + '.', 52, vy, width - 104, 13, TR_TXT, 18, CENTER, 300); }
  txt('FIRST WORD IN THE HEBREW (WLC)  //  STRONG\'S ' + P.strongs, width / 2 + 2, vy + 12, 8, rgba(TR.am, 0.85), CENTER, 400, 2);
  textFont(DISPLAY_POINTED_FONT); textSize(40); try { textWeight(400); } catch (_) {} lspace(0); fill(TR_GOLD); noStroke(); textAlign(CENTER, CENTER); text(P.firstWord, width / 2, vy + 50);
  vy = wrapTxt('"' + P.kjv + '"', 52, vy + 86, width - 104, 14, TR.cy2, 20, CENTER, 300);
  txt('PSALM 119:' + P.from + '  (KJV)', width / 2 + 2, vy + 8, 9, TR_SUB, CENTER, 400, 3); window.cardEnd = vy + 8;
  const prev = (bookIdx + 21) % 22, next = (bookIdx + 1) % 22;
  uiBtn(30, 800, 140, 48, 'PREV', () => { bookIdx = prev; }, { size: 12 });
  uiBtn(width / 2 - 80, 800, 160, 48, 'BACK', () => goScene(cardBack), { col: TR.vi, size: 13 });
  uiBtn(width - 170, 800, 140, 48, 'NEXT', () => { bookIdx = next; }, { size: 12 });
  txt(LETTERS[prev][1] + '  <  ' + L.name + '  >  ' + LETTERS[next][1], width / 2 + 2, 876, 8, TR_SUB, CENTER, 400, 3);
}

// ---------- title, how to play, debug ----------
function drawTitle(dt) {
  titleBackdrop();
  const cx = width / 2, cy = 278;
  tickRing(cx, cy, 138);
  for (let i = 0; i < LETTERS.length; i++) { const a = -i / LETTERS.length * TWO_PI + DUI.t * -0.05 - HALF_PI; hebTxt(LETTERS[i][0], cx + Math.cos(a) * 196, cy + Math.sin(a) * 196, 19, rgba(MET[LETTERS[i][1]] ? TR.gn : TR.cy2, 0.6)); }
  titleRig.update(dt, 0, 0, 0.55, {}); titleRig.draw(cx, cy, DISPLAY_DOT_TITLE_RADIUS, { face: 'happy', tool: 'light', aim: 0.55, lightOn: true });
  txt('ALEF-BET', cx + 7, 506, 42, '#FFFFFF', CENTER, 200, 14);
  txt('RULES', cx + 7, 554, 42, TR.cy2, CENTER, 200, 14);
  rule(cx, 584, 130);
  txt('LEARN THE HEBREW LETTERS WITH DO-T', cx + 3, 604, 10, rgba(TR.am, 0.85), CENTER, 400, 5);
  uiBtn(cx - 130, 632, 260, 48, 'PLAY  //  TIMELESS', () => newGame('timeless', DEBUG_ON ? DEBUG_START_LEVEL : 1), { col: TR.cy });
  uiBtn(cx - 130, 690, 260, 48, 'CHALLENGE  //  TIMED', () => newGame('challenge', DEBUG_ON ? DEBUG_START_LEVEL : 1), { col: TR.am });
  uiBtn(cx - 130, 748, 260, 48, 'LETTER BOOK', () => { bookBack = 'title'; goScene('book'); }, { col: TR.gn });
  uiBtn(cx - 130, 806, 260, 48, 'HOW TO PLAY', () => { howtoBack = 'title'; goScene('howto'); }, { col: TR.vi });
  if (SHOW_DEBUG_BUTTON) { uiBtn(cx - 130, 864, 260, 38, 'DEBUG MENU', () => goScene('debug'), { col: TR.am, size: 12 }); }
  txt('BEST  //  TIMELESS LV ' + (BEST.timeless || 0) + '    CHALLENGE LV ' + (BEST.challenge || 0) + '    LETTERS ' + LETTERS.filter((L) => MET[L[1]]).length + '/22', cx + 2, 922, 8, TR_SUB, CENTER, 400, 3);
  txt('MADE BY PETER VENOIT, JR.  //  2026', cx + 2, 944, 9, rgba(TR.am, 0.6), CENTER, 400, 4);
}
function drawHowto() {
  background(TR.bg); gridBack(30); heading('HOW TO PLAY', 80);
  panel(26, 150, width - 52, 596, TR.cy);
  const steps = [
    'DO-T gives you one new rule each level. Read it carefully.',
    'Tap the tiles that follow the NEWEST rule first.',
    'Then follow the rule before it, and the one before that, down to rule 1. Rule 1 always clears the board.',
    'Rules stack up. Every 10 levels a new stack starts: NUMBERS, ALEF-BET ORDER, SOUNDS, then PSALM 119.',
    'Every letter you tap right goes into your LETTER BOOK, with its sound, its number and its part of Psalm 119.'
  ];
  let y = 176;
  steps.forEach((s, i) => {
    stroke(TR.am); strokeWeight(1.4); fill(3, 10, 30, 210); hexagon(62, y + 9, 13, HALF_PI); txt(String(i + 1), 62.5, y + 9.5, 11, TR.am, CENTER, 400, 0);
    y = wrapTxt(s, 88, y, width - 150, 14, TR_TXT, 20, LEFT, 300) + 10;
  });
  txt('TIMELESS', 52, y + 8, 10, TR.gn, LEFT, 400, 6); y = wrapTxt('No clock. Tap HINT if you forget a rule, and DO-T will show it.', 52, y + 22, width - 110, 13, TR_TXT, 18, LEFT, 300) + 6;
  txt('CHALLENGE', 52, y + 8, 10, TR.am, LEFT, 400, 6); y = wrapTxt('A clock runs down. Correct taps add time. Wrong taps cost a second.', 52, y + 22, width - 110, 13, TR_TXT, 18, LEFT, 300) + 6;
  txt('PSALM 119', 52, y + 8, 10, TR.cy2, LEFT, 400, 6);
  wrapTxt('Psalm 119 is an Alef-Bet psalm: 22 parts, one for each letter. "Thy word have I hid in mine heart, that I might not sin against thee." (Psalm 119:11, KJV)', 52, y + 22, width - 110, 13, TR_TXT, 18, LEFT, 300);
  uiBtn(width / 2 - 90, 772, 180, 48, 'BACK', () => goScene(howtoBack), { size: 14 });
}
function drawDebug() {
  background(TR.bg); gridBack(30); heading('DEBUG', 80);
  txt('FOR TESTING  //  NOT PART OF THE GAME', width / 2 + 2, 150, 10, TR_TXT, CENTER, 300, 3);
  const flag = (y, label, key) => uiBtn(40, y, width - 80, 42, label + ':  ' + (DBG[key] ? 'ON' : 'OFF'), () => { DBG[key] = !DBG[key]; }, { col: DBG[key] ? TR.gn : TR.cy, size: 12, hot: DBG[key] });
  flag(176, 'SHOW RULE TEXT', 'ruleText'); flag(226, 'INFINITE TIME', 'infinite'); flag(276, 'SHOW HITBOXES', 'hitboxes');
  uiBtn(40, 326, width - 80, 42, 'JUMP MODE:  ' + debugMode.toUpperCase(), () => { debugMode = debugMode === 'timeless' ? 'challenge' : 'timeless'; }, { col: TR.vi, size: 12 });
  uiBtn(40, 376, (width - 90) / 2, 42, 'MEET ALL LETTERS', () => { for (const L of LETTERS) { MET[L[1]] = true; } saveAll(); }, { col: TR.gn, size: 11, ls: 3 });
  uiBtn(50 + (width - 90) / 2, 376, (width - 90) / 2, 42, 'CLEAR LETTER BOOK', () => { for (const k in MET) { delete MET[k]; } saveAll(); }, { col: TR.red, size: 11, ls: 3 });
  txt('JUMP TO LEVEL', width / 2 + 4, 440, 10, TR.cy2, CENTER, 400, 6);
  const cols = 8, gap = 8, bw = (width - 80 - gap * (cols - 1)) / cols;
  for (let i = 0; i < TOTAL_LEVELS; i++) { uiBtn(40 + (i % cols) * (bw + gap), 458 + Math.floor(i / cols) * 48, bw, 40, String(i + 1), () => newGame(debugMode, i + 1), { size: 12, ls: 1 }); }
  uiBtn(width / 2 - 90, 820, 180, 48, 'BACK', () => goScene('title'), { size: 14 });
}

// ---------- p5 ----------
function loadFonts() {
  if (document.getElementById('alef-fonts')) { return; }
  const l = document.createElement('link'); l.id = 'alef-fonts'; l.rel = 'stylesheet';
  l.href = 'https://fonts.googleapis.com/css2?family=Exo+2:wght@200;300;400;500&family=Frank+Ruhl+Libre:wght@400;500&family=Noto+Serif+Hebrew:wght@400;500&display=swap';
  document.head.appendChild(l);
}
function fitCanvas() { const k = Math.min(window.innerWidth / width, window.innerHeight / height); cnv.elt.style.width = (width * k) + 'px'; cnv.elt.style.height = (height * k) + 'px'; }
function onPointerDown(e) {
  e.preventDefault(); sndInit(); try { window.focus(); } catch (_) {}
  const r = cnv.elt.getBoundingClientRect(), x = (e.clientX - r.left) / r.width * width, y = (e.clientY - r.top) / r.height * height;
  handleTap(x, y);
}
function handleTap(x, y) {
  if (DUI.tap(x, y)) { SFX.ui(); return; }
  if (scene === 'play' && !paused) { const t = tileAt(x, y); if (t) { tapTile(t); } }
}
function onKeyDown(e) {
  sndInit();
  if (e.key === 'Escape') {
    if (scene === 'play' && G && G.clearT < 0) { paused = !paused; }
    else if (scene === 'howto') { goScene(howtoBack); } else if (scene === 'book') { goScene(bookBack); } else if (scene === 'card') { goScene(cardBack); } else if (scene === 'debug' || scene === 'announce') { goScene('title'); }
  } else if (e.key === 'Enter' || e.key === ' ') {
    if (scene === 'announce') { beginPlay(); } else if (scene === 'clear') { nextLevel(); }
    e.preventDefault();
  } else if (scene === 'card' && (e.key === 'ArrowRight' || e.key === 'ArrowLeft')) { bookIdx = (bookIdx + (e.key === 'ArrowRight' ? 1 : 21)) % 22;
  } else if ((e.key === 'h' || e.key === 'H') && scene === 'play' && !paused && G.mode === 'timeless') { showHint(true); }
}
function setup() {
  cnv = createCanvas(DISPLAY_W, DISPLAY_H);
  loadFonts();
  document.body.style.margin = '0'; document.body.style.background = TR.bg; document.body.style.overflow = 'hidden';
  document.body.style.display = 'flex'; document.body.style.alignItems = 'center'; document.body.style.justifyContent = 'center'; document.body.style.height = '100%'; document.documentElement.style.height = '100%';
  cnv.elt.style.touchAction = 'none';
  fitCanvas(); window.addEventListener('resize', fitCanvas);
  cnv.elt.addEventListener('pointerdown', onPointerDown, { passive: false });
  cnv.elt.addEventListener('contextmenu', (e) => e.preventDefault());
  window.addEventListener('keydown', onKeyDown);
  dotRig = new DotRig(); titleRig = new DotRig();
  loadAll();
  AhadFeel.config({ glitch: OPT.glitch, impact: false });
  AhadFeel.hooks.onStep = (n) => SFX.good(n);
  AhadFeel.hooks.onTier = () => { if (G) { setFace('heart', 1.2); } };
  AhadFeel.hooks.onBonus = (extra) => { if (G) { G.score += extra * PLAYER_POINTS_COMBO_BONUS; } };
}
function draw() {
  const dt = Math.min(0.05, (deltaTime || 16) / 1000);
  DUI.frame(); sceneT += dt; AhadFeel.update(dt);
  if (scene === 'title') { drawTitle(dt); }
  else if (scene === 'howto') { drawHowto(); }
  else if (scene === 'debug') { drawDebug(); }
  else if (scene === 'book') { drawBook(); }
  else if (scene === 'card') { drawCard(); }
  else if (scene === 'announce') { drawAnnounce(dt); }
  else if (scene === 'over') { drawOver(dt); }
  else if (scene === 'win') { drawWin(dt); }
  else {
    if (scene === 'play' && !paused && !AhadFeel.frozen()) { updatePlay(dt); }
    drawGame(dt);
    if (scene === 'clear') { drawClear(); }
    if (paused && scene === 'play') { drawPause(); }
  }
  if (scene === 'play' || scene === 'clear') { AhadFeel.drawGreatJob(width / 2, 150); }       // above the BOARD CLEAR card, never on top of its numbers
  AhadFeel.applyPostFx();
  image(DUI.fx(), 0, 0, width, height);
}

// ---------- test hooks (used by the automated checks; harmless in play) ----------
window.ALEF = {
  get scene() { return scene; }, get G() { return G; }, get paused() { return paused; },
  start(mode, level) { newGame(mode || 'timeless', level || 1); }, begin() { beginPlay(); },
  tapValid() { const v = validTiles(); if (v.length) { tapTile(v[0]); return true; } return false; },
  tapWrong() { const v = validTiles(), w = aliveTiles().find((t) => !v.includes(t)); if (w) { tapTile(w); return true; } return false; },
  tapAt(x, y) { handleTap(x, y); }, next() { nextLevel(); }, go(s) { goScene(s); }, pause(p) { paused = p; },
  card(i, back) { openCard(i, back || 'book'); }, book() { bookBack = 'title'; goScene('book'); }, met: MET, facts: FACTS,
  rule: (r, t) => ruleMatch(r, t), board: (lv) => { const info = levelInfo(lv), b = makeBoard(info.rules); return scoreBoard(b, info.rules); }
};
