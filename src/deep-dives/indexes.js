export const indexesDeepDive = {
  lessonId: 'indexes',
  updated: '2026-10-24',
  sections: [
    {
      id: 'why-index',
      heading: 'Why isn\'t a sequential read enough?',
      blocks: [
        { type: 'p', text: 'A sequential scan reads players from top to bottom. On six rows that is one heap page, and a normal server should do it. An index is a second structure mapping a key such as realm to each matching row. Selective reads get cheaper. Writes get more expensive, because they must maintain it. The mission index does not change results. It adds a plan.' },
      ],
    },
    {
      id: 'btree',
      heading: 'How does a B-tree find a row?',
      blocks: [
        { type: 'p', text: 'CREATE INDEX with no USING clause builds a B-tree, the right default for equality, range, and ORDER BY. Hash, GiST, GIN, and BRIN are other access methods. A realm lookup does not need them.' },
        { type: 'p', text: 'A B-tree is a balanced tree of 8 kB pages. Internal pages hold separators and child pointers. Leaves hold keys plus a TID, the heap block and offset of the row. A lookup reads one page per level, and a few levels cover millions of rows. Linked leaves also serve a range or a matching ORDER BY.' },
        { type: 'p', text: 'The index does not store visibility. PostgreSQL usually fetches the heap row to check your snapshot. An index-only scan skips that only when VACUUM\'s visibility map marks the page all-visible, which SELECT * almost never gets. players already has unique B-trees on id and on username.' },
      ],
    },
    {
      id: 'planner',
      heading: 'When does the planner refuse the index?',
      blocks: [
        { type: 'p', text: 'The planner can ignore an index. A sequential scan wins on a tiny table, a predicate that matches much of the table, a predicate the index cannot apply, or stale statistics. random_page_cost defaults to 4 against seq_page_cost of 1. There is no fixed "under 5 percent" rule.' },
        { type: 'p', text: 'Run the lookup before the mission index, then create the index and run it again.' },
        { type: 'sql', run: true, caption: 'Runnable before the index. Plan below is the sandbox output.', code: `EXPLAIN SELECT * FROM players WHERE realm = 'Forest';` },
        { type: 'plan', caption: 'Before the index. 10000000000 is the enable_seqscan = off penalty in this sandbox, not time. Four rows is a pre-ANALYZE guess; nova and moss are the Forest players.', code: `Seq Scan on players  (cost=10000000000.00..10000000020.00 rows=4 width=73)
  Filter: (realm = 'Forest'::text)` },
        { type: 'sql', run: true, caption: 'Runnable. The mission index, then the same lookup.', code: `CREATE INDEX idx_players_realm ON players (realm);

EXPLAIN SELECT * FROM players WHERE realm = 'Forest';` },
        { type: 'plan', caption: 'After the index, in the sandbox. Index Cond is what the B-tree applied. The row estimate is still a guess.', code: `Index Scan using idx_players_realm on players  (cost=0.13..8.15 rows=1 width=73)
  Index Cond: (realm = 'Forest'::text)` },
        { type: 'p', text: 'A normal server allows sequential scans, so these six rows stay on a sequential scan after the index: one heap page is cheaper. The first plan below was generated with enable_seqscan on and ANALYZE. The editor will not print it. On a 50,006-row copy the same predicate, about a third of the rows, becomes a bitmap scan that reads matching heap pages in order instead of once per row.' },
        { type: 'plan', caption: 'Generated with sequential scans allowed, after ANALYZE. Not the editor output.', code: `Seq Scan on players  (cost=0.00..1.07 rows=2 width=20)
  Filter: (realm = 'Forest'::text)` },
        { type: 'plan', caption: 'Generated on a 50,006-row copy, not on the lesson\'s six rows.', code: `Bitmap Heap Scan on players  (cost=189.02..760.64 rows=16610 width=21)
  Recheck Cond: (realm = 'Forest'::text)
  ->  Bitmap Index Scan on idx_players_realm  (cost=0.00..184.86 rows=16610 width=0)
        Index Cond: (realm = 'Forest'::text)` },
      ],
    },
    {
      id: 'cost',
      heading: 'What do indexes cost on writes and on disk?',
      blocks: [
        { type: 'p', text: 'Each index is another relation that inserts and deletes must maintain. A HOT update skips that when no indexed column changes and the new version fits on the same heap page. Set realm and the shortcut is gone. Unused indexes still cost cache, disk, and vacuum, and they bloat until REINDEX.' },
        { type: 'p', text: 'CREATE INDEX blocks writes, not reads, until it finishes. CREATE INDEX CONCURRENTLY avoids that lock, takes two passes, cannot run inside a transaction, and can leave an invalid index. Do not paste it here. The mission is the plain statement.' },
      ],
    },
    {
      id: 'composite-partial',
      heading: 'When do composite and partial indexes help?',
      blocks: [
        { type: 'p', text: 'A B-tree on (realm, xp) serves realm, realm plus xp, and WHERE realm = \'Forest\' ORDER BY xp. It does not serve xp alone. PostgreSQL will not skip-scan every realm just to test xp.' },
        { type: 'sql', run: true, caption: 'Runnable beside the mission index.', code: `CREATE INDEX idx_players_realm_xp ON players (realm, xp);` },
        { type: 'p', text: 'A partial index keeps only rows that pass a predicate. The planner uses it only when the query implies that predicate. AND active matches the index below. realm alone does not, because inactive Forest players are missing and the answer would be wrong.' },
        { type: 'sql', run: true, caption: 'Runnable. WHERE active and WHERE active = true both match.', code: `CREATE INDEX idx_players_active_realm
ON players (realm)
WHERE active;` },
      ],
    },
    {
      id: 'mistakes',
      heading: 'Which indexing mistakes show up in production?',
      blocks: [
        { type: 'ul', items: [
          'Wrapping the column. lower(username) needs an expression index. LIKE \'%orest\' cannot use a B-tree. Neither can a predicate on only the second column of a composite index.',
          'Treating this sandbox as a server. The plan flips because sequential scans are off. Six rows will not flip on a server. Check EXPLAIN (ANALYZE, BUFFERS) on a realistic copy.',
          'Skipping ANALYZE after a bulk load. The plans above guess 4 rows, then 1, until autovacuum or ANALYZE catches up.',
          'Indexing every column, or copying the primary key. pg_stat_user_indexes.idx_scan shows what a server actually uses.',
        ] },
      ],
    },
    {
      id: 'interview',
      heading: 'Interview question: why might PostgreSQL ignore an index I just created?',
      blocks: [
        { type: 'answer', paragraphs: [
          'The planner skips an index when a sequential scan is cheaper: a tiny table, or a predicate that matches most rows. It skips it when the predicate does not fit, including a function around the column, a missing leading column, or a partial index the query does not imply. Missing statistics make the costs a guess.',
          'This sandbox flips the other way, because enable_seqscan is off. Index Cond means the index applied the predicate. Filter under a sequential scan means it did not.',
        ] },
      ],
    },
  ],
  faqs: [
    {
      question: 'Does a primary key already create an index?',
      answer: 'Yes. A primary key or UNIQUE constraint is already a unique B-tree. players has one on id and one on username. CREATE INDEX is for an index that does not enforce a constraint.',
    },
    {
      question: 'Will this index make every query faster?',
      answer: 'No. It can help reads that constrain realm, and it slows writes that change realm. Other queries ignore it. On six rows a normal server often keeps the sequential scan. Results stay the same either way.',
    },
    {
      question: 'How do I tell whether the index was used?',
      answer: 'Compare EXPLAIN before and after CREATE INDEX. Index Cond on idx_players_realm means it was used. Filter under a sequential scan means it was not. On a server, pg_stat_user_indexes.idx_scan is the longer-term counter.',
    },
  ],
  furtherReading: [
    { title: 'Introduction to indexes', href: 'https://www.postgresql.org/docs/current/indexes-intro.html' },
    { title: 'Index types, including B-tree', href: 'https://www.postgresql.org/docs/current/indexes-types.html' },
    { title: 'Multicolumn indexes', href: 'https://www.postgresql.org/docs/current/indexes-multicolumn.html' },
    { title: 'Partial indexes', href: 'https://www.postgresql.org/docs/current/indexes-partial.html' },
    { title: 'Using EXPLAIN', href: 'https://www.postgresql.org/docs/current/using-explain.html' },
    { title: 'CREATE INDEX', href: 'https://www.postgresql.org/docs/current/sql-createindex.html' },
  ],
}
