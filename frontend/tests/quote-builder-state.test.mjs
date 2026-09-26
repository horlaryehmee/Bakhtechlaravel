import { readFileSync } from 'node:fs'
import assert from 'node:assert/strict'
import { test } from 'node:test'
import ts from 'typescript'

const source = readFileSync(new URL('../src/lib/quote-builder-state.ts', import.meta.url), 'utf8')
const { outputText } = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext } })
const { chooseProject, detailsComplete } = await import(`data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`)
const selected = { project_type: 'business', discovery: '', answers: { 1: 'Enquiries' }, features: [2, 3] }

test('revisiting the same project preserves answers and selected functionality', () => {
  assert.deepEqual(chooseProject(selected, 'business'), selected)
})
test('switching project or discovery goal removes incompatible answers and features', () => {
  assert.deepEqual(chooseProject(selected, 'ecommerce'), { project_type: 'ecommerce', discovery: '', answers: {}, features: [] })
  const discovery = { ...selected, project_type: 'unsure', discovery: 'promote' }
  assert.deepEqual(chooseProject(discovery, 'unsure', 'promote'), discovery)
  assert.deepEqual(chooseProject(discovery, 'unsure', 'sell'), { project_type: 'unsure', discovery: 'sell', answers: {}, features: [] })
})
test('progression requires valid answers to every relevant question', () => {
  const type = { questions: [{ id: 1, options: [{ label: 'Enquiries' }] }, { id: 2, options: [{ label: 'Small team' }] }] }
  assert.equal(detailsComplete(type, selected), false)
  assert.equal(detailsComplete(type, { ...selected, answers: { 1: 'Enquiries', 2: 'Small team' } }), true)
  assert.equal(detailsComplete(type, { ...selected, answers: { 1: 'Invalid', 2: 'Small team' } }), false)
})
