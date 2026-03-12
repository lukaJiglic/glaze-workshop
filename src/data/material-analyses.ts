// ─── Material oxide analyses for UMF chemistry calculation ────────────────────
//
// Oxide percentages are weight % of the RAW (unfired) material as received.
// This is the standard ceramic chemistry convention used in Digitalfire, Insight,
// and most published analyses. No LOI correction is needed during oxide calculation
// — the percentages already tell you how many grams of each oxide you get per
// 100g of raw material. LOI is stored for reference (batch weight, pinhole risk).
//
// Sources: Digitalfire reference database, Hansen "Digitalfire Ceramic Materials"
// database, Hamer & Hamer "The Potter's Dictionary", Insight-Live published analyses.

export interface MaterialAnalysis {
  loi: number                    // Loss on Ignition, weight % (CO2, H2O released during firing)
  oxides: Record<string, number> // oxide id → weight % of raw material
  note?: string                  // data quality note (e.g. "variable — typical average")
}

// ─── Oxide molecular weights (g/mol) ──────────────────────────────────────────
export const OXIDE_MW: Record<string, number> = {
  sio2:  60.09,
  al2o3: 101.96,
  b2o3:  69.62,
  cao:   56.08,
  mgo:   40.30,
  k2o:   94.20,
  na2o:  61.98,
  li2o:  29.88,
  zno:   81.38,
  bao:   153.33,
  sro:   103.62,
  fe2o3: 159.69,
  tio2:  79.87,
  zro2:  123.22,
  mno:   70.94,
  mno2:  86.94,
  p2o5:  141.94,
  coo:   74.93,
  cuo:   79.55,
  cr2o3: 152.00,
  nio:   74.69,
  sno2:  150.71,
}

// ─── Oxide group classification ────────────────────────────────────────────────
export type OxideGroup = 'r2o' | 'ro' | 'r2o3' | 'ro2' | 'colorant' | 'other'

export const OXIDE_GROUPS: Record<string, OxideGroup> = {
  // R₂O — monovalent alkali fluxes (high expansion, strong melters)
  na2o: 'r2o', k2o: 'r2o', li2o: 'r2o',
  // RO — divalent earth fluxes (moderate expansion, durability)
  cao: 'ro', mgo: 'ro', zno: 'ro', bao: 'ro', sro: 'ro', mno: 'ro',
  // R₂O₃ — intermediate oxides (stiffeners, stabilisers)
  al2o3: 'r2o3', b2o3: 'r2o3', fe2o3: 'r2o3', cr2o3: 'r2o3',
  // RO₂ — glass-forming oxides (network formers)
  sio2: 'ro2', tio2: 'ro2', zro2: 'ro2', sno2: 'ro2', mno2: 'ro2',
  // Colorants — tracked but excluded from flux normalisation
  coo: 'colorant', cuo: 'colorant', nio: 'colorant',
  // Other
  p2o5: 'other',
}

// ─── Human-readable oxide labels ──────────────────────────────────────────────
export const OXIDE_LABELS: Record<string, string> = {
  sio2: 'SiO₂', al2o3: 'Al₂O₃', b2o3: 'B₂O₃',
  cao: 'CaO', mgo: 'MgO', k2o: 'K₂O', na2o: 'Na₂O', li2o: 'Li₂O',
  zno: 'ZnO', bao: 'BaO', sro: 'SrO', mno: 'MnO', mno2: 'MnO₂',
  fe2o3: 'Fe₂O₃', tio2: 'TiO₂', zro2: 'ZrO₂', p2o5: 'P₂O₅',
  coo: 'CoO', cuo: 'CuO', cr2o3: 'Cr₂O₃', nio: 'NiO', sno2: 'SnO₂',
}

// ─── Expansion coefficients (Seger approximation, × 10⁻⁷/°C per unity mole) ──
// Used to estimate thermal expansion of the fired glaze relative to the clay body.
// A typical stoneware clay body runs 55–65 × 10⁻⁷/°C. A well-fitting glaze should
// sit just below the body — slight compression prevents crazing.
export const EXPANSION_FACTORS: Record<string, number> = {
  na2o:  39.4,
  k2o:   28.6,
  li2o:  27.0,
  cao:   13.0,
  mgo:    0.0,
  zno:    5.0,
  bao:   20.0,
  sro:   16.0,
  mno:    4.0,
  b2o3:   7.0,
  al2o3: -6.0,
  fe2o3:  4.0,
  sio2:   3.8,
  tio2:   8.0,
  zro2:   2.0,
}

// ─── UMF target ranges by firing range ────────────────────────────────────────
// These are widely-used studio heuristics, not hard rules. They define what
// "typical" chemistry looks like for each temperature range and help identify
// unusual recipes that might need testing or adjustment.
export interface UMFTargets {
  sio2: [number, number]     // [min, max] unity moles
  al2o3: [number, number]
  b2o3?: [number, number]
  knao: [number, number]     // K2O + Na2O combined
  siToAl: [number, number]
  expansion: [number, number] // acceptable index range
  label: string
  note: string
}

export const UMF_TARGETS: Record<string, UMFTargets> = {
  'high-fire': {
    sio2: [2.5, 5.0], al2o3: [0.25, 0.60], knao: [0.10, 0.45],
    siToAl: [7, 13], expansion: [40, 65],
    label: 'Cone 9–11',
    note: 'High-fire feldspathic glazes rely on SiO₂ and Al₂O₃ for durability. Low B₂O₃ or none. CaO often 0.4–0.7.',
  },
  'mid-fire': {
    sio2: [2.5, 4.5], al2o3: [0.25, 0.55], b2o3: [0.0, 0.40], knao: [0.15, 0.55],
    siToAl: [6, 11], expansion: [38, 62],
    label: 'Cone 4–8',
    note: 'Mid-fire glazes often use boron frits to lower melting point. More flexibility in chemistry than high-fire.',
  },
  'low-fire': {
    sio2: [1.2, 2.8], al2o3: [0.05, 0.30], b2o3: [0.20, 0.70], knao: [0.10, 0.60],
    siToAl: [4, 10], expansion: [35, 60],
    label: 'Cone 06–2',
    note: 'Low-fire glazes depend heavily on boron frits for melting. Lower SiO₂ and Al₂O₃ are normal at these temperatures.',
  },
  'raku': {
    sio2: [1.5, 3.0], al2o3: [0.10, 0.40], b2o3: [0.10, 0.50], knao: [0.15, 0.60],
    siToAl: [4, 10], expansion: [35, 70],
    label: 'Raku',
    note: 'Raku chemistry is secondary to thermal-shock resistance of the clay body. Surface effects override chemistry concerns.',
  },
}

// ─── Material analyses ─────────────────────────────────────────────────────────

export const materialAnalyses = new Map<string, MaterialAnalysis>([

  // ── GLASS FORMERS ─────────────────────────────────────────────────────────
  ['silica', {
    loi: 0,
    oxides: { sio2: 100.0 },
  }],

  // ── STABILISERS / KAOLINS ─────────────────────────────────────────────────
  ['kaolin', {
    loi: 13.9,
    oxides: { sio2: 46.54, al2o3: 39.50, fe2o3: 0.10 },
    note: 'Theoretical pure kaolin analysis',
  }],
  ['epk-kaolin', {
    loi: 13.6,
    oxides: { sio2: 45.76, al2o3: 37.36, tio2: 0.37, fe2o3: 0.70 },
    note: 'Edgar Plastic Kaolin, Florida. Warm tint from TiO₂ and Fe₂O₃.',
  }],
  ['grolleg-kaolin', {
    loi: 13.3,
    oxides: { sio2: 47.28, al2o3: 36.23, tio2: 0.02, fe2o3: 0.60 },
    note: 'English premium kaolin. Very low TiO₂ = neutral white fired result.',
  }],
  ['calcined-kaolin', {
    loi: 0,
    oxides: { sio2: 53.50, al2o3: 45.50 },
    note: 'Pre-fired kaolin (Glomax LL). No LOI — same fired chemistry as raw kaolin.',
  }],
  ['ball-clay', {
    loi: 10.5,
    oxides: { sio2: 63.10, al2o3: 21.70, tio2: 1.71, fe2o3: 1.10, mgo: 0.30, k2o: 0.60 },
    note: 'OM4 typical analysis. Higher Fe₂O₃ and TiO₂ than kaolin — warm tint.',
  }],
  ['bentonite', {
    loi: 8.0,
    oxides: { sio2: 61.0, al2o3: 21.0, fe2o3: 3.0, mgo: 3.0, cao: 0.7, na2o: 2.6 },
    note: 'Wyoming bentonite. Used at 1–3% only — contributes little to UMF.',
  }],

  // ── FELDSPARS ─────────────────────────────────────────────────────────────
  ['potash-feldspar', {
    loi: 0.3,
    oxides: { sio2: 65.70, al2o3: 18.00, k2o: 11.50, na2o: 3.20 },
    note: 'Generic potash feldspar representative analysis.',
  }],
  ['custer-feldspar', {
    loi: 0.3,
    oxides: { sio2: 68.70, al2o3: 17.00, k2o: 9.70, na2o: 3.00, cao: 0.30 },
    note: 'Post-2010 Custer formula. Na₂O ~3% (up from earlier batches). Test if using old recipes.',
  }],
  ['g200-feldspar', {
    loi: 0.3,
    oxides: { sio2: 66.60, al2o3: 17.70, k2o: 13.20, na2o: 1.50, cao: 0.20 },
    note: 'G200 HP current formula. Higher K₂O than original G-200 (8.9%). Not a clean 1:1 sub.',
  }],
  ['soda-feldspar', {
    loi: 0.3,
    oxides: { sio2: 67.00, al2o3: 19.40, na2o: 9.90, k2o: 1.50, cao: 0.20 },
    note: 'Minspar 200 / Kona F-4 representative. Higher expansion than potash feldspar.',
  }],
  ['nepheline-syenite', {
    loi: 0.5,
    oxides: { sio2: 60.40, al2o3: 23.30, na2o: 9.80, k2o: 4.60, cao: 0.70, fe2o3: 0.08 },
    note: 'Strong melter at mid-fire temps. High Na₂O — raises thermal expansion.',
  }],
  ['cornwall-stone', {
    loi: 1.2,
    oxides: { sio2: 73.76, al2o3: 15.29, k2o: 4.44, na2o: 3.22, cao: 1.56, mgo: 0.05 },
    note: 'Traditional English felspathic stone. High SiO₂ stiffens the melt.',
  }],

  // ── CALCIUM AND EARTH FLUXES ──────────────────────────────────────────────
  ['whiting', {
    loi: 43.9,
    oxides: { cao: 56.03 },
    note: 'Pure CaCO₃. High LOI (CO₂ release) — fire slowly to avoid pinholes.',
  }],
  ['wollastonite', {
    loi: 2.0,
    oxides: { sio2: 51.72, cao: 48.28 },
    note: 'CaSiO₃. Provides CaO without CO₂ gas. Adds SiO₂ — adjust recipe accordingly.',
  }],
  ['dolomite', {
    loi: 46.6,
    oxides: { cao: 30.41, mgo: 21.86 },
    note: 'CaMg(CO₃)₂. Very high LOI — significant pinhole risk if fired too fast.',
  }],
  ['talc', {
    loi: 5.5,
    oxides: { sio2: 63.37, mgo: 31.88 },
    note: 'Mg₃Si₄O₁₀(OH)₂. MgO pushes surface toward silky matte. Adds considerable SiO₂.',
  }],
  ['strontium-carbonate', {
    loi: 29.8,
    oxides: { sro: 70.19 },
    note: 'SrCO₃. Low-expansion alternative to BaCO₃ without the toxicity.',
  }],
  ['barium-carbonate', {
    loi: 22.3,
    oxides: { bao: 77.70 },
    note: 'BaCO₃. TOXIC. Unique crawled matte surfaces. Not for functional ware.',
  }],
  ['bone-ash', {
    loi: 3.3,
    oxides: { cao: 54.25, p2o5: 45.75 },
    note: 'Ca₃(PO₄)₂. Phosphorus creates opalescence and milkiness. 1–3% in transparent glazes.',
  }],

  // ── BORON AND ZINC FLUXES ─────────────────────────────────────────────────
  ['zinc-oxide', {
    loi: 0,
    oxides: { zno: 100.0 },
  }],
  ['gerstley-borate', {
    loi: 26.7,
    oxides: { b2o3: 26.28, cao: 20.80, mgo: 2.00, na2o: 3.30, sio2: 6.09 },
    note: 'Highly variable natural mineral. Chemistry changes batch to batch — expect results to drift.',
  }],
  ['colemanite', {
    loi: 21.7,
    oxides: { b2o3: 27.26, cao: 27.28, sio2: 0.80 },
    note: 'More consistent than Gerstley Borate. Good boron + calcium source.',
  }],

  // ── FRITS ─────────────────────────────────────────────────────────────────
  ['ferro-frit-3134', {
    loi: 0,
    oxides: { b2o3: 23.04, cao: 20.16, na2o: 10.64, sio2: 46.16 },
    note: 'Consistent borosilicate frit. High Na₂O → moderate crazing tendency.',
  }],
  ['ferro-frit-3124', {
    loi: 0,
    oxides: { b2o3: 14.00, cao: 14.00, na2o: 9.00, al2o3: 10.00, sio2: 53.00 },
    note: 'More Al₂O₃ than 3134 — stiffer melt, better for glazes that tend to run.',
  }],
  ['ferro-frit-3195', {
    loi: 0,
    oxides: { b2o3: 23.00, cao: 10.00, mgo: 3.00, na2o: 5.00, al2o3: 4.00, sio2: 55.00 },
    note: 'Good all-round frit. Lower Na₂O than 3134 — less crazing risk.',
  }],
  ['ferro-frit-3110', {
    loi: 0,
    oxides: { b2o3: 12.00, cao: 0.20, na2o: 17.50, k2o: 0.20, al2o3: 8.00, sio2: 62.00 },
    note: 'Very high Na₂O (17.5%). Aggressive low-fire melter. High crazing risk on most bodies.',
  }],
  ['ferro-frit-3249', {
    loi: 0,
    oxides: { b2o3: 22.00, mgo: 13.50, na2o: 1.50, al2o3: 2.00, sio2: 61.00 },
    note: 'Lowest-expansion Ferro frit. MgO + low Na₂O = excellent crazing correction tool.',
  }],
  ['ferro-frit-4110', {
    loi: 0,
    oxides: { b2o3: 12.00, cao: 22.00, al2o3: 6.00, sio2: 60.00 },
    note: 'High-calcium low-fire frit. Durable food-safe earthenware base.',
  }],
  ['ferro-frit-3107', {
    loi: 0,
    oxides: { b2o3: 7.00, cao: 10.00, na2o: 5.50, al2o3: 10.00, sio2: 67.50 },
    note: 'Standard low-fire clear frit. Classic earthenware and majolica base.',
  }],

  // ── LITHIUM MATERIALS ─────────────────────────────────────────────────────
  ['spodumene', {
    loi: 0,
    oxides: { li2o: 7.66, al2o3: 27.40, sio2: 64.58 },
    note: 'LiAlSi₂O₆. Li₂O brightens colours and lowers expansion. Also adds substantial Al₂O₃ + SiO₂.',
  }],
  ['lithium-carbonate', {
    loi: 59.6,
    oxides: { li2o: 40.44 },
    note: 'Li₂CO₃. Pure lithium flux. Very high LOI — use sparingly. Small amounts have dramatic effect.',
  }],

  // ── NATURAL SLIP MATERIALS ────────────────────────────────────────────────
  ['alberta-slip', {
    loi: 10.6,
    oxides: { sio2: 57.0, al2o3: 13.5, fe2o3: 5.70, mgo: 2.6, cao: 4.3, k2o: 3.2, na2o: 0.9, tio2: 0.9 },
    note: 'Natural Alberta clay slip. Rich iron (5.7% Fe₂O₃) gives amber-brown in reduction.',
  }],
  ['ravenscrag-slip', {
    loi: 8.0,
    oxides: { sio2: 63.3, al2o3: 14.2, fe2o3: 1.80, mgo: 2.4, cao: 7.0, k2o: 3.7, na2o: 0.4, tio2: 0.4 },
    note: 'Saskatchewan natural clay. Lower Fe₂O₃ than Alberta — lighter, more transparent result.',
  }],
  ['barnard-clay', {
    loi: 8.0,
    oxides: { sio2: 48.0, al2o3: 16.0, fe2o3: 16.0, mgo: 1.0, cao: 0.5, k2o: 3.7, na2o: 0.2, tio2: 1.3 },
    note: 'Very high iron (16%) and manganese. Supply exhausted — reformulate from alternatives.',
  }],

  // ── ASH AND SODIUM MATERIALS ──────────────────────────────────────────────
  ['wood-ash', {
    loi: 30.0,
    oxides: { cao: 20.0, mgo: 5.0, k2o: 10.0, p2o5: 5.0, sio2: 15.0, na2o: 2.0 },
    note: 'Variable — highly dependent on wood species. Values are typical averages. Wash to remove solubles.',
  }],
  ['soda-ash', {
    loi: 41.5,
    oxides: { na2o: 58.49 },
    note: 'Na₂CO₃. Very soluble — migrates to glaze surface as it dries. Key to American Shino carbon trapping.',
  }],

  // ── OPACIFIERS ────────────────────────────────────────────────────────────
  ['tin-oxide', {
    loi: 0,
    oxides: { sno2: 100.0 },
  }],
  ['zirconium-silicate', {
    loi: 0,
    oxides: { zro2: 65.28, sio2: 34.72 },
    note: 'Zircopax / Opax. Cheaper than tin. Contributes SiO₂ to the recipe chemistry.',
  }],
  ['titanium-dioxide', {
    loi: 0,
    oxides: { tio2: 100.0 },
  }],
  ['rutile', {
    loi: 0,
    oxides: { tio2: 95.0, fe2o3: 4.0 },
    note: 'Natural TiO₂ with iron impurities. Batch variation is part of its charm.',
  }],

  // ── IRON COLORANTS ────────────────────────────────────────────────────────
  ['red-iron-oxide', {
    loi: 0,
    oxides: { fe2o3: 99.0 },
  }],
  ['yellow-iron-oxide', {
    loi: 10.0,
    oxides: { fe2o3: 89.0 },
  }],
  ['black-iron-oxide', {
    loi: 0,
    oxides: { fe2o3: 96.0 },
    note: 'Fe₃O₄ oxidation state — slightly more fluid than red iron at same %.',
  }],
  ['ilmenite', {
    loi: 0,
    oxides: { tio2: 52.66, fe2o3: 44.00 },
    note: 'FeTiO₃ — iron titanate. Use coarse granular form for visible dark speckle.',
  }],

  // ── OTHER COLORANTS ───────────────────────────────────────────────────────
  ['cobalt-carbonate', {
    loi: 37.0,
    oxides: { coo: 63.0 },
  }],
  ['cobalt-oxide', {
    loi: 0,
    oxides: { coo: 100.0 },
  }],
  ['copper-carbonate', {
    loi: 28.0,
    oxides: { cuo: 72.0 },
    note: 'Basic copper carbonate Cu₂(OH)₂CO₃. Standard colorant form.',
  }],
  ['copper-oxide', {
    loi: 0,
    oxides: { cuo: 100.0 },
    note: 'Black copper oxide CuO. ~25% stronger than carbonate per gram.',
  }],
  ['manganese-dioxide', {
    loi: 0,
    oxides: { fe2o3: 0, mno2: 100.0 },
    note: 'Note: in UMF, MnO₂ is a glass former. Colorant contribution tracked separately.',
  }],
  ['manganese-carbonate', {
    loi: 38.3,
    oxides: { mno: 61.73 },
    note: 'MnCO₃ → MnO after firing. Gentler form of manganese — slightly lower LOI than MnO₂.',
  }],
  ['chrome-oxide', {
    loi: 0,
    oxides: { cr2o3: 100.0 },
  }],
  ['nickel-oxide', {
    loi: 0,
    oxides: { nio: 100.0 },
  }],

  // ── SUSPENSION AIDS ───────────────────────────────────────────────────────
  ['epsom-salt', {
    loi: 0,
    oxides: { mgo: 16.4 },
    note: 'MgSO₄·7H₂O. Minimal chemistry contribution at 0.1–0.5% use levels.',
  }],
])
