export interface Ingredient {
  materialId: string
  sourceLabel: string
  amount: number
}

export interface Recipe {
  id: string
  name: string
  firingRangeId: string
  cone: string
  atmosphereIds: string[]
  kilnIds: string[]
  clayIds: string[]
  techniqueIds: string[]
  styleIds: string[]
  colourIds: string[]
  surfaceIds: string[]
  ingredients: Ingredient[]
  tablewareStatus: string
  cautionIds: string[]
  notes: string[]
  sourceIds: string[]
}

export interface ColorProfile {
  id: string
  name: string
  familyId: string
  swatchHex: string
  appearance: string
  sourceIds: string[]
}

export interface RecipeMapping {
  recipeId: string
  defaultProfileId: string
  secondaryProfileIds?: string[]
}

export interface VisualScores {
  glossLevel: number
  opacityLevel: number
  variationLevel: number
  runRisk: number
  textureLevel: number
  crackleLevel: number
  poolingLevel: number
}

export interface FamilyDefault {
  familyId: string
  scores: VisualScores
}

export interface RecipeOverride {
  recipeId: string
  scores: VisualScores
  edgeBreak?: string
  poolingColorHint?: string
}

export interface VisualMetadata {
  meta: { title: string; createdAt: string; note: string }
  scales: Record<string, string>
  familyDefaults: FamilyDefault[]
  recipeOverrides: RecipeOverride[]
}

export interface GlazeFamily {
  id: string
  name: string
  summary: string
  commonBodies: string[]
  commonAtmospheres: string[]
  commonSignals: string[]
  representativeRecipes: string[]
  sourceIds?: string[]
}

export interface TaxonomyItem {
  id: string
  name: string
  coneRange?: string
  approxCelsius?: string
  summary: string
  sourceIds: string[]
}

export interface Taxonomy {
  meta: { title: string; createdAt: string }
  taxonomies: {
    firingRanges: TaxonomyItem[]
    atmospheres: TaxonomyItem[]
    surfaces: TaxonomyItem[]
    colours: TaxonomyItem[]
    styles: TaxonomyItem[]
  }
}

export interface FilterState {
  selectedCones: string[]
  selectedAtmospheres: string[]
  selectedColors: string[]
  selectedSurfaces: string[]
  selectedFamilies: string[]
  selectedStyles: string[]
  selectedTablewareStatuses: string[]
}

export interface ScaledIngredient extends Ingredient {
  scaledGrams: number
}

// ─── Glaze Chemistry / UMF types ─────────────────────────────────────────────

export type OxideGroup = 'r2o' | 'ro' | 'r2o3' | 'ro2' | 'colorant' | 'other'

export interface OxideEntry {
  id: string         // e.g. 'sio2'
  label: string      // e.g. 'SiO₂'
  moles: number      // unity-normalised moles (flux sum = 1.0), except colorants
  group: OxideGroup
}

export interface UMFResult {
  isValid: boolean
  missingMaterials: string[]     // materialIds with no analysis data
  fluxSum: number                // sum of all RO + R2O moles before normalisation
  r2o: OxideEntry[]              // Na₂O, K₂O, Li₂O — normalised
  ro: OxideEntry[]               // CaO, MgO, ZnO, BaO, SrO, MnO — normalised
  r2o3: OxideEntry[]             // Al₂O₃, B₂O₃, Fe₂O₃, Cr₂O₃ — normalised
  ro2: OxideEntry[]              // SiO₂, TiO₂, ZrO₂, SnO₂ — normalised
  colorants: OxideEntry[]        // CoO, CuO, NiO — absolute moles (not normalised)
  other: OxideEntry[]            // P₂O₅ etc.
  siToAl: number | null          // SiO₂ / Al₂O₃ ratio (null if no Al₂O₃)
  knaO: number                   // K₂O + Na₂O combined (unity)
  totalR2O: number               // sum of all R₂O (unity)
  totalRO: number                // sum of all RO (unity)
  totalAl: number                // Al₂O₃ (unity)
  totalSi: number                // SiO₂ (unity)
  totalB: number                 // B₂O₃ (unity)
  expansionIndex: number         // Seger approximation (× 10⁻⁷/°C)
  totalLOI: number               // weighted average LOI % across whole recipe
  hasApproximateData: boolean    // true if wood ash or other variable materials present
  firingRangeId?: string         // passed through for target comparison
}

export interface CustomRecipe {
  id: string
  name: string
  firingRangeId: string
  cone: string
  atmosphereIds: string[]
  surfaceIds: string[]
  colourIds: string[]
  ingredients: Ingredient[]
  notes: string[]
  createdAt: string
  updatedAt: string
}
