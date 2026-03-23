import type { Recipe, UMFResult, VisualScores } from '@/types'
import { colorantHeuristics } from '@/data/materials-knowledge'
import { OXIDE_LABELS } from '@/data/material-analyses'

export interface RecipeExplanation {
  summary: string
  details: string[]
  warnings: string[]
}

export function explainRecipe(
  recipe: Recipe,
  chemistry: UMFResult,
  scores: VisualScores | null,
): RecipeExplanation {
  const details: string[] = []
  const warnings: string[] = []

  // ── Firing range description ─────────────────────────────────────
  const rangeDescriptions: Record<string, string> = {
    'high-fire': 'a high-fire glaze (cone 8–11), designed for stoneware or porcelain',
    'mid-fire': 'a mid-fire glaze (cone 4–7), suitable for most electric kiln work',
    'low-fire': 'a low-fire glaze (cone 06–2), designed for earthenware',
    'raku': 'a raku glaze, meant for rapid firing and dramatic post-firing reduction',
  }

  const rangeDesc = rangeDescriptions[recipe.firingRangeId] ?? `a ${recipe.firingRangeId.replace(/-/g, ' ')} glaze`

  // ── Atmosphere ────────────────────────────────────────────────────
  const atmospheres = recipe.atmosphereIds.join(' or ')
  const atmosDesc = atmospheres ? ` Fired in ${atmospheres}.` : ''

  // ── Surface character from visual scores ─────────────────────────
  let surfaceDesc = ''
  if (scores) {
    const glossTerm = scores.glossLevel >= 4 ? 'glossy' : scores.glossLevel >= 3 ? 'satin' : scores.glossLevel >= 2 ? 'satin-matte' : 'matte'
    const opacityTerm = scores.opacityLevel >= 4 ? 'opaque' : scores.opacityLevel >= 3 ? 'semi-opaque' : scores.opacityLevel >= 2 ? 'translucent' : 'transparent'
    surfaceDesc = `The surface is ${glossTerm} and ${opacityTerm}.`

    if (scores.variationLevel >= 4) {
      details.push('High surface variation — expect colour breaks, pooling, and visual movement across the piece.')
    } else if (scores.variationLevel >= 3) {
      details.push('Moderate surface variation — some colour shifting and breaking on edges.')
    }

    if (scores.runRisk >= 4) {
      warnings.push('High run risk — apply thinly and keep pieces on sacrificial stilts. This glaze moves significantly during firing.')
    } else if (scores.runRisk >= 3) {
      warnings.push('Moderate run risk — avoid thick application on vertical surfaces.')
    }

    if (scores.textureLevel >= 4) {
      details.push('Pronounced surface texture — the glaze develops tactile quality.')
    }
  }

  // ── Chemistry-based insights ─────────────────────────────────────
  if (chemistry.isValid) {
    // Si:Al ratio
    if (chemistry.siToAl !== null) {
      if (chemistry.siToAl > 10) {
        details.push(`High Si:Al ratio (${chemistry.siToAl.toFixed(1)}) — this favours a glossy, fluid surface. The relatively low alumina means the glaze will move more in the kiln.`)
      } else if (chemistry.siToAl < 6) {
        details.push(`Low Si:Al ratio (${chemistry.siToAl.toFixed(1)}) — this creates a stiffer, more matte surface. High alumina relative to silica gives a velvety feel.`)
      } else {
        details.push(`Balanced Si:Al ratio (${chemistry.siToAl.toFixed(1)}) — a well-centred chemistry that should produce a reliable result.`)
      }
    }

    // KNaO and crazing
    if (chemistry.knaO > 0.4) {
      warnings.push(`High alkali flux (KNaO ${chemistry.knaO.toFixed(2)}) — significant crazing risk, especially on stoneware. Test on your specific clay body before committing to production.`)
    } else if (chemistry.knaO > 0.25) {
      details.push(`Moderate alkali flux (KNaO ${chemistry.knaO.toFixed(2)}) — watch for crazing on bodies with lower expansion.`)
    } else {
      details.push(`Low alkali flux (KNaO ${chemistry.knaO.toFixed(2)}) — good crazing resistance.`)
    }

    // Expansion
    if (chemistry.expansionIndex > 60) {
      warnings.push(`High thermal expansion (${chemistry.expansionIndex.toFixed(1)}) — likely to craze on most stoneware bodies. Consider adding silica or switching alkali fluxes to earth fluxes.`)
    } else if (chemistry.expansionIndex < 40) {
      details.push(`Low thermal expansion (${chemistry.expansionIndex.toFixed(1)}) — excellent crazing resistance. May even shiver on some bodies if compression is too high.`)
    }

    // LOI
    if (chemistry.totalLOI > 18) {
      warnings.push(`Very high LOI (${chemistry.totalLOI.toFixed(1)}%) — significant gas release during firing. Fire slowly through 900–1100°C to prevent pinholes.`)
    } else if (chemistry.totalLOI > 10) {
      details.push(`Moderate LOI (${chemistry.totalLOI.toFixed(1)}%) — some gas release during firing. A normal soak at top temperature should clear any bubbles.`)
    }

    // Boron
    if (chemistry.totalB > 0.3) {
      details.push(`Significant boron content (B₂O₃ ${chemistry.totalB.toFixed(2)}) — this is a major flux in this recipe, typical of mid/low-fire formulations.`)
    }

    // Calcium
    const caO = chemistry.ro.find(e => e.id === 'cao')?.moles ?? 0
    if (caO > 0.5) {
      details.push(`High calcium (CaO ${caO.toFixed(2)}) — the primary flux. Creates a hard, durable surface and promotes crystal growth if slow-cooled.`)
    }

    // Magnesium
    const mgO = chemistry.ro.find(e => e.id === 'mgo')?.moles ?? 0
    if (mgO > 0.15) {
      details.push(`Notable magnesia (MgO ${mgO.toFixed(2)}) — pushes the surface toward a buttery, silky quality. This is a key ingredient in satin-matte glazes.`)
    }

    // Colorants
    for (const entry of chemistry.colorants) {
      const label = OXIDE_LABELS[entry.id] ?? entry.id
      if (entry.id === 'coo') {
        details.push(`Contains cobalt (${label}) — expect blue colouration even at tiny amounts. Cobalt is the strongest and most reliable ceramic colorant.`)
      } else if (entry.id === 'cuo') {
        const inReduction = recipe.atmosphereIds.includes('reduction')
        if (inReduction) {
          details.push(`Contains copper (${label}) in reduction — expect copper red colours ranging from ox-blood to pink, depending on thickness and cooling.`)
        } else {
          details.push(`Contains copper (${label}) in oxidation — expect green colouration. With high alkali, may shift toward turquoise.`)
        }
      } else if (entry.id === 'nio') {
        details.push(`Contains nickel (${label}) — expect muted grey-green-brown tones. Nickel modifies other colorants rather than dominating.`)
      }
    }

    // Iron (from r2o3 group)
    const feEntry = chemistry.r2o3.find(e => e.id === 'fe2o3')
    if (feEntry && feEntry.moles > 0.01) {
      const ironPct = recipe.ingredients
        .filter(i => ['red-iron-oxide', 'yellow-iron-oxide', 'black-iron-oxide'].includes(i.materialId))
        .reduce((s, i) => s + i.amount, 0)
      if (ironPct >= 8) {
        details.push(`High iron content (~${ironPct}%) — expect dark tenmoku/oil-spot territory. Iron acts as both colorant and flux at these levels.`)
      } else if (ironPct >= 3) {
        const inReduction = recipe.atmosphereIds.includes('reduction')
        details.push(`Moderate iron (~${ironPct}%) — expect ${inReduction ? 'amber-brown to olive tones in reduction' : 'honey to amber tones in oxidation'}.`)
      } else if (ironPct >= 1) {
        const inReduction = recipe.atmosphereIds.includes('reduction')
        details.push(`Light iron (~${ironPct}%) — expect ${inReduction ? 'celadon blue-green tones in reduction' : 'pale warm tints in oxidation'}.`)
      }
    }

    if (chemistry.missingMaterials.length > 0) {
      warnings.push(`Missing chemistry data for: ${chemistry.missingMaterials.join(', ')}. The UMF analysis may be incomplete.`)
    }

    if (chemistry.hasApproximateData) {
      warnings.push('Contains variable materials (wood ash). Actual chemistry will vary batch to batch — test each batch.')
    }
  }

  // ── Build summary ────────────────────────────────────────────────
  const colorDesc = recipe.colourIds.length > 0
    ? recipe.colourIds.slice(0, 2).join('/') + ' '
    : ''

  const surfaceType = recipe.surfaceIds.length > 0
    ? recipe.surfaceIds[0] + ' '
    : ''

  const summary = `This is ${rangeDesc} — a ${colorDesc}${surfaceType}glaze with ${recipe.ingredients.length} ingredients.${atmosDesc} ${surfaceDesc}`.trim()

  return { summary, details, warnings }
}
