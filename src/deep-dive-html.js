import { lessonPath } from './seo.js'

const escapeHtml = value => String(value)
  .replaceAll('&', '&amp;')
  .replaceAll('"', '&quot;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')

export function formatUpdated(iso) {
  const [year, month, day] = iso.split('-').map(Number)
  return new Intl.DateTimeFormat('en-US', {
    month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC',
  }).format(new Date(Date.UTC(year, month - 1, day)))
}

function renderBlock(block) {
  switch (block.type) {
    case 'p':
      return `<p>${escapeHtml(block.text)}</p>`
    case 'h3':
      return `<h3 id="${escapeHtml(block.id)}">${escapeHtml(block.text)}</h3>`
    case 'ul':
      return `<ul>${block.items.map(item => `<li>${escapeHtml(item)}</li>`).join('')}</ul>`
    case 'sql':
      return `<pre class="deep-dive-code"><code>${escapeHtml(block.code.trim())}</code></pre>${block.caption ? `<p class="deep-dive-caption">${escapeHtml(block.caption)}</p>` : ''}`
    case 'plan':
      return `<pre class="deep-dive-plan"><code>${escapeHtml(block.code.trim())}</code></pre>${block.caption ? `<p class="deep-dive-caption">${escapeHtml(block.caption)}</p>` : ''}`
    case 'table':
      return `${block.caption ? `<p class="deep-dive-caption">${escapeHtml(block.caption)}</p>` : ''}<div class="deep-dive-table-scroll"><table><thead><tr>${block.headers.map(header => `<th scope="col">${escapeHtml(header)}</th>`).join('')}</tr></thead><tbody>${block.rows.map(row => `<tr>${row.map(cell => `<td>${escapeHtml(cell)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`
    case 'answer':
      return `<div class="deep-dive-answer"><p class="deep-dive-label">Answer</p>${block.paragraphs.map(paragraph => `<p>${escapeHtml(paragraph)}</p>`).join('')}</div>`
    default:
      throw new Error(`Unknown deep dive block: ${block.type}`)
  }
}

function tocItems(dive) {
  return [
    ...dive.sections.map(section => ({ id: section.id, label: section.heading })),
    { id: 'deep-dive-faq', label: 'Which questions come up most often?' },
    { id: 'deep-dive-reading', label: 'Where do the official docs go deeper?' },
  ]
}

export function renderDeepDiveHtml(dive) {
  const updated = formatUpdated(dive.updated)
  const toc = tocItems(dive).map(item => `<li><a href="#${escapeHtml(item.id)}">${escapeHtml(item.label)}</a></li>`).join('')
  const sections = dive.sections.map(section => `<h2 id="${escapeHtml(section.id)}">${escapeHtml(section.heading)}</h2>${section.blocks.map(renderBlock).join('')}`).join('')
  const faqs = dive.faqs.map((faq, index) => `<h3 id="deep-dive-faq-${index + 1}">${escapeHtml(faq.question)}</h3><p>${escapeHtml(faq.answer)}</p>`).join('')
  const reading = dive.furtherReading.map(link => `<li><a href="${escapeHtml(link.href)}">${escapeHtml(link.title)}</a></li>`).join('')
  return `<section class="deep-dive" id="deep-dive" aria-label="Deep dive">
    <p class="deep-dive-kicker">Deep dive</p>
    <p class="deep-dive-updated">Last updated <time datetime="${escapeHtml(dive.updated)}">${escapeHtml(updated)}</time></p>
    <nav class="deep-dive-toc" aria-label="Deep dive contents">
      <p>In this section</p>
      <ol>${toc}</ol>
    </nav>
    ${sections}
    <h2 id="deep-dive-faq">Which questions come up most often?</h2>
    ${faqs}
    <h2 id="deep-dive-reading">Where do the official docs go deeper?</h2>
    <ul class="deep-dive-reading">${reading}</ul>
  </section>`
}

export function lessonPagerHtml(previous, next) {
  const link = (lesson, kind, label) => lesson
    ? `<a class="lesson-pager-${kind}" href="${lessonPath(lesson.id)}"><span>${label}</span><strong>${escapeHtml(lesson.title)}</strong></a>`
    : ''
  if (!previous && !next) return ''
  return `<nav class="lesson-pager" aria-label="Lesson pages">${link(previous, 'prev', 'Previous lesson')}${link(next, 'next', 'Next lesson')}</nav>`
}

function proseParts(dive) {
  const parts = [
    'Deep dive',
    `Last updated ${formatUpdated(dive.updated)}`,
  ]
  for (const section of dive.sections) {
    parts.push(section.heading)
    for (const block of section.blocks) {
      if (block.type === 'p' || block.type === 'h3') parts.push(block.text)
      if (block.type === 'ul') parts.push(...block.items)
      if (block.type === 'sql' || block.type === 'plan' || block.type === 'table') parts.push(block.caption || '')
      if (block.type === 'table') parts.push(...block.headers, ...block.rows.flat())
      if (block.type === 'answer') parts.push('Answer', ...block.paragraphs)
    }
  }
  parts.push('Which questions come up most often?')
  for (const faq of dive.faqs) parts.push(faq.question, faq.answer)
  parts.push('Where do the official docs go deeper?', ...dive.furtherReading.map(link => link.title))
  return parts
}

export function deepDiveWordCount(dive) {
  return proseParts(dive).join(' ').trim().split(/\s+/).filter(Boolean).length
}
