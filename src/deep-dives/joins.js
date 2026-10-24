export const joinsDeepDive = {
  lessonId: 'joins',
  updated: '2026-10-24',
  sections: [
    {
      id: 'why-join',
      heading: 'Why do these tables need a join at all?',
      blocks: [
        { type: 'p', text: 'completions stores ids and a date, not a username or a title. The title lives on quests, so a rename does not rewrite every completion. "Who finished which quest?" is a join: every matching pair, not one row. nova finished two quests and appears twice. A count that looks too high usually starts there.' },
      ],
    },
    {
      id: 'join-types',
      heading: 'How do INNER, LEFT, RIGHT, and FULL joins differ?',
      blocks: [
        { type: 'p', text: 'JOIN alone means INNER JOIN. A row survives only when both sides match, which is what this mission asks for. ORDER BY is just for reading the result.' },
        { type: 'sql', run: true, caption: 'Runnable. Five rows: byte and glitch share Fix the satellite, nova finished two quests, and pixel finished Cross the dunes.', code: `SELECT p.username, q.title
FROM players p
JOIN completions c ON c.player_id = p.id
JOIN quests q ON q.id = c.quest_id
ORDER BY p.username, q.title;` },
        { type: 'p', text: 'moss and echo are absent because no completion points at them. That is the predicate, not missing data. LEFT JOIN keeps every left row and writes null on the right when nothing matches.' },
        { type: 'sql', run: true, caption: 'Runnable. echo and moss have a null quest_id. nova still appears twice.', code: `SELECT p.username, c.quest_id
FROM players p
LEFT JOIN completions c ON c.player_id = p.id
ORDER BY p.username, c.quest_id NULLS FIRST;` },
        { type: 'p', text: 'RIGHT JOIN keeps every right-hand row. Here that matches the inner join, because every completion points at a real player. FULL JOIN keeps unmatched rows from either side, so on this sample it matches the left join. An orphan player_id shows up only in RIGHT or FULL. Null never equals null: a missing key is not a wildcard, and the nulls in an outer join do not mean "match anything."' },
        {
          type: 'table',
          caption: 'Six players, five completions, every completion pointing at a real player.',
          headers: ['Join', 'Rows that survive', 'On this sample'],
          rows: [
            ['INNER', 'Only pairs that match', 'moss and echo disappear'],
            ['LEFT', 'Every left row, plus matches', 'moss and echo have a null quest'],
            ['RIGHT', 'Every right row, plus matches', 'Same five rows as INNER'],
            ['FULL', 'Unmatched rows from either side', 'Same rows as LEFT'],
          ],
        },
        { type: 'h3', id: 'on-versus-where', text: 'Where should an extra filter sit?' },
        { type: 'p', text: 'Only glitch and byte finished a quest on or after 2025-04-05. Put that test in WHERE and the other four players vanish. nova did finish quests, on earlier dates, and unmatched players have a null completed_at. A comparison with null is not true, so WHERE discards the row the left join had kept.' },
        { type: 'sql', run: true, caption: 'Runnable. Only byte and glitch remain.', code: `SELECT p.username, c.quest_id
FROM players p
LEFT JOIN completions c ON c.player_id = p.id
WHERE c.completed_at >= DATE '2025-04-05';` },
        { type: 'p', text: 'Move the date into ON to keep every player and attach only recent completions. nova stays, with a null quest. ON decides what attaches. WHERE decides what survives. For an inner join those places are usually equivalent. For an outer join they are not.' },
        { type: 'sql', run: true, caption: 'Runnable. All six players stay. Only recent completions attach.', code: `SELECT p.username, c.quest_id
FROM players p
LEFT JOIN completions c
  ON c.player_id = p.id
 AND c.completed_at >= DATE '2025-04-05'
ORDER BY p.username;` },
      ],
    },
    {
      id: 'planner',
      heading: 'How does PostgreSQL actually execute a join?',
      blocks: [
        { type: 'p', text: 'The planner prices algorithms. It does not replay your JOIN text. A nested loop probes the inner side once per outer row: cheap if the outer side is small or the inner side is indexed, costly if both are large. A hash join hashes one equijoin key and probes with the other, in memory up to work_mem (4MB by default), then on disk. A merge join walks two inputs already ordered by the key. Hash and merge need equality.' },
        { type: 'p', text: 'EXPLAIN in front of the mission query shows hash joins. The scan of completions starts at a cost of 10000000000 because this sandbox sets enable_seqscan off. That number is a penalty, not time. A normal server still hash-joins this query with sequential scans, at a cost under 100. A right join is often rewritten as a left join with the inputs swapped. Past join_collapse_limit (default 8) explicit join order stops being freely rearranged. Leave that setting alone here.' },
      ],
    },
    {
      id: 'mistakes',
      heading: 'Which join mistakes break the result?',
      blocks: [
        { type: 'ul', items: [
          'Joining on a label. ON realm gives moss both Forest quests without a completion. Match player_id and quest_id.',
          'Counting pairs as players. nova\'s two completions count nova twice. COUNT(DISTINCT p.id), or aggregate first.',
          'A comma in FROM is a cross join: 6 times 5 is 30 rows with no filter. JOIN without ON is a syntax error. The comma is not. Write JOIN ... ON.',
          'WHERE on the outer side becomes an inner join, as the date query shows. COUNT(*) counts moss once. COUNT(quest_id) skips the null and counts zero.',
        ] },
      ],
    },
    {
      id: 'interview',
      heading: 'Interview question: when does a LEFT JOIN condition belong in ON instead of WHERE?',
      blocks: [
        { type: 'answer', paragraphs: [
          'ON decides which right-hand rows attach, and unmatched left-hand rows stay. WHERE rejects the joined row. A test on a nullable column in WHERE, other than IS NULL, drops the unmatched side and you have an inner join. ON and WHERE match for a plain inner join. They do not once outer rows should survive.',
          'The date filter is the demo: WHERE returns byte and glitch, ON returns every player. Players with no completion are the left join plus WHERE quest_id IS NULL.',
        ] },
      ],
    },
  ],
  faqs: [
    {
      question: 'Is JOIN the same thing as INNER JOIN?',
      answer: 'Yes. JOIN with no keyword is an inner join. LEFT, RIGHT, and FULL are the outer joins, and the word OUTER is optional.',
    },
    {
      question: 'Why did my LEFT JOIN lose rows?',
      answer: 'A later WHERE often removed them. completed_at >= a date is unknown when the date is null, and WHERE keeps only true rows. Move that test into ON. A left join also preserves the left table only, so the table order matters.',
    },
    {
      question: 'Why does one player show up more than once?',
      answer: 'nova completed two quests, so the join emits nova twice. Joins do not deduplicate. DISTINCT or GROUP BY is how you get one row per player.',
    },
  ],
  furtherReading: [
    { title: 'Joins Between Tables, the official tutorial', href: 'https://www.postgresql.org/docs/current/tutorial-join.html' },
    { title: 'Joined tables in the SQL reference', href: 'https://www.postgresql.org/docs/current/queries-table-expressions.html#QUERIES-JOIN' },
    { title: 'Controlling the planner with explicit JOINs', href: 'https://www.postgresql.org/docs/current/explicit-joins.html' },
    { title: 'Using EXPLAIN', href: 'https://www.postgresql.org/docs/current/using-explain.html' },
  ],
}
