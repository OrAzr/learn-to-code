import { useCallback, useEffect, useRef, useState } from 'react'
import { PGlite } from '@electric-sql/pglite'
import {
  ArrowRight, BookOpen, Check, CheckCircle2, ChevronDown, ChevronRight,
  Code2, Copy, Database, Eye, EyeOff, HardDrive, Info, Lightbulb,
  Menu, Play, RotateCcw, Sparkles, Table2, Terminal, Volume2, VolumeX, X, Zap,
} from 'lucide-react'
import { getLesson, lessons, modules, seedSQL } from './course'
import { createMusicPlayer } from './chiptune'

const STORAGE_KEY = 'query-quest-progress-v1'

function readProgress() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]') } catch { return [] }
}

function readMusicPreference() {
  try { return localStorage.getItem('query-quest-music-on') !== 'false' } catch { return true }
}

function runtimeErrorMessage(error) {
  const message = error?.message || String(error)
  return /failed to fetch/i.test(message)
    ? 'Could not load PostgreSQL runtime files. Make sure the app server is running, then refresh the page.'
    : message
}

function PixelMark() {
  return <div className="pixel-mark" aria-hidden="true"><i /><i /><i /><i /><i /><i /><i /><i /><i /></div>
}

function App() {
  const [selectedId, setSelectedId] = useState(lessons[0].id)
  const [mode, setMode] = useState('course')
  const [completed, setCompleted] = useState(readProgress)
  const [code, setCode] = useState(lessons[0].starter)
  const [results, setResults] = useState([])
  const [error, setError] = useState('')
  const [feedback, setFeedback] = useState('')
  const [loading, setLoading] = useState(true)
  const [running, setRunning] = useState(false)
  const [databaseName, setDatabaseName] = useState('quest_db')
  const [schema, setSchema] = useState([])
  const [tab, setTab] = useState('editor')
  const [hintOpen, setHintOpen] = useState(false)
  const [solutionOpen, setSolutionOpen] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const [musicOn, setMusicOn] = useState(readMusicPreference)
  const [musicError, setMusicError] = useState('')
  const dbRef = useRef(null)
  const musicRef = useRef(null)
  const musicWantedRef = useRef(musicOn)
  const generationRef = useRef(0)
  const lesson = getLesson(selectedId)
  const lessonIndex = lessons.findIndex(l => l.id === selectedId)
  const totalXp = lessons.filter(l => completed.includes(l.id)).reduce((sum, l) => sum + l.xp, 0)
  const progress = Math.round(completed.length / lessons.length * 100)

  const loadSchema = useCallback(async (db) => {
    try {
      const data = await db.query(`SELECT table_name, column_name, data_type
        FROM information_schema.columns
        WHERE table_schema = 'public'
        ORDER BY table_name, ordinal_position`)
      const grouped = data.rows.reduce((acc, row) => {
        const table = acc.find(t => t.name === row.table_name)
        if (table) table.columns.push({ name: row.column_name, type: row.data_type })
        else acc.push({ name: row.table_name, columns: [{ name: row.column_name, type: row.data_type }] })
        return acc
      }, [])
      setSchema(grouped)
    } catch { setSchema([]) }
  }, [])

  const boot = useCallback(async (id, currentMode) => {
    const generation = ++generationRef.current
    setLoading(true)
    setResults([])
    setError('')
    setFeedback('')
    setHintOpen(false)
    setSolutionOpen(false)
    setTab('editor')
    setDatabaseName('quest_db')
    setCode(currentMode === 'playground' ? 'SELECT * FROM players;' : getLesson(id).starter)
    const old = dbRef.current
    dbRef.current = null
    if (old) { try { await old.close() } catch { /* previous sandbox can already be closed */ } }
    try {
      const db = await PGlite.create()
      if (id !== 'create-database' || currentMode === 'playground') await db.exec(seedSQL)
      if (generation !== generationRef.current) { await db.close(); return }
      dbRef.current = db
      await loadSchema(db)
    } catch (err) {
      if (generation === generationRef.current) setError(`Could not start PostgreSQL: ${runtimeErrorMessage(err)}`)
    } finally {
      if (generation === generationRef.current) setLoading(false)
    }
  }, [loadSchema])

  useEffect(() => {
    boot(selectedId, mode)
    return () => { generationRef.current++ }
  }, [selectedId, mode, boot])

  useEffect(() => { localStorage.setItem(STORAGE_KEY, JSON.stringify(completed)) }, [completed])

  useEffect(() => {
    if (musicWantedRef.current) {
      try {
        const player = createMusicPlayer()
        musicRef.current = player
        player.setMuted(false)
        player.resume().catch(() => { /* The first user gesture can unlock autoplay. */ })
      } catch (err) { setMusicError(err.message || 'Audio is unavailable') }
    }
    const unlockMusic = () => {
      if (musicWantedRef.current) musicRef.current?.resume().catch(() => {})
    }
    document.addEventListener('click', unlockMusic)
    document.addEventListener('keydown', unlockMusic)
    return () => {
      document.removeEventListener('click', unlockMusic)
      document.removeEventListener('keydown', unlockMusic)
      musicRef.current?.close()
      musicRef.current = null
    }
  }, [])

  const toggleMusic = () => {
    setMusicError('')
    const next = !musicWantedRef.current
    musicWantedRef.current = next
    setMusicOn(next)
    try { localStorage.setItem('query-quest-music-on', String(next)) } catch { /* Preference is optional. */ }
    try {
      if (next && !musicRef.current) musicRef.current = createMusicPlayer()
      musicRef.current?.setMuted(!next)
      if (next) musicRef.current?.resume().catch(err => setMusicError(err.message || 'Audio is unavailable'))
    } catch (err) { setMusicError(err.message || 'Audio is unavailable') }
  }

  const selectLesson = (id) => {
    setSidebarOpen(false)
    if (mode === 'course' && selectedId === id) return
    setSelectedId(id)
    setMode('course')
  }

  const showPlayground = () => {
    setSidebarOpen(false)
    if (mode !== 'playground') setMode('playground')
  }

  const runQuery = async () => {
    if (loading || running || !code.trim() || !dbRef.current) return
    setRunning(true)
    setError('')
    setFeedback('')
    const currentDb = dbRef.current
    try {
      const runnableCode = code.replace(/--[^\n]*/g, '').trim()
      const createMatch = runnableCode.match(/^CREATE\s+DATABASE\s+([a-z_][a-z0-9_]*)\s*;?$/i)
      let nextResults
      let activeDb = currentDb
      let newName = databaseName
      if (createMatch) {
        const name = createMatch[1].toLowerCase()
        const nextDb = await PGlite.create()
        dbRef.current = nextDb
        activeDb = nextDb
        newName = name
        setDatabaseName(name)
        await currentDb.close()
        nextResults = [{ rows: [], fields: [], affectedRows: 0, command: 'CREATE DATABASE' }]
      } else {
        nextResults = await currentDb.exec(code)
      }
      setResults(nextResults)
      await loadSchema(activeDb)
      if (mode === 'course') {
        let passed = false
        try { passed = await lesson.check({ sql: code, results: nextResults, db: activeDb, databaseName: newName }) } catch { /* Learner may have changed the schema while experimenting. */ }
        if (passed) {
          setFeedback('Mission complete! Your SQL did the job.')
          setCompleted(previous => previous.includes(lesson.id) ? previous : [...previous, lesson.id])
        } else {
          setFeedback('Query ran successfully. Check the mission and try again!')
        }
      } else {
        setFeedback('Query executed successfully.')
      }
    } catch (err) {
      setError(runtimeErrorMessage(err))
      setResults([])
    } finally { setRunning(false) }
  }

  const copyCode = async () => {
    try { await navigator.clipboard.writeText(code); setCopied(true); setTimeout(() => setCopied(false), 1600) } catch { /* clipboard may be unavailable */ }
  }

  const displayResult = [...results].reverse().find(r => r.rows?.length || r.fields?.length)
  const resultColumns = displayResult?.fields?.map(f => f.name) || (displayResult?.rows?.[0] ? Object.keys(displayResult.rows[0]) : [])
  const affected = results.reduce((sum, r) => sum + (r.affectedRows || 0), 0)
  const won = completed.includes(lesson.id)

  return <div className="app-shell">
    <div className="ambient ambient-one" /><div className="ambient ambient-two" />
    <header className="topbar">
      <button className="mobile-menu icon-button" onClick={() => setSidebarOpen(true)} aria-label="Open menu"><Menu size={20} /></button>
      <button className="brand" onClick={() => selectLesson(lessons[0].id)} aria-label="Query Quest home"><PixelMark /><span>QUERY<span className="brand-accent">QUEST</span><small>POSTGRESQL ACADEMY</small></span></button>
      <nav className="topnav" aria-label="Main navigation">
        <button className={mode === 'course' ? 'active' : ''} onClick={() => setMode('course')}><BookOpen size={16} /> Course</button>
        <button className={mode === 'playground' ? 'active' : ''} onClick={showPlayground}><Terminal size={16} /> Playground</button>
      </nav>
      <div className="topbar-right"><span className="online"><span /> POSTGRES ONLINE</span><span className="topbar-separator" /><button className={`music-toggle ${musicOn ? 'playing' : ''}`} onClick={toggleMusic} aria-label={musicOn ? 'Mute 8-bit music' : 'Play 8-bit music'} aria-pressed={musicOn} title={musicError || (musicOn ? 'Mute one-minute 8-bit loop' : 'Play one-minute 8-bit loop')}>{musicOn ? <Volume2 size={16} /> : <VolumeX size={16} />}<span className="music-label">SOUND {musicOn ? 'ON' : 'OFF'}</span><span className="music-bars" aria-hidden="true"><i /><i /><i /></span></button><span className="xp-pill"><Zap size={15} fill="currentColor" /> {totalXp} XP</span><span className="avatar">Q</span></div>
    </header>

    <div className="layout">
      {sidebarOpen && <div className="sidebar-scrim" onClick={() => setSidebarOpen(false)} />}
      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-mobile-head"><span>CHOOSE A LEVEL</span><button className="icon-button" onClick={() => setSidebarOpen(false)} aria-label="Close menu"><X size={20} /></button></div>
        <div className="sidebar-inner">
          <div className="sidebar-kicker">YOUR ADVENTURE <span>16 LEVELS</span></div>
          <div className="progress-card"><div className="progress-top"><span>COURSE PROGRESS</span><strong>{progress}%</strong></div><div className="progress-track"><div style={{ width: `${progress}%` }} /></div><small>{completed.length} of {lessons.length} lessons completed</small></div>
          <div className="module-list">
            {modules.map(module => {
              const items = lessons.filter(l => l.module === module.id)
              const doneCount = items.filter(l => completed.includes(l.id)).length
              return <section className="module" key={module.id}>
                <div className="module-head"><span className={`module-number ${module.color}`}>{module.icon}</span><span className="module-copy"><strong>{module.title}</strong><small>{module.subtitle}</small></span><span className="module-count">{doneCount}/{items.length}</span></div>
                <div className="lesson-links">{items.map((item) => <button key={item.id} className={`lesson-link ${mode === 'course' && selectedId === item.id ? 'selected' : ''}`} onClick={() => selectLesson(item.id)}><span className={`lesson-status ${completed.includes(item.id) ? 'done' : ''}`}>{completed.includes(item.id) ? <Check size={12} strokeWidth={3} /> : String(lessons.indexOf(item) + 1).padStart(2, '0')}</span><span>{item.title}</span>{mode === 'course' && selectedId === item.id && <ChevronRight size={14} />}</button>)}</div>
              </section>
            })}
          </div>
          <button className="sidebar-playground" onClick={showPlayground}><Terminal size={18} /><span><strong>Free playground</strong><small>Explore without a mission</small></span><ArrowRight size={16} /></button>
        </div>
      </aside>

      <main className="main-area">
        {mode === 'course' ? <>
          <div className="breadcrumb"><span>THE COURSE</span><ChevronRight size={13} /><span>{modules.find(m => m.id === lesson.module)?.title.toUpperCase()}</span><ChevronRight size={13} /><strong>LEVEL {String(lessonIndex + 1).padStart(2, '0')}</strong></div>
          <div className="content-grid">
            <div className="lesson-content">
              <div className="eyebrow"><span className="eyebrow-line" />{lesson.eyebrow}</div>
              <h1>{lesson.heading}</h1>
              <p className="intro">{lesson.intro}</p>
              <div className="lesson-meta"><span><span className="meta-dot" /> {lesson.duration} READ</span><span><Zap size={14} fill="currentColor" /> +{lesson.xp} XP</span><span><span className="meta-square" /> HANDS-ON</span></div>

              <div className="section-divider"><span>THE CONCEPT</span><i /></div>
              <div className="concept-card"><span className="concept-icon"><Lightbulb size={20} /></span><div><strong>GOOD TO KNOW</strong><p>{lesson.concept}</p></div></div>
              <div className="syntax-label"><Code2 size={15} /> THE SYNTAX</div>
              <pre className="syntax-block"><code>{lesson.syntax}</code><span>SQL</span></pre>

              <div className="mission-card"><div className="mission-header"><span className="mission-icon"><Sparkles size={19} /></span><div><small>YOUR MISSION</small><strong>{lesson.title}</strong></div><span className="mission-xp">+{lesson.xp} XP</span></div><p>{lesson.mission}</p><div className="mission-footer"><span>{won ? <><CheckCircle2 size={16} /> COMPLETED</> : <><span className="mission-pulse" /> READY WHEN YOU ARE</>}</span><span>↓ WRITE SQL IN THE EDITOR</span></div></div>

              <div className="help-row"><button onClick={() => setHintOpen(!hintOpen)}><Lightbulb size={16} /> {hintOpen ? 'Hide hint' : 'Need a hint?'} <ChevronDown size={15} className={hintOpen ? 'rotated' : ''} /></button><button onClick={() => setSolutionOpen(!solutionOpen)}>{solutionOpen ? <EyeOff size={16} /> : <Eye size={16} />} {solutionOpen ? 'Hide solution' : 'Show solution'}</button></div>
              {hintOpen && <div className="help-note"><Lightbulb size={17} />{lesson.hint}</div>}
              {solutionOpen && <div className="solution-note"><span>SOLUTION</span><code>{lesson.solution}</code><button onClick={() => setCode(lesson.solution)}>Use in editor <ArrowRight size={14} /></button></div>}

              <div className="lesson-bottom"><span>LEVEL {String(lessonIndex + 1).padStart(2, '0')} OF {lessons.length}</span><button disabled={lessonIndex === lessons.length - 1} onClick={() => selectLesson(lessons[lessonIndex + 1].id)}>{won ? 'Next level' : 'Skip to next'} <ArrowRight size={17} /></button></div>
            </div>
            <Console {...{ code, setCode, results, displayResult, resultColumns, affected, error, feedback, loading, running, databaseName, schema, tab, setTab, runQuery, boot, selectedId, mode, copyCode, copied }} />
          </div>
        </> : <>
          <div className="breadcrumb"><span>QUERY QUEST</span><ChevronRight size={13} /><strong>FREE PLAYGROUND</strong></div>
          <div className="content-grid playground-grid"><div className="lesson-content playground-content"><div className="eyebrow"><span className="eyebrow-line" /> NO RULES · JUST SQL</div><h1>Your sandbox.<br /><em>Your rules.</em></h1><p className="intro">Experiment with real PostgreSQL in your browser. The sample world has players, quests, and completions ready to explore. Write anything, run it, and see what happens.</p><div className="playground-tips"><strong>TRY THESE COMMANDS</strong>{["SELECT * FROM players;", "SELECT realm, COUNT(*) FROM players GROUP BY realm;", "CREATE TABLE loot (id SERIAL PRIMARY KEY, name TEXT);"].map(s => <button key={s} onClick={() => setCode(s)}><code>{s}</code><ArrowRight size={15} /></button>)}</div><div className="concept-card playground-info"><span className="concept-icon"><Info size={20} /></span><div><strong>YOUR BROWSER IS THE SERVER</strong><p>Queries run locally in a fresh PostgreSQL sandbox. Reset restores the sample data. Course progress is saved in this browser.</p></div></div></div><Console {...{ code, setCode, results, displayResult, resultColumns, affected, error, feedback, loading, running, databaseName, schema, tab, setTab, runQuery, boot, selectedId, mode, copyCode, copied }} /></div>
        </>}
      </main>
    </div>
  </div>
}

function Console({ code, setCode, results, displayResult, resultColumns, affected, error, feedback, loading, running, databaseName, schema, tab, setTab, runQuery, boot, selectedId, mode, copyCode, copied }) {
  const lines = code.split('\n').length
  return <section className="console-wrap" aria-label="SQL workspace">
    <div className="console-heading"><div><span className="console-heading-icon"><Terminal size={19} /></span><span><strong>SQL WORKSPACE</strong><small>Write. Run. Learn. Repeat.</small></span></div><span className="engine-badge"><span /> LIVE ENGINE</span></div>
    <div className="console-window">
      <div className="window-bar"><div className="window-dots"><i /><i /><i /></div><span>query_quest.sql</span><div className="window-bar-right"><HardDrive size={13} /> {databaseName} <ChevronDown size={12} /></div></div>
      <div className="editor-tabs"><button className={tab === 'editor' ? 'active' : ''} onClick={() => setTab('editor')}><Code2 size={15} /> SQL EDITOR</button><button className={tab === 'schema' ? 'active' : ''} onClick={() => setTab('schema')}><Table2 size={15} /> SCHEMA <span>{schema.length}</span></button></div>
      {tab === 'editor' ? <div className="editor-area"><div className="line-numbers" aria-hidden="true">{Array.from({ length: Math.max(lines, 10) }, (_, i) => <span key={i}>{i + 1}</span>)}</div><textarea spellCheck="false" aria-label="SQL editor" value={code} onChange={e => setCode(e.target.value)} onKeyDown={e => { if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') { e.preventDefault(); runQuery() } else if (e.key === 'Tab') { e.preventDefault(); const el = e.target; const start = el.selectionStart; const end = el.selectionEnd; setCode(code.slice(0, start) + '  ' + code.slice(end)); requestAnimationFrame(() => { el.selectionStart = el.selectionEnd = start + 2 }) } }} placeholder="-- Write your SQL here..." /></div> : <div className="schema-area">{schema.length ? schema.map(table => <div className="schema-table" key={table.name}><div><Table2 size={15} /> <strong>{table.name}</strong><span>{table.columns.length} COLUMNS</span></div>{table.columns.map(col => <p key={col.name}><span>{col.name}</span><small>{col.type}</small></p>)}</div>) : <div className="schema-empty">No tables yet. Create one with SQL.</div>}</div>}
      <div className="editor-toolbar"><span>{loading ? 'BOOTING POSTGRESQL...' : 'POSTGRESQL · READY'} <span className="shortcut">⌘ / CTRL + ENTER TO RUN</span></span><div><button className="toolbar-icon" onClick={copyCode} title="Copy SQL" aria-label="Copy SQL">{copied ? <Check size={16} /> : <Copy size={16} />}</button><button className="toolbar-icon" onClick={() => boot(selectedId, mode)} title="Reset database" aria-label="Reset database"><RotateCcw size={16} /></button><button className="run-button" onClick={runQuery} disabled={loading || running || !code.trim()}><Play size={15} fill="currentColor" /> {running ? 'RUNNING...' : 'RUN QUERY'}</button></div></div>
      <div className="results-header"><span><span className="results-symbol">⌁</span> OUTPUT</span><span>{error ? 'ERROR' : results.length ? `${displayResult?.rows?.length ?? affected} ${displayResult ? 'ROWS' : 'AFFECTED'}` : 'AWAITING QUERY'}</span></div>
      <div className="results-body" aria-live="polite">{error ? <div className="error-message"><X size={16} /><div><strong>QUERY ERROR</strong><p>{error}</p></div></div> : results.length ? displayResult ? <div className="table-scroll"><table><thead><tr><th className="row-index">#</th>{resultColumns.map(col => <th key={col}>{col}</th>)}</tr></thead><tbody>{displayResult.rows.map((row, i) => <tr key={i}><td className="row-index">{i + 1}</td>{resultColumns.map(col => <td key={col}>{row[col] == null ? <em>NULL</em> : String(row[col])}</td>)}</tr>)}</tbody></table>{displayResult.rows.length === 0 && <div className="empty-rows">0 rows returned</div>}</div> : <div className="command-success"><CheckCircle2 size={21} /><div><strong>Command executed</strong><span>{affected ? `${affected} row${affected === 1 ? '' : 's'} affected` : 'Database updated successfully'}</span></div></div> : <div className="empty-output"><div className="empty-output-icon"><Database size={26} /></div><strong>Results will appear here</strong><span>Write a query and hit Run Query to see the magic.</span></div>}</div>
      {(feedback && !error) && <div className={`feedback ${feedback.startsWith('Mission complete') ? 'success' : 'neutral'}`}><span>{feedback.startsWith('Mission complete') ? <CheckCircle2 size={15} /> : <Info size={15} />}</span>{feedback}</div>}
      <div className="console-footer"><span><span /> {loading ? 'STARTING ENGINE' : 'CONNECTED TO LOCAL POSTGRESQL'}</span><span>POWERED BY PGLITE</span></div>
    </div>
    <div className="console-footnote"><span>✦</span> Your workspace resets when you switch lessons. Experiment freely!</div>
  </section>
}

export default App
