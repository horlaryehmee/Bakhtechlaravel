import { readFileSync } from 'node:fs'
import assert from 'node:assert/strict'
import { test } from 'node:test'
import ts from 'typescript'
import { DOMParser } from 'linkedom'

globalThis.DOMParser = DOMParser

const compile = name => ts.transpileModule(readFileSync(new URL(`../src/pages/admin/${name}.ts`, import.meta.url), 'utf8'), { compilerOptions: { module: ts.ModuleKind.ESNext } }).outputText
const moduleUrl = source => `data:text/javascript;base64,${Buffer.from(source).toString('base64')}`
const blocksUrl = moduleUrl(compile('crm-email-blocks'))
const { renderBlock, newBlock, parseBlocks, htmlDocument, emailEditorMode } = await import(blocksUrl)
const { emailTemplates, emptyBrand, templateHtml, templateBlocks, customHtmlTemplate } = await import(moduleUrl(compile('crm-email-templates').replace("'./crm-email-blocks'", JSON.stringify(blocksUrl))))
const brand = { name: 'Acme & Co', logo: 'https://cdn.example.test/logo.png', website: 'https://example.test/offer?a=1&b=2', email: 'hello@example.test', phone: '+234 800 123 4567', address: '12 Example Street\nLagos' }

test('ten distinct purposes are editable in both block-based editors and fit the send limit', () => {
  assert.equal(emailTemplates.length, 10)
  assert.equal(new Set(emailTemplates.map(item => item.purpose)).size, 10)
  for (const mode of ['default', 'visual']) {
    for (const template of emailTemplates) {
      const html = templateHtml(template, mode, brand)
      const marker = mode === 'visual' ? 'data-crm-visual' : 'data-crm-block'
      assert.match(html, new RegExp(`${marker}="logo"`))
      assert.match(html, new RegExp(`${marker}="contact"`))
      assert.match(html, /\{\{name\}\}/)
      assert.ok(html.includes(template.cta))
      assert.ok(Buffer.byteLength(html) < 100000)
      assert.ok(html.includes('src="https://cdn.example.test/logo.png"'))
      assert.ok(html.includes('mailto:hello@example.test'))
      assert.ok(html.includes('tel:+2348001234567'))
      assert.ok(html.includes('12 Example Street<br>Lagos'))
      assert.ok(html.includes('Acme &amp; Co'))
      assert.ok(html.includes('https://example.test/offer?a=1&amp;b=2'))
      const blocks = templateBlocks(template, brand)
      assert.equal(new Set(blocks.map(block => block.id)).size, blocks.length)
    }
  }
})

test('brand-name logo fallback and optional contacts do not invent customer details', () => {
  const html = templateHtml(emailTemplates[0], 'visual', emptyBrand)
  assert.match(html, /YOUR BRAND/)
  assert.doesNotMatch(html, /<img|mailto:|tel:|example\.com/)
  assert.match(html, /href="#"/)
})

test('branding cannot inject markup or executable destinations', () => {
  const malicious = { name: '<img src=x onerror=alert(1)>', logo: 'javascript:alert(1)', website: 'javascript:alert(2)', email: '"><script>alert(3)</script>', phone: '"><img src=x>', address: '<iframe src=x></iframe>' }
  for (const html of [templateHtml(emailTemplates[0], 'default', malicious), customHtmlTemplate(malicious)]) {
    assert.doesNotMatch(html, /<script|<iframe|src="javascript:|href="javascript:/)
    assert.match(html, /&lt;img/)
    assert.match(html, /href="#"/)
  }
})

test('HTML starter has responsive table layout and clearly marked logo, CTA, and contact editing areas', () => {
  const html = customHtmlTemplate(brand)
  assert.match(html, /^<!doctype html>/)
  assert.match(html, /@media only screen and \(max-width:600px\)/)
  assert.match(html, /role="presentation"/)
  assert.match(html, /<!-- LOGO:/)
  assert.match(html, /<!-- CONTACT:/)
  assert.match(html, /<!-- CTA:/)
  assert.match(html, /mailto:hello@example.test/)
  assert.ok(Buffer.byteLength(html) < 100000)
})

test('edited logo size and contact values are serialized for reopening the draft', () => {
  const logo = renderBlock({ ...newBlock('logo'), text: 'Custom brand', url: brand.logo, imageWidth: 230 }, 'visual')
  assert.match(logo, /width="230"/)
  assert.match(logo, /data-image-width="230"/)
  assert.match(logo, /data-brand-name="Custom brand"/)
  const contact = renderBlock({ ...newBlock('contact'), text: brand.name, email: brand.email, phone: brand.phone, address: brand.address, url: brand.website }, 'default')
  assert.match(contact, /data-email="hello@example.test"/)
  assert.match(contact, /data-phone="\+234 800 123 4567"/)
})

test('all twenty editor variants preserve their content, branding, and styling after reopening', () => {
  for (const mode of ['default', 'visual']) {
    for (const template of emailTemplates) {
      const original = templateBlocks(template, brand)
      original[0].imageWidth = 220
      const reopened = parseBlocks(htmlDocument(original, mode), mode)
      const withoutId = blocks => blocks.map(({ id, ...rest }) => rest)
      assert.deepEqual(withoutId(reopened), withoutId(original), `${template.id} / ${mode}`)
      // Editing a paragraph after reopening must preserve the logo and contact footer.
      reopened.find(block => block.type === 'text').text = 'Updated after saving'
      const edited = htmlDocument(reopened, mode)
      assert.match(edited, /Updated after saving/)
      assert.match(edited, /width="220"/)
      assert.match(edited, /mailto:hello@example.test/)
    }
  }
})

test('saved library templates and campaign copies reopen in their original editor', () => {
  for (const mode of ['default', 'visual']) {
    for (const template of emailTemplates) {
      const savedBody = templateHtml(template, mode, brand)
      assert.equal(emailEditorMode(savedBody), mode)
    }
  }
  assert.equal(emailEditorMode(customHtmlTemplate(brand)), 'html')
  assert.equal(emailEditorMode('<h1>Existing custom HTML template</h1>'), 'html')
  assert.equal(emailEditorMode(''), 'html')
})
