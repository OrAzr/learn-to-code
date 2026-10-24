import { indexesDeepDive } from './indexes.js'
import { joinsDeepDive } from './joins.js'

/**
 * Optional long-form article for a lesson. To add another lesson later, create
 * a file in this folder with the same shape and register it here.
 *
 * sections[].blocks:
 * - { type: 'p', text }
 * - { type: 'h3', id, text }
 * - { type: 'ul', items: string[] }
 * - { type: 'sql', code, caption, run?: boolean }
 * - { type: 'plan', code, caption }
 * - { type: 'table', headers: string[], rows: string[][], caption }
 * - { type: 'answer', paragraphs: string[] }
 */
const deepDives = {
  [joinsDeepDive.lessonId]: joinsDeepDive,
  [indexesDeepDive.lessonId]: indexesDeepDive,
}

export function getDeepDive(lessonId) {
  return deepDives[lessonId] || null
}

export function listDeepDives() {
  return Object.values(deepDives)
}
