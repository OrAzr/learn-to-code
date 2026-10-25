const strip = sql => sql.replace(/--[^\n]*/g, ' ').replace(/\s+/g, ' ')

const joinMissingOn = sql => {
  const flat = strip(sql)
  if (!/\bjoin\b/i.test(flat)) return false
  if (/\bon\s+(?:join|where|group|order|limit|;|$)/i.test(flat)) return true
  return /\bjoin\s+[a-z_][\w]*\s+(?:[a-z_][\w]*\s+)?(?:join|where|group|order|limit|;|$)/i.test(flat)
}

export const joinsDeepDive = {
  lessonId: 'joins',
  hints: [
    { label: 'Nudge', text: 'A completion stores ids, not the quest title. The title lives on quests, so one table is not enough.' },
    { label: 'Concept', text: 'JOIN with no keyword is an inner join. A row survives only when both sides match, so moss and echo drop out. nova finished two quests, so nova appears twice.' },
    { label: 'Closer', text: 'Match completions.player_id to players.id, then quests.id to completions.quest_id. Return the username and the quest title.' },
  ],
  failures: [
    {
      id: 'missing-on',
      summary: 'JOIN without ON',
      text: 'JOIN needs an ON condition. PostgreSQL rejects the statement without one. A comma between tables is allowed, and that is a cross join: every player paired with every completion.',
      when: ({ sql, error }) => Boolean(error) && joinMissingOn(sql),
    },
    {
      id: 'cross-join',
      summary: 'Cartesian product',
      text: 'Those rows are a cross join. Six players times five completions is 30 rows, and adding quests multiplies again. Match player_id and quest_id in ON instead of listing tables with a comma.',
      when: ({ sql, rows }) => {
        const flat = strip(sql)
        const commaFrom = /\bfrom\b/i.test(flat) && flat.includes(',') && !/\bjoin\b/i.test(flat)
        return commaFrom && (!/\bwhere\b/i.test(flat) || rows.length >= 30)
      },
    },
    {
      id: 'realm-key',
      summary: 'Joined on realm',
      text: 'Joining on realm matches a label, not a completion. moss would receive both Forest quests without finishing them. Match completions.player_id to players.id and quests.id to completions.quest_id.',
      when: ({ sql, rows }) => /\bon\b[\s\S]{0,80}\brealm\b/i.test(strip(sql)) && rows.some(row => row.username === 'moss' && row.title),
    },
    {
      id: 'outer-keeps-nulls',
      summary: 'Outer join kept non-players',
      text: 'A left or full join keeps players who finished nothing, with nulls on the quest side. This mission wants completed quests only, so an inner join is the one that drops moss and echo.',
      when: ({ sql, rows }) => /\b(left|right|full)\b/i.test(sql) && rows.some(row => row.title == null || row.quest_id == null),
    },
    {
      id: 'missing-title',
      summary: 'Quest title not selected',
      text: 'The quest title lives on quests, not on completions. Keep the join to quests and select the title column, next to the username.',
      when: ({ fields }) => fields.length > 0 && !fields.includes('title'),
    },
    {
      id: 'too-few',
      summary: 'Too few pairs',
      text: 'An inner join drops any pair whose keys do not match. If completed quests are missing, check both links: player_id to players.id, and quest_id to quests.id.',
      when: ({ rows, error }) => !error && rows.length > 0 && rows.length < 5,
    },
  ],
  fallback: {
    error: 'PostgreSQL rejected that statement. Check commas, quotes, and that every JOIN has an ON condition, then run it again.',
    miss: 'The query ran, but it is not the completed-quest list yet. You want each username beside the quest title, and only rows that really match.',
  },
  why: {
    paragraphs: [
      'An inner join keeps a pair only when the ON condition is true. nova finished two quests, so nova is two result rows, not one. moss and echo have no completion, so they disappear. That is the predicate, not missing data. Null never equals null, so a missing key is not a wildcard.',
      'PostgreSQL does not replay your JOIN text. It prices a nested loop (probe the inner side once per outer row), a hash join (hash one equijoin key and probe with the other, in work_mem), or a merge join (walk two inputs already ordered by the key). Hash and merge need equality. EXPLAIN of this mission is a hash join. In this sandbox the scan of completions starts near a cost of 10000000000 because sequential scans are switched off. That figure is a penalty, not time. A normal server still hash-joins these six rows with ordinary sequential scans.',
    ],
    challenges: [
      {
        title: 'Who has no completion?',
        prompt: 'Predict the result, then run it. A left join keeps every player. echo and moss should come back with a null quest_id, and nova should still appear twice.',
        expect: 'Seven rows. echo and moss have a null quest_id. nova appears twice.',
        sql: `SELECT p.username, c.quest_id
FROM players p
LEFT JOIN completions c ON c.player_id = p.id
ORDER BY p.username, c.quest_id NULLS FIRST;`,
      },
      {
        title: 'WHERE versus ON',
        prompt: 'Predict who survives if the date test sits in WHERE. Only glitch and byte finished a quest on or after 2025-04-05. A comparison with null is not true, so WHERE throws away the players the left join had kept.',
        expect: 'Only byte and glitch remain. nova disappears even though nova did finish earlier quests.',
        sql: `SELECT p.username, c.quest_id
FROM players p
LEFT JOIN completions c ON c.player_id = p.id
WHERE c.completed_at >= DATE '2025-04-05';`,
      },
    ],
    quiz: {
      question: 'When does a LEFT JOIN condition belong in ON instead of WHERE?',
      choices: [
        { id: 'on', text: 'In ON, when unmatched left-hand rows should stay', correct: true, why: 'ON decides which right-hand rows attach. Unmatched left rows remain. WHERE rejects the joined row, and a test on a nullable column drops those unmatched rows, which turns the outer join into an inner join. The date filter is the demo: WHERE returns byte and glitch, ON returns every player.' },
        { id: 'where', text: 'In WHERE, whenever the right-hand table is filtered', correct: false, why: 'WHERE runs after the join. A filter on the nullable side, other than IS NULL, discards the unmatched left rows.' },
        { id: 'either', text: 'Either place. ON and WHERE are always the same', correct: false, why: 'They match for a plain inner join. They do not once an outer join has rows you mean to keep.' },
      ],
    },
  },
  faqs: [
    { question: 'Is JOIN the same thing as INNER JOIN?', answer: 'Yes. JOIN with no keyword is an inner join. LEFT, RIGHT, and FULL are the outer joins, and the word OUTER is optional.' },
    { question: 'Why did my LEFT JOIN lose rows?', answer: 'A later WHERE often removed them. completed_at >= a date is unknown when the date is null, and WHERE keeps only true rows. Move that test into ON. A left join also preserves the left table only, so the table order matters.' },
    { question: 'Why does one player show up more than once?', answer: 'nova completed two quests, so the join emits nova twice. Joins do not deduplicate. DISTINCT or GROUP BY is how you get one row per player.' },
  ],
  reading: [
    { title: 'Joins Between Tables, the official tutorial', href: 'https://www.postgresql.org/docs/current/tutorial-join.html' },
    { title: 'Joined tables in the SQL reference', href: 'https://www.postgresql.org/docs/current/queries-table-expressions.html#QUERIES-JOIN' },
    { title: 'Controlling the planner with explicit JOINs', href: 'https://www.postgresql.org/docs/current/explicit-joins.html' },
    { title: 'Using EXPLAIN', href: 'https://www.postgresql.org/docs/current/using-explain.html' },
  ],
}
