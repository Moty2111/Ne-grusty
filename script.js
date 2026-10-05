const canvas = document.getElementById('sky');
const ctx = canvas.getContext('2d');
const TAU = Math.PI * 2;
const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const coarse = window.matchMedia('(pointer: coarse)').matches;
const hasGsap = typeof window.gsap !== 'undefined';

const rnd = (a, b) => a + Math.random() * (b - a);
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const TINTS = ['255,255,255', '214,226,255', '255,231,208', '228,210,255', '204,238,255'];
const WARM = ['255,244,224', '255,255,255', '226,236,255'];

const INTRO_DUR = 4.2;
const DROPS = [{ x: 0.30, at: 0.5 }, { x: 0.52, at: 1.15 }, { x: 0.70, at: 1.8 }];

let vw = 0, vh = 0, horizon = 0, shore = 0, figX = 0, moonX = 0, moonY = 0, moonDim = 1;
let stars = [], paths = [], freed = [], streaks = [], seaRows = [];
let ripples = [], splash = [], ascents = [], waves = [];
let introOn = !reduced, introStart = 0, revealed = false, nextShoot = 4;

function makePath(raw, cx, cy, size, rot) {
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (const p of raw) {
    if (p[0] < minX) minX = p[0];
    if (p[0] > maxX) maxX = p[0];
    if (p[1] < minY) minY = p[1];
    if (p[1] > maxY) maxY = p[1];
  }
  const s = Math.min(size / (maxX - minX || 1), size / (maxY - minY || 1));
  const cos = Math.cos(rot), sin = Math.sin(rot);
  return raw.map((p) => {
    const nx = (p[0] - (minX + maxX) / 2) * s;
    const ny = (p[1] - (minY + maxY) / 2) * s;
    return [cx + nx * cos - ny * sin, cy + nx * sin + ny * cos];
  });
}

function heartRaw() {
  const p = [];
  for (let i = 0; i < 30; i++) {
    const t = (i / 30) * TAU;
    const x = 16 * Math.pow(Math.sin(t), 3);
    const y = -(13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t));
    p.push([x, y]);
  }
  return p;
}
function waveRaw() {
  const p = [];
  for (let i = 0; i < 8; i++) {
    const x = (i / 7) * 2 - 1;
    p.push([x, -Math.sin(x * Math.PI * 1.35) * 0.34]);
  }
  return p;
}
function spiralRaw() {
  const p = [];
  for (let i = 0; i < 26; i++) {
    const a = i * 0.44, r = 0.04 + i * 0.042;
    p.push([Math.cos(a) * r * 2.2, -Math.sin(a) * r * 2.2]);
  }
  return p;
}
function houseRaw() {
  return [[-1, 1], [-1, -0.1], [0, -1.08], [1, -0.1], [1, 1]];
}

function buildSky() {
  const rect = canvas.getBoundingClientRect();
  vw = Math.round(rect.width) || window.innerWidth;
  vh = Math.round(rect.height) || window.innerHeight;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.round(vw * dpr);
  canvas.height = Math.round(vh * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  const u = Math.min(vw, vh);
  const wide = vw > 780;
  horizon = vh * (coarse ? 0.66 : 0.72);
  shore = vh - (coarse ? 34 : 46);
  figX = wide ? vw * 0.115 : vw * 0.5;
  moonX = wide ? vw * 0.815 : vw * 0.5;
  moonY = wide ? vh * 0.16 : horizon - u * 0.13;
  moonDim = wide ? 1 : 0.5;
  for (const d of DROPS) d.done = false;

  seaRows = [];
  for (let i = 0; i < 34; i++) {
    const k = i / 34;
    seaRows.push({
      k,
      seed: rnd(0, TAU),
      len: rnd(9, 24) + k * 64,
      step: rnd(34, 74) + k * 86,
      speed: rnd(5, 13) + k * 16,
      a: rnd(0.45, 1)
    });
  }

  const density = coarse ? 13000 : 8000;
  const count = Math.round(clamp((vw * vh) / density, coarse ? 70 : 110, coarse ? 190 : 300));
  stars = Array.from({ length: count }, () => ({
    x: rnd(0, vw), y: rnd(0, horizon),
    r: rnd(0.35, 1.55),
    a: rnd(0.2, 0.95),
    tw: rnd(0.35, 1.7),
    ph: rnd(0, TAU),
    tint: pick(TINTS),
    glow: Math.random() < (coarse ? 0.12 : 0.17)
  }));

  if (wide) {
    paths = [
      {
        p: makePath(heartRaw(), vw * 0.2, horizon * 0.42, u * 0.19, 0),
        closed: true, tint: '255,224,196', label: 'катя'
      },
      {
        p: makePath(waveRaw(), vw * 0.84, horizon * 0.3, u * 0.24, -0.12),
        closed: false, tint: '210,226,255'
      },
      {
        p: makePath(houseRaw(), vw * 0.855, horizon * 0.62, u * 0.15, 0),
        closed: true, tint: '226,208,255'
      },
      {
        p: makePath(spiralRaw(), vw * 0.13, horizon * 0.6, u * 0.2, 0),
        closed: false, tint: '204,238,255'
      }
    ];
  } else {
    paths = [
      {
        p: makePath(heartRaw(), vw * 0.5, horizon * 0.3, u * 0.2, 0),
        closed: true, tint: '255,224,196', label: 'катя'
      },
      {
        p: makePath(waveRaw(), vw * 0.86, horizon * 0.15, u * 0.18, -0.12),
        closed: false, tint: '210,226,255'
      },
      {
        p: makePath(houseRaw(), vw * 0.18, horizon * 0.26, u * 0.13, 0),
        closed: true, tint: '226,208,255'
      },
      {
        p: makePath(spiralRaw(), vw * 0.82, horizon * 0.26, u * 0.16, 0),
        closed: false, tint: '204,238,255'
      }
    ];
  }

  freed = freed.filter((f) => f.x > -40 && f.x < vw + 40 && f.y > -40 && f.y < vh + 40);
}

function star(x, y, r, alpha, tint, glow) {
  if (alpha <= 0.002 || r <= 0) return;
  if (glow) {
    const g = ctx.createRadialGradient(x, y, 0, x, y, r * 7);
    g.addColorStop(0, 'rgba(' + tint + ',' + (alpha * 0.5).toFixed(3) + ')');
    g.addColorStop(1, 'rgba(' + tint + ',0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, r * 7, 0, TAU);
    ctx.fill();
  }
  ctx.fillStyle = 'rgba(' + tint + ',' + Math.min(1, alpha).toFixed(3) + ')';
  ctx.beginPath();
  ctx.arc(x, y, r, 0, TAU);
  ctx.fill();
}

function drawLabel(text, x, y, tint) {
  const size = 13;
  ctx.font = '400 ' + size + 'px "Manrope", sans-serif';
  ctx.fillStyle = 'rgba(' + tint + ',.42)';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const gap = size * 0.52;
  let cx = x - (text.length * gap) / 2 + gap / 2;
  for (const ch of text) {
    ctx.fillText(ch, cx, y);
    cx += gap;
  }
}

function pathLines(path, alpha, t) {
  const pts = path.p;
  ctx.lineWidth = 1;
  ctx.strokeStyle = 'rgba(' + path.tint + ',' + alpha.toFixed(3) + ')';
  ctx.beginPath();
  ctx.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
  if (path.closed) ctx.closePath();
  ctx.stroke();

  pts.forEach((p, k) => {
    const pulse = reduced ? 0.7 : 0.55 + 0.35 * Math.sin(t * 1.1 + k * 0.6);
    star(p[0], p[1], 1.9, pulse * 0.8, path.tint, true);
  });
}

function drawPath(path, t) {
  const pts = path.p;
  pathLines(path, 0.13, t);

  const seg = [];
  let total = 0;
  for (let i = 1; i < pts.length; i++) {
    const len = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
    seg.push(len);
    total += len;
  }
  const head = (t * 0.06 + 0.4) % 1;
  let pos = head * total, i = 0;
  while (i < seg.length - 1 && pos > seg[i]) { pos -= seg[i]; i++; }
  const f = pos / (seg[i] || 1);
  const hx = pts[i][0] + (pts[i + 1][0] - pts[i][0]) * f;
  const hy = pts[i][1] + (pts[i + 1][1] - pts[i][1]) * f;

  if (!reduced) {
    star(hx, hy, 2.6, Math.max(0.15, Math.sin(head * Math.PI) * 0.9), '255,255,255', true);
  }

  if (path.label) {
    let minX = Infinity, maxX = -Infinity;
    for (const p of pts) {
      if (p[0] < minX) minX = p[0];
      if (p[0] > maxX) maxX = p[0];
    }
    drawLabel(path.label, (minX + maxX) / 2, pts[0][1] - 34, path.tint);
  }
}

function spawnStreak() {
  streaks.push({
    x: rnd(vw * 0.1, vw * 0.92),
    y: rnd(-20, horizon * 0.5),
    vx: rnd(-1, 1) * (140 + Math.random() * 140),
    vy: rnd(55, 115),
    age: 0,
    life: 1.1
  });
}

function drawStreak(s) {
  const k = 1 - s.age / s.life;
  const len = 130;
  const n = Math.hypot(s.vx, s.vy) || 1;
  const g = ctx.createLinearGradient(s.x, s.y, s.x - (s.vx / n) * len, s.y - (s.vy / n) * len);
  g.addColorStop(0, 'rgba(255,255,255,' + (0.75 * k).toFixed(3) + ')');
  g.addColorStop(0.35, 'rgba(206,226,255,' + (0.28 * k).toFixed(3) + ')');
  g.addColorStop(1, 'rgba(206,226,255,0)');
  ctx.strokeStyle = g;
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(s.x, s.y);
  ctx.lineTo(s.x - (s.vx / n) * len, s.y - (s.vy / n) * len);
  ctx.stroke();
  star(s.x, s.y, 2, 0.9 * k, '255,255,255', true);
}

function touch(x, y, onWater) {
  ripples.push({
    x, y, age: 0,
    life: onWater ? 2.8 : 2.1,
    r0: 5,
    grow: onWater ? 160 : 118,
    alpha: onWater ? 0.85 : 0.62,
    squash: onWater ? 0.22 : 0.2
  });
  const n = onWater ? 8 : 5;
  for (let i = 0; i < n; i++) {
    splash.push({
      x, y,
      vx: rnd(-110, 110),
      vy: rnd(-170, -60),
      r: rnd(0.9, 2.4),
      age: 0,
      life: rnd(0.45, 0.9)
    });
  }
}

function drawRipple(rp) {
  const k = clamp(rp.age / rp.life, 0, 1);
  const e = 1 - Math.pow(1 - k, 2.4);
  const R = rp.r0 + e * rp.grow;
  const a = Math.max(0, 1 - k * k) * rp.alpha;
  if (a <= 0.002) return;

  ctx.save();
  ctx.translate(rp.x, rp.y);
  ctx.scale(1, rp.squash);

  const g = ctx.createRadialGradient(0, 0, R * 0.5, 0, 0, R);
  g.addColorStop(0, 'rgba(150,190,255,0)');
  g.addColorStop(0.82, 'rgba(190,215,255,' + (a * 0.1).toFixed(3) + ')');
  g.addColorStop(1, 'rgba(210,230,255,0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(0, 0, R, 0, TAU);
  ctx.fill();

  ctx.strokeStyle = 'rgba(215,232,255,' + (a * 0.55).toFixed(3) + ')';
  ctx.lineWidth = 1.1;
  ctx.beginPath();
  ctx.arc(0, 0, R, 0, TAU);
  ctx.stroke();

  ctx.strokeStyle = 'rgba(255,255,255,' + (a * 0.18).toFixed(3) + ')';
  ctx.beginPath();
  ctx.arc(0, 0, R * 0.78, 0, TAU);
  ctx.stroke();

  ctx.restore();
}

function drawSplash(s) {
  const a = Math.max(0, 1 - s.age / s.life) * 0.85;
  star(s.x, s.y, s.r * (1 - s.age / s.life * 0.4), a, '226,238,255', false);
}

function bez(p0, p1, p2, t) {
  const u = 1 - t;
  return [
    u * u * p0[0] + 2 * u * t * p1[0] + t * t * p2[0],
    u * u * p0[1] + 2 * u * t * p1[1] + t * t * p2[1]
  ];
}

function drawAscent(a, t) {
  const k = clamp(a.age / a.life, 0, 1);
  const ease = 1 - Math.pow(1 - k, 1.6);

  for (let i = 8; i >= 1; i--) {
    const tk = ease - i * 0.032;
    if (tk <= 0) continue;
    const p = bez(a.p0, a.p1, a.p2, tk);
    star(p[0], p[1], 3.2 * (1 - i / 10), (1 - i / 9) * 0.3 * (1 - k * 0.25), '255,246,228', true);
  }

  const p = bez(a.p0, a.p1, a.p2, ease);
  const r = 5.2 + Math.sin(t * 2.2) * 0.35;

  const g = ctx.createRadialGradient(p[0], p[1], 0, p[0], p[1], r * 9);
  g.addColorStop(0, 'rgba(255,250,238,.65)');
  g.addColorStop(0.35, 'rgba(210,230,255,.22)');
  g.addColorStop(1, 'rgba(180,205,255,0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(p[0], p[1], r * 9, 0, TAU);
  ctx.fill();

  ctx.fillStyle = 'rgba(255,252,245,.95)';
  ctx.beginPath();
  ctx.arc(p[0], p[1], r, 0, TAU);
  ctx.fill();

  ctx.fillStyle = 'rgba(255,255,255,.7)';
  ctx.beginPath();
  ctx.arc(p[0] - r * 0.3, p[1] - r * 0.35, r * 0.34, 0, TAU);
  ctx.fill();

  if (!reduced) {
    for (let i = 0; i < 3; i++) {
      const ang = t * 1.8 + (i * TAU) / 3;
      const rr = r * 2.6 + Math.sin(t * 3 + i) * 2;
      star(p[0] + Math.cos(ang) * rr, p[1] + Math.sin(ang) * rr * 0.6, 1.2, 0.5, '255,240,214', false);
    }
  }
}

function drawMoon(t) {
  const r = Math.min(vw, vh) * 0.03;

  const glow = ctx.createRadialGradient(moonX, moonY, r * 0.3, moonX, moonY, r * 10);
  glow.addColorStop(0, 'rgba(255,244,220,' + (0.34 * moonDim).toFixed(3) + ')');
  glow.addColorStop(0.35, 'rgba(226,224,255,' + (0.1 * moonDim).toFixed(3) + ')');
  glow.addColorStop(1, 'rgba(210,220,255,0)');
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(moonX, moonY, r * 10, 0, TAU);
  ctx.fill();

  ctx.globalAlpha = 0.55 + 0.45 * moonDim;
  const disc = ctx.createRadialGradient(moonX, moonY - r * 0.3, r * 0.1, moonX, moonY, r);
  disc.addColorStop(0, 'rgba(255,253,246,.96)');
  disc.addColorStop(0.7, 'rgba(248,240,222,.9)');
  disc.addColorStop(1, 'rgba(226,222,214,.7)');
  ctx.fillStyle = disc;
  ctx.beginPath();
  ctx.arc(moonX, moonY, r, 0, TAU);
  ctx.fill();
  ctx.globalAlpha = 1;
  void t;
}

function drawSea(t, fade) {
  const h = horizon;

  const body = ctx.createLinearGradient(0, h, 0, vh);
  body.addColorStop(0, 'rgba(60,82,178,' + (0.16 * fade).toFixed(3) + ')');
  body.addColorStop(0.14, 'rgba(24,34,96,' + (0.24 * fade).toFixed(3) + ')');
  body.addColorStop(0.55, 'rgba(8,12,44,' + (0.32 * fade).toFixed(3) + ')');
  body.addColorStop(1, 'rgba(2,4,16,' + (0.5 * fade).toFixed(3) + ')');
  ctx.fillStyle = body;
  ctx.fillRect(0, h, vw, vh - h);

  const colW = Math.min(150, vw * 0.24);
  const col = ctx.createLinearGradient(moonX - colW, 0, moonX + colW, 0);
  col.addColorStop(0, 'rgba(255,236,200,0)');
  col.addColorStop(0.5, 'rgba(255,238,208,' + (0.1 * fade).toFixed(3) + ')');
  col.addColorStop(1, 'rgba(255,236,200,0)');
  ctx.fillStyle = col;
  ctx.fillRect(moonX - colW, h, colW * 2, shore - h);

  for (const r of seaRows) {
    const y = h + Math.pow(r.k, 1.9) * (shore - h) + Math.sin(t * 0.7 + r.seed * 3) * 1.6;
    const off = (((t * r.speed) + r.seed * 60) % r.step + r.step) % r.step;
    const wob = Math.sin(t * 0.55 + r.seed) * (2 + r.k * 16);
    const a = 0.06 * r.a * fade * Math.pow(1 - r.k * 0.72, 0.8);
    for (let x = -r.step; x < vw + r.step; x += r.step) {
      const px = x + off + wob;
      const warm = Math.max(0, 1 - Math.abs(px - moonX) / (colW + 60));
      ctx.fillStyle = 'rgba(' +
        Math.round(206 + warm * 49) + ',' +
        Math.round(224 + warm * 14) + ',255,' +
        (a * (1 + warm * 1.3)).toFixed(3) + ')';
      ctx.fillRect(px, y, r.len * (0.55 + 0.6 * Math.abs(Math.sin(t * 0.9 + r.seed))), 1 + r.k * 1.1);
    }
  }

  const haze = ctx.createLinearGradient(0, h - 2, 0, h + 24);
  haze.addColorStop(0, 'rgba(180,204,255,' + (0.16 * fade).toFixed(3) + ')');
  haze.addColorStop(1, 'rgba(180,204,255,0)');
  ctx.fillStyle = haze;
  ctx.fillRect(0, h - 2, vw, 26);

  const line = ctx.createLinearGradient(0, 0, vw, 0);
  line.addColorStop(0, 'rgba(190,212,255,0)');
  line.addColorStop(0.5, 'rgba(206,224,255,' + (0.3 * fade).toFixed(3) + ')');
  line.addColorStop(1, 'rgba(190,212,255,0)');
  ctx.fillStyle = line;
  ctx.fillRect(0, h, vw, 1);
}

function drawShore(fade) {
  const y = shore;
  const g = ctx.createLinearGradient(0, y - 14, 0, vh);
  g.addColorStop(0, 'rgba(6,9,28,' + (0.35 * fade).toFixed(3) + ')');
  g.addColorStop(0.35, 'rgba(3,5,18,' + (0.88 * fade).toFixed(3) + ')');
  g.addColorStop(1, 'rgba(2,3,12,1)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(0, vh);
  ctx.lineTo(0, y + 10);
  ctx.quadraticCurveTo(vw * 0.28, y - 8, vw * 0.55, y + 4);
  ctx.quadraticCurveTo(vw * 0.82, y + 14, vw, y - 2);
  ctx.lineTo(vw, vh);
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = 'rgba(190,212,255,' + (0.16 * fade).toFixed(3) + ')';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, y + 10);
  ctx.quadraticCurveTo(vw * 0.28, y - 8, vw * 0.55, y + 4);
  ctx.quadraticCurveTo(vw * 0.82, y + 14, vw, y - 2);
  ctx.stroke();
}

function figurePath(ctx2) {
  ctx2.beginPath();
  ctx2.arc(0, -46, 4.3, 0, TAU);
  ctx2.moveTo(-2.6, -42.5);
  ctx2.quadraticCurveTo(-8.4, -39.5, -9.6, -27);
  ctx2.quadraticCurveTo(-10.8, -16, -8.2, -6.5);
  ctx2.lineTo(8.2, -6.5);
  ctx2.quadraticCurveTo(10.8, -16, 9.6, -27);
  ctx2.quadraticCurveTo(8.4, -39.5, 2.6, -42.5);
  ctx2.closePath();
}

function drawFigure(fade, breathe) {
  if (fade <= 0.01) return;
  const h = (coarse ? 48 : 66) * (1 + Math.sin(breathe) * 0.006);
  const s = h / 54;

  ctx.save();
  ctx.globalAlpha = 0.15 * fade;
  ctx.translate(figX, shore + 2);
  ctx.scale(s, -s * 0.45);
  ctx.fillStyle = 'rgba(4,7,22,1)';
  figurePath(ctx);
  ctx.fill();
  ctx.restore();

  ctx.save();
  ctx.globalAlpha = 0.97 * fade;
  ctx.translate(figX, shore + 2);
  ctx.scale(s, s);
  const rim = ctx.createLinearGradient(8.5, -50, 14, -6);
  rim.addColorStop(0, 'rgba(46,62,120,1)');
  rim.addColorStop(0.5, 'rgba(12,18,46,1)');
  rim.addColorStop(1, 'rgba(3,5,16,1)');
  ctx.fillStyle = 'rgba(3,5,16,1)';
  figurePath(ctx);
  ctx.fill();
  ctx.fillStyle = rim;
  ctx.fill();
  ctx.fillStyle = 'rgba(3,5,16,1)';
  ctx.beginPath();
  ctx.moveTo(-4.4, -43.5);
  ctx.quadraticCurveTo(-6.4, -33, -5.4, -26);
  ctx.quadraticCurveTo(-2, -32, -1.2, -43);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  const g = ctx.createRadialGradient(figX, shore + 4, 0, figX, shore + 4, h * 1.5);
  g.addColorStop(0, 'rgba(178,204,255,' + (0.16 * fade).toFixed(3) + ')');
  g.addColorStop(0.5, 'rgba(160,190,255,' + (0.05 * fade).toFixed(3) + ')');
  g.addColorStop(1, 'rgba(170,198,255,0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.ellipse(figX, shore + 4, h * 1.5, h * 0.42, 0, 0, TAU);
  ctx.fill();
}

function drawDrops(it) {
  for (const d of DROPS) {
    const local = it - d.at;
    const x = vw * d.x;
    if (local >= 0 && local < 0.55) {
      const k = local / 0.55;
      const y = -40 + (horizon + 46) * (k * k * 0.35 + k * 0.65);
      const vy = (horizon + 46) * (k * 0.35 + k * 0.65) / 0.55;
      const stretch = clamp(3.4 + vy * 0.012, 3.4, 7.5);
      const g = ctx.createRadialGradient(x, y, 0, x, y, stretch * 5);
      g.addColorStop(0, 'rgba(220,236,255,.35)');
      g.addColorStop(1, 'rgba(220,236,255,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(x, y, stretch * 5, 0, TAU);
      ctx.fill();

      ctx.fillStyle = 'rgba(232,242,255,.95)';
      ctx.beginPath();
      ctx.ellipse(x, y, stretch * 0.55, stretch, 0, 0, TAU);
      ctx.fill();
    } else if (local >= 0.55 && !d.done) {
      d.done = true;
      touch(x, horizon, true);
    }
  }
}

function drawHint(it) {
  const a = clamp((it - 2.2) / 0.4, 0, 1) * (1 - clamp((it - 2.85) / 0.45, 0, 1));
  if (a <= 0.01) return;
  const text = 'коснись воды';
  ctx.font = '300 12px "Manrope", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = 'rgba(226,232,255,' + (0.55 * a).toFixed(3) + ')';
  const gap = 7;
  let cx = vw / 2 - (text.length * gap) / 2 + gap / 2;
  for (const ch of text) {
    ctx.fillText(ch, cx, horizon - 44);
    cx += gap;
  }
}

function frame(now) {
  const t = now / 1000;
  const dt = Math.min((now - (frame.last || now)) / 1000, 0.05);
  frame.last = now;

  ctx.clearRect(0, 0, vw, vh);

  const it = introOn ? t - introStart : 99;
  const sceneIn = introOn ? clamp(it / 0.6, 0, 1) : 1;
  const skyIn = introOn ? clamp((it - 2.35) / 1.25, 0, 1) : 1;
  const figIn = introOn ? clamp((it - 3.1) / 1.0, 0, 1) : 1;

  for (const s of stars) {
    const a = (reduced ? s.a * 0.8 : s.a * (0.55 + 0.45 * Math.sin(t * s.tw + s.ph))) * skyIn;
    star(s.x, s.y, s.r, a, s.tint, s.glow);
  }

  drawMoon(t);
  if (skyIn > 0.02) {
    for (const p of paths) drawPath(p, t);
    for (const f of freed) {
      const k = Math.min(f.age / 1.6, 1) * Math.max(0, 1 - Math.max(0, f.age - (f.life - 7)) / 7);
      const tw = reduced ? 1 : 0.82 + 0.18 * Math.sin(t * 1.3 + f.x);
      star(f.x, f.y, f.r * tw, Math.max(0, k) * 0.95 * skyIn, f.tint, true);
    }
  }

  drawSea(t, sceneIn);

  if (skyIn > 0.15 && !reduced) {
    ctx.save();
    ctx.globalAlpha = 0.11 * skyIn * sceneIn;
    ctx.translate(Math.sin(t * 0.8) * 2.5, horizon * 2);
    ctx.scale(1, -1);
    for (const p of paths) pathLines(p, 0.1, t);
    ctx.restore();
  }

  drawShore(sceneIn);
  drawFigure(figIn, t * 0.9);

  if (introOn) {
    drawDrops(it);
    drawHint(it);
  }

  if (skyIn > 0.55 && !reduced && t > nextShoot) {
    nextShoot = t + rnd(4.5, 11);
    spawnStreak();
  }
  streaks = streaks.filter((s) => (s.age += dt) < s.life);
  for (const s of streaks) {
    s.x += s.vx * dt;
    s.y += s.vy * dt;
    drawStreak(s);
  }

  ripples = ripples.filter((r) => (r.age += dt) < r.life);
  for (const r of ripples) drawRipple(r);

  splash = splash.filter((s) => {
    s.age += dt;
    s.x += s.vx * dt;
    s.y += s.vy * dt;
    s.vy += 620 * dt;
    return s.age < s.life;
  });
  for (const s of splash) drawSplash(s);

  ascents = ascents.filter((a) => {
    a.age += dt;
    return a.age < a.life;
  });
  for (const a of ascents) drawAscent(a, t);

  waves = waves.filter((w) => (w.age += dt) < w.life);
  for (const w of waves) drawRipple(w);

  freed = freed.filter((f) => {
    f.age += dt;
    f.x += f.vx * dt;
    f.y += f.vy * dt;
    return f.age < f.life;
  });

  if (introOn && it >= INTRO_DUR) {
    introOn = false;
    reveal();
  }

  requestAnimationFrame(frame);
}

function reveal() {
  if (revealed) return;
  revealed = true;
  document.body.classList.remove('pre-intro');
  if (hasGsap) {
    gsap.from('.reveal', {
      y: 24,
      opacity: 0,
      duration: 1.15,
      ease: 'power3.out',
      stagger: 0.09,
      delay: 0.2
    });
  } else {
    document.body.classList.add('no-gsap');
  }
}

let resizeTimer = 0;
window.addEventListener('resize', () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(buildSky, 160);
});

function onTap(e) {
  touch(e.clientX, e.clientY, introOn && e.clientY > horizon * 0.7);
}

if (window.PointerEvent) {
  canvas.addEventListener('pointerdown', onTap, { passive: true });
} else {
  canvas.addEventListener('touchstart', (e) => {
    const p = e.changedTouches[0];
    onTap({ clientX: p.clientX, clientY: p.clientY });
  }, { passive: true });
}

const form = document.getElementById('releaseForm');
const input = document.getElementById('releaseInput');
const counter = document.getElementById('releaseCount');
const card = document.querySelector('.card');
let letGo = 0;

function skyPoint() {
  const r = card.getBoundingClientRect();
  for (let i = 0; i < 60; i++) {
    const x = rnd(0.05, 0.95) * vw;
    const y = rnd(0.05, 0.62) * horizon;
    if (x < r.left - 10 || x > r.right + 10 || y < r.top - 10) return [x, y];
  }
  return [rnd(0.05, 0.95) * vw, Math.max(16, r.top - 34)];
}

function becomeStar(x, y) {
  waves.push({ x, y, age: 0, life: 1.6, r0: 8, grow: 200, alpha: 0.9, squash: 0.5 });
  for (let i = 0; i < 14; i++) {
    const a = (i / 14) * TAU + rnd(-0.2, 0.2);
    const sp = rnd(70, 220);
    splash.push({
      x, y,
      vx: Math.cos(a) * sp,
      vy: Math.sin(a) * sp * 0.6 - 40,
      r: rnd(0.9, 2.2),
      age: 0,
      life: rnd(0.6, 1.3)
    });
  }
  freed.push({
    x, y,
    r: rnd(1.8, 2.6),
    age: 0,
    life: 26,
    vx: rnd(-7, 7),
    vy: rnd(-13, -5),
    tint: pick(WARM)
  });
}

function send(text) {
  const box = input.getBoundingClientRect();
  const sx = box.left + box.width / 2;
  const sy = box.top + box.height / 2;
  const target = skyPoint();
  const tx = target[0];
  const ty = target[1];

  const el = document.createElement('p');
  el.className = 'fly';
  el.textContent = text;
  el.style.left = sx + 'px';
  el.style.top = sy + 'px';
  document.body.appendChild(el);

  letGo += 1;
  const note = letGo === 1
    ? 'отпустила — она уже летит наверх'
    : letGo < 5
      ? 'отпущено мыслей: ' + letGo + '. звёзды считают'
      : 'отпущено ' + letGo + ' мыслей. всё тёплое осталось';
  counter.textContent = note;
  if (hasGsap) gsap.fromTo(counter, { opacity: 0.15, y: 5 }, { opacity: 1, y: 0, duration: 0.8, ease: 'power2.out' });

  const startAscent = () => {
    ascents.push({
      p0: [sx, sy - 40],
      p1: [(sx + tx) / 2 + rnd(-120, 120), (sy + ty) / 2 - rnd(20, 90)],
      p2: [tx, ty],
      age: 0,
      life: 2.9
    });
  };

  if (hasGsap) {
    gsap.set(el, { xPercent: -50, yPercent: -50, opacity: 0, scale: 0.92 });
    gsap.timeline()
      .to(el, { opacity: 1, duration: 0.5, ease: 'power1.out' })
      .to(el, { y: -34, scale: 1.06, letterSpacing: '0.06em', duration: 0.7, ease: 'sine.out' }, 0.1)
      .to(el, { y: -104, scale: 0.78, opacity: 0, letterSpacing: '0.5em', duration: 0.95, ease: 'power2.in' }, 0.72)
      .call(() => {
        el.remove();
        startAscent();
      });
  } else {
    el.style.opacity = '0';
    el.style.transition = 'opacity .5s ease, transform .75s ease .1s, letter-spacing .95s ease .72s';
    requestAnimationFrame(() => {
      el.style.opacity = '1';
      el.style.transform = 'translate(-50%,-50%) translateY(-34px) scale(1.06)';
    });
    setTimeout(() => {
      el.style.opacity = '0';
      el.style.transform = 'translate(-50%,-50%) translateY(-104px) scale(.78)';
      el.style.letterSpacing = '0.5em';
    }, 820);
    setTimeout(() => {
      el.remove();
      startAscent();
    }, 1700);
  }
}

form.addEventListener('submit', (e) => {
  e.preventDefault();
  const value = input.value.trim();
  if (!value) {
    form.classList.remove('shake');
    void form.offsetWidth;
    form.classList.add('shake');
    return;
  }
  send(value);
  input.value = '';
  input.blur();
});

buildSky();
introStart = performance.now() / 1000;
requestAnimationFrame(frame);

if (reduced) {
  reveal();
} else {
  setTimeout(reveal, 5400);
}