# Glaze Workshop

A ceramics portfolio and practical reference tool — a personal glaze library with search, filtering, a batch calculator with live UMF chemistry, a custom recipe editor, learning paths, a glossary, and a troubleshooting guide.

---

## Requirements

- **Node.js** v18 or later — download from [nodejs.org](https://nodejs.org)
  - The installer also installs `npm`, which is what you use to run commands
  - To check if you already have it: open a terminal and run `node -v`

No other software, database, or account is required. Everything runs locally in your browser.

---

## Setup

Open a terminal, navigate to this folder, and run:

```bash
npm install
```

This downloads all dependencies into a `node_modules/` folder. It only needs to be run once (or again after pulling new changes).

---

## Running the app

```bash
npm run dev
```

Open your browser to **http://localhost:5173**

The page hot-reloads automatically when you save changes to any file.

```bash
npm run build     # compile for production → output goes to dist/
npm run preview   # preview the production build locally before deploying
```

No test runner is configured.

---

## What's inside

### Recipe Workshop (`/workshop`)
Browse 300+ reference recipes across 8 collections (high-fire, mid-fire, earthenware, raku, Digitalfire core/extended/slip). Filter by firing range, atmosphere, color, surface, style, glaze family, and tableware use status. Full-text fuzzy search via Fuse.js. Save and load filter sets. Compare up to 3 recipes side by side.

Opening any recipe slides out a detail drawer with:
- Full ingredient list with material info panels, substitution switcher, switching playbooks, and ingredient-to-workshop search links
- UMF glaze chemistry — unity-normalised oxide breakdown across 4 groups (R₂O, RO, R₂O₃, RO₂), Si:Al ratio, expansion index, LOI, and contextual interpretation notes compared to firing-range targets
- "What If?" variation generator — adjust any ingredient and preview the chemistry delta
- Visual character scores (gloss, opacity, variation, run risk, texture)
- Colorant combination hints when multiple colorants are detected
- Similar recipes, cross-range similar, and visual twins
- Colour development guides, firing programs, and body response data
- Application guide (thickness, specific gravity, dipping time, layering)
- Recipe explanation (plain-language summary of what the recipe does and why)
- Safety cautions and source attribution
- Copy to clipboard, Export PDF, Open in Calculator, and Make My Version actions

### Chemistry Explorer (`/chemistry`)
Interactive scatter plots of SiO₂ vs Al₂O₃ across all recipes, colored by firing range. Compare two recipes side by side with full oxide breakdown. Oxide encyclopedia with 15 oxides explained. Line blend calculator. Material breakdown showing which materials contribute which oxides. UMF benchmarks by firing range.

### Batch Calculator (`/calculator`)
Load any recipe, set a target batch weight, and get gram amounts per ingredient. Batch history tracks past calculations. Save any scaled batch as a custom recipe. Full recipe reference in the side panel.

### My Recipes (`/my-recipes`, `/my-recipes/:id`)
Create and edit custom recipes with ingredient sliders, a live percentage total, change-impact panels per ingredient, caution and style tag editing, and auto-save (debounced 1 second). Version history with restore. Export/import as JSON. Live UMF chemistry sidebar.

### Color Atlas (`/colors`)
Visual swatch grid of all color profiles with gloss, opacity, variation, run risk, texture, crackle, and pooling scores. Filter by family and firing range. Chemistry summary per profile.

### Learn (`/learn`)
Three guided learning paths (Cone 6 Basics, Understanding Matte, Fixing Crazing) with step-by-step recipe and concept sequences.

### Glossary (`/glossary`)
120+ ceramics terms across 14 categories with search and cross-navigation. Each entry has a plain explanation, an analogy, and a "why it matters" note.

### Troubleshooter (`/troubleshooter`)
Decision-tree guide for 7 common glaze defects: crazing, shivering, pinholing, blistering, crawling, running, and cutlery marking. Step-by-step procedures for each fix.

### Saved Recipes (`/favorites`)
All heart-saved recipes in one place. Count shown live in the nav.

---

## Data

Recipe JSON lives in `public/knowledge/glaze/` (8 recipe files + taxonomy, colour-profiles, visual-metadata, glaze-families, plus expansion data: colour guides, firing programs, body response, materials, playbooks, benchmarks, step-by-step instructions). All loaded in parallel on app mount via `glazeStore.loadAll()`.

Reference data compiled into the app bundle (`src/data/`):
- `material-analyses.ts` — oxide weight percentages and LOI for 63 ceramic materials with cost tiers, used for UMF calculation
- `materials-knowledge.ts` — material descriptions, change impacts, substitutions, colorant ranges
- `glossary.ts` — 120+ ceramics terms with seeAlso cross-links
- `learning-paths.ts` — 3 guided learning paths with recipe and concept sequences
- `cautions.ts` — safety warnings (barium, manganese, food-surface testing, etc.)
- `sources.ts` — recipe source attribution (70+ entries)
- `colorant-combinations.ts` — combined colorant effects for 25+ pairs
- `application-notes.ts` — thickness, specific gravity, and layering guidance by firing range and surface
- `recipe-import.ts` — material name alias mapping for 95+ materials (Glazy/Digitalfire import support)

---

## Tech

Vue 3 · Vite 7 · TypeScript · Pinia · Vue Router 4 · GSAP · Fuse.js · VueUse · PWA (vite-plugin-pwa)

No Tailwind — custom CSS variables throughout (`src/assets/styles/variables.css`).

Palette: `--cream`, `--parchment`, `--chalk`, `--carbon`, `--clay`, `--sage`, `--stone`, `--ink`
Fonts: Playfair Display (display) · Lora (body) · Space Mono (data/labels)
