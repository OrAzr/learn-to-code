import { getLesson, lessons } from './course.js'

export const homeTitle = 'Query Quest — Learn PostgreSQL by Doing'
export const homeDescription = 'Learn PostgreSQL with 16 hands-on SQL lessons. Write real queries in your browser, explore tables and joins, and practice at your own pace.'
export const playgroundPath = '/playground/'
export const lessonPath = id => `/lessons/${id}/`

export function pageFromPath(pathname) {
  if (pathname === playgroundPath) return { mode: 'playground', selectedId: lessons[0].id }
  const id = pathname.match(/^\/lessons\/([a-z0-9-]+)\/?$/)?.[1]
  return { mode: 'course', selectedId: lessons.some(lesson => lesson.id === id) ? id : lessons[0].id }
}

export function pageMeta(mode, id, pathname = '') {
  if (mode === 'playground') {
    return { title: 'SQL Playground — Query Quest', description: 'Practice PostgreSQL in your browser with a free SQL playground and sample data.', path: playgroundPath }
  }
  if (pathname === '/') return { title: homeTitle, description: homeDescription, path: '/' }
  const lesson = getLesson(id)
  const description = lesson.intro.length > 155 ? `${lesson.intro.slice(0, 152).replace(/\s+\S*$/, '')}…` : lesson.intro
  return { title: `${lesson.title} — Query Quest PostgreSQL Course`, description, path: lessonPath(lesson.id) }
}
