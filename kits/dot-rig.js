// =====================================================================
// DO-T (Dot)  v1.0.0  (LightHeart Labs module; see README.md here)
// A cheerful robot from All Humans Are Dead (AHAD v10, Prototype 11): the original vector rig, unchanged.
// =====================================================================
const DOT_VERSION = '1.0.0';
// dot_rig.js
// ============================================================
// ============================================================
// DO-T  -  pseudo-3D vector rig for p5.js 2.x
// Everything is flat 2D shapes, but features (visor, face, arm pods, fins, seams)
// live on an imaginary sphere and are re-projected every frame, so the visor and
// face wrap around the body and the pods / fins swing like they are real 3D.
// Art units = pixels of the reference hero art (body radius 315). draw() scales it.
// Tools: 'light' | 'ext' | 'flame' | 'empty'
// Faces: happy neutral strained tired sad heart content unimpressed defeated
// ============================================================
const DOT_REF = 315;
const D2R = Math.PI / 180;
const DOTC = {
  shade: '#CDE8EF', hi: '#E9F5F4', hi2: '#F6FBFA', rim: '#62CAF0', pale: '#BFE3F0', blue: '#2E86C8', blue2: '#1B6FB0',
  deep: '#1362A3', navy: '#16315A', screen: '#5FCAEE', face: '#0C2243', hl: '#BCE4F6', white: '#EDF6F5',
  or1: '#FFC878', or2: '#F79454', amber: '#F6B04E'
};
const FACE_ALIAS = { alert: 'neutral', wide: 'neutral', worried: 'tired', asleep: 'content' };

// ---- shape samplers (visor-local art px) ----
function dEll(cx, cy, rx, ry, n = 30) { const o = []; for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2; o.push([cx + Math.cos(a) * rx, cy + Math.sin(a) * ry]); } return o; }
function dPill(cx, cy, w, h, n = 18) { const r = h / 2, o = []; for (let i = 0; i <= n; i++) { const a = -Math.PI / 2 + i / n * Math.PI; o.push([cx + w / 2 - r + Math.cos(a) * r, cy + Math.sin(a) * r]); } for (let i = 0; i <= n; i++) { const a = Math.PI / 2 + i / n * Math.PI; o.push([cx - w / 2 + r + Math.cos(a) * r, cy + Math.sin(a) * r]); } return o; }
function dArc(cx, cy, r, a0, a1, n = 16) { const o = []; for (let i = 0; i <= n; i++) { const a = a0 + (a1 - a0) * i / n; o.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]); } return o; }
function dBez(p0, p1, p2, p3, n = 14) { const o = []; for (let i = 0; i <= n; i++) { const t = i / n, u = 1 - t; o.push([u * u * u * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t * t * t * p3[0], u * u * u * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t * t * t * p3[1]]); } return o; }
const HEART_SIZE = 38;      // LOVE face: how big the heart eyes are (half the width of one heart, in rig units; the character sheet is about 38)
function dHeart(cx, cy, s) { const o = []; for (let i = 0; i < 40; i++) { const t = i / 40 * Math.PI * 2; o.push([cx + s * 16 * Math.pow(Math.sin(t), 3) / 16 * 16 / 16, cy - s * (13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t)) / 16 * 16 / 16]); } return o; }
const mirrorX = (pts) => pts.map(p => [-p[0], p[1]]);

class DotRig {
  constructor() {
    this.restYaw = 29 * D2R;
    this.yaw = this.restYaw; this.yawV = 0; this.pitch = 0; this.roll = 0;
    this.facing = 1; this.t = Math.random() * 10; this.blinkT = 0; this.nextBlink = 2.5;
    this.gx = 0; this.gy = 0; this.speed = 0; this.velAng = 0; this.thrust = 0; this.flutter = 0; this.bob = 0;
    this.finPhase = Math.random() * 6; this.turnPulse = 0;
    this.fins = [
      { p: [-0.349, -0.873, -0.34], k: 1.0, w: 230, h: 120, ang: -12, col: DOTC.blue, back: true },
      { p: [0.97, 0.13, -0.2], k: 1.1, w: 84, h: 160, ang: 90, col: DOTC.blue2, back: true },
      { p: [-0.63, 0.72, -0.29], k: 1.2, w: 120, h: 250, ang: 34, col: DOTC.deep, back: true },
      { p: [0.03, 1.0, -0.2], k: 1.06, w: 175, h: 95, ang: 0, col: DOTC.deep, back: true },
      { p: [-0.9, -0.25, -0.35], k: 1.05, w: 86, h: 150, ang: 90, col: DOTC.blue2, back: true } // mirror of right fin, shows when facing left
    ];
  }

  // ---------- animation ----------
  update(dt, vx, vy, aim, opt = {}) {
    this.t += dt; const maxS = opt.maxSpeed || 235;
    const sp = Math.hypot(vx, vy); this.speed = sp; if (sp > 8) this.velAng = Math.atan2(vy, vx);
    if (Math.abs(vx) > 25) this.facing = Math.sign(vx);
    else if (opt.aimFacing && Math.abs(Math.cos(aim)) > 0.35) this.facing = Math.sign(Math.cos(aim));
    const sway = Math.sin(this.t * 0.9) * 0.05;
    const target = this.facing * this.restYaw + Math.max(-1, Math.min(1, vx / maxS)) * 0.2 * (this.facing >= 0 ? 1 : 1) + sway;
    const k = 120, c = 2 * Math.sqrt(k) * 0.55;
    this.yawV += ((target - this.yaw) * k - this.yawV * c) * dt; this.yaw += this.yawV * dt;
    const pt = Math.max(-1, Math.min(1, -vy / maxS)) * 0.38 + Math.sin(this.t * 0.7) * 0.03;
    this.pitch += (pt - this.pitch) * Math.min(1, dt * 7);
    const idle = 1 - this.thrust;
    this.roll += (Math.max(-1, Math.min(1, vx / maxS)) * 0.18 + Math.sin(this.t * 3.49) * 0.09 * idle - this.roll) * Math.min(1, dt * 6);
    this.thrust += (Math.min(1, sp / maxS) - this.thrust) * Math.min(1, dt * 8);
    this.bob = Math.sin(this.t * 3.49) * 0.035 * (0.4 + 0.6 * (1 - this.thrust)) + Math.sin(this.t * 1.3) * 0.008;
    this.flutter = Math.sin(this.t * (6 + 10 * this.thrust) + this.finPhase) * (3 + 7 * this.thrust);
    this.blinkT -= dt; this.nextBlink -= dt;
    if (this.nextBlink <= 0) { this.blinkT = 0.14; this.nextBlink = 2.2 + Math.random() * 3.2; }
    const gx = Math.cos(aim) * (opt.gazeAim ? 1 : 0) + vx / maxS, gy = Math.sin(aim) * (opt.gazeAim ? 1 : 0) + vy / maxS;
    this.gx += (Math.max(-1, Math.min(1, gx)) * 9 - this.gx) * Math.min(1, dt * 8);
    this.gy += (Math.max(-1, Math.min(1, gy)) * 6 - this.gy) * Math.min(1, dt * 8);
  }

  // ---------- projection ----------
  _view(b, yaw = this.yaw, pitch = this.pitch) {
    const cy = Math.cos(yaw), sy = Math.sin(yaw);
    const x = b[0] * cy + b[2] * sy, z = -b[0] * sy + b[2] * cy, y = b[1];
    const cp = Math.cos(pitch), sp = Math.sin(pitch);
    return [x, y * cp - z * sp, y * sp + z * cp];
  }
  _bodyFromRest(v) { return this._view(v, -this.restYaw, 0); }
  _map(lon, lat, roll, k, pts) {
    const a = lon * D2R, b = lat * D2R;
    const c = [Math.cos(b) * Math.sin(a), -Math.sin(b), Math.cos(b) * Math.cos(a)];
    const E = [Math.cos(a), 0, -Math.sin(a)], S = [Math.sin(b) * Math.sin(a), Math.cos(b), Math.sin(b) * Math.cos(a)];
    const cr = Math.cos(roll * D2R), sr = Math.sin(roll * D2R), out = [];
    for (const [u, v] of pts) {
      const uu = u * cr - v * sr, vv = u * sr + v * cr, rho = Math.hypot(uu, vv) / DOT_REF;
      let d = [0, 0, 0]; if (rho > 1e-7) { const ca = uu / (rho * DOT_REF), sa = vv / (rho * DOT_REF); d = [ca * E[0] + sa * S[0], ca * E[1] + sa * S[1], ca * E[2] + sa * S[2]]; }
      const sr2 = Math.sin(rho), cr2 = Math.cos(rho);
      const w = this._view([(c[0] * cr2 + d[0] * sr2) * k, (c[1] * cr2 + d[1] * sr2) * k, (c[2] * cr2 + d[2] * sr2) * k]);
      if (w[2] < 0) { const m = Math.hypot(w[0], w[1]) || 1; out.push([w[0] / m * DOT_REF * k, w[1] / m * DOT_REF * k, w[2]]); }
      else out.push([w[0] * DOT_REF, w[1] * DOT_REF, w[2]]);
    }
    return out;
  }
  _zc(lon, lat) { return this._view(dvec(lon, lat))[2]; }
  _poly(P) { beginShape(); for (const q of P) vertex(q[0], q[1]); endShape(CLOSE); }
  _line(P) { noFill(); beginShape(); for (const q of P) vertex(q[0], q[1]); endShape(); }

  // billboard transform for protruding parts (pods): sits on sphere, tilts with it
  _billboard(lon, lat, k, restZ, fn) {
    const bv = dvec(lon, lat), v = this._view(bv); if (v[2] < -0.12) return;
    const px = v[0] * DOT_REF * k, py = v[1] * DOT_REF * k;
    const f = Math.max(0.06, Math.min(1, Math.max(0, v[2]) / restZ)), nang = Math.atan2(v[1], v[0]);
    push(); translate(px, py); rotate(nang); scale(f, 1); rotate(-nang); fn(v, nang, f); pop();
  }

  // ---------- draw ----------
  draw(x, y, R, o = {}) {
    const face = FACE_ALIAS[o.face] || o.face || 'happy', toolId = o.tool || 'light', aim = o.aim || 0;
    const s = R / DOT_REF, sp = this.speed;
    push(); translate(x, y + this.bob * R); rotate(this.roll);
    if (sp > 20) { const st = Math.min(0.12, sp / 2600); rotate(this.velAng); scale(1 + st, 1 - st * 0.7); rotate(-this.velAng); }
    scale(s);
    // thruster glow
    noStroke();
    for (let i = 0; i < 3; i++) { fill(95, 202, 238, (22 + 55 * this.thrust) / (i + 1)); ellipse(0, DOT_REF * 1.02, DOT_REF * (0.9 - i * 0.2), DOT_REF * (0.22 + 0.4 * this.thrust) * (1 + i * 0.3)); }
    // idle sonic rings (from the 12-frame idle GIF): two cyan ellipses expand + fade from under the arm pod
    { const idleK = 1 - this.thrust; if (idleK > 0.05) { noFill(); for (let k = 0; k < 2; k++) { const ph = ((this.t / 1.8) + k * 0.5) % 1, a = Math.sin(ph * Math.PI) * 220 * idleK;
      stroke(95, 215, 250, a); strokeWeight(9 - 4 * ph); push(); translate(-DOT_REF * (1.15 + 0.12 * ph), DOT_REF * (0.52 + 0.1 * ph)); rotate(-0.2); ellipse(0, 0, 70 + 70 * ph, 190 + 90 * ph); pop(); } noStroke(); } }
    // outer glow
    for (let i = 4; i >= 1; i--) { fill(120, 210, 245, 10); circle(0, 0, DOT_REF * 2 + i * 22); }
    // tool (behind body, outside the rim)
    this._tool(toolId, aim, o.lightOn !== false);
    // back fins
    for (const f of this.fins) this._fin(f, true);
    // body
    noStroke(); fill(DOTC.shade); circle(0, 0, DOT_REF * 2);
    fill(DOTC.hi); circle(-DOT_REF * 0.05, -DOT_REF * 0.06, DOT_REF * 1.86);
    this._seams();
    // front fins (swung round in front)
    for (const f of this.fins) this._fin(f, false);
    // rim light (left)
    noFill(); stroke(DOTC.rim); strokeWeight(9); strokeCap(ROUND); arc(0, 0, DOT_REF * 2 - 4, DOT_REF * 2 - 4, Math.PI * 0.62, Math.PI * 1.32);
    noStroke();
    // pods + chest + visor (sorted by depth)
    const items = [
      { z: this._zc(-80, -2), fn: () => this._pod(-1) }, { z: this._zc(80, -2), fn: () => this._pod(1) },
      { z: 0.5, fn: () => this._chest() },
      { z: 1, fn: () => this._visor(face, o) }
    ].sort((a, b) => a.z - b.z);
    for (const it of items) it.fn();
    pop();
  }

  _seams() { // two meridian seams that rotate with the body
    stroke(DOTC.hi2); strokeWeight(8); strokeCap(ROUND); noFill();
    for (const lon of [8, 29]) {
      let run = [];
      for (let lat = -78; lat <= 78; lat += 6) {
        const v = this._view(dvec(lon, lat));
        if (v[2] > 0.04) run.push([v[0] * DOT_REF, v[1] * DOT_REF]); else { if (run.length > 1) this._line(run); run = []; }
      }
      if (run.length > 1) this._line(run);
    }
    stroke(DOTC.pale); strokeWeight(5);
    for (const lon of [18]) {
      let run = [];
      for (let lat = -70; lat <= 70; lat += 6) { const v = this._view(dvec(lon, lat)); if (v[2] > 0.04) run.push([v[0] * DOT_REF, v[1] * DOT_REF]); else { if (run.length > 1) this._line(run); run = []; } }
      if (run.length > 1) this._line(run);
    }
    noStroke();
  }

  _fin(f, backPass) {
    const b = this._bodyFromRest(f.p), v = this._view(b);
    const isBack = v[2] < 0.02; if (isBack !== backPass) return;
    const px = v[0] * DOT_REF * f.k, py = v[1] * DOT_REF * f.k;
    const restV = f.p, restAng = Math.atan2(restV[1], restV[0]), nowAng = Math.atan2(v[1], v[0]);
    const swing = this.flutter * D2R * (f.p[1] > 0 ? 1 : -1);
    push(); translate(px, py); rotate((f.ang * D2R) + (nowAng - restAng) + swing);
    const depth = Math.max(0.35, Math.abs(v[2]) * 0.4 + 0.6);
    noStroke(); fill(f.col); ellipse(0, 0, f.w * depth, f.h * 1);
    pop();
  }

  _chest() {
    const lon = -26, lat = -22, v = this._view(dvec(lon, lat)); if (v[2] < 0.15) return;
    const rot = (pts, cx, cy, a) => pts.map(p => { const x = p[0] - cx, y = p[1] - cy, c = Math.cos(a * D2R), s = Math.sin(a * D2R); return [cx + x * c - y * s, cy + x * s + y * c]; });
    const pill = (cx, cy, w, h, a, col) => { fill(col); this._poly(this._map(lon, lat, 0, 1.0, rot(dPill(cx, cy, w, h, 10), cx, cy, a))); };
    noStroke(); pill(-72, 22, 72, 30, 14, DOTC.or1); pill(2, 32, 54, 26, 0, DOTC.or2); pill(58, 26, 30, 20, -18, DOTC.or1);
    this._billboard(lon, lat + 1.5, 1.0, Math.cos(17 * D2R) * Math.cos(24 * D2R), () => {
      noStroke(); fill(DOTC.navy); textAlign(CENTER, CENTER); textSize(21); textStyle(BOLD); text('DO-T', 6, -2); textStyle(NORMAL);
    });
  }

  _pod(side) {
    const lon = side * 80, lat = -2, rest = Math.cos(51 * D2R);
    this._billboard(lon, lat, 1.04, rest, (v, nang, f) => {
      scale(-side, 1); // art drawn for the left pod
      const dep = (d) => { translate(0, 0); };
      noStroke();
      // wing plate (behind the ring)
      push(); translate(-150 + this.flutter * 0.6, -62); rotate(-28 * D2R);
      fill(DOTC.blue); rect(-115, -34, 230, 70, 22); fill(DOTC.white); rect(-104, -26, 208, 54, 17);
      fill('#B4E0F4'); rect(-86, -14, 120, 11, 5); rect(-86, 4, 86, 11, 5);
      fill(DOTC.blue); rect(-60, 34, 100, 26, 10); fill(DOTC.white); rect(-52, 38, 78, 14, 6);
      pop();
      fill(DOTC.rim); circle(0, 0, 276);
      for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2 + 0.3; fill(DOTC.navy); circle(Math.cos(a) * 118, Math.sin(a) * 118, 11); }
      fill(DOTC.blue); circle(-4, 0, 224);
      fill(DOTC.deep); circle(-30, 4, 172);
      fill(DOTC.navy); circle(-74, 4, 104); fill(DOTC.blue); circle(-74, 4, 78);
    });
  }

  _visor(face, o) {
    const lon = 0, lat = 8, K = 1;
    const fill_ = (col, pts, k) => { fill(col); this._poly(this._map(lon, lat, 0, k, pts)); };
    noStroke();
    fill_(DOTC.pale, dPill(-16, 20, 470, 206), 1.06);
    fill_(DOTC.navy, dPill(0, 0, 470, 206), 1.10);
    fill_(DOTC.blue, dPill(14, 8, 408, 172), 1.115);
    fill_(DOTC.screen, dPill(16, 14, 386, 154), 1.122);
    fill_(DOTC.hl, dPill(-168, 60, 16, 11, 8), 1.123); fill_(DOTC.hl, dPill(-104, 60, 84, 11, 8), 1.123);
    this._face(face, lon, lat, 1.13);
  }

  _face(face, lon, lat, k) {
    const cx = 22 + this.gx, cy = 8 + this.gy, E = 97;
    const mp = (pts) => this._map(lon, lat, 0, k, pts.map(p => [p[0] + cx, p[1] + cy]));
    const F = (pts) => { noStroke(); fill(DOTC.face); this._poly(mp(pts)); };
    const L = (pts, w = 11) => { stroke(DOTC.face); strokeWeight(w); strokeCap(ROUND); strokeJoin(ROUND); this._line(mp(pts)); noStroke(); };
    const blink = this.blinkT > 0 ? 0.12 : 1;
    const eyeL = [[-122, 8], [-84, 8]];
    const tiredEye = (sgn) => { const c = dBez([sgn * 84, -30], [sgn * 86, -6], [sgn * 100, 6], [sgn * 124, 6]); L(c, 10); L([[sgn * 126, 20], [sgn * 92, 20]], 10); };
    switch (face) {
      case 'neutral': F(dEll(-E, 0, 15, 30 * blink)); F(dEll(E, 0, 15, 30 * blink)); F(dEll(0, 14, 12, 12)); break;
      case 'strained': L([[-124, -26], [-84, 0], [-124, 26]]); L([[124, -26], [84, 0], [124, 26]]); L(dArc(-21, 24, 21, Math.PI, Math.PI * 2, 10).concat(dArc(21, 24, 21, Math.PI, Math.PI * 2, 10)), 10); break;
      case 'tired': tiredEye(-1); tiredEye(1); F(dEll(0, 8, 13, 27)); break;
      case 'sad': tiredEye(-1); tiredEye(1); L(dArc(0, 34, 22, Math.PI, Math.PI * 2, 12), 11); break;
      case 'heart': F(dHeart(-E, -5, HEART_SIZE)); F(dHeart(E, -5, HEART_SIZE)); L(dArc(0, 2, 27, 0.15, Math.PI - 0.15, 14), 9); break;   // big hearts like the character sheet (half-width = HEART_SIZE)
      case 'content': L(dArc(-E, -6, 20, 0.1, Math.PI - 0.1, 12), 10); L(dArc(E, -6, 20, 0.1, Math.PI - 0.1, 12), 10); L([[-22, 24], [22, 24]], 10); break;
      case 'unimpressed': { for (const sg of [-1, 1]) { L([[sg * 134, -8], [sg * 60, -8]], 9); F(dArc(sg * 97, -8, 17, 0, Math.PI, 12)); L([[sg * 60, -36], [sg * 60, -8]], 8); } L([[-28, 22], [28, 22]], 9); break; }
      case 'defeated': { for (const sg of [-1, 1]) { L([[sg * E - 20, -22], [sg * E + 20, 18]], 11); L([[sg * E - 20, 18], [sg * E + 20, -22]], 11); } F(dEll(0, 8, 13, 26)); break; }
      case 'joy':
        L(dArc(-E, 6, 21, Math.PI, Math.PI * 2, 12), 11); L(dArc(E, 6, 21, Math.PI, Math.PI * 2, 12), 11);
        F(dArc(0, 0, 28, 0, Math.PI, 14).concat([[-28, 0]]).map(p => [p[0], p[1] + 6])); break;
      default: // happy = hero painting face: tall oval eyes + U smile
        F(dEll(-E, -2, 18, 38 * blink)); F(dEll(E, -2, 18, 38 * blink)); L(dArc(0, -6, 34, 0.2, Math.PI - 0.2, 16), 7);
    }
  }

  // ---------- tools (drawn pointing +x from the socket) ----------
  _tool(id, aim, lightOn) {
    push();
    const dist = DOT_REF * 1.13; translate(Math.cos(aim) * dist, Math.sin(aim) * dist); rotate(aim);
    if (Math.cos(aim) < 0) scale(1, -1);
    const pump = Math.sin(this.t * 3) * 3;
    noStroke();
    fill(DOTC.blue); circle(0, 0, 150); fill(DOTC.blue2); circle(9, 0, 112);       // socket cap
    // bell
    const bell = () => {
      fill(DOTC.white); beginShape(); for (const q of dBez([22, -58], [60, -118], [120, -140], [182, -140], 14)) vertex(q[0], q[1]);
      for (const q of dBez([182, 150], [120, 148], [60, 118], [22, 60], 14)) vertex(q[0], q[1]); endShape(CLOSE);
      fill(DOTC.pale); beginShape(); for (const q of dBez([22, 60], [60, 118], [120, 148], [182, 150], 12)) vertex(q[0], q[1]);
      for (const q of dBez([182, 40], [130, 70], [70, 62], [22, 30], 12)) vertex(q[0], q[1]); endShape(CLOSE);
      fill(DOTC.navy); quad(168, -150, 214, -148, 214, 160, 168, 160);
      fill(DOTC.screen); for (const yy of [-110, -45, 20, 85, 130]) circle(191, yy, 8);
    };
    bell();
    if (id === 'light') {
      fill(DOTC.blue); ellipse(222, 6, 40, 296);
      fill(lightOn ? '#FFE9A8' : '#7a8aa6'); ellipse(222, 6, 28, 270);
      fill(lightOn ? DOTC.amber : '#51607c'); ellipse(222, 6, 20, 120);
    } else if (id === 'ext') {
      fill(DOTC.blue); beginShape(); vertex(214, -118); vertex(380, -104 - pump * 0.2); vertex(380, 116 + pump * 0.2); vertex(214, 130); endShape(CLOSE);
      fill(DOTC.screen); beginShape(); vertex(214, -118); vertex(380, -104); vertex(380, -64); vertex(214, -70); endShape(CLOSE);
      fill('#3FA4DE'); beginShape(); vertex(214, -50); vertex(380, -44); vertex(380, 20); vertex(214, 10); endShape(CLOSE);
      fill(DOTC.deep); ellipse(382, 6, 36, 222); fill('#0E4F86'); ellipse(384, 6, 22, 190);
      push(); translate(70, 110); rotate(-12 * D2R); fill('#B41F45'); rect(-50, -10, 96, 150, 18); fill('#F0485F'); rect(-34, 8, 12, 80, 6); fill(DOTC.screen); rect(-50, 124, 96, 22, 8); pop();
    } else if (id === 'flame') {
      push(); translate(52, 104); rotate(-18 * D2R); fill('#EC8780'); rect(-52, -10, 104, 160, 20); fill('#F4968A'); rect(-44, -4, 70, 140, 16); fill('#FFC6A6'); rect(-24, 16, 12, 70, 6); fill('#F2A090'); rect(-52, 134, 104, 20, 8); pop();
      fill(DOTC.navy); rect(214, -26, 52, 52); fill(DOTC.blue); rect(262, -14, 36, 28);
      fill(DOTC.screen); beginShape(); vertex(298, -34); vertex(430, -76); vertex(430, 82); vertex(298, 40); endShape(CLOSE);
      fill(DOTC.face); for (const [px, py, r] of [[330, -30, 16], [384, -48, 18], [364, 6, 20], [326, 26, 12], [398, 40, 17], [352, -64, 10], [336, -6, 10]]) ellipse(px, py, r * 1.4, r);
      fill(DOTC.deep); ellipse(432, 3, 28, 160);
      stroke('#5FA9E0'); strokeWeight(7); noFill(); line(240, 70, 310, 126); line(310, 126, 430, 110); noStroke();
      fill(DOTC.blue); rect(430, 96, 36, 28, 8);
      const fl = Math.sin(this.t * 14) * 4; fill('#FF7A24'); ellipse(488, 100, 36 + fl, 52); fill('#FFD04A'); ellipse(488, 104, 20, 32);
    } else if (id === 'fist') {
      fill(DOTC.navy); rect(214, -30, 56, 60, 8);   // wrist mount only: the full-size Rocket Fist is drawn by drawHolsterFist() in the world layer
    } else if (id === 'shield') {
      fill(DOTC.navy); rect(214, -26, 44, 52, 8);
      fill(DOTC.screen); beginShape(); for (const q of dBez([250, -190], [380, -150], [380, 150], [250, 190], 16)) vertex(q[0], q[1]); for (const q of dBez([286, 120], [336, 70], [336, -70], [286, -120], 12)) vertex(q[0], q[1]); endShape(CLOSE);
      fill(DOTC.hl); beginShape(); for (const q of dBez([262, -150], [330, -110], [330, -40], [300, -20], 10)) vertex(q[0], q[1]); for (const q of dBez([284, -30], [300, -70], [296, -110], [262, -130], 10)) vertex(q[0], q[1]); endShape(CLOSE);
    } else { // empty socket stub
      fill(DOTC.pale); rect(210, -20, 124, 44, 12); fill(DOTC.white); rect(210, -22, 124, 36, 12);
    }
    pop();
  }
}

function dvec(lon, lat) { const a = lon * D2R, b = lat * D2R; return [Math.cos(b) * Math.sin(a), -Math.sin(b), Math.cos(b) * Math.cos(a)]; }

