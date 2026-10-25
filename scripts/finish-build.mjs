import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname } from 'node:path'
import { loadEnv } from 'vite'
import { lessons } from '../src/course.js'
import { lessonPagerHtml, renderCoachHtml } from '../src/deep-dive-html.js'
import { getDeepDive } from '../src/deep-dives/index.js'
import { verifyDeepDiveExamples } from '../src/deep-dives/verify.js'
import { homeDescription, homeTitle, lessonPath, ogImagePath, pageMeta, structuredData } from '../src/seo.js'

const siteUrl = (process.env.SITE_URL || loadEnv('production', process.cwd(), '').SITE_URL)?.trim()
let origin = ''

if (siteUrl) {
  const url = new URL(siteUrl)
  if (url.protocol !== 'https:' || url.pathname !== '/' || url.search || url.hash || url.username || url.password) {
    throw new Error('SITE_URL must be an HTTPS origin, such as https://example.dev')
  }
  origin = url.origin
}

await verifyDeepDiveExamples()

const escapeHtml = value => value.replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
const jsonLd = data => `<script type="application/ld+json" id="structured-data">\n${JSON.stringify(data, null, 2).replaceAll('<', '\\u003c')}\n    </script>`
const template = await readFile('dist/index.html', 'utf8')
const pages = [
  { path: '/', mode: 'course', id: lessons[0].id, title: homeTitle, description: homeDescription, content: `
    <h1>Learn PostgreSQL by doing</h1>
    <p>Query Quest is a free, interactive PostgreSQL course with 16 hands-on lessons and a SQL playground that runs in your browser.</p>
    <h2>Explore the lessons</h2>
    <ol>${lessons.map(lesson => `<li><a href="${lessonPath(lesson.id)}">${escapeHtml(lesson.title)}</a></li>`).join('')}</ol>` },
  ...lessons.map((lesson, index) => {
    const meta = pageMeta('course', lesson.id, lessonPath(lesson.id))
    const dive = getDeepDive(lesson.id)
    return { ...meta, mode: 'course', id: lesson.id, content: `
    <p><a href="/">Query Quest PostgreSQL Course</a></p>
    <h1>${escapeHtml(lesson.title)}</h1>
    <p>${escapeHtml(lesson.intro)}</p>
    <h2>What you'll learn</h2>
    <p>${escapeHtml(lesson.concept)}</p>
    <h2>Your mission</h2>
    <p>${escapeHtml(lesson.mission)}</p>
    <p>Enable JavaScript to run SQL in the interactive lesson.</p>
    ${dive ? renderCoachHtml(dive) : ''}
    ${lessonPagerHtml(lessons[index - 1], lessons[index + 1])}` }
  }),
  { ...pageMeta('playground', lessons[0].id), mode: 'playground', id: lessons[0].id, content: `
    <p><a href="/">Query Quest PostgreSQL Course</a></p>
    <h1>Free PostgreSQL playground</h1>
    <p>Write and run PostgreSQL queries in your browser. Explore sample players, quests, and completions.</p>` },
]

const seenTitles = new Set()
const seenDescriptions = new Set()
const assertPage = (page, html) => {
  if (page.title.length < 50 || page.title.length > 60) throw new Error(`Title length ${page.title.length} for ${page.path}: ${page.title}`)
  if (page.description.length < 140 || page.description.length > 160) throw new Error(`Description length ${page.description.length} for ${page.path}: ${page.description}`)
  if (seenTitles.has(page.title) || seenDescriptions.has(page.description)) throw new Error(`Duplicate title or description for ${page.path}`)
  seenTitles.add(page.title)
  seenDescriptions.add(page.description)
  const json = html.match(/<script type="application\/ld\+json" id="structured-data">([\s\S]*?)<\/script>/)?.[1]
  const data = JSON.parse(json)
  const image = `${origin}${ogImagePath}`
  for (const needle of [
    `property="og:image" content="${image}"`,
    'property="og:image:width" content="1200"',
    'property="og:image:height" content="630"',
    'property="og:image:alt" content="',
    'name="twitter:card" content="summary_large_image"',
    `name="twitter:image" content="${image}"`,
    'name="twitter:image:alt" content="',
  ]) if (!html.includes(needle)) throw new Error(`${page.path} is missing ${needle}`)
  if (page.path === '/') {
    if (data['@type'] !== 'Course' || data.isAccessibleForFree !== true) throw new Error('Homepage JSON-LD must be a free Course')
    if (data.offers?.['@type'] !== 'Offer' || data.offers.price !== '0' || data.offers.priceCurrency !== 'USD') throw new Error('Homepage JSON-LD needs a free Offer')
    if (data.provider?.['@type'] !== 'Organization' || data.provider.name !== 'Query Quest') throw new Error('Homepage JSON-LD needs an Organization provider')
    if (data.hasCourseInstance?.['@type'] !== 'CourseInstance' || data.hasCourseInstance.courseMode !== 'online' || !data.hasCourseInstance.courseWorkload) throw new Error('Homepage JSON-LD needs an online CourseInstance')
    return
  }
  const types = data['@graph']?.map(node => node['@type']) ?? []
  const crumbs = data['@graph']?.find(node => node['@type'] === 'BreadcrumbList')?.itemListElement
  if (crumbs?.length !== 2 || crumbs[0].name !== 'Home' || crumbs.some(crumb => !crumb.item || !crumb.position)) throw new Error(`BreadcrumbList is incomplete for ${page.path}`)
  if (page.path === '/playground/') {
    if (types[0] !== 'WebApplication' || !types.includes('BreadcrumbList')) throw new Error('Playground JSON-LD must be a WebApplication with a breadcrumb')
    return
  }
  const resource = data['@graph']?.[0]
  if (resource?.['@type'] !== 'LearningResource' || resource.isPartOf?.['@type'] !== 'Course' || !resource.isPartOf.url) throw new Error(`Lesson JSON-LD must be a LearningResource in the course for ${page.path}`)
  const dive = getDeepDive(page.id)
  const faq = data['@graph']?.find(node => node['@type'] === 'FAQPage')
  if (!html.includes('class="lesson-pager"')) throw new Error(`Missing previous/next links for ${page.path}`)
  if (html.includes('class="deep-dive"') || html.includes('id="deep-dive"') || html.includes('deep-dive-toc')) throw new Error(`Reading chapter still present on ${page.path}`)
  if (!dive) {
    if (faq || html.includes('class="coach-static"')) throw new Error(`Unexpected lesson coach on ${page.path}`)
    return
  }
  const missionAt = html.indexOf(escapeHtml(getLessonMission(page.id)))
  const coachAt = html.indexOf('id="lesson-coach"')
  const pagerAt = html.indexOf('class="lesson-pager"')
  if (missionAt < 0 || coachAt < missionAt || pagerAt < coachAt) throw new Error(`Lesson coach must follow the mission on ${page.path}`)
  if (!html.includes('class="coach-static"') || !html.includes('id="why-this-works"') || !html.includes('id="why-questions"')) throw new Error(`Lesson coach is incomplete for ${page.path}`)
  const coachHtml = html.slice(coachAt, pagerAt)
  if (coachHtml.includes('<details open')) throw new Error(`Coach details must start collapsed on ${page.path}`)
  const detailCount = coachHtml.split('<details>').length - 1
  const expectedDetails = dive.hints.length + dive.failures.length + dive.why.challenges.length + 1 + dive.faqs.length
  if (detailCount !== expectedDetails) throw new Error(`Coach details count ${detailCount} !== ${expectedDetails} on ${page.path}`)
  for (const hint of dive.hints) if (!coachHtml.includes(escapeHtml(hint.text))) throw new Error(`Hint missing from static HTML for ${page.path}`)
  for (const rule of dive.failures) if (!coachHtml.includes(escapeHtml(rule.text))) throw new Error(`Failure note missing from static HTML for ${page.path}`)
  if (!coachHtml.includes(escapeHtml(dive.fallback.error)) || !coachHtml.includes(escapeHtml(dive.fallback.miss))) throw new Error(`Fallback note missing from static HTML for ${page.path}`)
  for (const paragraph of dive.why.paragraphs) if (!coachHtml.includes(escapeHtml(paragraph))) throw new Error(`Why this works missing from static HTML for ${page.path}`)
  for (const challenge of dive.why.challenges) {
    if (!coachHtml.includes(escapeHtml(challenge.prompt)) || !coachHtml.includes(escapeHtml(challenge.sql.trim())) || !coachHtml.includes(escapeHtml(challenge.expect))) {
      throw new Error(`Challenge missing from static HTML for ${page.path}`)
    }
  }
  if (!coachHtml.includes(escapeHtml(dive.why.quiz.question))) throw new Error(`Quiz missing from static HTML for ${page.path}`)
  for (const choice of dive.why.quiz.choices) {
    if (!coachHtml.includes(escapeHtml(choice.text)) || !coachHtml.includes(escapeHtml(choice.why))) throw new Error(`Quiz choice missing from static HTML for ${page.path}`)
  }
  if (!faq || faq.mainEntity?.length !== dive.faqs.length || !String(faq.url || '').endsWith('#why-questions')) throw new Error(`FAQPage JSON-LD missing for ${page.path}`)
  dive.faqs.forEach((item, index) => {
    const node = faq.mainEntity[index]
    if (node?.['@type'] !== 'Question' || node.name !== item.question || node.acceptedAnswer?.['@type'] !== 'Answer' || node.acceptedAnswer.text !== item.answer) {
      throw new Error(`FAQ JSON-LD does not match the visible answer for ${page.path}`)
    }
    if (!coachHtml.includes(escapeHtml(item.question)) || !coachHtml.includes(escapeHtml(item.answer))) throw new Error(`FAQ text missing from static HTML for ${page.path}`)
  })
}

const getLessonMission = id => lessons.find(lesson => lesson.id === id).mission

for (const page of pages) {
  const escapedTitle = escapeHtml(page.title)
  const escapedDescription = escapeHtml(page.description)
  const canonical = origin ? `${origin}${page.path}` : ''
  let html = template
    .replace(/<title>[^<]*<\/title>/, `<title>${escapedTitle}</title>`)
    .replace(/<meta name="description" content="[^"]*"\s*\/>/, `<meta name="description" content="${escapedDescription}" />`)
    .replace(/<meta property="og:title" content="[^"]*"\s*\/>/, `<meta property="og:title" content="${escapedTitle}" />`)
    .replace(/<meta property="og:description" content="[^"]*"\s*\/>/, `<meta property="og:description" content="${escapedDescription}" />`)
    .replace(/<meta name="twitter:title" content="[^"]*"\s*\/>/, `<meta name="twitter:title" content="${escapedTitle}" />`)
    .replace(/<meta name="twitter:description" content="[^"]*"\s*\/>/, `<meta name="twitter:description" content="${escapedDescription}" />`)
    .replace(/<script type="application\/ld\+json" id="structured-data">[\s\S]*?<\/script>/, jsonLd(structuredData(page.mode, page.id, page.path, origin)))
    .replace('<div id="root"></div>', `<div id="root"><main class="seo-fallback">${page.content}\n    </main></div>`)
  if (origin) html = html.replaceAll(`content="${ogImagePath}"`, `content="${origin}${ogImagePath}"`)
  if (canonical) html = html.replace('  </head>', `    <link rel="canonical" href="${canonical}" />\n    <meta property="og:url" content="${canonical}" />\n  </head>`)
  if (!html.includes('id="structured-data"') || html.includes('<div id="root"></div>')) throw new Error(`Failed to write head metadata for ${page.path}`)
  assertPage(page, html)
  const file = page.path === '/' ? 'dist/index.html' : `dist${page.path}index.html`
  await mkdir(dirname(file), { recursive: true })
  await writeFile(file, html)
}

if (origin) {
  const lastmod = new Date().toISOString().slice(0, 10)
  await writeFile('dist/sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${pages.map(page => `  <url><loc>${origin}${page.path}</loc><lastmod>${lastmod}</lastmod></url>`).join('\n')}\n</urlset>\n`)
}

await writeFile('dist/robots.txt', `User-agent: *\nAllow: /\n${origin ? `Sitemap: ${origin}/sitemap.xml\n` : ''}`)

const image = await readFile(`dist${ogImagePath}`)
if (image.readUInt32BE(16) !== 1200 || image.readUInt32BE(20) !== 630) throw new Error('og:image must be 1200 by 630 pixels')
