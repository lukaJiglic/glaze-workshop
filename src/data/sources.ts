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
])
