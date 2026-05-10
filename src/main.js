import p5 from 'p5';
import GUI from 'lil-gui';
import p5plot from 'p5.plotsvg';
import { Delaunay } from 'd3-delaunay';
import { contours } from 'd3-contour';
import { createNoise2D } from 'simplex-noise';
import './style.css';

const W = 816; // 8.5in @ 96dpi
const H = 1056; // 11in @ 96dpi
const M = 72;
const state = { seed: 12345, generatorId: 'random-walk', exportSvg: false, params: {} };
let gui;
let referenceImage;
const simplex = createNoise2D(() => seededRandom(state.seed + 99));

const generators = [
  { id: 'random-walk', name: '01 Random Walk', defaults: { walkers: 18, steps: 220, step: 7, drift: 0.32, turnJitter: 1.2 }, controls: {
    walkers: [1, 80, 1], steps: [20, 900, 1], step: [1, 20, .5], drift: [-1, 1, .01], turnJitter: [0, 3.14, .01]
  }, draw: randomWalk },
  { id: 'l-systems', name: '02 L-Systems', defaults: { iterations: 5, angle: 25, length: 5.5, spread: 0.82 }, controls: {
    iterations: [1, 7, 1], angle: [5, 60, 1], length: [1, 14, .25], spread: [0.35, 1.4, .01]
  }, draw: lSystem },
  { id: 'spirals', name: '03 Spirals', defaults: { arms: 6, turns: 6, spacing: 4.8, wobble: 8, points: 520 }, controls: {
    arms: [1, 16, 1], turns: [1, 14, .1], spacing: [1, 12, .1], wobble: [0, 30, .5], points: [60, 1400, 1]
  }, draw: spirals },
  { id: 'contour-lines', name: '04 Contour Lines', defaults: { resolution: 80, thresholds: 18, scale: 0.009, warp: 0.7 }, controls: {
    resolution: [30, 150, 1], thresholds: [4, 36, 1], scale: [0.002, 0.025, .001], warp: [0, 2, .01]
  }, draw: contourLines },
  { id: 'voronoi', name: '05 Voronoi Diagram', defaults: { sites: 90, relax: 1, jitter: 0.55, circles: 0 }, controls: {
    sites: [10, 350, 1], relax: [0, 3, 1], jitter: [0, 1, .01], circles: [0, 1, 1]
  }, draw: voronoi },
  { id: 'delaunay', name: '06 Delaunay Triangulation', defaults: { points: 120, jitter: 0.85, prune: 0.2, longEdge: 190 }, controls: {
    points: [10, 420, 1], jitter: [0, 1, .01], prune: [0, .85, .01], longEdge: [40, 360, 1]
  }, draw: delaunayTriangles },
  { id: 'hatching', name: '07 Hatching / Parallel Lines', defaults: { spacing: 11, angle: 28, wave: 18, bands: 5 }, controls: {
    spacing: [4, 32, .5], angle: [-80, 80, 1], wave: [0, 60, 1], bands: [1, 12, 1]
  }, draw: hatching },
  { id: 'cross-hatching', name: '08 Cross Hatching', defaults: { spacing: 14, angle: 32, layers: 3, maskRadius: 0.78 }, controls: {
    spacing: [5, 34, .5], angle: [5, 70, 1], layers: [1, 5, 1], maskRadius: [.25, 1.2, .01]
  }, draw: crossHatching },
  { id: 'noise-fields', name: '09 Noise Fields', defaults: { agents: 420, steps: 75, scale: 0.006, step: 4.8, curl: 1.8 }, controls: {
    agents: [20, 1400, 1], steps: [10, 220, 1], scale: [0.001, 0.02, .001], step: [1, 12, .1], curl: [.2, 4, .1]
  }, draw: noiseFields },
  { id: 'attractors', name: '10 Attractor Systems', defaults: { particles: 170, steps: 130, attractors: 5, force: 1.2, drag: 0.88 }, controls: {
    particles: [20, 700, 1], steps: [20, 360, 1], attractors: [1, 9, 1], force: [.1, 4, .1], drag: [.65, .99, .01]
  }, draw: attractorSystems },
  { id: 'rosettes', name: '11 Rosettes', defaults: { petals: 9, rings: 7, radius: 285, modulation: 0.28, samples: 460 }, controls: {
    petals: [3, 24, 1], rings: [1, 14, 1], radius: [80, 390, 1], modulation: [0, .75, .01], samples: [80, 1200, 1]
  }, draw: rosettes },
  { id: 'epicycloids', name: '12 Epicycloids / Spirograph', defaults: { R: 160, r: 53, d: 130, repeats: 7, samples: 1600 }, controls: {
    R: [30, 260, 1], r: [10, 160, 1], d: [10, 260, 1], repeats: [1, 16, 1], samples: [200, 4000, 1]
  }, draw: epicycloids },
  { id: 'bezier-flow-fields', name: '13 Bezier Flow Fields', defaults: { curves: 80, scale: 0.006, length: 125, bend: 0.42 }, controls: {
    curves: [5, 260, 1], scale: [0.001, 0.025, .001], length: [20, 260, 1], bend: [0, 1.8, .01]
  }, draw: bezierFlowFields },
  { id: 'space-filling-curves', name: '14 Space Filling Curves', defaults: { order: 5, margin: 74, wobble: 0, skip: 1 }, controls: {
    order: [1, 7, 1], margin: [20, 160, 1], wobble: [0, 12, .25], skip: [1, 8, 1]
  }, draw: spaceFillingCurves },
  { id: 'image-trace', name: '15 Image Trace / Vectorize', defaults: { cell: 14, threshold: 135, maxLine: 12, angle: 45 }, controls: {
    cell: [6, 32, 1], threshold: [20, 240, 1], maxLine: [2, 24, .5], angle: [-80, 80, 1]
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
  p.preload = () => { referenceImage = p.loadImage('/reference-poster.jpg'); };
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
    p.background('#fffdf7'); p.noFill(); p.stroke('#111'); p.strokeWeight(1);
    if (state.exportSvg) {
      p5plot.setSvgDefaultStrokeColor?.('black');
      p5plot.setSvgDefaultStrokeWeight?.(1);
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
function polyline(p, pts, close = false) { if (pts.length < 2) return; p.beginShape(); for (const [x, y] of pts) p.vertex(x, y); if (close) p.endShape(p.CLOSE); else p.endShape(); }

function randomWalk(p, c) { const b = bounds(); for (let i = 0; i < c.walkers; i++) { let x = p.random(b.x0, b.x1), y = p.random(b.y0, b.y1), a = p.random(p.TAU); p.beginShape(); for (let s = 0; s < c.steps; s++) { p.vertex(x, y); a += p.random(-c.turnJitter, c.turnJitter) + c.drift * 0.06; x = p.constrain(x + Math.cos(a) * c.step, b.x0, b.x1); y = p.constrain(y + Math.sin(a) * c.step, b.y0, b.y1); } p.endShape(); } }
function lSystem(p, c) { let sentence = 'F'; const rule = 'F[+F]F[-F][F]'; for (let i = 0; i < c.iterations; i++) sentence = sentence.replaceAll('F', rule); p.translate(W / 2, H - M); p.scale(c.spread, c.spread); p.rotate(-p.HALF_PI); const stack = []; const len = c.length; const ang = p.radians(c.angle); for (const ch of sentence.slice(0, 25000)) { if (ch === 'F') { p.line(0, 0, len, 0); p.translate(len, 0); } else if (ch === '+') p.rotate(ang); else if (ch === '-') p.rotate(-ang); else if (ch === '[') { p.push(); stack.push(1); } else if (ch === ']' && stack.pop()) p.pop(); } }
function spirals(p, c) { p.translate(W / 2, H / 2); for (let a0 = 0; a0 < p.TAU; a0 += p.TAU / c.arms) { p.beginShape(); for (let i = 0; i < c.points; i++) { const t = i / (c.points - 1) * c.turns * p.TAU; const r = c.spacing * t; const wob = Math.sin(t * 2.7 + a0 * 3) * c.wobble; p.vertex(Math.cos(t + a0) * (r + wob), Math.sin(t + a0) * (r + wob)); } p.endShape(); } }
function contourLines(p, c) { const n = Math.floor(c.resolution), values = []; for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) { const nx = x * c.scale * 90, ny = y * c.scale * 90; values.push(p.noise(nx + c.warp * p.noise(ny), ny + c.warp * p.noise(nx))); } const cs = contours().size([n, n]).thresholds(c.thresholds)(values); const b = bounds(), sx = b.w / (n - 1), sy = b.h / (n - 1); for (const co of cs) for (const poly of co.coordinates) for (const ring of poly) polyline(p, ring.map(([x, y]) => [b.x0 + x * sx, b.y0 + y * sy]), true); }
function makePoints(p, n, jitter = 1) { const b = bounds(), pts = []; const cols = Math.ceil(Math.sqrt(n * b.w / b.h)), rows = Math.ceil(n / cols), cw = b.w / cols, ch = b.h / rows; for (let i = 0; i < n; i++) { const cx = i % cols, cy = Math.floor(i / cols); pts.push([b.x0 + (cx + .5 + p.random(-.45, .45) * jitter) * cw, b.y0 + (cy + .5 + p.random(-.45, .45) * jitter) * ch]); } return pts; }
function voronoi(p, c) { const b = bounds(); let pts = makePoints(p, c.sites, c.jitter); for (let r = 0; r < c.relax; r++) { const d = Delaunay.from(pts), v = d.voronoi([b.x0, b.y0, b.x1, b.y1]); pts = pts.map((pt, i) => { const cell = v.cellPolygon(i); if (!cell) return pt; const avg = cell.reduce((a, q) => [a[0]+q[0], a[1]+q[1]], [0,0]); return [avg[0]/cell.length, avg[1]/cell.length]; }); } const d = Delaunay.from(pts), v = d.voronoi([b.x0, b.y0, b.x1, b.y1]); for (let i = 0; i < pts.length; i++) { const cell = v.cellPolygon(i); if (cell) polyline(p, cell, true); if (c.circles) p.circle(pts[i][0], pts[i][1], 3); } }
function delaunayTriangles(p, c) { const pts = makePoints(p, c.points, c.jitter), d = Delaunay.from(pts); for (let i = 0; i < d.triangles.length; i += 3) { const tri = [pts[d.triangles[i]], pts[d.triangles[i+1]], pts[d.triangles[i+2]]]; const edges = [[tri[0],tri[1]],[tri[1],tri[2]],[tri[2],tri[0]]]; if (edges.some(([a,b]) => Math.hypot(a[0]-b[0], a[1]-b[1]) > c.longEdge) || p.random() < c.prune) continue; polyline(p, tri, true); } }
function hatching(p, c) { const b = bounds(); p.push(); p.translate(W/2,H/2); p.rotate(p.radians(c.angle)); for (let y = -H; y <= H; y += c.spacing) { p.beginShape(); for (let x = -W; x <= W; x += 16) p.vertex(x, y + Math.sin(x * .012 + y * .01) * c.wave); p.endShape(); } p.pop(); for (let i=1; i<c.bands; i++) p.line(b.x0, b.y0 + b.h*i/c.bands, b.x1, b.y0 + b.h*i/c.bands); }
function crossHatching(p, c) { for (let i = 0; i < c.layers; i++) { p.push(); p.translate(W/2,H/2); p.rotate(p.radians(c.angle + i * 90 / c.layers)); for (let y = -H; y <= H; y += c.spacing * (1 + i * .18)) { const yy = y / H; const len = W * c.maskRadius * Math.sqrt(Math.max(0, 1 - yy * yy)); p.line(-len/2, y, len/2, y); } p.pop(); } }
function noiseFields(p, c) { const b = bounds(); for (let i = 0; i < c.agents; i++) { let x = p.random(b.x0, b.x1), y = p.random(b.y0, b.y1); p.beginShape(); for (let s = 0; s < c.steps; s++) { p.vertex(x, y); const a = p.noise(x * c.scale, y * c.scale) * p.TAU * c.curl; x += Math.cos(a) * c.step; y += Math.sin(a) * c.step; if (x < b.x0 || x > b.x1 || y < b.y0 || y > b.y1) break; } p.endShape(); } }
function attractorSystems(p, c) { const b = bounds(), ats = makePoints(p, c.attractors, 1); ats.forEach(a => p.circle(a[0], a[1], 8)); for (let i = 0; i < c.particles; i++) { let x = p.random(b.x0,b.x1), y = p.random(b.y0,b.y1), vx = 0, vy = 0; p.beginShape(); for (let s=0; s<c.steps; s++) { p.vertex(x,y); for (const a of ats) { const dx=a[0]-x, dy=a[1]-y, m=dx*dx+dy*dy+80; vx += dx/m*c.force; vy += dy/m*c.force; } vx*=c.drag; vy*=c.drag; x+=vx; y+=vy; if(x<b.x0||x>b.x1||y<b.y0||y>b.y1) break; } p.endShape(); } }
function rosettes(p, c) { p.translate(W/2,H/2); for (let r=1; r<=c.rings; r++) { const base = c.radius * r / c.rings; p.beginShape(); for (let i=0; i<=c.samples; i++) { const t = i/c.samples*p.TAU; const rr = base * (1 + c.modulation * Math.sin(c.petals*t + r)); p.vertex(Math.cos(t)*rr, Math.sin(t)*rr); } p.endShape(); } }
function epicycloids(p, c) { p.translate(W/2,H/2); p.beginShape(); for (let i=0;i<=c.samples;i++) { const t=i/c.samples*p.TAU*c.repeats; const x=(c.R+c.r)*Math.cos(t)-c.d*Math.cos(((c.R+c.r)/c.r)*t); const y=(c.R+c.r)*Math.sin(t)-c.d*Math.sin(((c.R+c.r)/c.r)*t); p.vertex(x,y); } p.endShape(); }
function bezierFlowFields(p, c) { const b = bounds(); for (let i=0;i<c.curves;i++) { const x=p.random(b.x0,b.x1), y=p.random(b.y0,b.y1); const a=p.noise(x*c.scale,y*c.scale)*p.TAU*2; const b1=a+c.bend, b2=a-c.bend; p.bezier(x,y, x+Math.cos(b1)*c.length*.45, y+Math.sin(b1)*c.length*.45, x+Math.cos(b2)*c.length*.75, y+Math.sin(b2)*c.length*.75, x+Math.cos(a)*c.length, y+Math.sin(a)*c.length); } }
function hilbert(i, order) { let x=0,y=0; for(let s=1, t=i; s < (1<<order); s*=2) { const rx = 1 & (t/2), ry = 1 & (t ^ rx); if (ry === 0) { if (rx === 1) { x = s-1-x; y = s-1-y; } [x,y]=[y,x]; } x += s*rx; y += s*ry; t = Math.floor(t/4); } return [x,y]; }
function spaceFillingCurves(p, c) { const n=1<<c.order, total=n*n, b=bounds(), s=(Math.min(b.w,b.h)-2*c.margin)/(n-1), ox=W/2-s*(n-1)/2, oy=H/2-s*(n-1)/2; p.beginShape(); for(let i=0;i<total;i+=c.skip) { const [x,y]=hilbert(i,c.order); p.vertex(ox+x*s+p.random(-c.wobble,c.wobble), oy+y*s+p.random(-c.wobble,c.wobble)); } p.endShape(); }
function imageTrace(p, c) { if (!referenceImage) return; referenceImage.loadPixels(); const b=bounds(), sx=referenceImage.width/b.w, sy=referenceImage.height/b.h, angle=p.radians(c.angle); for(let y=b.y0; y<b.y1; y+=c.cell) for(let x=b.x0; x<b.x1; x+=c.cell) { const ix=Math.floor((x-b.x0)*sx), iy=Math.floor((y-b.y0)*sy), idx=4*(iy*referenceImage.width+ix); const bright=(referenceImage.pixels[idx]+referenceImage.pixels[idx+1]+referenceImage.pixels[idx+2])/3; if (bright < c.threshold) lineClip(p, x, y, p.map(bright,0,c.threshold,c.maxLine,1), angle + (bright/255-.5)); } }

setupUI();
new p5(sketch);
