export interface CombinationHint {
  materials: string[]
  combined: string
  note: string
}

function key(...ids: string[]): string {
  return [...ids].sort().join('+')
}

export const colorantCombinations = new Map<string, CombinationHint>([
  [key('cobalt-carbonate', 'iron-oxide'), {
    materials: ['cobalt-carbonate', 'iron-oxide'],
    combined: 'Warm blue-black or deep slate',
    note: 'Iron tempers cobalt\'s brightness toward a deeper, earthier blue-black. Common in tenmoku-adjacent and ash glazes.',
  }],
  [key('cobalt-carbonate', 'copper-carbonate'), {
    materials: ['cobalt-carbonate', 'copper-carbonate'],
    combined: 'Deep teal to blue-green',
    note: 'A classic pairing that shifts cobalt\'s blue toward rich teal. Reduction often gives lustrous results.',
  }],
  [key('iron-oxide', 'rutile'), {
    materials: ['iron-oxide', 'rutile'],
    combined: 'Amber-brown with fluid movement',
    note: 'Rutile and iron create strong visual movement, often with amber and brown breaking across the surface.',
  }],
  [key('red-iron-oxide', 'rutile'), {
    materials: ['red-iron-oxide', 'rutile'],
    combined: 'Warm amber with lively surface',
    note: 'Creates strong amber and ochre tones with a textured, flowing surface character.',
  }],
  [key('tin-oxide', 'copper-carbonate'), {
    materials: ['tin-oxide', 'copper-carbonate'],
    combined: 'Turquoise to soft celadon-green',
    note: 'Tin opacifies while copper tints — together they produce the soft turquoise of Persian and majolica glazes.',
  }],
  [key('cobalt-carbonate', 'manganese-dioxide'), {
    materials: ['cobalt-carbonate', 'manganese-dioxide'],
    combined: 'Purple-blue to plum',
    note: 'Manganese pulls cobalt\'s blue toward purple. Can give violet and plum tones, especially in oxidation.',
  }],
  [key('cobalt-carbonate', 'rutile'), {
    materials: ['cobalt-carbonate', 'rutile'],
    combined: 'Mottled blue with movement',
    note: 'Rutile adds crystalline movement and breaks up flat blue. Often produces variegated cloud-like effects.',
  }],
  [key('cobalt-oxide', 'iron-oxide'), {
    materials: ['cobalt-oxide', 'iron-oxide'],
    combined: 'Warm blue-black or slate',
    note: 'Iron tempers cobalt\'s brightness. Produces deep slate and charcoal tones in both firing atmospheres.',
  }],
  [key('copper-carbonate', 'iron-oxide'), {
    materials: ['copper-carbonate', 'iron-oxide'],
    combined: 'Earthy olive to brown-green',
    note: 'Iron pulls copper\'s green toward olive and earthy brown-greens. Reduction brings out deeper tones.',
  }],
  [key('cobalt-carbonate', 'titanium-dioxide'), {
    materials: ['cobalt-carbonate', 'titanium-dioxide'],
    combined: 'Broken blue with crystal texture',
    note: 'Titanium disrupts cobalt\'s flat blue, producing mottled surfaces with potential crystalline movement.',
  }],
  [key('iron-oxide', 'manganese-dioxide'), {
    materials: ['iron-oxide', 'manganese-dioxide'],
    combined: 'Dark brown to near-black',
    note: 'A classic combination for rich dark browns and blacks. High amounts of both can produce a matte, very dark surface.',
  }],
  [key('copper-oxide', 'tin-oxide'), {
    materials: ['copper-oxide', 'tin-oxide'],
    combined: 'Turquoise to mint',
    note: 'Similar to copper carbonate + tin, but copper oxide is more intense — a little goes further.',
  }],
  // Chrome-oxide pairs
  [key('chrome-oxide', 'tin-oxide'), {
    materials: ['chrome-oxide', 'tin-oxide'],
    combined: 'Chrome-tin pink to raspberry',
    note: 'The classic chrome-tin pink reaction. Even trace amounts of chrome near tin glazes can trigger pink. 0.1–0.5% chrome + 5–8% tin.',
  }],
  [key('chrome-oxide', 'cobalt-carbonate'), {
    materials: ['chrome-oxide', 'cobalt-carbonate'],
    combined: 'Teal to dark green-blue',
    note: 'Chrome grounds cobalt\'s blue toward a deeper teal or green-blue. Low amounts of both give the best results.',
  }],
  [key('chrome-oxide', 'cobalt-oxide'), {
    materials: ['chrome-oxide', 'cobalt-oxide'],
    combined: 'Deep teal to forest green-blue',
    note: 'Same chrome-cobalt teal as the carbonate pair but stronger per gram. Use less of both.',
  }],
  [key('chrome-oxide', 'red-iron-oxide'), {
    materials: ['chrome-oxide', 'red-iron-oxide'],
    combined: 'Olive to brown-green',
    note: 'Iron dulls chrome\'s bright green toward olive and earthy brown-greens. Common in historical stoneware.',
  }],
  // Nickel-oxide pairs
  [key('nickel-oxide', 'cobalt-carbonate'), {
    materials: ['nickel-oxide', 'cobalt-carbonate'],
    combined: 'Cool blue-gray to muted slate',
    note: 'Nickel cools and grays cobalt\'s blue. Creates sophisticated slate and blue-gray tones at low percentages.',
  }],
  [key('nickel-oxide', 'cobalt-oxide'), {
    materials: ['nickel-oxide', 'cobalt-oxide'],
    combined: 'Steel blue-gray',
    note: 'Same cooling effect as nickel + cobalt carbonate. Stronger per gram — use less of both.',
  }],
  [key('nickel-oxide', 'red-iron-oxide'), {
    materials: ['nickel-oxide', 'red-iron-oxide'],
    combined: 'Muted brown to gray-brown',
    note: 'Nickel softens iron\'s warmth. In magnesia bases this can produce surprisingly green-tinged browns.',
  }],
  // Ilmenite + manganese
  [key('ilmenite', 'manganese-dioxide'), {
    materials: ['ilmenite', 'manganese-dioxide'],
    combined: 'Dark speckled brown-black with metallic hints',
    note: 'The iron-titanium speckle of ilmenite plus manganese\'s brown-purple creates a rich, dark, complex surface with metallic undertones.',
  }],
  [key('ilmenite', 'manganese-carbonate'), {
    materials: ['ilmenite', 'manganese-carbonate'],
    combined: 'Warm speckled brown with purple undertone',
    note: 'Manganese carbonate is milder than dioxide — gives a warmer, more purple-brown backdrop to ilmenite\'s dark specks.',
  }],
  // Yellow iron oxide pairs
  [key('yellow-iron-oxide', 'rutile'), {
    materials: ['yellow-iron-oxide', 'rutile'],
    combined: 'Buff-amber with gentle movement',
    note: 'Cooler than red iron + rutile. Softer amber-buff tones with rutile\'s characteristic streaking and variegation.',
  }],
  [key('yellow-iron-oxide', 'cobalt-carbonate'), {
    materials: ['yellow-iron-oxide', 'cobalt-carbonate'],
    combined: 'Muted olive-blue to slate-green',
    note: 'Yellow iron softens cobalt\'s blue toward olive and slate. Less dramatic than red iron + cobalt.',
  }],
  [key('yellow-iron-oxide', 'manganese-dioxide'), {
    materials: ['yellow-iron-oxide', 'manganese-dioxide'],
    combined: 'Warm brown with purple-amber tones',
    note: 'Milder version of iron + manganese. Warm browns with a more amber, less dark result than red iron.',
  }],
  [key('yellow-iron-oxide', 'copper-carbonate'), {
    materials: ['yellow-iron-oxide', 'copper-carbonate'],
    combined: 'Soft olive to khaki-green',
    note: 'A muted, earthy green combination. The yellow iron pulls copper\'s green toward natural olive and khaki tones.',
  }],
])

export function findCombinationHints(materialIds: string[]): CombinationHint[] {
  const hints: CombinationHint[] = []
  for (let i = 0; i < materialIds.length; i++) {
    for (let j = i + 1; j < materialIds.length; j++) {
      const k = key(materialIds[i], materialIds[j])
      const hint = colorantCombinations.get(k)
      if (hint) hints.push(hint)
    }
  }
  return hints
}
