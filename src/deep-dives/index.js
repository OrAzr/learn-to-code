import { indexesDeepDive } from './indexes.js'
import { joinsDeepDive } from './joins.js'

/**
 * Optional interactive coaching for a lesson. To add another lesson later,
 * create a file with the same shape and register it here.
 *
 * hints: 2 or 3 tiers, from a nudge to a near-solution. Never the full statement.
 * failures: ordered rules. The first matching `when` explains a failed run.
 * why: shown only after the mission succeeds, with runnable challenges and a quiz.
 * faqs: revealable questions. They also feed FAQPage JSON-LD.
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

export function explainFailure(coach, context) {
  for (const rule of coach.failures) {
    if (rule.when(context)) return rule.text
  }
  return context.error ? coach.fallback.error : coach.fallback.miss
}
