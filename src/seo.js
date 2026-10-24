import { getLesson, lessons } from './course.js'

export const homeTitle = 'Free Beginner SQL Course: Interactive PostgreSQL Lessons'
export const homeDescription = 'A free beginner SQL course with 16 hands-on interactive lessons. Practice real PostgreSQL queries in your browser, with no setup and no signup.'
export const playgroundTitle = 'Free SQL Playground: Run PostgreSQL in Your Browser'
export const playgroundDescription = 'Practice PostgreSQL in a free interactive SQL playground. Query sample players, quests, and completions in your browser. No signup or setup.'
export const ogImagePath = '/og-image.png'
export const ogImageAlt = 'Query Quest, a free interactive SQL and PostgreSQL course'
export const courseName = 'Query Quest — Learn SQL and PostgreSQL'
export const courseDescription = 'Free SQL and PostgreSQL course with 16 interactive lessons.'
export const playgroundPath = '/playground/'
export const lessonPath = id => `/lessons/${id}/`

const lessonMeta = {
  'hello-sql': {
    title: 'SQL SELECT Tutorial: Your First PostgreSQL Query (Free)',
    description: 'Write your first SQL SELECT in a free interactive lesson. Return a text column with AS and run PostgreSQL in your browser. No signup or setup.',
  },
  'create-database': {
    title: 'CREATE DATABASE in PostgreSQL: SQL Tutorial (Free)',
    description: 'Create a PostgreSQL database with CREATE DATABASE in a free interactive lesson. Name it in your browser and start with no signup or setup required.',
  },
  'create-table': {
    title: 'SQL CREATE TABLE Tutorial: Columns and Keys (Free)',
    description: 'Build a table in a free interactive PostgreSQL lesson. Use SERIAL, TEXT, INTEGER, NOT NULL, and a primary key in your browser. No signup required.',
  },
  'insert-rows': {
    title: 'SQL INSERT INTO Tutorial: Add Rows in PostgreSQL (Free)',
    description: 'Add a row with SQL INSERT INTO in a free interactive PostgreSQL lesson. Name the columns, use RETURNING, and run it in your browser. No signup.',
  },
  constraints: {
    title: 'SQL UNIQUE and CHECK Constraints in PostgreSQL (Free)',
    description: 'Protect a table with UNIQUE, NOT NULL, and CHECK in a free interactive PostgreSQL lesson. Practice the rules in your browser. No signup required.',
  },
  'select-columns': {
    title: 'SQL SELECT Columns Tutorial for PostgreSQL (Interactive)',
    description: 'Choose columns with SQL SELECT in a free interactive PostgreSQL lesson. Return only username and xp, in your browser, with no signup or setup.',
  },
  'filter-rows': {
    title: 'SQL WHERE Tutorial: Filter Rows in PostgreSQL (Free)',
    description: 'Filter rows with SQL WHERE and AND in a free interactive PostgreSQL lesson. Compare text and true or false values in your browser. No signup.',
  },
  'sort-limit': {
    title: 'SQL ORDER BY and LIMIT Tutorial in PostgreSQL (Free)',
    description: 'Sort with SQL ORDER BY DESC and keep the top rows with LIMIT in a free interactive PostgreSQL lesson. Practice in your browser. No signup required.',
  },
  'update-rows': {
    title: 'SQL UPDATE Tutorial: Change Rows in PostgreSQL (Free)',
    description: 'Change existing rows with SQL UPDATE, SET, and WHERE in a free interactive PostgreSQL lesson. Practice the statement in your browser. No signup.',
  },
  'delete-rows': {
    title: 'SQL DELETE Tutorial: Remove Rows in PostgreSQL (Free)',
    description: 'Remove one row with SQL DELETE and WHERE in a free interactive PostgreSQL lesson. Inspect it with RETURNING, in your browser. No signup required.',
  },
  transactions: {
    title: 'SQL Transactions: BEGIN and COMMIT in PostgreSQL (Free)',
    description: 'Save SQL changes with BEGIN and COMMIT in a free interactive PostgreSQL lesson. See how ROLLBACK cancels them, in your browser. No signup required.',
  },
  joins: {
    title: 'SQL JOIN Tutorial: INNER JOIN in PostgreSQL (Free)',
    description: 'Practice SQL INNER JOIN in a free interactive PostgreSQL lesson. Match players to completed quests with ON, in your browser. No signup required.',
  },
  'group-by': {
    title: 'SQL GROUP BY and COUNT Tutorial in PostgreSQL (Free)',
    description: 'Summarize rows with SQL GROUP BY and COUNT in a free interactive PostgreSQL lesson. Return one row per realm, in your browser. No signup required.',
  },
  indexes: {
    title: 'SQL Index Tutorial: CREATE INDEX in PostgreSQL (Free)',
    description: 'Add an index with CREATE INDEX in a free interactive PostgreSQL lesson. Learn the read and write tradeoff, in your browser. No signup required.',
  },
  explain: {
    title: 'SQL EXPLAIN Tutorial: PostgreSQL Query Plans (Free)',
    description: 'Read a query plan with SQL EXPLAIN in a free interactive PostgreSQL lesson. See why a small table uses a Seq Scan, in your browser. No signup.',
  },
  'final-boss': {
    title: 'SQL Practice: JOIN, GROUP BY, and LIMIT in PostgreSQL',
    description: 'Combine JOIN, COUNT, GROUP BY, ORDER BY, and LIMIT in a free interactive PostgreSQL challenge. Find the top players in your browser. No signup.',
  },
}

export function pageFromPath(pathname) {
  if (pathname === playgroundPath) return { mode: 'playground', selectedId: lessons[0].id }
  const id = pathname.match(/^\/lessons\/([a-z0-9-]+)\/?$/)?.[1]
  return { mode: 'course', selectedId: lessons.some(lesson => lesson.id === id) ? id : lessons[0].id }
}

export function pageMeta(mode, id, pathname = '') {
  if (mode === 'playground') return { title: playgroundTitle, description: playgroundDescription, path: playgroundPath }
  if (pathname === '/') return { title: homeTitle, description: homeDescription, path: '/' }
  const lesson = getLesson(id)
  const meta = lessonMeta[lesson.id]
  return { title: meta.title, description: meta.description, path: lessonPath(lesson.id) }
}

export function courseWorkload() {
  const minutes = lessons.reduce((sum, lesson) => sum + Number.parseInt(lesson.duration, 10), 0)
  const hours = Math.floor(minutes / 60)
  const remainder = minutes % 60
  return `PT${hours}H${remainder}M`
}

function absolute(origin, path) {
  return origin ? `${origin}${path}` : path
}

function provider(origin) {
  return { '@type': 'Organization', name: 'Query Quest', url: absolute(origin, '/') }
}

function breadcrumb(origin, items) {
  return {
    '@type': 'BreadcrumbList',
    itemListElement: items.map(([name, path], index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name,
      item: absolute(origin, path),
    })),
  }
}

export function structuredData(mode, id, pathname, origin = '') {
  const courseId = absolute(origin, '/#course')
  const courseRef = { '@type': 'Course', '@id': courseId, name: courseName, url: absolute(origin, '/') }
  if (pathname === '/') {
    return {
      '@context': 'https://schema.org',
      '@type': 'Course',
      '@id': courseId,
      name: courseName,
      description: courseDescription,
      url: absolute(origin, '/'),
      inLanguage: 'en',
      isAccessibleForFree: true,
      educationalLevel: 'Beginner',
      learningResourceType: 'Interactive Tutorial',
      keywords: 'SQL, PostgreSQL, database, tutorial, hands-on learning, SQL lessons',
      provider: provider(origin),
      offers: {
        '@type': 'Offer',
        price: '0',
        priceCurrency: 'USD',
        category: 'Free',
        url: absolute(origin, '/'),
      },
      hasCourseInstance: {
        '@type': 'CourseInstance',
        courseMode: 'online',
        courseWorkload: courseWorkload(),
        url: absolute(origin, '/'),
      },
    }
  }
  if (mode === 'playground') {
    const meta = pageMeta(mode, id, pathname)
    return {
      '@context': 'https://schema.org',
      '@graph': [
        {
          '@type': 'WebApplication',
          name: meta.title,
          description: meta.description,
          url: absolute(origin, playgroundPath),
          applicationCategory: 'EducationalApplication',
          operatingSystem: 'Web browser',
          browserRequirements: 'Requires JavaScript',
          isAccessibleForFree: true,
          offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
          provider: provider(origin),
        },
        breadcrumb(origin, [['Home', '/'], ['Playground', playgroundPath]]),
      ],
    }
  }
  const lesson = getLesson(id)
  const meta = pageMeta('course', lesson.id, lessonPath(lesson.id))
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'LearningResource',
        name: meta.title,
        description: meta.description,
        url: absolute(origin, meta.path),
        learningResourceType: 'Interactive lesson',
        educationalLevel: 'Beginner',
        isAccessibleForFree: true,
        inLanguage: 'en',
        timeRequired: `PT${Number.parseInt(lesson.duration, 10)}M`,
        teaches: lesson.concept,
        isPartOf: courseRef,
        provider: provider(origin),
      },
      breadcrumb(origin, [['Home', '/'], [lesson.title, meta.path]]),
    ],
  }
}
