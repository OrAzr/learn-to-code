import { lessonPath } from './seo.js'

const escapeHtml = value => String(value)
  .replaceAll('&', '&amp;')
  .replaceAll('"', '&quot;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')

const details = (summary, body) => `<details><summary>${escapeHtml(summary)}</summary>${body}</details>`

export function renderCoachHtml(coach) {
  const hints = coach.hints.map((hint, index) => details(`Hint ${index + 1}: ${hint.label}`, `<p>${escapeHtml(hint.text)}</p>`)).join('')
  const failures = coach.failures.map(rule => details(rule.summary, `<p>${escapeHtml(rule.text)}</p>`)).join('')
  const fallback = `<p>${escapeHtml(coach.fallback.error)}</p><p>${escapeHtml(coach.fallback.miss)}</p>`
  const why = coach.why.paragraphs.map(paragraph => `<p>${escapeHtml(paragraph)}</p>`).join('')
  const challenges = coach.why.challenges.map(challenge => details(challenge.title, `<p>${escapeHtml(challenge.prompt)}</p><pre><code>${escapeHtml(challenge.sql.trim())}</code></pre><p>${escapeHtml(challenge.expect)}</p>`)).join('')
  const quiz = details(coach.why.quiz.question, `<ul>${coach.why.quiz.choices.map(choice => `<li>${escapeHtml(choice.text)} ${escapeHtml(choice.why)}</li>`).join('')}</ul>`)
  const faqs = coach.faqs.map(faq => details(faq.question, `<p>${escapeHtml(faq.answer)}</p>`)).join('')
  const reading = coach.reading.map(link => `<li><a href="${escapeHtml(link.href)}">${escapeHtml(link.title)}</a></li>`).join('')
  return `<section class="coach-static" id="lesson-coach">
    <h2>Hints</h2>
    ${hints}
    <h2>When a query misses</h2>
    ${failures}
    ${fallback}
    <h2 id="why-this-works">Why this works</h2>
    ${why}
    ${challenges}
    ${quiz}
    <h2 id="why-questions">Questions</h2>
    ${faqs}
    <h2>Official docs</h2>
    <ul>${reading}</ul>
  </section>`
}

export function lessonPagerHtml(previous, next) {
  const link = (lesson, kind, label) => lesson
    ? `<a class="lesson-pager-${kind}" href="${lessonPath(lesson.id)}"><span>${label}</span><strong>${escapeHtml(lesson.title)}</strong></a>`
    : ''
  if (!previous && !next) return ''
  return `<nav class="lesson-pager" aria-label="Lesson pages">${link(previous, 'prev', 'Previous lesson')}${link(next, 'next', 'Next lesson')}</nav>`
}
