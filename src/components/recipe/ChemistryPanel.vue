<script setup lang="ts">
import { computed, ref } from 'vue'
import type { UMFResult, OxideEntry, UMFDiagnostic } from '@/types'
import { UMF_TARGETS } from '@/data/material-analyses'
import { useGlazeStore } from '@/stores/glaze'

const props = defineProps<{
  chemistry: UMFResult
  compact?: boolean
}>()

const glazeStore = useGlazeStore()

const collapsed = ref(props.compact ?? false)

// ─── Target range helpers ─────────────────────────────────────────────────────
const targets = computed(() => {
  const id = props.chemistry.firingRangeId ?? 'mid-fire'
  return UMF_TARGETS[id] ?? UMF_TARGETS['mid-fire']
})

function inRange(val: number, range: [number, number]) {
  return val >= range[0] && val <= range[1]
}

function rangeStatus(val: number, range: [number, number]): 'ok' | 'low' | 'high' {
  if (val < range[0]) return 'low'
  if (val > range[1]) return 'high'
  return 'ok'
}

// ─── Metric interpretations ───────────────────────────────────────────────────
const siAlStatus = computed(() => {
  if (props.chemistry.siToAl === null) return 'unknown'
  const tgt = targets.value.siToAl
  return rangeStatus(props.chemistry.siToAl, tgt)
})

const knaStatus = computed(() => {
  const tgt = targets.value.knao
  return rangeStatus(props.chemistry.knaO, tgt)
})

const siStatus = computed(() => {
  const tgt = targets.value.sio2
  return rangeStatus(props.chemistry.totalSi, tgt)
})

const alStatus = computed(() => {
  const tgt = targets.value.al2o3
  return rangeStatus(props.chemistry.totalAl, tgt)
})

// ─── Interpretation notes ─────────────────────────────────────────────────────
const interpretations = computed(() => {
  const c = props.chemistry
  const t = targets.value
  const notes: { text: string; type: 'ok' | 'warn' | 'info' }[] = []

  if (!c.isValid) return notes

  // Alkali / crazing
  if (c.knaO > t.knao[1]) {
    notes.push({ type: 'warn', text: `High KNaO (${c.knaO.toFixed(2)}) — elevated thermal expansion. Likely to craze on most stoneware bodies. Consider increasing SiO₂ or replacing some alkali feldspar with whiting or talc.` })
  } else if (c.knaO < t.knao[0]) {
    notes.push({ type: 'info', text: `Low KNaO (${c.knaO.toFixed(2)}) — the glaze relies on CaO/MgO for melting. Expect a stiffer, more controlled surface.` })
  }

  // Si:Al ratio
  if (c.siToAl !== null) {
    if (c.siToAl < t.siToAl[0]) {
      notes.push({ type: 'warn', text: `Low Si:Al ratio (${c.siToAl.toFixed(1)}) — insufficient silica relative to alumina. Surface may be dull or underfired-looking.` })
    } else if (c.siToAl > t.siToAl[1]) {
      notes.push({ type: 'info', text: `High Si:Al ratio (${c.siToAl.toFixed(1)}) — glassy and potentially fluid. Good for transparent glossy results.` })
    }
  }

  // Alumina
  if (c.totalAl < t.al2o3[0]) {
    notes.push({ type: 'warn', text: `Low Al₂O₃ (${c.totalAl.toFixed(2)}) — glaze may be unstable and prone to running. Consider adding kaolin or ball clay.` })
  }

  // Silica
  if (c.totalSi < t.sio2[0]) {
    notes.push({ type: 'warn', text: `Low SiO₂ (${c.totalSi.toFixed(2)}) — under-silicated for this firing range. Durability may be reduced.` })
  } else if (c.totalSi > t.sio2[1]) {
    notes.push({ type: 'info', text: `High SiO₂ (${c.totalSi.toFixed(2)}) — well-silicated. Glaze will be hard and durable but may need a hotter fire to fully melt.` })
  }

  // Boron note
  if (c.totalB > 0.05) {
    const boronNote = c.totalB > 0.35
      ? `Significant B₂O₃ (${c.totalB.toFixed(2)}) — boron frits are driving this melt. This is typical for mid- and low-fire glazes.`
      : `B₂O₃ present (${c.totalB.toFixed(2)}) — boron contributes to lower melting point and gloss.`
    notes.push({ type: 'info', text: boronNote })
  }

  // LOI pinhole risk
  if (c.totalLOI > 18) {
    notes.push({ type: 'warn', text: `High recipe LOI (${c.totalLOI.toFixed(1)}%) — significant gas release during firing. Fire slowly through 900–1050°C to allow CO₂ and H₂O to escape. Pinholes likely if fired too fast.` })
  }

  // Seger limit warnings — classic ranges for well-balanced glazes
  const firingRange = c.firingRangeId ?? 'mid-fire'
  if (firingRange === 'high-fire' || firingRange === 'mid-fire') {
    if (c.totalAl > 0 && c.totalAl > t.al2o3[1] * 1.2) {
      notes.push({ type: 'warn', text: `Al₂O₃ (${c.totalAl.toFixed(2)}) is well above the Seger limit for ${t.label}. The glaze may be too refractory — dry, rough, or under-melted at target temperature.` })
    }
    if (c.totalSi > t.sio2[1] * 1.15) {
      notes.push({ type: 'warn', text: `SiO₂ (${c.totalSi.toFixed(2)}) exceeds the upper Seger limit for ${t.label}. May need higher temperature or longer soak to fully melt.` })
    }
  }

  // Thermal expansion confidence (Seger approximation is rough ±15%)
  if (c.expansionIndex > 0) {
    const lower = Math.round(c.expansionIndex * 0.85)
    const upper = Math.round(c.expansionIndex * 1.15)
    if (c.expansionIndex > t.expansion[1]) {
      notes.push({ type: 'warn', text: `Expansion index ~${c.expansionIndex.toFixed(0)} (range ${lower}–${upper}) — above the comfortable zone for ${t.label}. Crazing is likely on standard bodies.` })
    } else if (c.expansionIndex < t.expansion[0]) {
      notes.push({ type: 'info', text: `Expansion index ~${c.expansionIndex.toFixed(0)} (range ${lower}–${upper}) — very low expansion. Could shiver on high-expansion bodies.` })
    }
  }

  // Approximate data
  if (c.hasApproximateData) {
    notes.push({ type: 'info', text: 'Wood ash chemistry varies significantly between batches and species. These values are typical averages — treat the UMF as a guide, not a precise result.' })
  }

  // All good
  if (notes.length === 0) {
    notes.push({ type: 'ok', text: `Chemistry looks balanced for ${t.label}. Si:Al, alkali, and flux levels are within typical working ranges.` })
  }

  return notes
})

// ─── Bar chart helpers ────────────────────────────────────────────────────────
// Global max across all unity entries (not colorants) for proportional bars
const globalMax = computed(() => {
  const c = props.chemistry
  const all = [...c.r2o, ...c.ro, ...c.r2o3, ...c.ro2]
  return all.reduce((m, e) => Math.max(m, e.moles), 0.001)
})

function barWidth(entry: OxideEntry) {
  return Math.min((entry.moles / globalMax.value) * 100, 100)
}

function fmt(n: number, decimals = 2) {
  return n.toFixed(decimals)
}

// ─── Group metadata ───────────────────────────────────────────────────────────
const groups = computed(() => {
  const c = props.chemistry
  return [
    {
      id: 'r2o',
      label: 'R₂O Alkali fluxes',
      sublabel: 'Na₂O · K₂O · Li₂O',
      description: 'Strong melters. Each oxide contributes significantly to thermal expansion. High totals → crazing risk.',
      entries: c.r2o,
      total: c.totalR2O,
      colorClass: 'group-alkali',
      status: rangeStatus(c.knaO, targets.value.knao),
    },
    {
      id: 'ro',
      label: 'RO Earth fluxes',
      sublabel: 'CaO · MgO · ZnO · BaO · SrO',
      description: 'Stable, moderate-expansion fluxes. CaO builds durability. MgO pushes matte surfaces. ZnO assists crystal growth.',
      entries: c.ro,
      total: c.totalRO,
      colorClass: 'group-earth',
      status: 'ok' as const,
    },
    {
      id: 'r2o3',
      label: 'R₂O₃ Stabilisers',
      sublabel: 'Al₂O₃ · B₂O₃ · Fe₂O₃',
      description: 'Al₂O₃ stiffens the melt and builds hardness. B₂O₃ lowers melting point. Both sit between fluxes and glass formers.',
      entries: c.r2o3,
      total: c.r2o3.reduce((s, e) => s + e.moles, 0),
      colorClass: 'group-stabiliser',
      status: rangeStatus(c.totalAl, targets.value.al2o3),
    },
    {
      id: 'ro2',
      label: 'RO₂ Glass formers',
      sublabel: 'SiO₂ · TiO₂ · ZrO₂',
      description: 'SiO₂ is the backbone of the glass network. More SiO₂ = harder, more durable, less fluid glaze.',
      entries: c.ro2,
      total: c.ro2.reduce((s, e) => s + e.moles, 0),
      colorClass: 'group-glass',
      status: rangeStatus(c.totalSi, targets.value.sio2),
    },
  ]
})

// ─── Surface-specific UMF benchmarks ────────────────────────────────────────
const matchingBenchmarks = computed(() => {
  const id = props.chemistry.firingRangeId
  if (!id) return []
  return glazeStore.benchmarksByFiringRange.get(id) ?? []
})

const showBenchmarks = ref(false)

const matchingDiagnostics = computed(() => {
  if (!glazeStore.umfDiagnostics.length) return []
  const c = props.chemistry
  const t = targets.value
  const relevant: UMFDiagnostic[] = []

  for (const diag of glazeStore.umfDiagnostics) {
    const diagId = diag.id.toLowerCase()
    // Show diagnostics relevant to current chemistry issues
    if (diagId.includes('craze') && c.knaO > t.knao[1]) relevant.push(diag)
    else if (diagId.includes('matte') && c.siToAl !== null && c.siToAl < t.siToAl[0]) relevant.push(diag)
    else if (diagId.includes('run') && c.totalAl < t.al2o3[0]) relevant.push(diag)
    else if (diagId.includes('pinhole') && c.totalLOI > 18) relevant.push(diag)
  }
  return relevant
})
</script>

<template>
  <div class="chemistry-panel" :class="{ compact }">

    <!-- Invalid / empty state -->
    <div v-if="!chemistry.isValid" class="chem-empty">
      <span class="chem-empty-icon">⚗</span>
      <p v-if="!chemistry.missingMaterials.length">
        No flux detected — add feldspar, whiting, or a frit to calculate chemistry.
      </p>
      <p v-else>
        Chemistry unavailable — no analysis data for the materials in this recipe.
      </p>
    </div>

    <template v-else>

      <!-- Collapse toggle (compact mode) -->
      <button
        v-if="compact"
        class="chem-toggle"
        @click="collapsed = !collapsed"
      >
        <span class="chem-toggle-label">Molecular formula</span>
        <span class="chem-toggle-icon">{{ collapsed ? '▾' : '▴' }}</span>
      </button>
      <div v-else class="chem-header-row">
        <span class="chem-section-eyebrow">Unity Molecular Formula</span>
        <span class="chem-range-badge">{{ targets.label }}</span>
      </div>

      <Transition name="expand-info">
        <div v-show="!collapsed" class="chem-body">

          <!-- ── Metrics strip ── -->
          <div class="metrics-strip">
            <div class="metric-chip" :class="'status-' + siAlStatus">
              <span class="metric-label">Si : Al</span>
              <span class="metric-value">
                {{ chemistry.siToAl !== null ? fmt(chemistry.siToAl, 1) : '—' }}
              </span>
            </div>
            <div class="metric-chip" :class="'status-' + knaStatus">
              <span class="metric-label">KNaO</span>
              <span class="metric-value">{{ fmt(chemistry.knaO) }}</span>
            </div>
            <div class="metric-chip">
              <span class="metric-label">LOI</span>
              <span class="metric-value" :class="{ 'val-warn': chemistry.totalLOI > 18 }">
                {{ fmt(chemistry.totalLOI, 1) }}%
              </span>
            </div>
            <div class="metric-chip">
              <span class="metric-label">Expansion</span>
              <span class="metric-value">{{ fmt(chemistry.expansionIndex, 1) }}</span>
            </div>
          </div>

          <!-- ── Oxide groups ── -->
          <div class="oxide-groups">
            <div
              v-for="group in groups"
              :key="group.id"
              class="oxide-group"
              :class="group.colorClass"
            >
              <div class="group-header">
                <div class="group-header-left">
                  <span class="group-label">{{ group.label }}</span>
                  <span class="group-sublabel">{{ group.sublabel }}</span>
                </div>
                <span class="group-total" :class="'status-' + group.status">
                  {{ fmt(group.total) }}
                </span>
              </div>

              <div v-if="group.entries.length" class="oxide-rows">
                <div
                  v-for="entry in group.entries"
                  :key="entry.id"
                  class="oxide-row"
                >
                  <span class="oxide-label">{{ entry.label }}</span>
                  <div class="oxide-bar-track">
                    <div
                      class="oxide-bar-fill"
                      :class="group.colorClass"
                      :style="{ width: barWidth(entry) + '%' }"
                    />
                  </div>
                  <span class="oxide-moles">{{ fmt(entry.moles) }}</span>
                </div>
              </div>
              <div v-else class="group-empty">—</div>
            </div>

            <!-- Colorants (if any) -->
            <div v-if="chemistry.colorants.length" class="oxide-group group-colorant">
              <div class="group-header">
                <div class="group-header-left">
                  <span class="group-label">Colorants</span>
                  <span class="group-sublabel">absolute · not unity-normalised</span>
                </div>
              </div>
              <div class="oxide-rows">
                <div
                  v-for="entry in chemistry.colorants"
                  :key="entry.id"
                  class="oxide-row"
                >
                  <span class="oxide-label">{{ entry.label }}</span>
                  <div class="oxide-bar-track">
                    <div class="oxide-bar-fill group-colorant" style="width: 30%" />
                  </div>
                  <span class="oxide-moles">{{ fmt(entry.moles, 4) }}</span>
                </div>
              </div>
            </div>
          </div>

          <!-- ── Interpretation notes ── -->
          <div class="interp-block">
            <div
              v-for="(note, i) in interpretations"
              :key="i"
              class="interp-note"
              :class="'note-' + note.type"
            >
              <span class="interp-icon">
                {{ note.type === 'warn' ? '!' : note.type === 'ok' ? '✓' : 'ℹ' }}
              </span>
              <p>{{ note.text }}</p>
            </div>
          </div>

          <!-- ── Surface benchmarks ── -->
          <div v-if="matchingBenchmarks.length" class="benchmark-block">
            <button class="benchmark-toggle" @click="showBenchmarks = !showBenchmarks">
              <span class="benchmark-toggle-label">Surface benchmarks</span>
              <span class="benchmark-toggle-count">{{ matchingBenchmarks.length }}</span>
              <span class="benchmark-toggle-icon">{{ showBenchmarks ? '▴' : '▾' }}</span>
            </button>
            <div v-if="showBenchmarks" class="benchmark-list">
              <div v-for="bm in matchingBenchmarks" :key="bm.id" class="benchmark-card">
                <div class="bm-header">
                  <span class="bm-name">{{ bm.name }}</span>
                  <span class="bm-cone">{{ bm.coneRange }}</span>
                </div>
                <p class="bm-goal">{{ bm.surfaceGoal }}</p>
                <div class="bm-bands">
                  <div v-for="(val, key) in bm.targetBands" :key="key" class="bm-band">
                    <span class="bm-band-key">{{ key }}</span>
                    <span class="bm-band-val">{{ val }}</span>
                  </div>
                </div>
                <div v-if="bm.chemistrySignals.length" class="bm-signals">
                  <p v-for="(sig, i) in bm.chemistrySignals" :key="i" class="bm-signal">{{ sig }}</p>
                </div>
              </div>
            </div>
          </div>

          <!-- ── Diagnostics (shown when chemistry issues detected) ── -->
          <div v-if="matchingDiagnostics.length" class="diagnostic-block">
            <div v-for="diag in matchingDiagnostics" :key="diag.id" class="diagnostic-card">
              <span class="diag-issue">{{ diag.issue }}</span>
              <ul class="diag-moves">
                <li v-for="(m, i) in diag.moveDirection" :key="i">{{ m }}</li>
              </ul>
            </div>
          </div>

          <!-- ── Missing materials warning ── -->
          <div v-if="chemistry.missingMaterials.length" class="missing-block">
            <span class="missing-icon">◌</span>
            <p>Partial chemistry — no analysis data for:
              <span v-for="(m, i) in chemistry.missingMaterials" :key="m" class="missing-id">
                {{ m }}<span v-if="i < chemistry.missingMaterials.length - 1">, </span>
              </span>
            </p>
          </div>

          <!-- ── Context footer ── -->
          <div class="chem-footer">
            <span class="chem-footer-text">
              UMF · flux normalised · Seger expansion estimate
            </span>
            <span v-if="targets" class="chem-footer-range">
              {{ targets.note }}
            </span>
          </div>

        </div>
      </Transition>
    </template>
  </div>
</template>

<style scoped>
.chemistry-panel {
  font-family: var(--font-mono);
}

/* ── Empty state ── */
.chem-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-6) var(--space-4);
  text-align: center;
}
.chem-empty-icon { font-size: 1.8rem; opacity: 0.3; }
.chem-empty p {
  font-family: var(--font-body);
  font-style: italic;
  font-size: var(--text-sm);
  color: var(--stone);
}

/* ── Header ── */
.chem-toggle {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  background: none;
  border: none;
  cursor: pointer;
  padding: 0;
  gap: var(--space-2);
}
.chem-toggle-label {
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--stone);
}
.chem-toggle-icon {
  font-size: var(--text-xs);
  color: var(--stone);
}
.chem-header-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: var(--space-4);
}
.chem-section-eyebrow {
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--stone);
}
.chem-range-badge {
  font-family: var(--font-mono);
  font-size: 10px;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--stone);
  background: var(--ink-05);
  border: 1px solid var(--ink-10);
  border-radius: var(--radius-full);
  padding: 2px 8px;
}

/* ── Body (collapsible) ── */
.chem-body { margin-top: var(--space-3); display: flex; flex-direction: column; gap: var(--space-4); }

/* ── Metrics strip ── */
.metrics-strip {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: var(--space-2);
}
.metric-chip {
  background: var(--chalk);
  border: 1px solid var(--ink-10);
  border-radius: var(--radius-lg);
  padding: var(--space-2) var(--space-3);
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.metric-label {
  font-size: 9px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--stone);
}
.metric-value {
  font-size: var(--text-sm);
  font-weight: 700;
  color: var(--carbon);
  line-height: 1;
}
.val-warn { color: var(--clay); }

/* Metric status coloring */
.status-ok   .metric-value { color: var(--carbon); }
.status-low  .metric-value { color: var(--stone-dark); }
.status-high .metric-value { color: var(--clay); }
.status-ok   { border-color: var(--ink-10); }
.status-high { border-color: var(--clay-30); }
.status-low  { border-color: var(--ink-20); }

/* ── Oxide groups ── */
.oxide-groups { display: flex; flex-direction: column; gap: var(--space-2); }

.oxide-group {
  background: var(--chalk);
  border-radius: var(--radius-lg);
  padding: var(--space-3) var(--space-4);
  border-left: 3px solid transparent;
}
.group-alkali    { border-left-color: var(--oxide-alkali); }
.group-earth     { border-left-color: var(--oxide-earth); }
.group-stabiliser{ border-left-color: var(--oxide-stabiliser); }
.group-glass     { border-left-color: var(--oxide-glass); }
.group-colorant  { border-left-color: var(--oxide-colorant); }

.group-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: var(--space-2);
}
.group-header-left { display: flex; flex-direction: column; gap: 1px; }
.group-label {
  font-size: var(--text-xs);
  font-weight: 700;
  letter-spacing: 0.04em;
  color: var(--carbon);
}
.group-sublabel {
  font-size: 9px;
  letter-spacing: 0.05em;
  color: var(--stone);
}
.group-total {
  font-size: var(--text-sm);
  font-weight: 700;
  color: var(--carbon);
  padding-top: 1px;
}
.group-total.status-high { color: var(--clay); }
.group-total.status-low  { color: var(--stone); }
.group-empty { font-size: var(--text-xs); color: var(--stone); padding-top: var(--space-1); }

/* ── Oxide rows ── */
.oxide-rows { display: flex; flex-direction: column; gap: 5px; }
.oxide-row {
  display: grid;
  grid-template-columns: 44px 1fr 44px;
  align-items: center;
  gap: var(--space-2);
}
.oxide-label {
  font-size: 10px;
  letter-spacing: 0.04em;
  color: var(--ink);
  text-align: right;
}
.oxide-bar-track {
  height: 6px;
  background: var(--ink-05);
  border-radius: var(--radius-full);
  overflow: hidden;
}
.oxide-bar-fill {
  height: 100%;
  border-radius: var(--radius-full);
  transition: width 0.5s cubic-bezier(0.4, 0, 0.2, 1);
}
.oxide-bar-fill.group-alkali    { background: var(--oxide-alkali); }
.oxide-bar-fill.group-earth     { background: var(--oxide-earth); }
.oxide-bar-fill.group-stabiliser{ background: var(--oxide-stabiliser); }
.oxide-bar-fill.group-glass     { background: var(--oxide-glass); }
.oxide-bar-fill.group-colorant  { background: var(--oxide-colorant); }

.oxide-moles {
  font-size: 10px;
  color: var(--stone);
  text-align: right;
}

/* ── Interpretation notes ── */
.interp-block { display: flex; flex-direction: column; gap: var(--space-2); }
.interp-note {
  display: flex;
  gap: var(--space-2);
  padding: var(--space-2) var(--space-3);
  border-radius: var(--radius-md);
  align-items: flex-start;
}
.note-ok   { background: var(--sage-10); border-left: 2px solid var(--sage); }
.note-warn { background: var(--clay-08); border-left: 2px solid var(--clay); }
.note-info { background: var(--ink-04); border-left: 2px solid var(--ink-20); }

.interp-icon {
  font-size: 10px;
  font-weight: 700;
  flex-shrink: 0;
  margin-top: 2px;
  color: var(--stone);
}
.note-ok   .interp-icon { color: var(--sage-dark); }
.note-warn .interp-icon { color: var(--clay); }

.interp-note p {
  font-family: var(--font-body);
  font-size: var(--text-xs);
  line-height: 1.55;
  color: var(--stone-dark);
}

/* ── Missing data ── */
.missing-block {
  display: flex;
  gap: var(--space-2);
  align-items: flex-start;
  padding: var(--space-2) var(--space-3);
  background: var(--ink-05);
  border-radius: var(--radius-md);
}
.missing-icon { color: var(--stone); font-size: var(--text-xs); }
.missing-block p {
  font-family: var(--font-body);
  font-size: var(--text-xs);
  color: var(--stone);
  line-height: 1.5;
}
.missing-id {
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  color: var(--stone-dark);
}

/* ── Footer ── */
.chem-footer {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding-top: var(--space-2);
  border-top: 1px solid var(--ink-05);
}
.chem-footer-text {
  font-size: 9px;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--stone-light);
}
.chem-footer-range {
  font-family: var(--font-body);
  font-size: var(--text-xs);
  font-style: italic;
  color: var(--stone);
  line-height: 1.4;
}

/* ── Benchmarks ── */
.benchmark-block {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.benchmark-toggle {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  background: none;
  border: none;
  cursor: pointer;
  padding: 0;
}

.benchmark-toggle-label {
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--stone);
}

.benchmark-toggle-count {
  font-family: var(--font-mono);
  font-size: 10px;
  color: var(--stone);
  background: var(--ink-05);
  border-radius: var(--radius-full);
  padding: 1px 6px;
}

.benchmark-toggle-icon {
  font-size: 10px;
  color: var(--stone);
}

.benchmark-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.benchmark-card {
  padding: var(--space-2) var(--space-3);
  background: var(--parchment);
  border: 1px solid var(--ink-10);
  border-radius: var(--radius-md);
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.bm-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.bm-name {
  font-family: var(--font-mono);
  font-size: 11px;
  font-weight: 700;
  color: var(--carbon);
  letter-spacing: 0.02em;
}

.bm-cone {
  font-family: var(--font-mono);
  font-size: 10px;
  color: var(--stone);
}

.bm-goal {
  font-family: var(--font-body);
  font-size: var(--text-xs);
  color: var(--stone);
  font-style: italic;
  line-height: 1.4;
}

.bm-bands {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-1);
}

.bm-band {
  display: flex;
  gap: 4px;
  align-items: center;
  background: var(--ink-05);
  border-radius: var(--radius-sm);
  padding: 1px 6px;
}

.bm-band-key {
  font-family: var(--font-mono);
  font-size: 9px;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--stone);
}

.bm-band-val {
  font-family: var(--font-mono);
  font-size: 10px;
  font-weight: 700;
  color: var(--carbon);
}

.bm-signals {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.bm-signal {
  font-family: var(--font-body);
  font-size: 11px;
  color: var(--stone);
  font-style: italic;
  line-height: 1.4;
}

/* ── Diagnostics ── */
.diagnostic-block {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.diagnostic-card {
  padding: var(--space-2) var(--space-3);
  background: var(--clay-06);
  border-left: 2px solid var(--clay);
  border-radius: 0 var(--radius-md) var(--radius-md) 0;
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.diag-issue {
  font-family: var(--font-mono);
  font-size: 11px;
  font-weight: 700;
  color: var(--clay);
}

.diag-moves {
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.diag-moves li {
  font-family: var(--font-body);
  font-size: var(--text-xs);
  color: var(--stone-dark);
  line-height: 1.45;
  padding-left: var(--space-3);
  position: relative;
}

.diag-moves li::before {
  content: '→';
  position: absolute;
  left: 0;
  color: var(--clay);
  font-family: var(--font-mono);
  font-size: 10px;
}

/* ── Compact mode ── */
.compact .metrics-strip {
  grid-template-columns: repeat(2, 1fr);
}
.compact .chem-body { gap: var(--space-3); }

/* ── Transition ── */
.expand-info-enter-active,
.expand-info-leave-active {
  transition: opacity 0.25s ease, transform 0.25s ease;
  overflow: hidden;
}
.expand-info-enter-from,
.expand-info-leave-to {
  opacity: 0;
  transform: translateY(-6px);
}
</style>
