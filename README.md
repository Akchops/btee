# AURELIS — Ko Lamphu

A fictional commission. **Everything in `data/` is authored fiction**: no real place,
person, business or measurement is described. See `data/README.md`.

**Status: complete drawing-led implementation; photography layer pending access to
suitable zero-cost source material.**

## Run

```
npm install
npm run gen      # tokens, survey field, plans
npm run build    # -> dist/
npm test         # invariant, data and manifest tests
```

## The single source of truth

`data/` holds every factual and numeric value on the site. No component contains a
brand fact or a bare number. Values are either **authored** (stated in `data/`) or
**derived** (computed in `src/lib/` and never stored): walk times, clearing radii,
compass letters, plan geometry and the terrain model are all derived.

`scripts/validate-data.mjs` fails the build if a clearing leaves the island polygon,
overlaps another, sits above the ridge, or is built larger than its own clearing.

## The invariant

The homepage's signature is 1,412 tree marks becoming 1,412 stars **in identical
positions**. That is guaranteed by construction — one frozen coordinate buffer, one
projection, two paint states — and asserted at the data level in CI:

```
surveyPosition[i] === starPosition[i]   for every i, across five viewports and DPRs
```

`src/lib/field.js` exports `deviceCoords(positions, proj, dpr, state)`. It accepts
`state` **only so the test can prove it is ignored**. Appearance may differ.
Coordinates may not.

## The photography layer

`data/plates.json` holds seven reserved slots, each with its narrative purpose,
ratio, caption, search language and rejection criteria. **A slot renders nothing
until it has a `src`** — the empty-air treatment is the current design, not a
placeholder. Adding a file turns the photograph on with no layout change; a test
enforces that a slot with a source also carries credit, licence and source URL.

Sourcing must go through the Stage 7 Image Bible and its four-gate checklist.
Free/zero-cost sources only. No AI-generated photography.

## Constraints held

Zero runtime dependencies. Zero paid assets, trials or finite credits. Fonts are
SIL OFL, self-hosted and subsetted. Nothing here needs an account to build or run.
