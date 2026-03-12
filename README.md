# Glaze Workshop

A ceramics portfolio and practical reference tool — a personal glaze library with search, filtering, a batch calculator with live UMF chemistry, a custom recipe editor, and a troubleshooting guide.

---

## Requirements

You need **Node.js** installed on your machine. That's the only system dependency.

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
Browse 300+ reference recipes across 8 collections (high-fire, mid-fire, earthenware, raku, Digitalfire core/extended/slip). Filter by firing range, atmosphere, color, surface, style, glaze family, and tableware use status. Full-text fuzzy search via Fuse.js.

Opening any recipe slides out a detail drawer with:
- Full ingredient list with material info panels, substitution switcher, and ingredient-to-workshop search links
- UMF glaze chemistry — unity-normalised oxide breakdown across 4 groups (R₂O, RO, R₂O₃, RO₂), Si:Al ratio, expansion index, LOI, and contextual interpretation notes compared to firing-range targets
- Visual character scores (gloss, opacity, variation, run risk, texture)
- Colorant combination hints when multiple colorants are detected
- Similar recipes based on shared ingredients within the same firing range
- Safety cautions and source attribution
- Copy to clipboard, Open in Calculator, and Make My Version actions

### Batch Calculator (`/calculator`)
Load any recipe, set a target batch weight, and get gram amounts per ingredient. The side panel is a full recipe reference: color swatch, cone/atmosphere tags, cautions, UMF chemistry (weight bars + oxide breakdown), character scores, colorant combination hints, notes, similar recipes you can load in one click, and actions (Make My Version, Open in Workshop, copy).

### My Recipes (`/my-recipes`, `/my-recipes/:id`)
Create and edit custom recipes with ingredient sliders, a live percentage total, change-impact panels per ingredient, and auto-save (debounced 1 second). The sidebar shows a live summary, ingredient breakdown, and live UMF chemistry that updates as you move sliders. All custom recipes are persisted to `localStorage`.

### Color Atlas (`/colors`)
Visual swatch grid of all color profiles with gloss, opacity, variation, run risk, texture, crackle, and pooling scores.

### Troubleshooter (`/troubleshooter`)
Decision-tree guide for 7 common glaze defects: crazing, shivering, pinholing, blistering, crawling, running, and cutlery marking.

### Saved Recipes (`/favorites`)
All heart-saved recipes in one place. Count shown live in the nav.

---

## Data

Recipe JSON lives in `public/knowledge/glaze/` (8 recipe files + taxonomy, colour-profiles, visual-metadata, glaze-families). All loaded in parallel on app mount via `glazeStore.loadAll()`.

Reference data compiled into the app bundle (`src/data/`):
- `material-analyses.ts` — oxide weight percentages and LOI for ~55 ceramic materials, used for UMF calculation
- `materials-knowledge.ts` — material descriptions, change impacts, substitutions, colorant ranges
- `glossary.ts` — 45+ ceramics terms for hover tooltips
- `cautions.ts` — safety warnings (barium, manganese, food-surface testing, etc.)
- `sources.ts` — recipe source attribution
- `colorant-combinations.ts` — combined colorant effects for 12 common pairs

---

## Tech

Vue 3 · Vite 7 · TypeScript · Pinia · Vue Router 4 · GSAP · Fuse.js · VueUse

No Tailwind — custom CSS variables throughout (`src/assets/styles/variables.css`).

Palette: `--cream`, `--parchment`, `--chalk`, `--carbon`, `--clay`, `--sage`, `--stone`, `--ink`
Fonts: Playfair Display (display) · Lora (body) · Space Mono (data/labels)
