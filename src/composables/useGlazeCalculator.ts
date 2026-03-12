import { computed } from 'vue'
import { useWorkshopStore } from '@/stores/workshop'
import { storeToRefs } from 'pinia'

export function useGlazeCalculator() {
  const store = useWorkshopStore()
  const { batchWeight, scaledIngredients, totalWeight, calculatorRecipe } = storeToRefs(store)

  const percentageSum = computed(() => {
    const src = calculatorRecipe.value
    if (!src) return 0
    return src.ingredients.reduce((sum, i) => sum + i.amount, 0)
  })

  const isBalanced = computed(() => {
    const s = percentageSum.value
    return s >= 99 && s <= 101
  })

  // Simplified UMF-inspired oxide groupings for display
  // We show the ingredient amounts as a visual bar chart by ingredient weight
  const ingredientBars = computed(() => {
    if (!scaledIngredients.value.length) return []
    const max = Math.max(...scaledIngredients.value.map(i => i.scaledGrams))
    return scaledIngredients.value.map(i => ({
      ...i,
      barWidth: max > 0 ? (i.scaledGrams / max) * 100 : 0,
    }))
  })

  return {
    batchWeight,
    scaledIngredients,
    totalWeight,
    calculatorRecipe,
    percentageSum,
    isBalanced,
    ingredientBars,
  }
}
