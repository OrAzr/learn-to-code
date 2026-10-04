import { PGlite } from '@electric-sql/pglite'
import { lessons, seedSQL } from '../src/course.js'

let passed = 0
for (const lesson of lessons) {
  if (lesson.special === 'database') {
    if (!/^CREATE\s+DATABASE\s+pixel_quest;?$/i.test(lesson.solution.trim())) throw new Error('Database mission solution is invalid')
    console.log(`✓ ${lesson.title} (browser database flow)`)
    passed++
    continue
  }
  const db = new PGlite()
  await db.exec(seedSQL)
  try {
    const results = await db.exec(lesson.solution)
    const valid = await lesson.check({ sql: lesson.solution, results, db, databaseName: 'quest_db' })
    if (!valid) throw new Error('Mission checker rejected the solution SQL')
    console.log(`✓ ${lesson.title}`)
    passed++
  } finally { await db.close() }
}
console.log(`${passed}/${lessons.length} lessons verified`)
