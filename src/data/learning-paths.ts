export interface LearningStep {
  type: 'explanation' | 'recipe' | 'exercise'
  title: string
  content: string           // markdown-like plain text
  recipeId?: string         // if type === 'recipe', links to a recipe
  highlightOxides?: string[] // oxides to call attention to in chemistry
  tip?: string              // beginner tip callout
}

export interface LearningPath {
  id: string
  title: string
  subtitle: string
  icon: string
  difficulty: 'beginner' | 'intermediate' | 'advanced'
  estimatedMinutes: number
  steps: LearningStep[]
}

export const learningPaths: LearningPath[] = [
  // ── PATH 1: Cone 6 Oxidation ─────────────────────────────────────────────
  {
    id: 'cone-6-oxidation',
    title: 'Understanding Cone 6 Oxidation',
    subtitle: 'The most popular firing range for studio potters — learn why, and explore the recipes that define it.',
    icon: '◈',
    difficulty: 'beginner',
    estimatedMinutes: 15,
    steps: [
      {
        type: 'explanation',
        title: 'Why Cone 6?',
        content: 'Cone 6 (roughly 1220 °C) is the sweet spot of studio ceramics. It\'s hot enough to fully vitrify stoneware — making it strong, waterproof, and food-safe — but cool enough for most electric kilns to reach without excessive wear. Almost every community studio and teaching program fires at cone 6 oxidation.',
        tip: 'If you\'re just starting out, cone 6 oxidation in an electric kiln is the easiest path to reliable, functional pottery.',
      },
      {
        type: 'explanation',
        title: 'What "Oxidation" Means',
        content: 'In an electric kiln, there\'s plenty of oxygen in the atmosphere. This means metal oxides in the glaze stay fully oxidized — iron stays as Fe₂O₃ (giving browns and ambers), copper stays as CuO (giving greens). The results are clean, repeatable, and predictable. This is the opposite of reduction firing, where oxygen-starved gas kilns create dramatically different colors from the same materials.',
      },
      {
        type: 'recipe',
        title: 'Start Simple: A Clear Glaze',
        content: 'Every glaze journey starts with a clear. This frit-based transparent is as simple as it gets — a frit provides pre-melted glass components, kaolin suspends it, and silica adjusts the melt. It\'s the "white rice" of glazing: boring on its own, essential as a foundation.',
        recipeId: 'translucent-clear-gloss',
        highlightOxides: ['SiO2', 'B2O3'],
        tip: 'A good clear glaze is the most useful recipe you can have — it works over underglazes, slips, and as a liner glaze inside pots.',
      },
      {
        type: 'recipe',
        title: 'Adding Opacity: White Matte',
        content: 'Now add an opacifier (tin oxide or zirconium silicate) and shift the chemistry toward matte. This glaze hides the clay body and produces a soft, tactile surface. Notice how the ingredients change: more talc (contributing MgO for smoothness) and less of the aggressive fluxes.',
        recipeId: 'smooth-white-matte',
        highlightOxides: ['MgO', 'Al2O3'],
      },
      {
        type: 'recipe',
        title: 'The Satin Sweet Spot',
        content: 'Between matte and glossy lives satin — a surface with a soft sheen that\'s practical for dinnerware (easy to clean) and beautiful to look at. This recipe balances alumina (matte-maker) and flux (gloss-maker) right in the middle zone.',
        recipeId: 'clear-satin-matte',
        highlightOxides: ['Al2O3', 'CaO'],
        tip: 'Satin glazes are the best all-rounders for functional ware — they look good, feel good, and clean easily.',
      },
      {
        type: 'recipe',
        title: 'Adding Color: Iron Red',
        content: 'Iron oxide is the most versatile colorant in ceramics. At 2% it\'s a warm amber; at 8% a rich brown; at 15% (like this recipe) it creates a striking red-orange with dark pooling where the glaze is thick. The high iron content also makes the glaze more fluid — watch for running.',
        recipeId: 'randys-red',
        highlightOxides: ['Fe2O3'],
        tip: 'Iron red glazes are temperature-sensitive: fire to exactly cone 6. Even half a cone too high kills the red.',
      },
      {
        type: 'recipe',
        title: 'Surface Complexity: Iron-Rutile Texture',
        content: 'This recipe combines iron (color) and rutile (variegation) to create a rich, textured surface with multiple tones breaking over form. Rutile (TiO₂) creates micro-crystalline effects during cooling that make every piece unique. This is where glazing starts to feel like alchemy.',
        recipeId: 'helens-matt-textured-rust',
        highlightOxides: ['Fe2O3', 'TiO2'],
      },
      {
        type: 'exercise',
        title: 'Your Turn',
        content: 'Open the Workshop and filter to cone 6, oxidation. Browse the recipes and notice the pattern: most use feldspar + silica + whiting as a base, then add kaolin for alumina and colorants for interest. Try comparing a glossy and a matte side by side in Compare Mode — look at how the Si:Al ratio differs.',
        tip: 'Use the Chemistry Explorer\'s scatter plot to see where these cone 6 recipes cluster on the Si:Al vs flux chart.',
      },
    ],
  },

  // ── PATH 2: Your First Matte Glaze ───────────────────────────────────────
  {
    id: 'first-matte',
    title: 'Your First Matte Glaze',
    subtitle: 'What makes a glaze matte? Three different chemical mechanisms, three different surfaces.',
    icon: '◐',
    difficulty: 'intermediate',
    estimatedMinutes: 12,
    steps: [
      {
        type: 'explanation',
        title: 'What Makes Matte?',
        content: 'A glossy glaze is a smooth, continuous sheet of glass. Matte glazes break that smoothness — but there are several ways to do it. The three main mechanisms are: high alumina (the glass is stiff and doesn\'t flow smooth), high magnesia (micro-crystals grow during cooling), and underfiring (the glaze simply didn\'t melt enough). The first two are intentional and beautiful. The third is a defect.',
      },
      {
        type: 'recipe',
        title: 'Mechanism 1: Magnesia (MgO) Matte',
        content: 'Talc and dolomite contribute MgO, which produces the classic "silky matte" — buttery smooth, pleasant to touch, with a gentle sheen. MgO encourages tiny crystals to form as the glaze cools, scattering light instead of reflecting it. This is the most popular matte mechanism for functional ware.',
        recipeId: 'sx-midfire-silky-functional-matte',
        highlightOxides: ['MgO'],
        tip: 'MgO mattes tend to have low thermal expansion, which means less crazing. They\'re naturally food-safe-friendly.',
      },
      {
        type: 'recipe',
        title: 'Mechanism 2: Alumina (Al₂O₃) Matte',
        content: 'High alumina stiffens the melt so much that the glaze surface can\'t flow smooth. The result is a drier, more textured matte than MgO — sometimes called a "dry matte." Too much alumina and the glaze feels rough; the right amount gives an elegant, refined surface. Kaolin is the usual source.',
        recipeId: 'clear-satin-matte',
        highlightOxides: ['Al2O3'],
      },
      {
        type: 'recipe',
        title: 'Comparison: Calcium Satin',
        content: 'This recipe uses wollastonite (CaO without the LOI of whiting) to create a smooth satin surface. It\'s not truly matte — it has more flow than the alumina or magnesia versions — but it shows how the dominant flux changes the character of the surface even when the Si:Al ratio is similar.',
        recipeId: 'sx2-midfire-cream-satin-calcium',
        highlightOxides: ['CaO'],
      },
      {
        type: 'recipe',
        title: 'High-Fire Reference: Dolomite Matte',
        content: 'At cone 9–10, dolomite (MgO + CaO) creates classic opaque mattes with a velvety surface. This recipe uses 21% dolomite — the MgO and CaO work together to create a surface that\'s both matte and incredibly smooth. It\'s a reference point for what high-fire mattes can achieve.',
        recipeId: 'matt-glaze-cone-9',
        highlightOxides: ['MgO', 'CaO'],
      },
      {
        type: 'exercise',
        title: 'Compare the Chemistry',
        content: 'Use Compare Mode to put the MgO matte, Al₂O₃ matte, and calcium satin side by side. Look at the UMF — you\'ll see that the Si:Al ratio is lowest in the alumina matte and highest in the calcium satin. The MgO matte sits in between. This ratio is the single best predictor of glaze surface.',
      },
    ],
  },

  // ── PATH 3: Why Glazes Craze ─────────────────────────────────────────────
  {
    id: 'why-glazes-craze',
    title: 'Why Glazes Craze',
    subtitle: 'Thermal expansion, glaze fit, and the most common defect in ceramics — explained from first principles.',
    icon: '≋',
    difficulty: 'intermediate',
    estimatedMinutes: 10,
    steps: [
      {
        type: 'explanation',
        title: 'The Physics of Crazing',
        content: 'Every material expands when heated and contracts when cooled. After firing, both the glaze and the clay body shrink as they cool. If the glaze shrinks MORE than the body, it gets stretched — like a too-small shirt on a growing teenager. The glaze cracks to relieve the tension. That network of cracks is crazing.',
        tip: 'Crazing can appear immediately out of the kiln, or develop slowly over weeks as the pot absorbs moisture (which expands the body further).',
      },
      {
        type: 'explanation',
        title: 'The Key Number: Thermal Expansion Coefficient',
        content: 'Each oxide in a glaze contributes to its overall thermal expansion. Sodium (Na₂O) and potassium (K₂O) are the biggest expanders — they\'re the main causes of crazing. Silica (SiO₂), lithium (Li₂O), and magnesium (MgO) have low expansion and help prevent crazing. The "KNaO" metric in the chemistry panel measures combined alkali — high KNaO = high craze risk.',
        highlightOxides: ['Na2O', 'K2O', 'SiO2'],
      },
      {
        type: 'recipe',
        title: 'Intentional Crackle (Extreme Expansion)',
        content: 'This recipe is designed to craze — it\'s 72% nepheline syenite, which is loaded with Na₂O and K₂O. The expansion is so high that the crackle pattern develops immediately on cooling. It\'s beautiful as a decorative effect but absolutely not food-safe.',
        recipeId: 'clear-crackle-cone-6',
        highlightOxides: ['Na2O', 'K2O'],
        tip: 'Crackle glazes are the same defect as crazing — the only difference is whether you did it on purpose.',
      },
      {
        type: 'recipe',
        title: 'Another Crackle Approach',
        content: 'This recipe achieves crackle through a different chemical path — high dolomite creates a shift from clear to milky opacity as the cracks form and scatter light. The expansion mismatch is built into the formula, not accidental.',
        recipeId: 'clear-to-milky-crackle',
        highlightOxides: ['Na2O', 'CaO', 'MgO'],
      },
      {
        type: 'recipe',
        title: 'The Fix: Low-Expansion Clear',
        content: 'Compare this to the crackle recipes — this clear was specifically designed for tight fit on porcelain (which has its own low expansion). Notice how the alkali content is lower, the silica is higher, and the overall expansion index drops. This is what "fixing" crazing looks like chemically.',
        recipeId: 'sx-midfire-porcelain-fit-clear',
        highlightOxides: ['SiO2', 'Na2O', 'K2O'],
      },
      {
        type: 'explanation',
        title: 'How to Fix a Crazing Glaze',
        content: 'The three most effective fixes, in order: 1) Increase SiO₂ — add more silica or a silica-rich frit. 2) Decrease Na₂O/K₂O — replace soda feldspar with potash, or reduce nepheline syenite. 3) Add CaO or MgO — replace some alkali flux with whiting or dolomite. Always test in small increments — a 5% change in one ingredient is a significant shift.',
        tip: 'Use the Chemistry Explorer\'s Line Blend tool to simulate these changes before mixing a single gram of material.',
      },
      {
        type: 'exercise',
        title: 'Spot the Risk',
        content: 'Go to the Workshop and sort by expansion index (high to low). The highest-expansion recipes are the most craze-prone. Open a few and check their KNaO value in the chemistry panel. You\'ll see the pattern: high KNaO = high expansion = high craze risk. Now find recipes with the same firing range but low expansion — what\'s different in the ingredients?',
      },
    ],
  },
]
