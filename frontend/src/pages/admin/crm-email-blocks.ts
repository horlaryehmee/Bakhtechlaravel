export type Block = { id: number; type: 'heading' | 'text' | 'button' | 'image' | 'divider' | 'logo' | 'contact'; text: string; url: string; color: string; background: string; align: 'left' | 'center' | 'right'; padding: number; fontSize: number; imageWidth: number; email: string; phone: string; address: string }
let nextBlockId = 1
export const newBlock = (type: Block['type']): Block => ({ id: nextBlockId++, type, text: type === 'button' ? 'Learn more' : type === 'logo' ? 'YOUR BRAND' : '', url: '', color: '#1f2937', background: '#ffffff', align: 'left', padding: 24, fontSize: type === 'heading' ? 30 : 16, imageWidth: 160, email: '', phone: '', address: '' })
export const escapeHtml = (value: string) => value.replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char] || char)
export const safeUrl = (value: string) => { if (!value.trim()) return '#'; try { const url = new URL(value); return ['http:', 'https:', 'mailto:', 'tel:'].includes(url.protocol) ? escapeHtml(url.href) : '#' } catch { return '#' } }
export const safeColor = (value: string) => /^#[0-9a-fA-F]{6}$/.test(value) ? value : '#1f2937'
export function emailEditorMode(html: string): 'default' | 'visual' | 'html' {
  if (/<!doctype|<html\b/i.test(html)) return 'html'
  const document = new DOMParser().parseFromString(html, 'text/html')
  if (document.querySelector('[data-crm-visual]')) return 'visual'
  if (document.querySelector('[data-crm-block]')) return 'default'
  return 'html'
}
const textHtml = (value: string) => escapeHtml(value).replace(/\n/g, '<br>')

export function parseBlocks(html: string, mode: 'default' | 'visual'): Block[] {
  if (!html.trim()) return [newBlock(mode === 'visual' ? 'heading' : 'text')]
  const document = new DOMParser().parseFromString(html, 'text/html')
  const selector = mode === 'visual' ? '[data-crm-visual]' : '[data-crm-block]'
  const found = Array.from(document.querySelectorAll<HTMLElement>(selector))
  if (!found.length) return [{ ...newBlock('text'), text: document.body.textContent?.trim() || '' }]
  return found.map(element => {
    const type = element.dataset.crmVisual || element.dataset.crmBlock
    const allowed: Block['type'][] = ['heading', 'text', 'button', 'image', 'divider', 'logo', 'contact']
    const block = newBlock(allowed.includes(type as Block['type']) ? type as Block['type'] : 'text')
    const content = element.querySelector('h1,h2,p,a,img') as HTMLElement | null
    content?.querySelectorAll('br').forEach(br => br.replaceWith('\n'))
    block.text = content?.tagName === 'IMG' ? content.getAttribute('alt') || '' : content?.textContent || ''
    block.url = content?.getAttribute('href') || content?.getAttribute('src') || ''
    if (block.type === 'logo' || block.type === 'contact') {
      block.text = element.dataset.brandName || ''
      block.url = element.dataset.brandUrl || ''
    }
    block.imageWidth = Math.max(60, Math.min(320, Number(element.dataset.imageWidth) || 160))
    block.email = element.dataset.email || ''
    block.phone = element.dataset.phone || ''
    block.address = element.dataset.address || ''
    block.color = element.dataset.color || block.color
    block.background = element.dataset.background || block.background
    block.align = (['left', 'center', 'right'].includes(element.dataset.align || '') ? element.dataset.align : 'left') as Block['align']
    block.padding = Math.max(0, Math.min(80, Number(element.dataset.padding ?? 24)))
    block.fontSize = Math.max(10, Math.min(64, Number(element.dataset.fontSize ?? (block.type === 'heading' ? 30 : 16))))
    return block
  })
}

export function renderBlock(block: Block, mode: 'default' | 'visual'): string {
  const marker = mode === 'visual' ? 'data-crm-visual' : 'data-crm-block'
  const attr = `${marker}="${block.type}" data-color="${safeColor(block.color)}" data-background="${safeColor(block.background)}" data-align="${block.align}" data-padding="${block.padding}" data-font-size="${block.fontSize}" data-image-width="${block.imageWidth}" data-brand-name="${escapeHtml(block.text)}" data-brand-url="${escapeHtml(block.url)}" data-email="${escapeHtml(block.email)}" data-phone="${escapeHtml(block.phone)}" data-address="${escapeHtml(block.address)}"`
  const contact = `<p style="margin:0;font-size:14px;line-height:1.8;color:${safeColor(block.color)}"><strong>${textHtml(block.text)}</strong>${block.address ? '<br>'+textHtml(block.address) : ''}${block.email ? '<br><a style="color:inherit" href="'+safeUrl('mailto:'+block.email)+'">'+escapeHtml(block.email)+'</a>' : ''}${block.phone ? '<br><a style="color:inherit" href="'+safeUrl('tel:'+block.phone.replace(/[^+\d]/g, ''))+'">'+escapeHtml(block.phone)+'</a>' : ''}${block.url ? '<br><a style="color:inherit" href="'+safeUrl(block.url)+'">Visit our website</a>' : ''}</p>`
  const logo = block.url && safeUrl(block.url) !== '#' ? `<img src="${safeUrl(block.url)}" width="${block.imageWidth}" alt="${escapeHtml(block.text)}" style="display:inline-block;max-width:100%;height:auto;border:0;vertical-align:middle" />` : `<p style="margin:0;font-size:18px;font-weight:bold;letter-spacing:2px;color:${safeColor(block.color)}"><span style="display:inline-block;padding:8px 10px;margin-right:10px;border:2px solid ${safeColor(block.color)};border-radius:8px;letter-spacing:0">${escapeHtml(block.text.trim().slice(0, 2).toUpperCase() || 'YB')}</span>${escapeHtml(block.text || 'YOUR BRAND')}</p>`
  const inner = block.type === 'heading' ? `<h1 style="margin:0;font-size:${block.fontSize}px;line-height:1.2;color:${safeColor(block.color)}">${textHtml(block.text)}</h1>`
    : block.type === 'text' ? `<p style="margin:0;line-height:1.6;font-size:${block.fontSize}px;color:${safeColor(block.color)}">${textHtml(block.text)}</p>`
      : block.type === 'button' ? `<a href="${safeUrl(block.url)}" style="display:inline-block;padding:12px 20px;border-radius:5px;background:${safeColor(block.color)};color:#ffffff;text-decoration:none">${textHtml(block.text)}</a>`
        : block.type === 'logo' ? logo : block.type === 'contact' ? contact
        : block.type === 'image' ? `<img src="${safeUrl(block.url)}" alt="${escapeHtml(block.text)}" style="max-width:100%;height:auto" />`
          : '<hr style="border:0;border-top:1px solid #e5e7eb" />'
  return `<div ${attr} style="padding:${block.padding}px;background:${safeColor(block.background)};text-align:${block.align}">${inner}</div>`
}

export function htmlDocument(blocks: Block[], mode: 'default' | 'visual') {
  if (!blocks.length) return ''
  const content = blocks.map(block => renderBlock(block, mode)).join('')
  return `<div style="max-width:640px;margin:0 auto;font-family:Arial,sans-serif;background:#ffffff">${content}</div>`
}

