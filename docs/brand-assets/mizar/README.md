# MSF Mizar Brand Assets

The master geometry is `vector/msf-mizar.svg`, copied directly from the approved blue-ribbon reconstruction. All raster outputs are generated from that SVG by `scripts/generate-mizar-brand-assets.cjs`; do not redraw or simplify the folds manually.

## Asset groups

- `vector/`: canonical transparent SVG.
- `transparent/`: transparent PNG exports from 16px through 2048px.
- `favicon/`: cropped SVG, 16/32/48px PNGs, and a multi-size ICO.
- `app-icon/`: white rounded-square application icons with transparent outer corners.
- `unraid/`: transparent 256px CA icon and 128px local plugin icon.
- `motion/`: approved ribbon-orbit animation in SVG, WebP, and GIF formats.
- `SHA256SUMS`: integrity hashes for all generated brand assets.

## Regeneration

The generator requires Node.js and Sharp:

```sh
node scripts/generate-mizar-brand-assets.cjs
```

The generated assets are also copied into their active Web, macOS, fnOS/root, and Unraid locations.
