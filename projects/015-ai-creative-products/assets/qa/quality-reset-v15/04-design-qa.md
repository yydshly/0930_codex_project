# CASE 04 visual reconstruction QA

Final result: passed for the requested original Canvas reconstruction.

The reference and current implementation are shown together in `04-reference-comparison.png`. Four author frames are 1280×720; current final frames are the live 1280×720 canvas bitmap, normalized to equal 640×360 panels in the comparison. They compare the same effect, with intentionally different local film timing and research product copy.

The interrupted implementation's oversized wordmark was retained. Its flat orbit was revised into a tall front/back projection with depth-sorted letters, and its dark low-amplitude point field was rebuilt as black radial dots on paper. The orange point now crosses type, curve, orbit and grid boundaries without a position jump. An incorrect legacy storyboard description of a large input card and folding paper was corrected to describe the actual oversized type and record marks.

Fonts and typography: local Inter Display Black loads before image/video export. Embedded metadata reports `Version 4.001;git-9221beed3`; the adjacent OFL 1.1 license is retained. The default mark occupies 1118px of the 1280px frame. Long Latin and Chinese edits fit without clipping; a dotless word gets a separate orange point above its glyphs. The original author's exact typeface is unknown.

Spacing and layout: the main film precedes its controls. The wordmark has substantial space above it; the curve uses quiet axes and a dashed reference level; the orbit has an open center. Controls and full evidence records remain below the artwork. Desktop and 390px mobile captures have no horizontal overflow.

Colors and tokens: paper, black ink and orange are preserved in the default type/curve/grid; the orbit reverses to paper letters on dark ink. Theme alternatives remain functional. The curve/orbit and orbit/grid backgrounds change through the timeline rather than a hard cut.

Image quality and assets: all artwork is the explicitly requested editable code animation. Native canvas captures and the actual PNG download are 1280×720. The cover candidate is an actual exported film frame, not a supplied source image. The new font and license are local assets; original source pixels are used only in this comparison evidence.

Copy and content: Archive is the local research product wordmark, and user scene words enter the orbit. The first observation is rendered as a small film note; the final film uses actual kept/merged/pending counts and record marks. Complete claims, URLs and pending details remain in the readable result panel and actual Markdown/JSON. The local exact-match operation does not claim to verify source contents or perform AI generation.

34 functional checks passed, with no runtime or HTTP asset errors. Actual default and edited input, different-source preservation, exact duplicate merging, empty input, theme choices, scene words, long wordmarks, mobile layout, PNG/Markdown/JSON/storyboard downloads, cancellation and exact seek restoration were exercised. A real full 15.00s WebM decodes at 1280×720; seven downloaded-file seeks match the preview with mean channel differences of 0.40–1.94 / 255. Four sub-frame point boundary probes show displacement of 0.02–0.80px. The test temporarily uses a range step of `any` for those probes; the user timeline retains its 0.1-second step.

Remaining limits: orbit glyphs use a depth-sorted affine projection rather than a fully modeled 3D type mesh, so extreme side letters compress. The reference font and toolchain remain unknown. Film artwork shows up to 14 classification marks; complete records remain in the result panel and files. There is no audio. These are declared implementation boundaries rather than blocked visual defects.

Evidence: `04-validation.json`, `04-page-final.png`, `04-mobile-final.png`, `04-cover-candidate.png`, `04-rebuilt-film.webm`, `04-edited-evidence.md`, `04-edited-recipe.json`, `04-edited-storyboard.md`, and seven `04-decoded-*.png` frames.
