# AURELIS — locked decisions

Client-approved and **locked**. Do not revisit without an explicit instruction to
reopen. Several of these are enforced by tests in `tests/`; where they are, the test
is named.

## Status

**Complete drawing-led implementation; photography layer pending access to suitable
zero-cost source material.** The visual direction is *not* declared permanently
finished. The next meaningful evaluation is against suitable photography when it
becomes available, or against the rendered site on real hardware — not against
further polishing.

**No further aesthetic changes should be made to the current version merely to
continue polishing.**

## Photography

1. The seven-slot architecture in `data/plates.json` stays.
2. A slot with no approved source **renders nothing at all** — no placeholder box, no
   fake caption, no artificial whitespace. *(`the built pages contain no empty plate
   boxes`)*
3. Provenance is mandatory: a slot with a `src` must carry `credit`, `licence` and
   `sourceUrl`. *(`a slot with a source must also carry its provenance`)*
4. Sourcing order is locked. *(`the client-locked sourcing priority is intact`)*

   | | Slot | Moment |
   |---|---|---|
   | 1 | `under` | forest path at 9 m |
   | 2 | `dark` | 19:40 night path |
   | 3 | `day-fire` | Hu Kwang — charcoal, fish, hands |
   | 4 | `day-water` | water at the surface |
   | 5 | `day-rain` | rain on a surface |
   | 6 | `material` | one tactile material study |
   | — | `villa-interior` | **do not source for completeness** |

5. When access is restored: return to the Stage 7 Image Bible and its four-gate
   rejection checklist. Free/zero-cost sources only. **No AI-generated photography.**
6. Every candidate competes against the drawing currently holding that position. A
   photograph is not automatically an improvement because it is a photograph. It
   enters only if it materially improves sensation, desire, atmosphere or physical
   presence while staying inside the photographic world.
7. **Do not lower the rejection standard to fill slots. One exceptional photograph is
   preferable to six merely acceptable ones.**

## Drawings

Keep the authored survey drawings wherever they outperform photography
conceptually: the survey field, architectural sections, terrain and elevation, the
villa plan, the aspect diagram, the coping/root detail, Rule I, and Rule III where
the drawing is the stronger statement.

## Motion and performance

- The dapple implementation is locked: viewport-sized layers drifting their tiled
  background, and **the drift holds while the page is scrolling.** Oversized
  composited layers were the entire measured scroll cost; do not reintroduce them.
- The degradation hierarchy is locked: scintillation → canvas DPR → dapple layers →
  dapple motion → **static but complete** → point reduction last, by build-time
  redundancy rank, never touching the 24 voids or the island silhouette.
- Zero runtime dependencies. No motion library, no WebGL.

## Content

- The 23 clearing pages without authored prose stay **honestly incomplete**. They
  carry their full survey record and say so on the page. Do not generate repetitive
  luxury copy to make them look finished.
- Stub pages stay deliberately bare.
- The sun path is **schematic** and is labelled as such. It is not presented as
  astronomical fact.

## Outstanding, and honest about it

**Real-device performance is unverified.** All frame-time figures were measured in
headless Chromium in a container with software compositing and no GPU — a setup that
specifically penalises the thing being measured. Treat p50 16.7 ms / p90 17.3 ms /
p99 25.6 ms as indicative only until tested on representative hardware.

## Fictional data

Everything in `data/` is authored fiction for a fictional commission. On a real
client project, anything presented as measurable fact must come from verified client
material or explicit client approval.
