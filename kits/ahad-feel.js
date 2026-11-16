// ============================================================
// AHAD FEEL kit v1.0.0  --  screen feel for p5.js 2.3.4 games in the ALL HUMANS ARE DEAD style
// Lifted from DO-T RUSH 0.1.46 (src/feel.js), which ported the glitch from AHAD Prototype 11 (v9_feel.js).
//   glitch       RGB split + tear bands (AhadFeel.glitch(0..1)); random glitching at low power
//   impact       one inverted black-and-white frame, then the colour bleeds back; never strobes (gap)
//   shake        screen shake (AhadFeel.shake(px)); call AhadFeel.applyShake() at the top of your world draw
//   freeze       hit-stop: AhadFeel.freeze(secs); skip your game update while AhadFeel.frozen()
//   hitstun      AhadFeel.stun(enemy, secs); AhadFeel.tickStun(enemy, dt) each frame (true = still stunned);
//                AhadFeel.vib(enemy) -> {x, y} offset to draw it shaking
//   combo        streaks with tiers, bonus callbacks, a DOT-UI counter (needs dot-ui.js for txt/glow/thinBar)
//   greatJob     the GREAT JOB! victory card (tilted chunky white letters, electric-blue glow)
// Needs: p5 2.x. The combo counter and great-job card also need dot-ui.js (txt, glow, noGlow, thinBar, TR).
// Every loop is braced (p5 web editor loop-protect safe). No globals except AhadFeel.
// ============================================================
const AhadFeel = (() => {
  const CFG = {
    glitch: true, glitchDecay: 3.0, rgbSplit: 10, tearSlices: 8,
    lowPwrAt: 0.15, lowPwrRate: [0.7, 6], lowPwrStrength: [0.14, 0.7],   // below 15% power: random glitching, worse toward 0
    impact: true, impactGap: 0.7, impactBleed: 0.35,
    shakeDecay: 30,                                  // pixels of shake lost per second
    combo: {
      window: 2.2,
      tiers: [[3, 'NICE'], [6, 'GREAT'], [10, 'AWESOME'], [15, 'FANTASTIC'], [22, 'UNSTOPPABLE'], [30, 'DO-T-TASTIC']],
      colors: ['#19E3FF', '#3CFFB0', '#FFB938', '#FF3FD0', '#FF4D5E', '#FFFFFF'],
      bonusEvery: 5,                                 // onBonus(extra) every this many in a row
    },
    greatJobSeconds: 2.8,
  };
  let glitchAmt = 0, bufs = null, impactT = -99, impactNow = 0, lastImpact = -99, shakeAmt = 0, freezeT = 0, gj = null;
  const combo = { n: 0, t: 0, tier: -1, popT: 0, tierT: 0, word: '', col: CFG.combo.colors[0], best: 0, bonus: 0 };
  const hooks = { onTier: null, onBonus: null, onEnd: null, onStep: null };   // set these to add sounds, PWR, bytes, toasts
  const now = () => millis() / 1000;
  const lerpN = (a, b, t) => a + (b - a) * t;
  const seeded = (seed) => { let s = seed; return () => (s = (s * 16807) % 2147483647) / 2147483647; };

  function config(opts) { Object.assign(CFG, opts || {}); if (opts && opts.combo) CFG.combo = Object.assign({}, CFG.combo, opts.combo); return CFG; }

  // ---- events ----
  function glitch(a) { if (CFG.glitch) glitchAmt = Math.min(1, Math.max(glitchAmt, a)); }
  function impactFrame() { const t = now(); if (!CFG.impact || t - lastImpact < CFG.impactGap) return false; lastImpact = t; impactT = t; impactNow = 2; return true; }
  function shake(px) { shakeAmt = Math.max(shakeAmt, px); }
  function freeze(secs) { freezeT = Math.max(freezeT, secs); }
  function frozen() { return freezeT > 0; }
  function stun(e, secs) { e.stunT = Math.max(e.stunT || 0, secs); e.vibT = secs; e.vibMax = secs; }
  function tickStun(e, dt) { e.vibT = Math.max(0, (e.vibT || 0) - dt); e.stunT = Math.max(0, (e.stunT || 0) - dt); return e.stunT > 0; }   // call per enemy per frame; true = still stunned
  function vib(e) { if (!(e.vibT > 0)) return { x: 0, y: 0 }; const v = 4 * e.vibT / (e.vibMax || 0.18); return { x: random(-v, v), y: random(-v, v) }; }

  // call once per frame (dt in seconds). power01 = 0..1 to drive low-power glitching (optional)
  function update(dt, power01) {
    glitchAmt = Math.max(0, glitchAmt - CFG.glitchDecay * dt);
    shakeAmt = Math.max(0, shakeAmt - CFG.shakeDecay * dt);
    freezeT = Math.max(0, freezeT - dt);
    if (power01 !== undefined && power01 < CFG.lowPwrAt) {
      const k = 1 - power01 / CFG.lowPwrAt;
      if (Math.random() < lerpN(CFG.lowPwrRate[0], CFG.lowPwrRate[1], k) * dt) glitch(lerpN(CFG.lowPwrStrength[0], CFG.lowPwrStrength[1], k));
    }
    combo.popT = Math.max(0, combo.popT - dt); combo.tierT = Math.max(0, combo.tierT - dt);
    if (combo.t > 0) { combo.t -= dt; if (combo.t <= 0) { if (hooks.onEnd && combo.n >= CFG.combo.tiers[0][0]) hooks.onEnd(combo.n, combo.bonus, combo.col); const best = combo.best; Object.assign(combo, { n: 0, t: 0, tier: -1, word: '', bonus: 0, col: CFG.combo.colors[0], best }); } }
  }
  // the shake: call right after push() at the start of your world drawing
  function applyShake() { if (shakeAmt > 0) translate(random(-shakeAmt, shakeAmt), random(-shakeAmt, shakeAmt)); }

  // ---- combos ----
  function comboAdd(x, y) {
    const C = CFG.combo;
    combo.n = combo.t > 0 ? combo.n + 1 : 1; combo.t = C.window; combo.popT = 0.25; combo.best = Math.max(combo.best, combo.n);
    if (hooks.onStep) hooks.onStep(combo.n, x, y);
    const extra = Math.floor(combo.n / C.bonusEvery);
    if (extra > 0 && combo.n >= 2 && hooks.onBonus) { combo.bonus += extra; hooks.onBonus(extra, x, y); }
    let tier = -1; C.tiers.forEach(([need], i) => { if (combo.n >= need) tier = i; });
    if (tier > combo.tier) {
      combo.tier = tier; combo.word = C.tiers[tier][1]; combo.col = C.colors[Math.min(tier, C.colors.length - 1)]; combo.tierT = 0.6;
      shake(3 + tier * 1.5); freeze(0.05); glitch(0.1 + tier * 0.04);
      if (hooks.onTier) hooks.onTier(tier, combo.word, combo.n, combo.col);
      return true;
    }
    return false;
  }
  // the counter: big thin "x12" in the tier colour, the word under it, a draining timer bar, speed lines on tier-up
  function drawCombo(x, y) {
    if (combo.n < 2 || combo.t <= 0) return;
    push();
    const s = 1 + combo.popT * 1.2 + combo.tierT * 0.6;
    if (combo.tierT > 0) {
      const a = combo.tierT / 0.6, c = color(combo.col); c.setAlpha(140 * a); stroke(c); strokeWeight(2);
      for (let i = 0; i < 26; i++) { const an = i / 26 * TWO_PI, r0 = Math.max(width, height) * (0.45 + 0.1 * Math.sin(i * 7)), r1 = r0 - 60 - 80 * a; line(width / 2 + Math.cos(an) * r0, height / 2 + Math.sin(an) * r0, width / 2 + Math.cos(an) * r1, height / 2 + Math.sin(an) * r1); }
      noStroke();
    }
    translate(x, y); scale(s);
    glow(combo.col, 10 + combo.tierT * 20); txt('x' + combo.n, 0, 0, 34, combo.col, CENTER, 200, 2); noGlow();
    if (combo.word) txt(combo.word, 0, 24, 9, combo.col, CENTER, 400, 4);
    thinBar(-36, 34, 72, combo.t / CFG.combo.window, combo.col);
    pop();
  }

  // ---- GREAT JOB! ----
  function greatJob() { gj = { t: 0 }; }
  function drawGreatJob(cx, cy) {
    if (!gj) return;
    gj.t += deltaTime / 1000;
    const t = gj.t, life = CFG.greatJobSeconds; if (t > life) { gj = null; return; }
    const popK = t < 0.25 ? 0.4 + 0.6 * (t / 0.25) * (1 + 0.25 * Math.sin(t / 0.25 * PI)) : 1, fade = Math.min(1, (life - t) / 0.4);
    push(); translate(cx === undefined ? width / 2 : cx, cy === undefined ? height * 0.46 : cy); rotate(-0.27); scale(popK);
    drawingContext.globalAlpha = fade;
    textFont('"Arial Rounded MT Bold", "Arial Black", "Helvetica Neue", sans-serif'); try { textWeight(800); } catch (_) { textStyle(BOLD); } textAlign(CENTER, CENTER); noStroke();   // p5 2.3.4: textStyle(BOLD) after textWeight() freezes textSize, so use textWeight
    const pulse = 0.8 + 0.2 * Math.sin(t * 8);
    for (const [blur, col] of [[40, 'rgba(40,110,255,0.9)'], [20, 'rgba(90,170,255,0.9)'], [8, 'rgba(190,230,255,1)']]) {
      drawingContext.shadowColor = col; drawingContext.shadowBlur = blur * pulse; fill(235, 248, 255);
      textSize(64); text('GREAT', 0, -34); text('JOB!', 10, 30);
    }
    drawingContext.shadowBlur = 0; fill(255); textSize(64); text('GREAT', 0, -34); text('JOB!', 10, 30);
    pop();
  }

  // ---- after everything is drawn (before the DOT-UI scanlines): impact frame, then glitch ----
  function applyPostFx() {
    const cv = drawingContext.canvas, ctx = drawingContext, w = cv.width, h = cv.height, since = now() - impactT;
    if (impactNow > 0 || (CFG.impact && since < CFG.impactBleed)) {
      ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0);
      if (impactNow > 0) {
        if (impactNow === 2) { ctx.globalCompositeOperation = 'difference'; ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, w, h); }
        ctx.globalCompositeOperation = 'saturation'; ctx.fillStyle = '#808080'; ctx.fillRect(0, 0, w, h);
        ctx.globalCompositeOperation = 'source-over'; ctx.fillStyle = impactNow === 2 ? 'rgba(0,0,0,0.25)' : 'rgba(255,255,255,0.08)'; ctx.fillRect(0, 0, w, h);
        impactNow--;
      } else { ctx.globalAlpha = 1 - since / CFG.impactBleed; ctx.globalCompositeOperation = 'saturation'; ctx.fillStyle = '#808080'; ctx.fillRect(0, 0, w, h); }
      ctx.restore();
    }
    if (!CFG.glitch || glitchAmt < 0.03) return;
    if (!bufs) bufs = [document.createElement('canvas'), document.createElement('canvas'), document.createElement('canvas')];
    for (const b of bufs) { if (b.width !== w || b.height !== h) { b.width = w; b.height = h; } }
    const [buf, red, cyan] = bufs, g = glitchAmt, k = w / width;
    const bc = buf.getContext('2d'); bc.globalCompositeOperation = 'source-over'; bc.globalAlpha = 1; bc.drawImage(cv, 0, 0);
    const rc = red.getContext('2d'); rc.globalCompositeOperation = 'source-over'; rc.drawImage(buf, 0, 0); rc.globalCompositeOperation = 'multiply'; rc.fillStyle = 'rgb(255,0,40)'; rc.fillRect(0, 0, w, h);
    const cc = cyan.getContext('2d'); cc.globalCompositeOperation = 'source-over'; cc.drawImage(buf, 0, 0); cc.globalCompositeOperation = 'multiply'; cc.fillStyle = 'rgb(0,255,255)'; cc.fillRect(0, 0, w, h);
    ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1;
    const split = CFG.rgbSplit * g * k;
    ctx.globalCompositeOperation = 'source-over'; ctx.fillStyle = '#000'; ctx.fillRect(0, 0, w, h);
    ctx.globalCompositeOperation = 'lighter'; ctx.drawImage(red, split, 0); ctx.drawImage(cyan, -split, 0);
    const rnd = seeded(Math.floor(millis() / 50) * 977 + 13), n = Math.ceil(CFG.tearSlices * g);
    for (let i = 0; i < n; i++) {
      const y = rnd() * h, sh = (5 + rnd() * 46 * g) * k, ox = (rnd() - 0.5) * 2 * 70 * g * k;
      ctx.globalCompositeOperation = rnd() < 0.3 ? 'lighter' : 'source-over';
      ctx.drawImage(rnd() < 0.3 ? cyan : buf, 0, y, w, sh, ox, y, w, sh);
    }
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 2; i++) { ctx.fillStyle = `rgba(110,255,255,${0.1 * g})`; ctx.fillRect(0, rnd() * h, w, (2 + rnd() * 3) * k); }
    if (g > 0.55) { ctx.fillStyle = `rgba(255,255,255,${0.07 * g})`; ctx.fillRect(0, 0, w, h); }
    ctx.restore();
  }

  return {
    CFG, config, hooks, combo,
    glitch, impactFrame, shake, freeze, frozen, stun, tickStun, vib, update, applyShake,
    comboAdd, drawCombo, greatJob, drawGreatJob, applyPostFx,
    get glitchAmount() { return glitchAmt; }, set glitchAmount(v) { glitchAmt = v; },
    VERSION: '1.0.0',
  };
})();
