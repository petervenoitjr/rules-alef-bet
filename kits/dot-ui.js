// ============================================================
// DOT-UI style  --  drop-in HUD + menu kit for p5.js 2.3.4
// Lifted from ALL HUMANS ARE DEAD Prototype 11 (v7_vis_base.js + v7_ui.js),
// with the game-only parts taken out so any sketch can use it.
// Paste this whole block into sketch.js (above setup) or load it as its own file.
// Needs: a canvas (any size). Uses width/height, so it works at any resolution.
// Call DUI.frame() at the top of draw(), DUI.tap(x, y) from touchStarted/mousePressed,
// and image(DUI.fx(), 0, 0, width, height) as the very last thing in draw().
// ============================================================

// ---------- palette (never invent new colors; use these) ----------
const TR = {
  cy: '#19E3FF',   // cyan     : default UI line, PLEX speaker, normal state
  cy2: '#8CF6FF',  // pale cyan: titles, headings, secondary labels
  mg: '#FF3FD0',   // magenta  : emergency / danger-to-do / terminals / last menu item
  am: '#FFB938',   // amber    : selected, interact, money, ABB speaker, "do this now"
  gn: '#3CFFB0',   // green    : online, done, fixed, boost ready
  vi: '#8E7BFF',   // violet   : secondary actions (switch, restart, customize)
  red: '#FF4D5E',  // red      : low power, boss, keys, failure
  bg: '#03060f'    // near-black blue background
};
const TR_OFF = '#58698f';         // disabled / off button color
const TR_DIM = '#41557a';         // locked / unknown
const TR_TXT = 'rgba(190,230,255,0.85)';   // body text on dark
const TR_SUB = 'rgba(160,200,230,0.7)';    // small stats / footnotes
const TR_GOLD = '#FFE9B0';        // big money numbers
const HUDFONT = '"Exo 2", Rajdhani, "Segoe UI", "Helvetica Neue", Arial, sans-serif';

// ---------- low-level helpers ----------
function glow(c, b) { drawingContext.shadowColor = c; drawingContext.shadowBlur = b; }
function noGlow() { drawingContext.shadowBlur = 0; drawingContext.shadowColor = 'rgba(0,0,0,0)'; }
function lspace(px) { try { drawingContext.letterSpacing = px + 'px'; } catch (_) {} }
function rgba(hex, a) { const n = parseInt(hex.slice(1), 16); return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a})`; }
function hex7(c) { return (typeof c === 'string' && c.length === 7 && c[0] === '#') ? c : TR.cy; }   // rgba() needs #rrggbb

function chamfer(x, y, w, h, c, g) {        // the signature shape: a rectangle with 45-degree cut corners
  const G = g || window; G.beginShape();
  G.vertex(x + c, y); G.vertex(x + w - c, y); G.vertex(x + w, y + c); G.vertex(x + w, y + h - c);
  G.vertex(x + w - c, y + h); G.vertex(x + c, y + h); G.vertex(x, y + h - c); G.vertex(x, y + c); G.endShape(CLOSE);
}
function hexagon(cx, cy, r, rot, g) {       // rot = HALF_PI gives a flat-sided (pointy-top) hex, used for buttons
  const G = g || window; G.beginShape();
  for (let i = 0; i < 6; i++) { const a = rot + i * Math.PI / 3; G.vertex(cx + Math.cos(a) * r, cy + Math.sin(a) * r); }
  G.endShape(CLOSE);
}
function corners(x, y, w, h, l) {           // four corner brackets (call with stroke set)
  line(x, y + l, x, y); line(x, y, x + l, y); line(x + w - l, y, x + w, y); line(x + w, y, x + w, y + l);
  line(x + w, y + h - l, x + w, y + h); line(x + w, y + h, x + w - l, y + h); line(x + l, y + h, x, y + h); line(x, y + h, x, y + h - l);
}

// ---------- text ----------
function setFont(sz, wt) { textFont(HUDFONT); textSize(sz); try { textWeight(wt || 300); } catch (_) {} }
// txt(string, x, y, size, color, align, weight, letterSpacing) -- the only way text is drawn in this style
function txt(str, x, y, size, col, al, wt, ls) { setFont(size, wt); lspace(ls || 0); fill(col); noStroke(); textAlign(al || LEFT, CENTER); text(str, x, y); lspace(0); }
function wrapTxt(str, x, y, w, size, col, lead, al, wt) {   // word wrap inside width w; returns y after last line
  setFont(size, wt || 300); const words = String(str).split(' '); let ln = '', yy = y; fill(col); noStroke(); textAlign(al || LEFT, TOP);
  const ax = al === CENTER ? x + w / 2 : al === RIGHT ? x + w : x;
  for (const wd of words) { const t = ln ? ln + ' ' + wd : wd; if (textWidth(t) > w && ln) { text(ln, ax, yy); yy += lead; ln = wd; } else ln = t; }
  if (ln) { text(ln, ax, yy); yy += lead; } return yy;
}

// ---------- tap targets (rebuilt every frame) ----------
const DUI = { list: [], prev: [], t: 0, fxG: null, fxW: 0, fxH: 0, toast: { text: '', t: 0 }, banner: { text: '', t: 0, kicker: 'SECTOR' } };
DUI.frame = function () { DUI.prev = DUI.list; DUI.list = []; DUI.t += (deltaTime || 16) / 1000; if (DUI.toast.t > 0) DUI.toast.t -= deltaTime / 1000; if (DUI.banner.t > 0) DUI.banner.t -= deltaTime / 1000; };
DUI.tap = function (x, y) {                 // returns true if a button took the tap
  for (let i = DUI.prev.length - 1; i >= 0; i--) { const b = DUI.prev[i]; if (x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) { b.fn(); return true; } }
  return false;
};
DUI.say = function (text, secs) { DUI.toast.text = text; DUI.toast.t = secs || 3; };            // 'PLEX: ...' / 'ABB: ...'
DUI.sector = function (text, kicker) { DUI.banner.text = text; DUI.banner.t = 3.2; DUI.banner.kicker = kicker || 'SECTOR'; };

// ---------- menu button: chamfered, thin line, spaced caps ----------
// o: { col, hot (selected), alpha, size (15), wt (300), ls (letter spacing 4), c (chamfer 9) }
function uiBtn(x, y, w, h, label, fn, o = {}) {
  const col = o.col || TR.cy, a = o.alpha === undefined ? 1 : o.alpha, hot = o.hot;
  drawingContext.globalAlpha = a;
  stroke(col); strokeWeight(hot ? 2 : 1.2); fill(hot ? rgba(hex7(col), 0.18) : 'rgba(3,10,30,0.55)'); chamfer(x, y, w, h, o.c || 9);
  noStroke(); fill(col); setFont(o.size || 15, o.wt || 300); lspace(o.ls === undefined ? 4 : o.ls); textAlign(CENTER, CENTER);
  text(label, x + w / 2 + (o.ls === 0 ? 0 : 2), y + h / 2); lspace(0);   // +2 nudges spaced caps back to visual centre
  drawingContext.globalAlpha = 1; if (fn) DUI.list.push({ x, y, w, h, fn });
}

// ---------- round action button (thumb button): hexagon with drop shadow, inner hex, optional cooldown ring ----------
// b: { x, y, r }  ring: 0..1 cooldown fill (1 = ready, no ring drawn)
function hexBtn(b, label, col, ts = 12, pulse = false, ring = 1, fn) {
  const r = b.r * (pulse ? 1 + Math.sin(DUI.t * 6) * 0.05 : 1), c3 = hex7(col);
  noStroke(); fill(0, 0, 0, 70); hexagon(b.x, b.y + 3, r + 1, HALF_PI);
  glow(col, pulse ? 14 : 6); stroke(col); strokeWeight(1.6); fill(3, 10, 30, 190); hexagon(b.x, b.y, r, HALF_PI); noGlow();
  noFill(); stroke(rgba(c3, 0.28)); strokeWeight(1); hexagon(b.x, b.y, r - 6, HALF_PI);
  if (ring < 1) { noFill(); stroke(255, 255, 255, 30); strokeWeight(3); circle(b.x, b.y, r * 2 + 10); stroke(col); strokeWeight(2); arc(b.x, b.y, r * 2 + 10, r * 2 + 10, -HALF_PI, -HALF_PI + TWO_PI * ring); }
  noStroke(); fill(col); setFont(ts, 400); lspace(1.5); textAlign(CENTER, CENTER); text(label, b.x + 0.7, b.y); lspace(0);
  if (fn) DUI.list.push({ x: b.x - b.r, y: b.y - b.r, w: b.r * 2, h: b.r * 2, fn });
}

// ---------- small chip (tool select, tabs) ----------
function chip(x, y, w, h, label, on, fn) {
  stroke(on ? TR.am : 'rgba(25,227,255,0.35)'); strokeWeight(on ? 1.6 : 1); fill(on ? 'rgba(255,185,56,0.12)' : 'rgba(3,10,30,0.45)'); chamfer(x, y, w, h, 5);
  txt(label, x + w / 2, y + h / 2 + 0.5, 8, on ? TR.am : 'rgba(160,220,255,0.7)', CENTER, 400, 2);
  if (fn) DUI.list.push({ x, y, w, h, fn });
}

// ---------- meter: thin outlined bar, glowing fill, tick marks, big number beside ----------
// v, max: current and full. lost: 0..1 of the bar that is gone for good (hatched red). label e.g. 'PWR'
function meter(x, y, w, v, max, label, o = {}) {
  const f = Math.max(0, v / max), lost = o.lost || 0, ticks = o.ticks || 13;
  const col = o.col || (f < 0.25 ? (Math.sin(DUI.t * 10) > 0 ? TR.red : '#ff9aa2') : f < 0.5 ? TR.am : TR.cy);
  if (label) txt(label, x, y - 16, 9, 'rgba(160,240,255,0.85)', LEFT, 400, 4);
  stroke(25, 227, 255, 70); strokeWeight(1); noFill(); rect(x, y, w, 6);
  if (lost > 0) { const lx = x + w * (1 - lost); noStroke(); fill(255, 77, 94, 35); rect(lx, y, w * lost, 6); stroke(255, 77, 94, 110); for (let xx = lx; xx < x + w; xx += 5) line(xx, y + 6, xx + 4, y); }
  noStroke(); glow(col, 8); fill(col); rect(x + 1, y + 1, Math.max(0, (w - 2) * Math.min(f, 1 - lost)), 4); noGlow();
  stroke(25, 227, 255, 100); strokeWeight(1); for (let i = 1; i < ticks; i++) { const tx = x + w * i / ticks; line(tx, y + 6, tx, y + 10); }
  if (o.number !== false) txt(String(Math.ceil(v)), x + w + 12, y + 3, 22, col, LEFT, 200, 1);
}
// thin progress line (timers, noise, calm): 1px outline, 2-3px fill
function thinBar(x, y, w, f, col) { stroke(255, 255, 255, 60); strokeWeight(1); noFill(); rect(x, y, w, 5); noStroke(); fill(col); rect(x + 1, y + 1, (w - 2) * Math.max(0, Math.min(1, f)), 3); }
// row of small pips (circuits fixed, upgrade levels)
function pips(cx, y, n, done, col) {
  for (let i = 0; i < n; i++) { const x = cx - n * 8 + i * 16 + 2, on = done > i; stroke(on ? (col || TR.gn) : 'rgba(25,227,255,0.5)'); strokeWeight(1.2); fill(on ? rgba(hex7(col || TR.gn), 0.6) : 'rgba(25,227,255,0.05)'); rect(x, y, 10, 5, 1); }
}
// counter with hex icon (bytes / coins)
function counter(rx, y, n, label) {
  const ix = rx - 78; noFill(); stroke(TR.am); strokeWeight(1.6); hexagon(ix, y, 9, HALF_PI); noStroke(); fill(TR.am); hexagon(ix, y, 3.5, HALF_PI);
  txt(String(n).padStart(4, '0'), rx, y, 20, TR_GOLD, RIGHT, 200, 2); txt(label || 'BYTES', ix + 12, y - 18, 8, 'rgba(255,185,56,0.8)', LEFT, 400, 3);
}
// pause "gear": hex outline with two bars
function pauseHex(x, y, fn) {
  noFill(); stroke(TR.cy); strokeWeight(1.6); hexagon(x, y, 20, HALF_PI); noStroke(); fill(TR.cy2); rect(x - 5, y - 7, 3.5, 14, 1); rect(x + 1.5, y - 7, 3.5, 14, 1);
  if (fn) DUI.list.push({ x: x - 23, y: y - 23, w: 46, h: 46, fn });
}

// ---------- overlays ----------
function dim(a) { noStroke(); fill(2, 6, 20, a); rect(0, 0, width, height); }
function panel(x, y, w, h, col) { stroke(col || TR.cy); strokeWeight(1.3); fill(3, 9, 28, 240); chamfer(x, y, w, h, 16); corners(x + 6, y + 6, w - 12, h - 12, 14); }
function gridBack(step, a) { stroke(25, 227, 255, a === undefined ? 18 : a); strokeWeight(1); for (let x = 0; x <= width; x += step || 30) line(x, 0, x, height); for (let y = 0; y <= height; y += step || 30) line(0, y, width, y); }
// page heading: big thin pale-cyan caps + the bent underline (straight, then a 45-degree kick down-right)
function heading(title, y) {
  const cx = width / 2; txt(title, cx, y, 36, TR.cy2, CENTER, 200, 10);
  stroke(TR.cy); strokeWeight(1.2); line(cx - 150, y + 38, cx + 60, y + 38); line(cx + 60, y + 38, cx + 84, y + 60);
}
function rule(cx, y, half, a) { stroke(25, 227, 255, a || 150); strokeWeight(1); line(cx - half, y, cx + half, y); }
function closeX(x, y, fn) { noFill(); stroke(TR.cy); strokeWeight(1.2); circle(x, y, 40); line(x - 7, y - 7, x + 7, y + 7); line(x + 7, y - 7, x - 7, y + 7); if (fn) DUI.list.push({ x: x - 20, y: y - 20, w: 40, h: 40, fn }); }
// rotating amber corner brackets around the thing you can interact with
function focusBrackets(x, y, s0) { push(); translate(x, y); rotate(DUI.t * 1.4); const s = (s0 || 38) + Math.sin(DUI.t * 6) * 3; glow(TR.am, 10); stroke(TR.am); strokeWeight(2); noFill(); corners(-s, -s, s * 2, s * 2, 12); noGlow(); pop(); }
// world label under an object: tiny spaced caps in the object's color
function tag(str, x, y, col) { txt(str, x, y, 9, col || TR.cy, CENTER, 400, 3); }

// ---------- comm toast (PLEX = cyan, ABB = amber, other = magenta) ----------
function speakerColor(t) { return t.startsWith('PLEX') ? TR.cy : t.startsWith('ABB') ? TR.am : TR.mg; }
function drawToast(y) {
  const T = DUI.toast; if (T.t <= 0) return;
  const a = Math.min(1, T.t * 2), sc = speakerColor(T.text); let body = T.text, who = '';
  const m = /^([A-Z][A-Z0-9 ]{1,10}):\s*/.exec(T.text); if (m) { who = m[1]; body = T.text.slice(m[0].length); }
  setFont(12, 300); const tw = width - 40, yy = y === undefined ? 100 : y;
  drawingContext.globalAlpha = a; const lines = Math.max(1, Math.ceil(textWidth(body) / (tw - 52))), hh = 22 + lines * 17;
  stroke(rgba(sc, 0.7)); strokeWeight(1.2); fill(3, 8, 24, 215); chamfer(20, yy, tw, hh, 8);
  noStroke(); fill(sc); rect(24, yy + 6, 2, hh - 12);
  if (who) txt(who, 36, yy + 12, 8, sc, LEFT, 500, 3);
  wrapTxt(body, 36, yy + (who ? 20 : 8), tw - 30, 12, 'rgba(240,248,255,0.95)', 16);
  drawingContext.globalAlpha = 1;
}
// ---------- area banner: tiny kicker, big white thin name, rule under it ----------
function drawBanner(y) {
  const B = DUI.banner; if (B.t <= 0) return; const cy = y || 180;
  const a = Math.max(0, Math.min(1, B.t * 1.5, (3.2 - B.t) * 3));
  drawingContext.globalAlpha = a; txt(B.kicker, width / 2, cy - 12, 10, TR.cy2, CENTER, 400, 8);
  txt(B.text, width / 2, cy + 16, 21, '#FFFFFF', CENTER, 200, 5); rule(width / 2, cy + 40, 110, 160); drawingContext.globalAlpha = 1;
}

// ---------- virtual stick: ring + inner ring + 24 tick marks, knob with crosshair ----------
function drawStickUI(bx, by, kx, ky, R) {
  R = R || 62; push(); translate(bx, by); noFill(); stroke(25, 227, 255, 120); strokeWeight(1.2); circle(0, 0, R * 2); stroke(25, 227, 255, 50); circle(0, 0, R * 1.1);
  for (let i = 0; i < 24; i++) { const a = i / 24 * TWO_PI, l = i % 6 === 0 ? 8 : 3; stroke(25, 227, 255, 110); line(Math.cos(a) * (R + 3), Math.sin(a) * (R + 3), Math.cos(a) * (R + 3 + l), Math.sin(a) * (R + 3 + l)); }
  pop(); noStroke(); fill(25, 227, 255, 50); circle(kx, ky, 52); stroke(TR.cy2); strokeWeight(1.6); noFill(); circle(kx, ky, 52);
  strokeWeight(1); line(kx - 8, ky, kx + 8, ky); line(kx, ky - 8, kx, ky + 8);
}

// ---------- scene transition: shutters close from top and bottom with glowing edge + grid ----------
// k: 0 (open) .. 1 (closed). Ease it yourself: k = k * k * (3 - 2 * k)
function shutters(k, label) {
  const h = (height / 2) * k; noStroke(); fill(3, 8, 22); rect(0, 0, width, h); rect(0, height - h, width, h);
  if (k > 0.02) { glow(TR.cy, 14); stroke(TR.cy); strokeWeight(2); line(0, h, width, h); line(0, height - h, width, height - h); noGlow();
    stroke(25, 227, 255, 40); strokeWeight(1); for (let x = 0; x < width; x += 40) { line(x, 0, x, h); line(x, height - h, x, height); }
    if (k > 0.9 && label) txt(label, width / 2, height / 2, 14, TR.cy2, CENTER, 300, 6); }
}

// ---------- title backdrop: drifting stars + faint horizon arcs + rotating tick ring ----------
const DUI_STARS = []; function duiStars(n) { DUI_STARS.length = 0; for (let i = 0; i < (n || 120); i++) DUI_STARS.push({ x: Math.random() * width, y: Math.random() * height, r: Math.random() * 1.6 + 0.4, a: Math.random() * 0.6 + 0.2, d: Math.random() * 2 + 0.3 }); }
function titleBackdrop() {
  background(TR.bg); noStroke(); if (!DUI_STARS.length) duiStars();
  for (const s of DUI_STARS) { const sx = (((s.x + DUI.t * 4 * s.d) % width) + width) % width; fill(200, 230, 255, s.a * 255); circle(sx, s.y, s.r); }
  noFill(); for (let k = 0; k < 4; k++) { stroke(25, 227, 255, 18 - k * 3); strokeWeight(2); const d = width * 1.3 + k * 380; arc(width / 2, height * 1.3, d, d, Math.PI * 1.1, Math.PI * 1.9); }
}
function tickRing(cx, cy, r) {
  push(); translate(cx, cy); noFill(); stroke(25, 227, 255, 90); strokeWeight(1.2); circle(0, 0, r * 2); stroke(25, 227, 255, 40); circle(0, 0, r * 2 + 50);
  rotate(DUI.t * 0.12); stroke(25, 227, 255, 120); for (let i = 0; i < 48; i++) { const a = i / 48 * TWO_PI, l = i % 6 === 0 ? 11 : 5; line(Math.cos(a) * (r + 26), Math.sin(a) * (r + 26), Math.cos(a) * (r + 26 + l), Math.sin(a) * (r + 26 + l)); } pop();
}

// ---------- screen finish: scanlines + vignette, built once, drawn LAST every frame ----------
DUI.fx = function () {
  if (!DUI.fxG || DUI.fxW !== width || DUI.fxH !== height) {
    DUI.fxW = width; DUI.fxH = height; DUI.fxG = createGraphics(width, height); DUI.fxG.pixelDensity(1); const c = DUI.fxG.drawingContext;
    c.clearRect(0, 0, width, height); c.fillStyle = 'rgba(0,10,24,0.16)'; for (let y = 0; y < height; y += 3) c.fillRect(0, y, width, 1);
    const g = c.createRadialGradient(width / 2, height / 2, height * 0.32, width / 2, height / 2, height * 0.78);
    g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,4,14,0.62)'); c.fillStyle = g; c.fillRect(0, 0, width, height);
  }
  return DUI.fxG;
};
// ============================== end DOT-UI ==============================
