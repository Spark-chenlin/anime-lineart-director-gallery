# Detail and installation follow-up — 2026-09-05

- Prior homepage baseline committed and pushed to origin/main: `6709739`.
- Follow-up changes are local for review: copy/share before the long prompt, separate creation notes on all 39 detail pages, and native expandable Codex / Claude Code installation instructions.
- User excluded the full-site copy audit. Existing categories, titles, subtitles and archived prompts were preserved. Compared all 39 prompt bodies against the pushed commit: identical.
- Installation references: https://developers.openai.com/codex/skills/ and https://code.claude.com/docs/en/skills, checked on 2026-09-05.
- Full build completed; `node verify_site.cjs`: **40 passed, 0 failed**, 1.06 MB first screen. Clipboard comparison normalizes Windows CRLF; narrow-screen check waits for font layout and scrolls the button into view.
- Inspected screenshots: screenshots/detail-refined.png, screenshots/detail-refined-mobile.png, screenshots/install-refined.png. Clear hierarchy, copy before reading notes, no horizontal overflow at 320px, and installation details retain homepage colors and spacing.

---

# Homepage QA — adopted A cover

final result: passed

## Adopted homepage, current result

The user selected the A cover and authorized further polish. The formal index.html now uses that layout with homepage-scoped assets/home.css, real responsive artwork, updated build-generated captions and counters, and the original carousel's playback controls. No deployment performed.

- Current source target: the user's first attachment (A art-book cover).
- Current comparison: D:/AAA-Software/CodexData/visualizations/2026/09/05/01a071c4-3477-7920-9b7e-10dbeadaeb85/adopted-final-comparison.jpg. Reference and implementation are both 1536 × 1024, initial Gojo artwork, with animation reduced for stable inspection.
- Current narrow-screen evidence: adopted-final-320.png in the same folder. Also inspected the 390px layout and the new Skill/gallery sections.
- Adjustments after inspection: repaired 320px navigation wrapping and control-row overflow; switched onstage artwork to 800w minimum to preserve ink detail; delayed the other two high-resolution variants until they enter the stage.
- Full build completed. `node verify_site.cjs`: **36 passed, 0 failed**. First-screen transfer **1.06 MB**, under the unchanged **1.2 MB** budget; 16 resource requests and 226 KB of fonts in the verified Edge run.
- Core coverage includes 39 detail pages, gallery return-scroll restoration, correct caption/request/link/counter synchronization, focus navigation, no-JavaScript detail navigation, and 320px controls.
- Intentional polish: clickable thin slide indicators, discreet pause control, original request beneath artwork, a compact Skill introduction before the gallery, sticky gallery chapter navigation, and consistent metadata alignment. The version comparison toolbar is absent from the official homepage.
- Remaining visual differences from the raster concept are the original artwork composition/white margins, slightly different font metrics, and the introduction beginning farther below the hero. No outstanding P0/P1/P2 issue for the adopted design.

## Previous preview iteration

Scope: two isolated HTML homepage previews. Existing index.html, gallery data, and work pages were not changed.

## Visual targets and evidence

- A: user attachment codex-clipboard-d6454bd1-bc3d-43d1-9750-ba51325b9780.png.
- B: user attachment codex-clipboard-741d2e04-0e72-4045-9581-b9886574d8c3.png.
- Both compared at 1536 × 1024, default first artwork, against real Edge screenshots.
- Side-by-side comparisons: D:/AAA-Software/CodexData/visualizations/2026/09/05/01a071c4-3477-7920-9b7e-10dbeadaeb85/comparison-a.jpg and comparison-b.jpg.
- Mobile screenshots in the same folder: web-a-mobile.png and web-b-mobile.png, at 390 × 844.

## Iteration

Initial review found the A artwork group too narrow and slightly low relative to its target, and B's outlined typography too narrow. Adjusted A's side positions and upper spacing, and B's outlined text width and image positioning. Recaptured both and inspected combined reference/implementation images. No outstanding P0/P1/P2 issues for this preview scope.

## Behavior checked

- Each variant cycles through all five real artwork assets and wraps back to its initial item.
- Previous/next controls update artwork, caption, index, and detail link.
- Arrow-key navigation works inside each hero; previous wraps to item five.
- Artwork detail links open the correct existing work page.
- Browse artwork anchors reach the local gallery section.
- All 42 distinct relative links in each preview returned successful local responses.
- No horizontal document overflow at widths 390, 800, 1024, and 1536.
- No browser page errors in the interaction check.
- Existing reduced-motion CSS applies; neither preview auto-advances.

## Intentional differences and limits

- Real original gallery images replace the slightly redrawn artwork in ImageGen mockups. Their precise composition and white margins therefore differ from the raster references.
- Existing self-hosted Chinese fonts are reused; glyph weights and caption sizing are approximate, not pixel-identical.
- A small version switcher is added solely for preview comparison.
- Mobile B stacks copy above artwork to preserve readable type and working actions.
- External GitHub links keep the existing destination; no publishing or external write was performed.
- This is focused visual and core-interaction QA, not a full accessibility audit or a rerun of every gallery-detail test.

## Rebuild

Run `python build_previews.py` to regenerate preview-a.html and preview-b.html from the existing gallery and content. Preview styles and interactions are in assets/preview.css and assets/preview.js.
