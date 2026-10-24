import { renderDeepDiveHtml } from './deep-dive-html.js'
import { lessonPath } from './seo.js'

export function DeepDive({ dive }) {
  if (!dive) return null
  return <div className="deep-dive-mount" dangerouslySetInnerHTML={{ __html: renderDeepDiveHtml(dive) }} />
}

export function LessonPager({ previous, next, onSelect }) {
  if (!previous && !next) return null
  const follow = (event, id) => {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
    event.preventDefault()
    onSelect(id)
  }
  return <nav className="lesson-pager" aria-label="Lesson pages">
    {previous && <a className="lesson-pager-prev" href={lessonPath(previous.id)} onClick={event => follow(event, previous.id)}><span>Previous lesson</span><strong>{previous.title}</strong></a>}
    {next && <a className="lesson-pager-next" href={lessonPath(next.id)} onClick={event => follow(event, next.id)}><span>Next lesson</span><strong>{next.title}</strong></a>}
  </nav>
}
