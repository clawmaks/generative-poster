import fs from 'node:fs';

const src = fs.readFileSync(new URL('../src/main.js', import.meta.url), 'utf8');
const required = [
  'random-walk', 'l-systems', 'spirals', 'contour-lines', 'voronoi',
  'delaunay', 'hatching', 'cross-hatching', 'noise-fields', 'attractors',
  'rosettes', 'epicycloids', 'bezier-flow-fields', 'space-filling-curves', 'image-trace'
];
const missing = required.filter((id) => !src.includes(`id: '${id}'`));
if (missing.length) {
  console.error(`Missing generators: ${missing.join(', ')}`);
  process.exit(1);
}
console.log(`Generator check passed: ${required.length} generators found.`);
