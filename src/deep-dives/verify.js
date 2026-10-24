import { PGlite } from '@electric-sql/pglite'
import { seedSQL } from '../course.js'
import { listDeepDives } from './index.js'

export async function verifyDeepDiveExamples() {
  for (const dive of listDeepDives()) {
    for (const section of dive.sections) {
      for (const block of section.blocks) {
        if (block.type !== 'sql' || block.run === false) continue
        const db = new PGlite()
        try {
          await db.exec(seedSQL)
          await db.exec(block.code)
        } catch (error) {
          throw new Error(`Deep dive SQL failed for ${dive.lessonId} (${section.id}): ${error.message}\n${block.code}`)
        } finally {
          await db.close()
        }
      }
    }
  }
}
