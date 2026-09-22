import { readFileSync } from 'node:fs'
import assert from 'node:assert/strict'
import { test } from 'node:test'
import ts from 'typescript'

const source = readFileSync(new URL('../src/lib/pricing-response.ts', import.meta.url), 'utf8')
const { outputText } = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext } })
const { parsePricingResponse } = await import(`data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`)
const valid = () => ({ currencies: ['NGN', 'USD', 'GBP'], categories: [{ slug: 'web', name: 'Web', description: '', plans: [{ id: 1, name: 'Custom', description: '', prices: [], features: [] }] }] })

test('accepts normal pricing, empty lists, and custom-price plans', () => {
  assert.deepEqual(parsePricingResponse(valid()), valid())
  assert.deepEqual(parsePricingResponse({ categories: [], currencies: ['NGN'] }).categories, [])
})
test('rejects non-array categories before they reach React', () => {
  for (const categories of [null, undefined, {}, { 0: valid().categories[0] }, 'stale']) {
    assert.throws(() => parsePricingResponse({ ...valid(), categories }), /temporarily unavailable/)
  }
})
test('rejects malformed nested lists and currencies', () => {
  const payload = valid()
  payload.categories[0].plans[0].features = {}
  assert.throws(() => parsePricingResponse(payload))
  payload.categories[0].plans = {}
  assert.throws(() => parsePricingResponse(payload))
  assert.throws(() => parsePricingResponse({ ...valid(), currencies: {} }))
  assert.throws(() => parsePricingResponse(null))
})
