# Generative Poster

A p5.js + Vite workspace for rebuilding the algorithms from the reference poster as separate, parameterized, plotter-friendly generators.

## What is included

- Vite vanilla app with p5.js 1.x.
- 15 separate generators matching the poster categories:
  - Random Walk
  - L-Systems
  - Spirals
  - Contour Lines
  - Voronoi Diagram
  - Delaunay Triangulation
  - Hatching / Parallel Lines
  - Cross Hatching
  - Noise Fields
  - Attractor Systems
  - Rosettes
  - Epicycloids / Spirograph
  - Bezier Flow Fields
  - Space Filling Curves
  - Image Trace / Vectorize
- UI knobs via `lil-gui`.
- SVG export via Golan Levin's `p5.plotSvg`.
- PNG export.
- Reference poster saved at `public/reference-poster.jpg`.
- Cloned source copy of `golanlevin/p5.plotSvg` in `vendor/p5.plotSvg`.
- GitHub Pages deployment workflow in `.github/workflows/deploy.yml`.

## Useful libraries selected

- `p5`: creative-coding canvas runtime.
- `p5.plotsvg`: plotter-oriented SVG export. This intentionally records path geometry, not fills/gradients/pixel effects.
- `lil-gui`: lightweight UI controls for tuning each generator's parameters.
- `d3-delaunay`: Delaunay triangulation and Voronoi diagrams.
- `d3-contour`: marching-squares contour generation for topographic line generators.
- `simplex-noise`: available for future flow-field variants; p5 noise is currently used where SVG repeatability matters.

## Development

```bash
npm install
npm run dev
```

Open the Vite URL, choose a generator, tune knobs, then export SVG/PNG.

## Build

```bash
npm run build
npm run preview
```

## Deploying to GitHub Pages

1. Create a GitHub repo named `generative-poster`.
2. Push this folder to GitHub.
3. In GitHub repo settings, set Pages source to **GitHub Actions**.
4. The included workflow will build and deploy `dist/` on every push to `main`.

## Plotter notes

`p5.plotSvg` ignores many visual canvas features by design. Keep final plotter generators focused on lines, polylines, arcs, curves, and logical pen colors. Use hatching instead of fills. For post-processing, run SVG exports through `vpype` to sort/merge/simplify paths before plotting.
