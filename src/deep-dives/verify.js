import { PGlite } from '@electric-sql/pglite'
import { seedSQL } from '../course.js'
import { explainFailure, listDeepDives } from './index.js'

const cases = [
  {
    lessonId: 'joins',
    context: { sql: 'SELECT p.username FROM players p JOIN completions c JOIN quests q ON q.id = c.quest_id', error: 'syntax error at or near "JOIN"', rows: [], fields: [] },
    includes: 'ON',
  },
  {
    lessonId: 'joins',
    context: {
      sql: 'SELECT p.username, q.title\nFROM players p\nJOIN completions c ON -- Match the player IDs\nJOIN quests q ON -- Match the quest IDs',
      error: 'syntax error at or near "JOIN"',
      rows: [],
      fields: [],
    },
    includes: 'ON',
  },
  {
    lessonId: 'joins',
    context: { sql: 'SELECT * FROM players p, completions c', error: '', rows: Array.from({ length: 30 }, () => ({})), fields: ['username'] },
    includes: 'cross join',
  },
  {
    lessonId: 'joins',
    context: { sql: 'SELECT p.username, q.title FROM players p JOIN quests q ON q.realm = p.realm', error: '', rows: [{ username: 'moss', title: 'Find the key' }], fields: ['username', 'title'] },
    includes: 'realm',
  },
  {
    lessonId: 'indexes',
    context: { sql: "EXPLAIN SELECT * FROM players WHERE realm = 'Forest'", error: '', rows: [{ 'QUERY PLAN': 'Seq Scan' }], fields: ['QUERY PLAN'] },
    includes: 'EXPLAIN',
  },
  {
    lessonId: 'indexes',
    context: { sql: 'CREATE INDEX idx_players_realm ON players (xp)', error: '', rows: [], fields: [] },
    includes: 'realm',
  },
]

export async function verifyDeepDiveExamples() {
  for (const item of cases) {
    const coach = listDeepDives().find(dive => dive.lessonId === item.lessonId)
    const text = explainFailure(coach, item.context)
    if (!text.toLowerCase().includes(item.includes.toLowerCase())) {
      throw new Error(`Failure note for ${item.lessonId} did not mention ${item.includes}: ${text}`)
    }
  }
  for (const dive of listDeepDives()) {
    if (dive.hints.length < 2 || dive.hints.length > 3) throw new Error(`${dive.lessonId} needs 2 or 3 hints`)
    for (const challenge of dive.why.challenges) {
      const db = new PGlite()
      try {
        await db.exec(seedSQL)
        await db.exec(challenge.sql)
      } catch (error) {
        throw new Error(`Coach SQL failed for ${dive.lessonId} (${challenge.title}): ${error.message}\n${challenge.sql}`)
      } finally {
        await db.close()
      }
    }
  }
}
