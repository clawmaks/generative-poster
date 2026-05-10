import p5 from 'p5';
import GUI from 'lil-gui';
import p5plot from 'p5.plotsvg';
import { Delaunay } from 'd3-delaunay';
import { contours } from 'd3-contour';
import { createNoise2D } from 'simplex-noise';
import './style.css';

const W = 288; // 3in @ 96dpi
const H = 288; // 3in @ 96dpi
const M = 24;
const BASE_URL = import.meta.env.BASE_URL;
const assetUrl = (path) => `${BASE_URL}${path.replace(/^\//, '')}`;
const state = { seed: 12345, generatorId: 'random-walk', exportSvg: false, params: {} };
let gui;
let referenceImage;
const simplex = createNoise2D(() => seededRandom(state.seed + 99));

const generators = [
  { id: 'random-walk', name: '01 Random Walk', defaults: { walkers: 9, steps: 260, step: 3.2, drift: 0.18, turnJitter: 1.05 }, controls: {
    walkers: [1, 80, 1], steps: [20, 360, 1], step: [1, 10, .25], drift: [-1, 1, .01], turnJitter: [0, 3.14, .01]
  }, draw: randomWalk },
  { id: 'l-systems', name: '02 L-Systems', defaults: { iterations: 4, angle: 28, length: 8.5, spread: 0.92 }, controls: {
    iterations: [1, 6, 1], angle: [5, 60, 1], length: [1, 8, .25], spread: [0.35, 1.4, .01]
  }, draw: lSystem },
  { id: 'spirals', name: '03 Spirals', defaults: { arms: 6, turns: 5.2, spacing: 2.2, wobble: 4, points: 420 }, controls: {
    arms: [1, 16, 1], turns: [1, 14, .1], spacing: [0.5, 6, .1], wobble: [0, 12, .25], points: [60, 1400, 1]
  }, draw: spirals },
  { id: 'contour-lines', name: '04 Contour Lines', defaults: { resolution: 96, thresholds: 12, scale: 0.014, warp: 0.35 }, controls: {
    resolution: [30, 150, 1], thresholds: [4, 36, 1], scale: [0.002, 0.025, .001], warp: [0, 2, .01]
  }, draw: contourLines },
  { id: 'voronoi', name: '05 Voronoi Diagram', defaults: { sites: 70, relax: 1, jitter: 0.55, circles: 0 }, controls: {
    sites: [10, 350, 1], relax: [0, 3, 1], jitter: [0, 1, .01], circles: [0, 1, 1]
  }, draw: voronoi },
  { id: 'delaunay', name: '06 Delaunay Triangulation', defaults: { points: 90, jitter: 0.85, prune: 0.15, longEdge: 62 }, controls: {
    points: [10, 260, 1], jitter: [0, 1, .01], prune: [0, .85, .01], longEdge: [20, 140, 1]
  }, draw: delaunayTriangles },
  { id: 'hatching', name: '07 Hatching / Parallel Lines', defaults: { spacing: 8, angle: -34, wave: 0, bands: 1 }, controls: {
    spacing: [3, 18, .5], angle: [-80, 80, 1], wave: [0, 20, .5], bands: [1, 12, 1]
  }, draw: hatching },
  { id: 'cross-hatching', name: '08 Cross Hatching', defaults: { spacing: 7, angle: 30, layers: 4, maskRadius: 0.82 }, controls: {
    spacing: [3, 18, .5], angle: [5, 70, 1], layers: [1, 5, 1], maskRadius: [.25, 1.2, .01]
  }, draw: crossHatching },
  { id: 'noise-fields', name: '09 Noise Fields', defaults: { agents: 280, steps: 48, scale: 0.024, step: 2.0, curl: 1.25 }, controls: {
    agents: [20, 1000, 1], steps: [10, 160, 1], scale: [0.002, 0.04, .001], step: [0.5, 6, .1], curl: [.2, 4, .1]
  }, draw: noiseFields },
  { id: 'attractors', name: '10 Attractor Systems', defaults: { particles: 1, steps: 5200, attractors: 2, force: 1.35, drag: 0.9 }, controls: {
    particles: [1, 80, 1], steps: [500, 9000, 100], attractors: [1, 4, 1], force: [.1, 4, .1], drag: [.65, .99, .01]
  }, draw: attractorSystems },
  { id: 'rosettes', name: '11 Rosettes', defaults: { petals: 8, rings: 5, radius: 86, modulation: 0.68, samples: 900 }, controls: {
    petals: [3, 24, 1], rings: [1, 14, 1], radius: [25, 125, 1], modulation: [0, .75, .01], samples: [80, 1200, 1]
  }, draw: rosettes },
  { id: 'epicycloids', name: '12 Epicycloids / Spirograph', defaults: { R: 42, r: 17, d: 42, repeats: 7, samples: 1200 }, controls: {
    R: [10, 90, 1], r: [4, 55, 1], d: [4, 90, 1], repeats: [1, 16, 1], samples: [200, 4000, 1]
  }, draw: epicycloids },
  { id: 'bezier-flow-fields', name: '13 Bezier Flow Fields', defaults: { curves: 68, scale: 0.010, length: 138, bend: 0.52 }, controls: {
    curves: [5, 260, 1], scale: [0.002, 0.04, .001], length: [10, 180, 1], bend: [0, 1.8, .01]
  }, draw: bezierFlowFields },
  { id: 'space-filling-curves', name: '14 Space Filling Curves', defaults: { order: 5, margin: 20, wobble: 0, skip: 1 }, controls: {
    order: [1, 7, 1], margin: [6, 60, 1], wobble: [0, 6, .25], skip: [1, 8, 1]
  }, draw: spaceFillingCurves },
  { id: 'image-trace', name: '15 Image Trace / Vectorize', defaults: { cell: 5, threshold: 160, maxLine: 10, angle: -18 }, controls: {
    cell: [3, 18, 1], threshold: [20, 240, 1], maxLine: [2, 14, .5], angle: [-80, 80, 1]
  }, draw: imageTrace }
];

const byId = Object.fromEntries(generators.map(g => [g.id, g]));

function seededRandom(seed) {
  let t = seed + 0x6D2B79F5;
  return function () {
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function setDefaults(g) { state.params = structuredClone(g.defaults); }
function current() { return byId[state.generatorId]; }
function redraw() { window.dispatchEvent(new Event('poster:redraw')); }

function setupUI() {
  const requestedGenerator = new URLSearchParams(window.location.search).get('generator');
  if (requestedGenerator && byId[requestedGenerator]) state.generatorId = requestedGenerator;
  const select = document.querySelector('#generatorSelect');
  for (const g of generators) {
    const option = document.createElement('option'); option.value = g.id; option.textContent = g.name; select.append(option);
  }
  select.value = state.generatorId;
  select.addEventListener('change', () => { state.generatorId = select.value; setDefaults(current()); rebuildGui(); redraw(); });
  document.querySelector('#randomSeed').addEventListener('click', () => { state.seed = Math.floor(Math.random() * 999999); redraw(); });
  document.querySelector('#exportSvg').addEventListener('click', () => { state.exportSvg = true; redraw(); });
  document.querySelector('#exportPng').addEventListener('click', () => { window.dispatchEvent(new Event('poster:png')); });
  setDefaults(current()); rebuildGui();
}

function rebuildGui() {
  if (gui) gui.destroy();
  gui = new GUI({ container: document.querySelector('#gui'), title: 'Knobs' });
  const g = current();
  Object.entries(g.controls).forEach(([key, range]) => gui.add(state.params, key, range[0], range[1], range[2]).name(key).onChange(redraw));
}

function sketch(p) {
  p.preload = () => { referenceImage = p.loadImage(assetUrl('reference-poster.jpg')); };
  p.setup = () => {
    p5.disableFriendlyErrors = true;
    p.createCanvas(W, H).parent('canvasWrap');
    p.pixelDensity(1); p.noLoop(); p.strokeJoin(p.ROUND); p.strokeCap(p.ROUND);
    if (p5plot.setSvgCoordinatePrecision) p5plot.setSvgCoordinatePrecision(3);
    if (p5plot.setSvgTransformPrecision) p5plot.setSvgTransformPrecision(4);
    window.addEventListener('poster:redraw', () => p.redraw());
    window.addEventListener('poster:png', () => p.saveCanvas(`${current().id}-${state.seed}`, 'png'));
    p.redraw();
  };
  p.draw = () => {
    p.randomSeed(state.seed); p.noiseSeed(state.seed);
    p.background('#fffdf7'); p.noFill(); p.stroke('#050505'); p.strokeWeight(1.2);
    if (state.exportSvg) {
      p5plot.setSvgDefaultStrokeColor?.('black');
      p5plot.setSvgDefaultStrokeWeight?.(1.2);
      p5plot.setSvgDocumentSize?.(W, H);
      p5plot.beginRecordSvg(p, `${current().id}-${state.seed}.svg`);
    }
    p.push(); current().draw(p, state.params); p.pop();
    if (state.exportSvg) { p5plot.endRecordSvg(); state.exportSvg = false; }
    drawFrame(p);
  };
}

function drawFrame(p) { p.push(); p.noFill(); p.stroke('#bdb3a3'); p.strokeWeight(1); p.rect(M / 2, M / 2, W - M, H - M); p.pop(); }
function bounds() { return { x0: M, y0: M, x1: W - M, y1: H - M, w: W - 2 * M, h: H - 2 * M }; }
function lineClip(p, x, y, len, angle) { const dx = Math.cos(angle) * len / 2, dy = Math.sin(angle) * len / 2; p.line(x - dx, y - dy, x + dx, y + dy); }
function lineInCircle(p, x, y, len, angle, cx, cy, r) {
  const ux = Math.cos(angle), uy = Math.sin(angle);
  const x0 = x - ux * len / 2, y0 = y - uy * len / 2;
  const x1 = x + ux * len / 2, y1 = y + uy * len / 2;
  const dx = x1 - x0, dy = y1 - y0, fx = x0 - cx, fy = y0 - cy;
  const a = dx * dx + dy * dy, bb = 2 * (fx * dx + fy * dy), cc = fx * fx + fy * fy - r * r;
  const disc = bb * bb - 4 * a * cc;
  if (disc < 0) return;
  const root = Math.sqrt(disc);
  let t0 = (-bb - root) / (2 * a), t1 = (-bb + root) / (2 * a);
  t0 = Math.max(0, t0); t1 = Math.min(1, t1);
  if (t1 <= t0) return;
  p.line(x0 + dx * t0, y0 + dy * t0, x0 + dx * t1, y0 + dy * t1);
}
function segmentClearOfCircle(x, y, len, angle, cx, cy, r) {
  const ux = Math.cos(angle), uy = Math.sin(angle);
  const x0 = x - ux * len / 2, y0 = y - uy * len / 2;
  const x1 = x + ux * len / 2, y1 = y + uy * len / 2;
  const dx = x1 - x0, dy = y1 - y0, denom = dx * dx + dy * dy;
  const t = denom === 0 ? 0 : Math.max(0, Math.min(1, ((cx - x0) * dx + (cy - y0) * dy) / denom));
  return Math.hypot(x0 + dx * t - cx, y0 + dy * t - cy) > r;
}
function lineInRect(p, x, y, len, angle, rect = bounds()) {
  let x0 = x - Math.cos(angle) * len / 2, y0 = y - Math.sin(angle) * len / 2;
  let x1 = x + Math.cos(angle) * len / 2, y1 = y + Math.sin(angle) * len / 2;
  let dx = x1 - x0, dy = y1 - y0, t0 = 0, t1 = 1;
  for (const [pp, qq] of [[-dx, x0 - rect.x0], [dx, rect.x1 - x0], [-dy, y0 - rect.y0], [dy, rect.y1 - y0]]) {
    if (pp === 0 && qq < 0) return;
    const r = qq / pp;
    if (pp < 0) { if (r > t1) return; if (r > t0) t0 = r; }
    else if (pp > 0) { if (r < t0) return; if (r < t1) t1 = r; }
  }
  p.line(x0 + t0 * dx, y0 + t0 * dy, x0 + t1 * dx, y0 + t1 * dy);
}
function polyline(p, pts, close = false) { if (pts.length < 2) return; p.beginShape(); for (const [x, y] of pts) p.vertex(x, y); if (close) p.endShape(p.CLOSE); else p.endShape(); }

function randomWalk(p, c) { const b = bounds(), cx = W / 2, cy = H / 2, rMax = b.w * .34; for (let i = 0; i < c.walkers; i++) { let x = cx + p.random(-14, 14), y = cy + p.random(-14, 14), a = p.random(p.TAU); p.beginShape(); for (let s = 0; s < c.steps; s++) { p.vertex(x, y); const dx = cx - x, dy = cy - y, d = Math.hypot(dx, dy), home = Math.atan2(dy, dx); a += p.random(-c.turnJitter, c.turnJitter) + c.drift * .08; if (d > rMax * .62) a = p.lerp(a, home, .28); x += Math.cos(a) * c.step; y += Math.sin(a) * c.step; const nd = Math.hypot(x - cx, y - cy); if (nd > rMax) { x = cx + (x - cx) / nd * rMax; y = cy + (y - cy) / nd * rMax; a = home + p.random(-.8, .8); } } p.endShape(); } }
function lSystem(p, c) { let sentence = 'F'; const rule = 'F[+F]F[-F][F]'; for (let i = 0; i < c.iterations; i++) sentence = sentence.replaceAll('F', rule); p.translate(W / 2, H - M); p.scale(c.spread, c.spread); p.rotate(-p.HALF_PI); const stack = []; const len = c.length; const ang = p.radians(c.angle); for (const ch of sentence.slice(0, 25000)) { if (ch === 'F') { p.line(0, 0, len, 0); p.translate(len, 0); } else if (ch === '+') p.rotate(ang); else if (ch === '-') p.rotate(-ang); else if (ch === '[') { p.push(); stack.push(1); } else if (ch === ']' && stack.pop()) p.pop(); } }
function spirals(p, c) { p.translate(W / 2, H / 2); for (let a0 = 0; a0 < p.TAU; a0 += p.TAU / c.arms) { p.beginShape(); for (let i = 0; i < c.points; i++) { const t = i / (c.points - 1) * c.turns * p.TAU; const r = c.spacing * t; const wob = Math.sin(t * 2.7 + a0 * 3) * c.wobble; p.vertex(Math.cos(t + a0) * (r + wob), Math.sin(t + a0) * (r + wob)); } p.endShape(); } }
function contourLines(p, c) {
  const b0 = bounds(), inset = 7, b = { x0: b0.x0 + inset, y0: b0.y0 + inset, x1: b0.x1 - inset, y1: b0.y1 - inset, w: b0.w - inset * 2, h: b0.h - inset * 2 }, n = Math.floor(c.resolution), values = [];
  const hills = [
    { x: .28, y: .30, sx: .15, sy: .12, h: 1.20 },
    { x: .67, y: .40, sx: .18, sy: .15, h: .98 },
    { x: .43, y: .72, sx: .22, sy: .14, h: .88 },
    { x: .86, y: .76, sx: .13, sy: .18, h: .62 },
    { x: .08, y: .66, sx: .22, sy: .20, h: .44 }
  ];
  let minV = Infinity, maxV = -Infinity;
  for (let gy = 0; gy < n; gy++) for (let gx = 0; gx < n; gx++) {
    const x = gx / (n - 1), y = gy / (n - 1);
    let v = -0.32 * x + 0.18 * y;
    for (const h of hills) {
      const dx = (x - h.x) / h.sx, dy = (y - h.y) / h.sy;
      v += h.h * Math.exp(-(dx * dx + dy * dy) * .5);
    }
    v += (p.noise(x / c.scale, y / c.scale) - .5) * .06 * c.warp;
    values.push(v); minV = Math.min(minV, v); maxV = Math.max(maxV, v);
  }
  const thresholds = Array.from({ length: c.thresholds }, (_, i) => p.map(i + 1, 1, c.thresholds, minV + (maxV - minV) * .16, maxV - (maxV - minV) * .08));
  const cs = contours().size([n, n]).thresholds(thresholds)(values);
  const sx = b.w / (n - 1), sy = b.h / (n - 1);
  for (const co of cs) for (const poly of co.coordinates) for (const ring of poly) {
    if (ring.length < 9) continue;
    const pts = ring.map(([x, y]) => [b.x0 + x * sx, b.y0 + y * sy]);
    let perimeter = 0;
    for (let i = 1; i < pts.length; i++) perimeter += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
    if (perimeter > 24) polyline(p, pts, true);
  }
}
function makePoints(p, n, jitter = 1) { const b = bounds(), pts = []; const cols = Math.ceil(Math.sqrt(n * b.w / b.h)), rows = Math.ceil(n / cols), cw = b.w / cols, ch = b.h / rows; for (let i = 0; i < n; i++) { const cx = i % cols, cy = Math.floor(i / cols); pts.push([b.x0 + (cx + .5 + p.random(-.45, .45) * jitter) * cw, b.y0 + (cy + .5 + p.random(-.45, .45) * jitter) * ch]); } return pts; }
function voronoi(p, c) { const b = bounds(); let pts = makePoints(p, c.sites, c.jitter); for (let r = 0; r < c.relax; r++) { const d = Delaunay.from(pts), v = d.voronoi([b.x0, b.y0, b.x1, b.y1]); pts = pts.map((pt, i) => { const cell = v.cellPolygon(i); if (!cell) return pt; const avg = cell.reduce((a, q) => [a[0]+q[0], a[1]+q[1]], [0,0]); return [avg[0]/cell.length, avg[1]/cell.length]; }); } const d = Delaunay.from(pts), v = d.voronoi([b.x0, b.y0, b.x1, b.y1]); for (let i = 0; i < pts.length; i++) { const cell = v.cellPolygon(i); if (cell) polyline(p, cell, true); if (c.circles) p.circle(pts[i][0], pts[i][1], 3); } }
function delaunayTriangles(p, c) { const pts = makePoints(p, c.points, c.jitter), d = Delaunay.from(pts); for (let i = 0; i < d.triangles.length; i += 3) { const tri = [pts[d.triangles[i]], pts[d.triangles[i+1]], pts[d.triangles[i+2]]]; const edges = [[tri[0],tri[1]],[tri[1],tri[2]],[tri[2],tri[0]]]; if (edges.some(([a,b]) => Math.hypot(a[0]-b[0], a[1]-b[1]) > c.longEdge) || p.random() < c.prune) continue; polyline(p, tri, true); } }
function hatching(p, c) { const b = bounds(), pad = 8, inner = { x0: b.x0 + pad, y0: b.y0 + pad, x1: b.x1 - pad, y1: b.y1 - pad }; const cx = W / 2, len = W * 2.2; for (let y = inner.y0; y <= inner.y1; y += c.spacing) { for (let band = 0; band < c.bands; band++) { const yy = y + (band - (c.bands - 1) / 2) * 1.6; const x = cx + Math.sin((yy + band * 17) * 0.05) * c.wave; lineInRect(p, x, yy, len, p.radians(c.angle), inner); } } }
function crossHatching(p, c) {
  const cx = W / 2, cy = H / 2 - 8, r = bounds().w * .39 * c.maskRadius;
  const hatchR = r - 10;
  const hatchCircle = (angle, spacing, threshold) => {
    const a = p.radians(angle), tx = Math.cos(a), ty = Math.sin(a), nx = Math.cos(a + p.HALF_PI), ny = Math.sin(a + p.HALF_PI);
    for (let off = -hatchR; off <= hatchR; off += spacing) {
      const chord = Math.sqrt(Math.max(0, hatchR * hatchR - off * off));
      for (let t = -chord; t < chord; t += 7.2) {
        const mx = cx + nx * off + tx * (t + 3.6), my = cy + ny * off + ty * (t + 3.6);
        const lx = (mx - cx) / r, ly = (my - cy) / r;
        const darkness = p.constrain(.50 + lx * .58 + ly * .42, 0, 1);
        if (darkness < threshold || p.random() > darkness) continue;
        lineInCircle(p, mx, my, 6.6 * p.map(darkness, 0, 1, .55, 1.12), a + ly * .06, cx, cy, hatchR);
      }
    }
  };
  const outsideHatches = () => {
    const b = bounds(), rect = { x0: b.x0 + 7, y0: b.y0 + 7, x1: b.x1 - 7, y1: b.y1 - 7 };
    const baseAngle = p.radians(c.angle), len = 7.2, clearR = r + 6;
    const clusters = [
      { angle: -56, start: r + 14, stop: r + 43, count: 20, jitter: 4.5 },
      { angle: 34, start: r + 18, stop: r + 38, count: 12, jitter: 3.5 },
    ];
    for (const cluster of clusters) {
      const theta = p.radians(cluster.angle), tangent = theta + p.HALF_PI;
      for (let i = 0; i < cluster.count; i++) {
        const radial = p.map(i, 0, Math.max(1, cluster.count - 1), cluster.start, cluster.stop) + p.random(-cluster.jitter, cluster.jitter);
        const along = p.random(-28, 28);
        const x = cx + Math.cos(theta) * radial + Math.cos(tangent) * along;
        const y = cy + Math.sin(theta) * radial + Math.sin(tangent) * along;
        const lineAngle = baseAngle + p.random(-.08, .08);
        if (x < rect.x0 || x > rect.x1 || y < rect.y0 || y > rect.y1) continue;
        if (!segmentClearOfCircle(x, y, len, lineAngle, cx, cy, clearR)) continue;
        lineInRect(p, x, y, len, lineAngle, rect);
      }
    }
  };
  outsideHatches();
  hatchCircle(c.angle, c.spacing, .14);
  if (c.layers > 1) hatchCircle(-c.angle, c.spacing * 1.05, .48);
  if (c.layers > 2) hatchCircle(c.angle + 72, c.spacing * 1.25, .69);
  p.circle(cx, cy, r * 2);
}
function noiseFields(p, c) { const b = bounds(); for (let i = 0; i < c.agents; i++) { let x = p.random(b.x0, b.x1), y = p.random(b.y0, b.y1); p.beginShape(); for (let s = 0; s < c.steps; s++) { p.vertex(x, y); const a = p.noise(x * c.scale, y * c.scale) * p.TAU * c.curl; x += Math.cos(a) * c.step; y += Math.sin(a) * c.step; if (x < b.x0 || x > b.x1 || y < b.y0 || y > b.y1) break; } p.endShape(); } }
function attractorSystems(p, c) { const sigma = 10, rho = 28, beta = 8 / 3, dt = .006; p.translate(W / 2, H / 2 + 2); for (let k = 0; k < c.particles; k++) { let x = .1 + k * .02, y = 0, z = 0; p.beginShape(); for (let i = 0; i < c.steps; i++) { const dx = sigma * (y - x), dy = x * (rho - z) - y, dz = x * y - beta * z; x += dx * dt; y += dy * dt; z += dz * dt; if (i > 80) p.vertex(x * 3.55, z * 3.2 - 52); } p.endShape(); } }
function rosettes(p, c) { p.translate(W/2,H/2); for (let ring=0; ring<c.rings; ring++) { const phase = ring * p.TAU / (c.rings * 2); const scale = 1 - ring * .055; p.beginShape(); for (let i=0; i<=c.samples; i++) { const t = i/c.samples*p.TAU; const rr = c.radius * scale * Math.sin(c.petals * t / 2 + phase) * (1 + c.modulation * .12 * Math.sin(t * c.petals)); p.vertex(Math.cos(t)*rr, Math.sin(t)*rr); } p.endShape(); } p.circle(0, 0, c.radius * .18); }
function epicycloids(p, c) { p.translate(W/2,H/2); p.beginShape(); for (let i=0;i<=c.samples;i++) { const t=i/c.samples*p.TAU*c.repeats; const x=(c.R+c.r)*Math.cos(t)-c.d*Math.cos(((c.R+c.r)/c.r)*t); const y=(c.R+c.r)*Math.sin(t)-c.d*Math.sin(((c.R+c.r)/c.r)*t); p.vertex(x,y); } p.endShape(); }
function bezierFlowFields(p, c) {
  const b0 = bounds(), pad = 13;
  const b = { x0: b0.x0 + pad, y0: b0.y0 + pad, x1: b0.x1 - pad, y1: b0.y1 - pad, w: b0.w - pad * 2, h: b0.h - pad * 2 };
  const ext = { x0: b.x0 - 56, y0: b.y0 - 56, x1: b.x1 + 56, y1: b.y1 + 56 };
  const fieldAngle = (x, y) => {
    const nx = (x - b.x0) / b.w, ny = (y - b.y0) / b.h;
    const base = -.015 + ny * .09;
    const broadWave = Math.sin(ny * p.TAU * 1.55 + nx * 1.6) * .30;
    const curl = (p.noise(x * c.scale, y * c.scale) - .5) * .88 * c.bend;
    return base + broadWave + curl;
  };
  const drawBezierPath = (pts) => {
    const smooth = pts.filter((_, idx) => idx % 5 === 0);
    if (smooth.length < 4) return;
    for (let i = 0; i < smooth.length - 1; i++) {
      const p0 = smooth[Math.max(0, i - 1)], p1 = smooth[i], p2 = smooth[i + 1], p3 = smooth[Math.min(smooth.length - 1, i + 2)];
      const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
      const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
      p.bezier(p1[0], p1[1], c1[0], c1[1], c2[0], c2[1], p2[0], p2[1]);
    }
  };
  for (let i = 0; i < c.curves; i++) {
    const t = i / Math.max(1, c.curves - 1);
    let x = b.x0 + p.random(-28, -8);
    let y = b.y0 + t * b.h + p.random(-2.8, 2.8);
    if (i % 7 === 0) { x = b.x0 + p.random(0, b.w * .24); y = b.y0 + p.random(0, b.h); }
    const pts = [];
    const step = 1.20, steps = Math.floor(c.length * p.random(.94, 1.20));
    for (let s = 0; s < steps; s++) {
      const inFrame = x >= b.x0 && x <= b.x1 && y >= b.y0 && y <= b.y1;
      if (inFrame) pts.push([x, y]);
      const a = fieldAngle(x, y);
      x += Math.cos(a) * step;
      y += Math.sin(a) * step;
      if (x < ext.x0 || x > ext.x1 || y < ext.y0 || y > ext.y1) break;
    }
    if (pts.length > 18) drawBezierPath(pts);
  }
}
function hilbert(i, order) { let x=0,y=0; for(let s=1, t=i; s < (1<<order); s*=2) { const rx = 1 & (t/2), ry = 1 & (t ^ rx); if (ry === 0) { if (rx === 1) { x = s-1-x; y = s-1-y; } [x,y]=[y,x]; } x += s*rx; y += s*ry; t = Math.floor(t/4); } return [x,y]; }
function spaceFillingCurves(p, c) { const n=1<<c.order, total=n*n, b=bounds(), s=(Math.min(b.w,b.h)-2*c.margin)/(n-1), ox=W/2-s*(n-1)/2, oy=H/2-s*(n-1)/2; p.beginShape(); for(let i=0;i<total;i+=c.skip) { const [x,y]=hilbert(i,c.order); p.vertex(ox+x*s+p.random(-c.wobble,c.wobble), oy+y*s+p.random(-c.wobble,c.wobble)); } p.endShape(); }
function imageTrace(p, c) { const b = bounds(), sun = { x: b.x0 + b.w * .26, y: b.y0 + b.h * .25, r: b.w * .13 }; p.circle(sun.x, sun.y, sun.r * 2); const ridges = []; for (let l = 0; l < 7; l++) { const baseY = b.y0 + b.h * (.40 + l * .072), amp = 21 - l * 1.7, pts = []; p.beginShape(); for (let x = b.x0; x <= b.x1; x += 4) { const y = baseY + Math.sin(x * .035 + l * 1.7) * amp * .42 + p.noise(x * .02, l * .7) * amp; pts.push([x, y]); p.vertex(x, y); } p.endShape(); ridges.push({ baseY, amp, pts, l }); } for (const { baseY, amp, l } of ridges) { for (let y = baseY + 10; y < b.y1 - 10; y += c.cell * 1.55 + l * .35) { for (let x = b.x0 + (l % 2) * 5; x < b.x1; x += c.cell * 2.4) { const ridge = baseY + Math.sin(x * .035 + l * 1.7) * amp * .42 + p.noise(x * .02, l * .7) * amp; if (y < ridge || Math.hypot(x - sun.x, y - sun.y) < sun.r * 1.15) continue; const tone = p.constrain((y - ridge) / (b.y1 - ridge), 0, 1); if (p.random() < tone * .38) lineClip(p, x, y, c.maxLine * (.45 + tone * .55), p.radians(c.angle + l * 5)); } } } }

setupUI();
document.querySelector('#referencePoster')?.setAttribute('src', assetUrl('reference-poster.jpg'));
new p5(sketch);
