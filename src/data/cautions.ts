export interface CautionEntry {
  id: string
  label: string
  description: string
  severity: 'info' | 'warning' | 'danger'
}

export const cautions = new Map<string, CautionEntry>([
  ['food-surface-testing', {
    id: 'food-surface-testing',
    label: 'Food surface testing required',
    description: 'This glaze has not been verified as food-safe. Test for leaching before using on functional ware.',
    severity: 'warning',
  }],
  ['barium-content', {
    id: 'barium-content',
    label: 'Contains barium',
    description: 'Barium carbonate is toxic when ingested. Handle dry material with a respirator. Avoid on food surfaces.',
    severity: 'danger',
  }],
  ['chrome-tin-pink', {
    id: 'chrome-tin-pink',
    label: 'Chrome + tin combination',
    description: 'Chrome and tin produce pink. Keep these glazes away from chrome-bearing glazes in the same firing to avoid unexpected color bleed.',
    severity: 'info',
  }],
  ['zinc-dust', {
    id: 'zinc-dust',
    label: 'Zinc oxide dust hazard',
    description: 'Zinc oxide fumes are released at very high temperatures. Ensure adequate kiln ventilation during firing.',
    severity: 'warning',
  }],
  ['colorant-limits', {
    id: 'colorant-limits',
    label: 'High colorant content',
    description: 'Colorants above safe limits can leach into food. Use low percentages and test before using on functional ware.',
    severity: 'warning',
  }],
  ['leadless-tested', {
    id: 'leadless-tested',
    label: 'Verified leadless',
    description: 'This recipe has been confirmed to contain no lead-bearing materials.',
    severity: 'info',
  }],
  ['cadmium-content', {
    id: 'cadmium-content',
    label: 'Contains cadmium',
    description: 'Cadmium-based colorants are toxic and restricted in many countries. Not suitable for functional ware.',
    severity: 'danger',
  }],
  ['manganese-dioxide', {
    id: 'manganese-dioxide',
    label: 'Manganese dioxide hazard',
    description: 'Manganese fumes during firing are a neurological hazard. Good ventilation required. Avoid on functional ware.',
    severity: 'danger',
  }],
  ['raw-glaze-handling', {
    id: 'raw-glaze-handling',
    label: 'Handle dry mix with care',
    description: 'Mix in a well-ventilated area with gloves and a fitted dust mask. Avoid generating airborne dust.',
    severity: 'info',
  }],
  ['strontium-content', {
    id: 'strontium-content',
    label: 'Contains strontium',
    description: 'Strontium carbonate is a mild hazard. Treat as a potential irritant and use standard dust precautions.',
    severity: 'info',
  }],
  ['lead-caution', {
    id: 'lead-caution',
    label: 'Contains lead compound',
    description: 'This recipe uses a lead-bearing material. Lead is highly toxic and tightly regulated. Not suitable for food surfaces. Handle with full PPE and fire only in dedicated, well-ventilated kilns.',
    severity: 'danger',
  }],
  ['raku-porosity', {
    id: 'raku-porosity',
    label: 'Raku — porous body',
    description: 'Raku-fired ware remains porous and absorbs water. Not food-safe or watertight. Intended for decorative use only.',
    severity: 'warning',
  }],
  ['soluble-barium', {
    id: 'soluble-barium',
    label: 'Soluble barium risk',
    description: 'This glaze contains barium in a soluble form (e.g. barium carbonate without full fusion into the glass). Soluble barium can leach under acidic conditions. Do not use on food or drink surfaces.',
    severity: 'danger',
  }],
  ['metal-oxide-handling', {
    id: 'metal-oxide-handling',
    label: 'Metal oxide — handle with care',
    description: 'Contains metal oxide colorants (cobalt, copper, manganese, chrome, nickel, etc.). Wear gloves and a fitted respirator when mixing dry materials. Avoid skin contact and inhalation.',
    severity: 'warning',
  }],
])
