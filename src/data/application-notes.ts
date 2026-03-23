// ─── Application notes by firing range / surface type ─────────────────────────
// These provide practical guidance ceramicists need: thickness, specific gravity,
// dipping time, and layering compatibility.

export interface ApplicationNote {
  id: string
  firingRangeId?: string
  surfaceId?: string
  thickness: string          // e.g. 'medium', 'thick'
  thicknessNote: string
  specificGravity: string    // e.g. '1.45–1.50'
  dippingTime: string        // e.g. '3–5 seconds'
  layeringNote: string
  generalTips: string[]
}

export const applicationNotes: ApplicationNote[] = [
  {
    id: 'high-fire-glossy',
    firingRangeId: 'high-fire',
    surfaceId: 'glossy',
    thickness: 'medium',
    thicknessNote: 'Even coat. Too thick and glossy high-fire glazes pool heavily in footring area.',
    specificGravity: '1.45–1.50',
    dippingTime: '3–4 seconds',
    layeringNote: 'Glossy over glossy can cause crawling at cone 10. Apply first coat thin, second coat normal.',
    generalTips: [
      'Wax resist the foot and 3mm above the shelf line — glossy high-fire glazes run',
      'Stir thoroughly before each dip — heavier particles settle fast',
      'For even coverage, dip once and count to three rather than double-dipping',
    ],
  },
  {
    id: 'high-fire-matte',
    firingRangeId: 'high-fire',
    surfaceId: 'matte',
    thickness: 'medium-thick',
    thicknessNote: 'Slightly thicker than glossy. Matte glazes need enough material to develop their characteristic surface.',
    specificGravity: '1.48–1.55',
    dippingTime: '4–5 seconds',
    layeringNote: 'Matte glazes layer well. Glossy over matte creates beautiful breaking edges.',
    generalTips: [
      'Matte glazes are generally less prone to running — can apply slightly thicker',
      'Thinner application may fire glossier than expected',
      'Allow full drying between coats to prevent crawling',
    ],
  },
  {
    id: 'high-fire-satin',
    firingRangeId: 'high-fire',
    surfaceId: 'satin',
    thickness: 'medium',
    thicknessNote: 'Even medium coat. Satin surface develops best at consistent thickness.',
    specificGravity: '1.45–1.50',
    dippingTime: '3–4 seconds',
    layeringNote: 'Satin glazes work well as a base layer. Most other glazes can go on top.',
    generalTips: [
      'Satin surfaces are sensitive to thickness variation — aim for consistency',
      'Slightly thicker application pushes toward matte; thinner pushes toward glossy',
    ],
  },
  {
    id: 'mid-fire-glossy',
    firingRangeId: 'mid-fire',
    surfaceId: 'glossy',
    thickness: 'medium',
    thicknessNote: 'Standard medium coat. Mid-fire glossy glazes are generally well-behaved.',
    specificGravity: '1.45–1.50',
    dippingTime: '3–4 seconds',
    layeringNote: 'Most mid-fire glazes layer safely. Test combinations for crawling before committing to a full load.',
    generalTips: [
      'Cone 6 glazes are less prone to running than high-fire — moderate wax resist is sufficient',
      'Brush application works well for small pieces — 3 even coats',
      'Keep specific gravity consistent between batches for reproducible results',
    ],
  },
  {
    id: 'mid-fire-matte',
    firingRangeId: 'mid-fire',
    surfaceId: 'matte',
    thickness: 'medium-thick',
    thicknessNote: 'Apply slightly thicker than glossy counterparts for full matte development.',
    specificGravity: '1.50–1.55',
    dippingTime: '4–5 seconds',
    layeringNote: 'Matte over glossy can produce interesting crawling effects. Test first.',
    generalTips: [
      'Cone 6 matte glazes with high MgO develop a buttery surface that is thickness-dependent',
      'Underfiring by half a cone can make a matte glaze feel rough instead of silky',
    ],
  },
  {
    id: 'low-fire-glossy',
    firingRangeId: 'low-fire',
    surfaceId: 'glossy',
    thickness: 'medium-thin',
    thicknessNote: 'Thinner than stoneware glazes. Low-fire glazes are more fluid and prone to running.',
    specificGravity: '1.40–1.48',
    dippingTime: '2–3 seconds',
    layeringNote: 'Low-fire glazes layer beautifully for decorative effects. Colors stay vibrant when layered.',
    generalTips: [
      'Earthenware is porous — first coat absorbs fast, so work quickly',
      'Apply wax to any surface that touches the kiln shelf',
      'Low-fire glazes produce the brightest colors — great for decorative work',
    ],
  },
  {
    id: 'raku-general',
    firingRangeId: 'raku',
    thickness: 'thick',
    thicknessNote: 'Apply thickly. Raku glazes need mass to develop crackle and metallic effects.',
    specificGravity: '1.50–1.60',
    dippingTime: '5–8 seconds or brush 4+ coats',
    layeringNote: 'Layering is uncommon in raku. Single thick coat is standard.',
    generalTips: [
      'Bisque to cone 06 for maximum absorption during glazing',
      'Leave the bottom unglazed — raku glazes fuse to shelves',
      'Thick application is key — thin raku glazes look anemic',
      'Post-firing reduction happens fast — have your reduction chamber ready',
    ],
  },
]

export function findApplicationNote(firingRangeId: string, surfaceIds: string[]): ApplicationNote | null {
  // Try exact match first
  for (const note of applicationNotes) {
    if (note.firingRangeId === firingRangeId && note.surfaceId && surfaceIds.includes(note.surfaceId)) {
      return note
    }
  }
  // Fall back to firing range only
  for (const note of applicationNotes) {
    if (note.firingRangeId === firingRangeId && !note.surfaceId) {
      return note
    }
  }
  // Fall back to first match for firing range
  return applicationNotes.find(n => n.firingRangeId === firingRangeId) ?? null
}
