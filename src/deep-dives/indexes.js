const strip = sql => sql.replace(/--[^\n]*/g, ' ').replace(/\s+/g, ' ').trim()

const indexTarget = sql => {
  const match = strip(sql).match(/create\s+index\s+(?:concurrently\s+)?(?:if\s+not\s+exists\s+)?([^\s(]+)\s+on\s+([^\s(]+)\s*\(\s*([^)]+)\)/i)
  if (!match) return null
  const clean = value => value.replaceAll('"', '').toLowerCase()
  return { name: clean(match[1]), table: clean(match[2]), columns: clean(match[3]) }
}

const explainsOnly = sql => /^\s*explain\b/i.test(strip(sql)) && !/\bcreate\s+index\b/i.test(sql)

export const indexesDeepDive = {
  lessonId: 'indexes',
  hints: [
    { label: 'Nudge', text: 'An index is a second structure on a column you look up. The mission names both the index and the column.' },
    { label: 'Concept', text: 'CREATE INDEX name ON table (column) builds a B-tree, the default. It does not change which rows come back. It gives the planner another way to find them.' },
    { label: 'Closer', text: 'The name is idx_players_realm and the column is realm, on players. On a normal server six rows would still sequential-scan. This sandbox turns sequential scans off, so EXPLAIN flips once the index exists.' },
  ],
  failures: [
    {
      id: 'concurrently',
      summary: 'CREATE INDEX CONCURRENTLY',
      text: 'CREATE INDEX CONCURRENTLY needs a multi-user server and cannot run in this one-session sandbox. The mission is the plain CREATE INDEX.',
      when: ({ sql, error }) => /\bconcurrently\b/i.test(sql) && Boolean(error),
    },
    {
      id: 'name-taken',
      summary: 'Index name already exists',
      text: 'That name is already used in this sandbox, and CREATE INDEX will not replace it. Reset the database, then create idx_players_realm on players(realm). An index on a different column does not count.',
      when: ({ error }) => Boolean(error) && /already exists/i.test(error),
    },
    {
      id: 'syntax',
      summary: 'Index syntax',
      text: 'That index statement did not parse. The shape is CREATE INDEX name ON players (column). Put realm inside the parentheses.',
      when: ({ sql, error }) => Boolean(error) && /index/i.test(sql) && !indexTarget(sql),
    },
    {
      id: 'explain-only',
      summary: 'EXPLAIN without an index',
      text: 'EXPLAIN only describes a plan. It does not create the index. Create idx_players_realm on players(realm), then run EXPLAIN again and look for Index Cond.',
      when: ({ sql, error }) => !error && explainsOnly(sql),
    },
    {
      id: 'wrong-target',
      summary: 'Wrong index name or column',
      text: 'That is an index, but not the one this mission asked for. Name it idx_players_realm and build it on players(realm). An index on another column will not serve a realm lookup.',
      when: ({ sql }) => {
        const target = indexTarget(sql)
        if (!target) return false
        return target.name !== 'idx_players_realm' || target.table !== 'players' || !/\brealm\b/.test(target.columns)
      },
    },
    {
      id: 'not-an-index',
      summary: 'No index was created',
      text: 'That statement does not create the index. The mission is CREATE INDEX idx_players_realm ON players (realm). Use EXPLAIN afterward to see whether the planner used it.',
      when: ({ sql, error }) => !error && !/\bcreate\s+index\b/i.test(sql),
    },
  ],
  fallback: {
    error: 'PostgreSQL rejected that statement. Check the CREATE INDEX syntax, then run it again. CONCURRENTLY is not available in this sandbox.',
    miss: 'The statement ran, but idx_players_realm on players(realm) is not there yet. Create that index, then use EXPLAIN if you want to see the plan.',
  },
  why: {
    paragraphs: [
      'CREATE INDEX with no USING clause builds a B-tree: a short tree of 8 kB pages. Leaves store the key and a TID, the heap address of the row. PostgreSQL still checks the heap for visibility unless VACUUM has marked the page all-visible. The planner can ignore the index. A sequential scan wins on a tiny table, on a predicate that matches most of the rows, when the predicate cannot use the index, or when statistics are stale. random_page_cost defaults to 4 against a seq_page_cost of 1.',
      'This sandbox sets enable_seqscan off, so EXPLAIN flips to an index scan even on six rows. The startup cost of 10000000000 before the index existed is that penalty, not time, and the row estimates are guesses until ANALYZE. On a normal server these six rows stay a sequential scan after the index, around cost 0.00..1.07, because one heap page is cheaper. On a copy of players with about 50,000 added rows, the same Forest predicate becomes a bitmap index scan. That plan is the shape after the table grows, not what these six rows print. Index Cond means the index applied the predicate. Filter under a sequential scan means it did not.',
    ],
    challenges: [
      {
        title: 'Read the plan you just earned',
        prompt: 'Run EXPLAIN on the Forest lookup. In this sandbox you should see an Index Scan on idx_players_realm and an Index Cond. On a normal server the same six rows would still say Seq Scan.',
        expect: 'Index Scan using idx_players_realm, with Index Cond on realm. The huge cost from before the index is gone.',
        sql: `EXPLAIN SELECT * FROM players WHERE realm = 'Forest';`,
      },
      {
        title: 'A leading column, then a partial index',
        prompt: 'A B-tree on (realm, xp) serves realm, and realm plus xp. It does not serve xp alone. Then build a partial index that stores only active players. The planner may use it only when the query implies active is true.',
        expect: 'Both statements succeed. The mission index is untouched. The partial index is smaller because inactive players are left out.',
        sql: `CREATE INDEX idx_players_realm_xp ON players (realm, xp);
CREATE INDEX idx_players_active_realm ON players (realm) WHERE active;`,
      },
    ],
    quiz: {
      question: 'Why might PostgreSQL ignore an index you just created?',
      choices: [
        { id: 'always', text: 'It never ignores an index that exists', correct: false, why: 'An index is an option. The planner skips it when a sequential scan is cheaper, when the predicate does not fit, or when the statistics are a guess.' },
        { id: 'reasons', text: 'A tiny or unselective table, a predicate that does not fit, or stale statistics', correct: true, why: 'All three are normal. A function around the column, a missing leading column, or a partial index the query does not imply are the usual predicate mismatches. This sandbox is the exception: enable_seqscan is off, so six rows flip to an index scan a server would refuse.' },
        { id: 'name', text: 'Only when the index name is wrong', correct: false, why: 'The name does not matter to the planner. The column, the predicate, and the cost do.' },
      ],
    },
  },
  faqs: [
    { question: 'Does a primary key already create an index?', answer: 'Yes. A primary key or UNIQUE constraint is already a unique B-tree. players has one on id and one on username. CREATE INDEX is for an index that does not enforce a constraint.' },
    { question: 'Will this index make every query faster?', answer: 'No. It can help reads that constrain realm, and it slows writes that change realm. Other queries ignore it. On six rows a normal server often keeps the sequential scan. Results stay the same either way.' },
    { question: 'How do I tell whether the index was used?', answer: 'Compare EXPLAIN before and after CREATE INDEX. Index Cond on idx_players_realm means it was used. Filter under a sequential scan means it was not. On a server, pg_stat_user_indexes.idx_scan is the longer-term counter.' },
  ],
  reading: [
    { title: 'Introduction to indexes', href: 'https://www.postgresql.org/docs/current/indexes-intro.html' },
    { title: 'Index types, including B-tree', href: 'https://www.postgresql.org/docs/current/indexes-types.html' },
    { title: 'Multicolumn indexes', href: 'https://www.postgresql.org/docs/current/indexes-multicolumn.html' },
    { title: 'Partial indexes', href: 'https://www.postgresql.org/docs/current/indexes-partial.html' },
    { title: 'Using EXPLAIN', href: 'https://www.postgresql.org/docs/current/using-explain.html' },
    { title: 'CREATE INDEX', href: 'https://www.postgresql.org/docs/current/sql-createindex.html' },
  ],
}
