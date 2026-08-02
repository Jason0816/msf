# MSF Mizar Logo Motion Specification

## Motion brief

- **Source of truth:** `logo.svg`, whose static render is pixel-identical to `A-final-blue-ribbon-refined.svg`.
- **Use context:** splash / application startup reveal, ending in a permanent static logo.
- **Personality:** precise, collaborative, luminous.
- **Concept:** the blue and cyan ribbon systems behave like Mizar's paired stars and the project's MosDNS + Mihomo engines. They approach from opposite sides, meet at the existing central fold, and settle as one mark.
- **Restraint:** no squash, no elastic bounce, no persistent Alcor dot, and no geometric morphing. The largest global overshoot is 1.1%.

## Part inventory

| Actor | SVG ID | Role |
| --- | --- | --- |
| Whole mark | `logo-geometry` | Global staging and final settle |
| Blue foundation | `layer-ribbon-base` | Primary blue engine / complete clipped foundation |
| Blue upper ribbon | `layer-upper-blue` | Leading blue surface |
| Blue lower ribbon | `layer-lower-blue` | Follow-through blue surface |
| Blue lower fold | `layer-bottom-fold` | Late material-depth detail |
| Cyan outside ribbon | `layer-outer-cyan`, `layer-outer-light` | Primary cyan engine and highlight |
| Cyan center ribbon | `layer-center-cyan` | Cyan surface arriving at the join |
| Cyan right fold | `layer-right-fold` | Late material-depth detail |
| Contact shadow | `layer-contact-shadow` | Confirms physical overlap after convergence |
| Join glint | `connection-glint` | Brief secondary action; invisible in the final frame |

## Shared 1800 ms timeline

| Time | Phase | Choreography |
| ---: | --- | --- |
| 0–360 ms | Anticipation (20%) | Mark is subtly compressed. Blue waits down-left; cyan waits down-right. The 70 ms cyan offset prevents lockstep motion. |
| 360–900 ms | Main action, approach | Both engines accelerate inward along shallow mirrored arcs. Blue upper/lower surfaces and cyan center surface trail their foundations. |
| 900–1260 ms | Main action, convergence | The two systems pass their final positions by only a few pixels. Fold details and contact shadow arrive after the primary surfaces. |
| 1008–1476 ms | Secondary action | A short cyan-white glint appears at the existing join around `(641, 512)` and dissipates completely. |
| 1260–1800 ms | Follow-through / settle (30%) | The 1.1% global overshoot returns to exact scale. All actors end at `transform: none`; the glint ends at opacity 0. |

## Animation principles applied

- **Staging:** only two opposing movements dominate; folds and glint remain subordinate.
- **Anticipation:** a small outward/downward preparation precedes convergence.
- **Slow in / slow out:** every moving segment declares a literal `cubic-bezier(...)` inside its keyframes.
- **Timing:** one 1800 ms shared clock preserves deterministic `?t=` seeking.
- **Follow-through and overlapping action:** primary surfaces, secondary folds, shadow, and glint finish at different times.
- **Arcs:** mirrored translation plus restrained rotation creates shallow curved approach paths.
- **Secondary action:** the join glint explains cooperation without altering the static brand mark.
- **Appeal:** motion preserves the exact ribbon silhouette and emphasizes the dual-engine story.

## Easing and tuning tokens

- Precise convergence: `cubic-bezier(0.22, 0.78, 0.22, 1)`
- Restrained settle: `cubic-bezier(0.18, 0.88, 0.28, 1)`
- Anticipation: `cubic-bezier(0.38, 0, 0.24, 1)`
- Symmetric glint fade: `cubic-bezier(0.36, 0, 0.64, 1)`

The CSS exposes `--p2m-duration` for the showcase controls. Easing values inside `@keyframes` are intentionally literal so Chromium does not silently fall back to linear interpolation.

## Final Frame Contract

At 100%:

- every visible logo actor is `opacity: 1` and `transform: none`;
- `connection-glint` is `opacity: 0`, matching its SVG base state;
- the original `filter="url(#contact-soft)"` presentation attribute remains untouched;
- no geometry, gradient, clip path, color, or path data is changed by the motion layer;
- deterministic `?static=1` and `?t=1800` captures must be pixel-identical in the same browser pipeline.

## Intended tunable range

- Duration: 1500–2100 ms; 1800 ms is the approved baseline.
- Translational anticipation: 24–42 px; current values remain under 3.4% of the viewBox width.
- Global overshoot: 0–1.5%; current value is 1.1%.
- Glint intensity: opacity 0.65–0.95; it must always finish at opacity 0.
