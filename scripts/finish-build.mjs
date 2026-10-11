import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname } from 'node:path'
import { loadEnv } from 'vite'
import { lessons } from '../src/course.js'
import { homeDescription, homeTitle, lessonPath, pageMeta } from '../src/seo.js'

const siteUrl = (process.env.SITE_URL || loadEnv('production', process.cwd(), '').SITE_URL)?.trim()
let origin = ''

if (siteUrl) {
  const url = new URL(siteUrl)
  if (url.protocol !== 'https:' || url.pathname !== '/' || url.search || url.hash || url.username || url.password) {
    throw new Error('SITE_URL must be an HTTPS origin, such as https://example.dev')
  }
  origin = url.origin
}

const escapeHtml = value => value.replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
const template = await readFile('dist/index.html', 'utf8')
const pages = [
  { path: '/', title: homeTitle, description: homeDescription, content: `
    <h1>Learn PostgreSQL by doing</h1>
    <p>Query Quest is a free, interactive PostgreSQL course with 16 hands-on lessons and a SQL playground that runs in your browser.</p>
    <h2>Explore the lessons</h2>
    <ol>${lessons.map(lesson => `<li><a href="${lessonPath(lesson.id)}">${escapeHtml(lesson.title)}</a></li>`).join('')}</ol>` },
  ...lessons.map(lesson => {
    const meta = pageMeta('course', lesson.id, lessonPath(lesson.id))
    return { ...meta, content: `
    <p><a href="/">Query Quest PostgreSQL Course</a></p>
    <h1>${escapeHtml(lesson.title)}</h1>
    <p>${escapeHtml(lesson.intro)}</p>
    <h2>What you'll learn</h2>
    <p>${escapeHtml(lesson.concept)}</p>
    <h2>Your mission</h2>
    <p>${escapeHtml(lesson.mission)}</p>
    <p>Enable JavaScript to run SQL in the interactive lesson.</p>` }
  }),
  { ...pageMeta('playground', lessons[0].id), content: `
    <p><a href="/">Query Quest PostgreSQL Course</a></p>
    <h1>Free PostgreSQL playground</h1>
    <p>Write and run PostgreSQL queries in your browser. Explore sample players, quests, and completions.</p>` },
]

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
    .replace('<div id="root"></div>', `<div id="root"><main class="seo-fallback">${page.content}\n    </main></div>`)
  if (canonical) html = html.replace('  </head>', `    <link rel="canonical" href="${canonical}" />\n    <meta property="og:url" content="${canonical}" />\n  </head>`)
  const file = page.path === '/' ? 'dist/index.html' : `dist${page.path}index.html`
  await mkdir(dirname(file), { recursive: true })
  await writeFile(file, html)
}

if (origin) {
  await writeFile('dist/sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${pages.map(page => `  <url><loc>${origin}${page.path}</loc></url>`).join('\n')}\n</urlset>\n`)
}

await writeFile('dist/robots.txt', `User-agent: *\nAllow: /\n${origin ? `Sitemap: ${origin}/sitemap.xml\n` : ''}`)
