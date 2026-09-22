import type { PricingCategory } from './api'

const unavailable = 'Pricing is temporarily unavailable. Please try again or book a call.'
const record = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value)

// TypeScript types do not validate JSON received from a server or an old cache.
export function parsePricingResponse(value: unknown): { categories: PricingCategory[]; currencies: string[] } {
  if (!record(value) || !Array.isArray(value.categories) ||
      !Array.isArray(value.currencies) || value.currencies.length === 0 ||
      !value.currencies.every((currency) => typeof currency === 'string' && /^[A-Z]{3}$/.test(currency))) {
    throw new Error(unavailable)
  }
  for (const category of value.categories) {
    if (!record(category) || typeof category.slug !== 'string' || typeof category.name !== 'string' ||
        typeof category.description !== 'string' || !Array.isArray(category.plans)) throw new Error(unavailable)
    for (const plan of category.plans) {
      if (!record(plan) || typeof plan.id !== 'number' || typeof plan.name !== 'string' ||
          typeof plan.description !== 'string' || !(record(plan.prices) || (Array.isArray(plan.prices) && plan.prices.length === 0)) ||
          !Array.isArray(plan.features)) throw new Error(unavailable)
      for (const feature of plan.features) {
        if (!record(feature) || typeof feature.title !== 'string' ||
            typeof feature.description !== 'string') throw new Error(unavailable)
      }
    }
  }
  return value as { categories: PricingCategory[]; currencies: string[] }
}
