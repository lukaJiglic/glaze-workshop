export interface SourceEntry {
  id: string
  name: string
  url?: string
  description?: string
}

export const sources = new Map<string, SourceEntry>([
  ['digitalfire', {
    id: 'digitalfire',
    name: 'Digitalfire Reference',
    url: 'https://digitalfire.com',
    description: "Tony Hansen's ceramic material and recipe database",
  }],
  ['ct-highfire', {
    id: 'ct-highfire',
    name: 'High-fire Collection',
  }],
  ['ct-highfire-extended', {
    id: 'ct-highfire-extended',
    name: 'High-fire Extended Collection',
  }],
  ['ct-stoneware', {
    id: 'ct-stoneware',
    name: 'Stoneware Collection',
  }],
  ['ct-midfire', {
    id: 'ct-midfire',
    name: 'Mid-fire Collection',
  }],
  ['ct-earthenware', {
    id: 'ct-earthenware',
    name: 'Earthenware Collection',
  }],
  ['ct-raku', {
    id: 'ct-raku',
    name: 'Raku Collection',
  }],
  ['ct-digitalfire-core', {
    id: 'ct-digitalfire-core',
    name: 'Digitalfire Core Recipes',
    url: 'https://digitalfire.com',
  }],
  ['ct-digitalfire-extended', {
    id: 'ct-digitalfire-extended',
    name: 'Digitalfire Extended Recipes',
    url: 'https://digitalfire.com',
  }],
  ['ct-digitalfire-slip', {
    id: 'ct-digitalfire-slip',
    name: 'Digitalfire Slip Bases',
    url: 'https://digitalfire.com',
  }],
  ['leach-1973', {
    id: 'leach-1973',
    name: 'A Potter\'s Book — Bernard Leach',
  }],
  ['rhodes-1973', {
    id: 'rhodes-1973',
    name: 'Stoneware and Porcelain — Daniel Rhodes',
  }],
  ['hamer-1975', {
    id: 'hamer-1975',
    name: 'The Potter\'s Dictionary — Frank & Janet Hamer',
  }],
  ['studio-recipes', {
    id: 'studio-recipes',
    name: 'Studio Collection',
  }],
  ['mason-reference-guide', {
    id: 'mason-reference-guide',
    name: 'Mason Color Works Stain Reference Guide',
    url: 'https://www.masoncolor.com',
    description: 'Official Mason Stain product data and compatibility charts',
  }],
  ['plainsman-p300', {
    id: 'plainsman-p300',
    name: 'Plainsman P300 Porcelain Reference',
    description: 'Plainsman Clays porcelain body data — cone 6 standard reference body',
  }],

  // ── Digitalfire recipe-specific sources ─────────────────────────────────────
  // Individual Digitalfire recipe pages referenced in recipe JSON sourceIds
  ['digitalfire-g3879', { id: 'digitalfire-g3879', name: 'Digitalfire G3879', url: 'https://digitalfire.com', description: 'Cone 04+ UltraClear Glossy Base' }],
  ['digitalfire-g1916q', { id: 'digitalfire-g1916q', name: 'Digitalfire G1916Q', url: 'https://digitalfire.com', description: 'Low Fire Highly-Expansion-Adjustable Transparent' }],
  ['digitalfire-g2931k', { id: 'digitalfire-g2931k', name: 'Digitalfire G2931K', url: 'https://digitalfire.com', description: 'Zero3 K Cone 03 Transparent' }],
  ['digitalfire-g2931l', { id: 'digitalfire-g2931l', name: 'Digitalfire G2931L', url: 'https://digitalfire.com', description: 'Lower-Expansion Low-Fire Clear' }],
  ['digitalfire-g2926b', { id: 'digitalfire-g2926b', name: 'Digitalfire G2926B', url: 'https://digitalfire.com', description: 'Cone 6 Whiteware / Porcelain Transparent' }],
  ['digitalfire-g2934', { id: 'digitalfire-g2934', name: 'Digitalfire G2934', url: 'https://digitalfire.com', description: 'Matte Glaze Base for Cone 6' }],
  ['digitalfire-g1214w', { id: 'digitalfire-g1214w', name: 'Digitalfire G1214W', url: 'https://digitalfire.com', description: 'Cone 6 Transparent Base' }],
  ['digitalfire-g1216l', { id: 'digitalfire-g1216l', name: 'Digitalfire G1216L', url: 'https://digitalfire.com', description: 'Transparent for Cone 6 Porcelains' }],
  ['digitalfire-g2571a', { id: 'digitalfire-g2571a', name: 'Digitalfire G2571A', url: 'https://digitalfire.com', description: 'Cone 10 Silky Dolomite Matte' }],
  ['digitalfire-g2916f', { id: 'digitalfire-g2916f', name: 'Digitalfire G2916F', url: 'https://digitalfire.com', description: 'Cone 6 Stoneware / Whiteware Transparent' }],
  ['digitalfire-g1214m', { id: 'digitalfire-g1214m', name: 'Digitalfire G1214M', url: 'https://digitalfire.com', description: 'Cone 6 Clear Base' }],
  ['digitalfire-g1214z1', { id: 'digitalfire-g1214z1', name: 'Digitalfire G1214Z1', url: 'https://digitalfire.com', description: 'Cone 6 Calcium Matte Variant' }],
  ['digitalfire-g1215u', { id: 'digitalfire-g1215u', name: 'Digitalfire G1215U', url: 'https://digitalfire.com', description: 'Cone 6 Low-Expansion Glossy Clear' }],
  ['digitalfire-g1216m', { id: 'digitalfire-g1216m', name: 'Digitalfire G1216M', url: 'https://digitalfire.com', description: 'Cone 6 Ultraclear for Porcelains' }],
  ['digitalfire-g1947u', { id: 'digitalfire-g1947u', name: 'Digitalfire G1947U', url: 'https://digitalfire.com', description: 'Cone 10 Glossy Transparent' }],
  ['digitalfire-g2240', { id: 'digitalfire-g2240', name: 'Digitalfire G2240', url: 'https://digitalfire.com', description: 'Cone 10R Classic Spodumene Matte' }],
  ['digitalfire-g2826r', { id: 'digitalfire-g2826r', name: 'Digitalfire G2826R', url: 'https://digitalfire.com', description: 'Cone 6 Floating Blue' }],
  ['digitalfire-g2826x', { id: 'digitalfire-g2826x', name: 'Digitalfire G2826X', url: 'https://digitalfire.com', description: 'Cone 6 Iron Red' }],
  ['digitalfire-g2926j', { id: 'digitalfire-g2926j', name: 'Digitalfire G2926J', url: 'https://digitalfire.com', description: 'Cone 6 Lower-Expansion Clear' }],
  ['digitalfire-g3838a', { id: 'digitalfire-g3838a', name: 'Digitalfire G3838A', url: 'https://digitalfire.com', description: 'Low-Expansion Transparent for P300 Porcelain' }],
  ['digitalfire-ga6a', { id: 'digitalfire-ga6a', name: 'Digitalfire GA6-A', url: 'https://digitalfire.com', description: 'Alberta Slip Base' }],
  ['digitalfire-ga6b', { id: 'digitalfire-ga6b', name: 'Digitalfire GA6-B', url: 'https://digitalfire.com', description: 'Alberta Slip Honey Base' }],
  ['digitalfire-ga6c', { id: 'digitalfire-ga6c', name: 'Digitalfire GA6-C', url: 'https://digitalfire.com', description: 'Alberta Slip Rutile Blue' }],
  ['digitalfire-ga6g', { id: 'digitalfire-ga6g', name: 'Digitalfire GA6-G', url: 'https://digitalfire.com', description: 'Alberta Slip Rutile Brown' }],
  ['digitalfire-ga6h', { id: 'digitalfire-ga6h', name: 'Digitalfire GA6-H', url: 'https://digitalfire.com', description: 'Alberta Slip Black Stain Base' }],
  ['digitalfire-alberta-slip-roasted', { id: 'digitalfire-alberta-slip-roasted', name: 'Digitalfire Alberta Slip (Roasted)', url: 'https://digitalfire.com', description: 'Calcined Alberta Slip reference' }],
  ['digitalfire-gr6a', { id: 'digitalfire-gr6a', name: 'Digitalfire GR6-A', url: 'https://digitalfire.com', description: 'Ravenscrag Slip Base' }],
  ['digitalfire-gr6m', { id: 'digitalfire-gr6m', name: 'Digitalfire GR6-M', url: 'https://digitalfire.com', description: 'Ravenscrag Floating Blue' }],
  ['digitalfire-gr6n', { id: 'digitalfire-gr6n', name: 'Digitalfire GR6-N', url: 'https://digitalfire.com', description: 'Ravenscrag Brilliant Celadon' }],
  ['digitalfire-gr10a', { id: 'digitalfire-gr10a', name: 'Digitalfire GR10-A', url: 'https://digitalfire.com', description: 'Ravenscrag High Fire Base' }],
  ['digitalfire-gr10b', { id: 'digitalfire-gr10b', name: 'Digitalfire GR10-B', url: 'https://digitalfire.com', description: 'Ravenscrag Liner' }],
  ['digitalfire-gr10c', { id: 'digitalfire-gr10c', name: 'Digitalfire GR10-C', url: 'https://digitalfire.com', description: 'Raventalc' }],
  ['digitalfire-g2934y', { id: 'digitalfire-g2934y', name: 'Digitalfire G2934Y', url: 'https://digitalfire.com', description: 'Cone 6 Silky Matte Base' }],
  ['digitalfire-g3806c', { id: 'digitalfire-g3806c', name: 'Digitalfire G3806C', url: 'https://digitalfire.com', description: 'Cone 6 Super-Gloss Fluid-Melt Copper Blue' }],
  ['digitalfire-fluid-melt-glazes', { id: 'digitalfire-fluid-melt-glazes', name: 'Digitalfire Fluid Melt Glazes', url: 'https://digitalfire.com', description: 'Reference article on fluid melt glaze behaviour' }],
  ['digitalfire-melt-fluidity', { id: 'digitalfire-melt-fluidity', name: 'Digitalfire Melt Fluidity', url: 'https://digitalfire.com', description: 'Reference article on melt fluidity testing' }],
])
