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
