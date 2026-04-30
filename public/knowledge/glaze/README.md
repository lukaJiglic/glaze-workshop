# Glaze Knowledge Pack

This folder is a research-only ceramics dataset for future workshop or app work. It does not contain Vue code or application scaffolding.

## Files

- `sources.json`: source ledger with publishers and URLs.
- `taxonomy.json`: firing, atmosphere, kiln, clay, technique, colour, surface, and reference-note taxonomies.
- `materials.json`: oxides, raw materials, defects, and safety notes.
- `recipes-earthenware.json`: curated low-fire and earthenware recipes.
- `recipes-midfire.json`: curated mid-fire recipes.
- `recipes-highfire.json`: curated high-fire stoneware and porcelain recipes.
- `recipes-highfire-extended.json`: additional high-fire formulas and surface families.
- `recipes-digitalfire-core.json`: modern reference recipes from Digitalfire.
- `recipes-digitalfire-extended.json`: additional Digitalfire reference formulas for fit testing, matte comparison, and reactive surface study.
- `recipes-digitalfire-slip-bases.json`: Alberta Slip, Ravenscrag Slip, and fluid-melt reference recipes.
- `recipes-raku.json`: curated raku recipes.
- `colour-profiles.json`: display-oriented swatches and recipe-to-colour mappings for future app use.
- `calculation-guides.json`: glaze calculation concepts, formulas, and change-impact heuristics.
- `goal-driven-guides.json`: user-intent to recipe-family selection guides.
- `adjustment-programs.json`: symptom-driven next-test programs tied to recipes, schedules, and workflows.
- `stain-host-matrix.json`: host-base compatibility ratings for stain families and sensitive warm colors.
- `coating-recipes.json`: workshop-template starter systems for engobes, underglazes, terra sigillata, oxide washes, and overglaze refire work.
- `body-glaze-recommendations.json`: body-specific recipe recommendations with confidence and inference notes.
- `recipe-lineages.json`: recipe-family branching, fit intent, and "why this variant exists" knowledge.
- `stain-systems.json`: ceramic stain families, host-glaze rules, and stain loading guidance.
- `coating-systems.json`: slips, engobes, underglazes, terra sigillata, glazes, and overglaze systems.
- `body-properties.json`: shrinkage, porosity, vitrification, grog effects, and body-behavior ranges.
- `manufacturer-body-datasets.json`: specific commercial clay-body records with published shrinkage and absorption data.
- `commercial-product-lines.json`: commercial underglaze and brush-on glaze family behavior plus representative color-shift examples.
- `commercial-layering-guides.json`: official layering protocols, clear-host choices, and combination cautions for commercial systems.
- `commercial-combo-examples.json`: official commercial combo-sheet datasets and project-based layering examples with app-facing colour labels.
- `commercial-combo-matrices.json`: matrix-style commercial combo indexes and highlighted stack records, including AMACO layering families.
- `commercial-swatch-library.json`: app-facing swatch cards for high-value commercial glaze products and grounds.
- `umf-targets.json`: broad chemistry target ranges and family chemistry signals.
- `clay-compatibility.json`: clay-body fit tendencies and compatibility rules.
- `firing-schedules.json`: schedule principles and reference firing programs.
- `substitutions.json`: chemistry-preserving substitution guidance.
- `durability-guidelines.json`: durability, liner, and functional-ware guidance.
- `defect-troubleshooting.json`: if/then defect diagnosis and corrective actions.
- `process-controls.json`: specific gravity, rheology, and slurry-control guidance.
- `glaze-families.json`: style-family knowledge and tradition-level descriptors.
- `atmosphere-effects.json`: colorant and family response to atmosphere and cooling.
- `testing-workflows.json`: experiment design, testing workflows, and record schema.
- `visual-metadata.json`: app-facing visual descriptors such as gloss, opacity, and run risk.

## Scope

The pack covers:

- glaze chemistry fundamentals
- cone and heatwork basics
- kiln and atmosphere types
- clay body families
- application methods and glaze traditions
- common raw materials and oxides
- colour and surface families
- common glaze defects and likely fixes
- studio safety notes
- a curated cross-range recipe set from earthenware, mid-fire, high-fire, and raku sources
- expanded Digitalfire reference recipes for fit, clarity, matte, floating blue, iron red, and cone-10 comparison
- natural-base glaze families built from Alberta Slip and Ravenscrag Slip
- fluid-melt cone-6 references that contrast with stable liner-style glazes
- recipe lineages that explain how formula changes affect fit, clarity, matte behavior, and reactivity
- goal-driven recipe selection logic for common workshop intents
- expanded goal routing for majolica, underglaze-plus-clear, engobe grounds, stain-host selection, high-fire traditions, raku branches, and commercial layering splits
- adjustment programs that map glaze problems and desired shifts to the next likely test path
- stain-host compatibility logic for stable clears, mattes, and zinc-free commercial hosts
- coating recipe templates for non-glaze surface systems such as engobes, underglazes, terra sigillata, oxide washes, and overglaze refire accents
- body-specific glaze recommendations derived from published manufacturer body data
- stain systems, decorating layers, and post-glaze decoration paths
- clay-fit and porosity guidance
- body-property ranges, shrinkage math, and vitrification behavior
- manufacturer body data for real commercial clay selections
- commercial product-line behavior for underglazes and brush-on glaze systems
- commercial layering rules, host-clear choices, and combo-safety cautions
- official commercial combo-sheet records and project-layer examples for Mayco glaze systems
- official AMACO combo indexes, highlighted stacks, and direction-sensitive layering families
- app-facing commercial swatch cards for selected AMACO and Mayco glaze products
- firing schedules and process-control knowledge
- expanded workflow patterns for thickness ladders, stain-host panels, coating-stack matrices, overglaze refire logs, and raku reduction logs
- substitution and UMF target guidance
- durability and troubleshooting systems, including decorative and layered-surface fault trees
- glaze-family and atmosphere-response knowledge
- testing workflows and app-facing visual descriptors

## Data conventions

- `sourceIds` link records back to `sources.json`.
- `materialId` points to a normalized raw-material entry even when the original recipe used a brand or trade name.
- `sourceLabel` preserves the ingredient wording used in the source recipe when it matters.
- cone ranges are stored as source text because heatwork depends on firing rate, soak, and atmosphere.
- some `styleIds`, `colourIds`, `surfaceIds`, `kilnIds`, and `atmosphereIds` are inferred from recipe family or standard ceramic practice when the source recipe page did not explicitly say so.

## Limits

- This is a large seed set, not a claim that every glaze recipe on the internet has been captured.
- Food-surface suitability is intentionally conservative. Recipes with lead, soluble barium, raku firing, or unclear durability should be treated as `test-only` or `decorative-only` until leach and fit testing is done.
- Cone temperatures are approximate because Orton cones measure heatwork, not peak temperature alone.
