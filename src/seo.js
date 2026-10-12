import { getLesson, lessons } from './course.js'

export const homeTitle = 'Learn SQL Interactively — Free PostgreSQL Course with Hands-On Lessons'
export const homeDescription = 'Master SQL with 16 interactive lessons. Write real queries in your browser, practice PostgreSQL, and learn database fundamentals—no setup required. Free SQL tutorial for beginners.'
export const playgroundPath = '/playground/'
export const lessonPath = id => `/lessons/${id}/`

export function pageFromPath(pathname) {
  if (pathname === playgroundPath) return { mode: 'playground', selectedId: lessons[0].id }
  const id = pathname.match(/^\/lessons\/([a-z0-9-]+)\/?$/)?.[1]
  return { mode: 'course', selectedId: lessons.some(lesson => lesson.id === id) ? id : lessons[0].id }
}

export function pageMeta(mode, id, pathname = '') {
  if (mode === 'playground') {
    return { title: 'Free SQL Playground — Practice PostgreSQL Online', description: 'Practice SQL and PostgreSQL in your browser. Free interactive SQL playground with sample data. Learn by doing with real queries.', path: playgroundPath }
  }
  if (pathname === '/') return { title: homeTitle, description: homeDescription, path: '/' }
  const lesson = getLesson(id)
  const description = lesson.intro.length > 155 ? `${lesson.intro.slice(0, 152).replace(/\s+\S*$/, '')}…` : lesson.intro
  return { title: `${lesson.title} — Learn SQL Step by Step`, description, path: lessonPath(lesson.id) }
}
