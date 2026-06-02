import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import bcrypt from 'bcryptjs'
import initSqlJs from 'sql.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const dataDir = path.join(__dirname, 'data')
const dbPath = path.join(dataDir, 'bakhtech.sqlite')

let SQL
let db

function now() {
  return new Date().toISOString()
}

function save() {
  fs.mkdirSync(dataDir, { recursive: true })
  fs.writeFileSync(dbPath, Buffer.from(db.export()))
}

function run(sql, params = []) {
  db.run(sql, params)
  save()
}

function all(sql, params = []) {
  const statement = db.prepare(sql)
  statement.bind(params)
  const rows = []

  while (statement.step()) {
    rows.push(statement.getAsObject())
  }

  statement.free()
  return rows
}

function get(sql, params = []) {
  return all(sql, params)[0] ?? null
}

function normalizeProject(row) {
  if (!row) return null

  return {
    id: row.id,
    title: row.title,
    slug: row.slug,
    category: row.category,
    summary: row.summary,
    description: row.description,
    image: row.image,
    coverImage: row.cover_image || '',
    videoUrl: row.video_url || '',
    websiteUrl: row.website_url,
    services: JSON.parse(row.services_json || '[]'),
    metrics: JSON.parse(row.metrics_json || '{}'),
    isFeatured: Boolean(row.is_featured),
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function createSlug(title, id = Date.now()) {
  const slug = String(title)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')

  return slug || `project-${id}`
}

function uniqueSlug(table, title, ignoreId = null) {
  const baseSlug = createSlug(title)
  let candidate = baseSlug
  let index = 2

  while (
    get(
      `SELECT id FROM ${table} WHERE slug = ? ${ignoreId ? 'AND id != ?' : ''}`,
      ignoreId ? [candidate, ignoreId] : [candidate],
    )
  ) {
    candidate = `${baseSlug}-${index}`
    index += 1
  }

  return candidate
}

function projectPayload(body) {
  const title = String(body.title || '').trim()

  return {
    title,
    slug: String(body.slug || title).trim(),
    category: String(body.category || '').trim(),
    summary: String(body.summary || '').trim(),
    description: String(body.description || '').trim(),
    image: String(body.image || '').trim(),
    coverImage: String(body.coverImage || body.cover_image || '').trim(),
    videoUrl: String(body.videoUrl || body.video_url || '').trim(),
    websiteUrl: String(body.websiteUrl || body.website_url || '').trim(),
    services: Array.isArray(body.services)
      ? body.services.map((item) => String(item).trim()).filter(Boolean)
      : String(body.services || '')
          .split(',')
          .map((item) => item.trim())
          .filter(Boolean),
    metrics: typeof body.metrics === 'object' && body.metrics !== null ? body.metrics : {},
    isFeatured: Boolean(body.isFeatured ?? body.is_featured),
    status: body.status === 'draft' ? 'draft' : 'published',
  }
}

function migrate() {
  db.run(`
    CREATE TABLE IF NOT EXISTS admins (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      name TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS projects (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      slug TEXT NOT NULL UNIQUE,
      category TEXT NOT NULL,
      summary TEXT NOT NULL,
      description TEXT,
      image TEXT,
      cover_image TEXT,
      video_url TEXT,
      website_url TEXT,
      services_json TEXT NOT NULL DEFAULT '[]',
      metrics_json TEXT NOT NULL DEFAULT '{}',
      is_featured INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'published',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS visits (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      path TEXT NOT NULL,
      referrer TEXT,
      user_agent TEXT,
      ip TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS media (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      filename TEXT NOT NULL,
      original_name TEXT NOT NULL,
      mime_type TEXT NOT NULL,
      size INTEGER NOT NULL,
      url TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS pages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      slug TEXT NOT NULL UNIQUE,
      content TEXT,
      seo_title TEXT,
      seo_description TEXT,
      status TEXT NOT NULL DEFAULT 'published',
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS posts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      slug TEXT NOT NULL UNIQUE,
      excerpt TEXT,
      content TEXT,
      category TEXT,
      image TEXT,
      status TEXT NOT NULL DEFAULT 'draft',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS bookings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT,
      phone TEXT,
      service TEXT,
      message TEXT,
      status TEXT NOT NULL DEFAULT 'open',
      scheduled_at TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `)
}

function seedAdmin() {
  const email = process.env.ADMIN_EMAIL || 'admin@bakhtech.com.ng'
  const password = process.env.ADMIN_PASSWORD || 'ChangeMe123!'
  const existing = get('SELECT id FROM admins WHERE email = ?', [email])

  if (existing) return

  run(
    'INSERT INTO admins (email, password_hash, name, created_at) VALUES (?, ?, ?, ?)',
    [email, bcrypt.hashSync(password, 12), 'Bakhtech Admin', now()],
  )
}

function seedProjects() {
  const count = get('SELECT COUNT(*) as total FROM projects')?.total ?? 0
  if (count > 0) return

  const starters = [
    {
      title: 'Bayara Ecommerce Store',
      category: 'Ecommerce',
      summary: 'A product-led online store experience for fast product discovery and ordering.',
      description: 'Built for a retail brand that needed a clean catalogue, campaign-ready sections, and a responsive shopping journey.',
      image: '/showcase/showcase-01.jpg',
      websiteUrl: 'https://bayara.ng',
      services: ['Ecommerce', 'UI/UX', 'Performance'],
      metrics: { seo: '92', performance: '88', conversion: 'Improved product discovery' },
      isFeatured: true,
      status: 'published',
    },
    {
      title: 'Consultation Booking Website',
      category: 'Booking System',
      summary: 'A consultation-first website with service pages, booking flow, and trust-focused messaging.',
      description: 'Designed to help visitors understand the service, choose the right appointment, and take action quickly.',
      image: '/showcase/showcase-03.jpg',
      websiteUrl: '',
      services: ['Booking System', 'Website', 'SEO'],
      metrics: { seo: '90', performance: '91', conversion: 'Clearer booking journey' },
      isFeatured: true,
      status: 'published',
    },
  ]

  for (const project of starters) {
    const payload = projectPayload(project)
    run(
      `INSERT INTO projects
        (title, slug, category, summary, description, image, cover_image, video_url, website_url, services_json, metrics_json, is_featured, status, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        payload.title,
        payload.slug,
        payload.category,
        payload.summary,
        payload.description,
        payload.image,
        payload.coverImage,
        payload.videoUrl,
        payload.websiteUrl,
        JSON.stringify(payload.services),
        JSON.stringify(payload.metrics),
        payload.isFeatured ? 1 : 0,
        payload.status,
        now(),
        now(),
      ],
    )
  }
}

function seedCms() {
  const pageCount = get('SELECT COUNT(*) as total FROM pages')?.total ?? 0
  if (!pageCount) {
    for (const title of ['Home 1', 'Home 2', 'About', 'Portfolio', 'Ebook', 'Career', 'Contact']) {
      const slug = createSlug(title)
      run(
        'INSERT INTO pages (title, slug, content, seo_title, seo_description, status, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [title, slug, `${title} page content`, `${title} | Bakhtech Solutions`, `Manage ${title} page SEO and content.`, 'published', now()],
      )
    }
  }

  const settingsCount = get('SELECT COUNT(*) as total FROM settings')?.total ?? 0
  if (!settingsCount) {
    for (const [key, value] of Object.entries(defaultSettings())) {
      run('INSERT INTO settings (key, value, updated_at) VALUES (?, ?, ?)', [key, value, now()])
    }
  }
}

function defaultSettings() {
  return {
    siteName: 'Bakhtech Solutions',
    contactEmail: 'solutions@bakhtech.com.ng',
    phone: '+234 708 637 2833',
    activeHome: 'home-2',
    homePortfolioShowDescriptions: 'true',
  }
}

export async function initDb() {
  SQL = await initSqlJs()
  fs.mkdirSync(dataDir, { recursive: true })
  db = fs.existsSync(dbPath) ? new SQL.Database(fs.readFileSync(dbPath)) : new SQL.Database()
  migrate()
  migrateProjectMediaColumns()
  save()
  seedAdmin()
  seedProjects()
  seedCms()
}

function migrateProjectMediaColumns() {
  const columns = all('PRAGMA table_info(projects)').map((column) => column.name)
  if (!columns.includes('cover_image')) {
    db.run('ALTER TABLE projects ADD COLUMN cover_image TEXT')
  }
  if (!columns.includes('video_url')) {
    db.run('ALTER TABLE projects ADD COLUMN video_url TEXT')
  }
}

export const database = {
  getAdminByEmail(email) {
    return get('SELECT * FROM admins WHERE email = ?', [email])
  },
  getAdminById(id) {
    const admin = get('SELECT id, email, name, created_at FROM admins WHERE id = ?', [id])
    return admin
  },
  createVisit({ path, referrer, userAgent, ip }) {
    run('INSERT INTO visits (path, referrer, user_agent, ip, created_at) VALUES (?, ?, ?, ?, ?)', [
      path || '/',
      referrer || '',
      userAgent || '',
      ip || '',
      now(),
    ])
  },
  dashboard() {
    const totalProjects = get('SELECT COUNT(*) as total FROM projects')?.total ?? 0
    const publishedProjects = get("SELECT COUNT(*) as total FROM projects WHERE status = 'published'")?.total ?? 0
    const totalVisits = get('SELECT COUNT(*) as total FROM visits')?.total ?? 0
    const todayPrefix = new Date().toISOString().slice(0, 10)
    const todayVisits = get('SELECT COUNT(*) as total FROM visits WHERE created_at LIKE ?', [`${todayPrefix}%`])?.total ?? 0
    const topPages = all('SELECT path, COUNT(*) as visits FROM visits GROUP BY path ORDER BY visits DESC LIMIT 6')

    return {
      totals: { projects: totalProjects, publishedProjects, visits: totalVisits, todayVisits },
      seo: { score: 92, indexedPages: 18, issues: 3 },
      performance: { score: 88, loadTime: '1.8s', mobileScore: 84 },
      visits: { topPages },
    }
  },
  listProjects({ includeDrafts = false } = {}) {
    const rows = includeDrafts
      ? all('SELECT * FROM projects ORDER BY updated_at DESC')
      : all("SELECT * FROM projects WHERE status = 'published' ORDER BY is_featured DESC, updated_at DESC")

    return rows.map(normalizeProject)
  },
  getProject(id) {
    return normalizeProject(get('SELECT * FROM projects WHERE id = ?', [id]))
  },
  createProject(body) {
    const payload = projectPayload(body)
    if (!payload.title || !payload.category || !payload.summary) {
      const error = new Error('Title, category, and summary are required.')
      error.status = 400
      throw error
    }

    run(
      `INSERT INTO projects
        (title, slug, category, summary, description, image, cover_image, video_url, website_url, services_json, metrics_json, is_featured, status, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        payload.title,
        uniqueSlug('projects', payload.slug || payload.title),
        payload.category,
        payload.summary,
        payload.description,
        payload.image,
        payload.coverImage,
        payload.videoUrl,
        payload.websiteUrl,
        JSON.stringify(payload.services),
        JSON.stringify(payload.metrics),
        payload.isFeatured ? 1 : 0,
        payload.status,
        now(),
        now(),
      ],
    )

    return normalizeProject(get('SELECT * FROM projects ORDER BY id DESC LIMIT 1'))
  },
  updateProject(id, body) {
    const existing = this.getProject(id)
    if (!existing) return null
    const payload = projectPayload({ ...existing, ...body })

    run(
      `UPDATE projects
        SET title = ?, slug = ?, category = ?, summary = ?, description = ?, image = ?, cover_image = ?, video_url = ?, website_url = ?,
            services_json = ?, metrics_json = ?, is_featured = ?, status = ?, updated_at = ?
        WHERE id = ?`,
      [
        payload.title,
        uniqueSlug('projects', payload.slug || payload.title, id),
        payload.category,
        payload.summary,
        payload.description,
        payload.image,
        payload.coverImage,
        payload.videoUrl,
        payload.websiteUrl,
        JSON.stringify(payload.services),
        JSON.stringify(payload.metrics),
        payload.isFeatured ? 1 : 0,
        payload.status,
        now(),
        id,
      ],
    )

    return this.getProject(id)
  },
  deleteProject(id) {
    const existing = this.getProject(id)
    if (!existing) return false
    run('DELETE FROM projects WHERE id = ?', [id])
    return true
  },
  listMedia() {
    return all('SELECT * FROM media ORDER BY created_at DESC').map((row) => ({
      id: row.id,
      filename: row.filename,
      originalName: row.original_name,
      mimeType: row.mime_type,
      size: row.size,
      url: row.url,
      createdAt: row.created_at,
    }))
  },
  createMedia(file) {
    run('INSERT INTO media (filename, original_name, mime_type, size, url, created_at) VALUES (?, ?, ?, ?, ?, ?)', [
      file.filename,
      file.originalname,
      file.mimetype,
      file.size,
      `/uploads/${file.filename}`,
      now(),
    ])
    return this.listMedia()[0]
  },
  deleteMedia(id) {
    const media = get('SELECT * FROM media WHERE id = ?', [id])
    if (!media) return null
    run('DELETE FROM media WHERE id = ?', [id])
    return media
  },
  listPages() {
    return all('SELECT * FROM pages ORDER BY id ASC').map((row) => ({
      id: row.id,
      title: row.title,
      slug: row.slug,
      content: row.content,
      seoTitle: row.seo_title,
      seoDescription: row.seo_description,
      status: row.status,
      updatedAt: row.updated_at,
    }))
  },
  updatePage(id, body) {
    run(
      'UPDATE pages SET title = ?, content = ?, seo_title = ?, seo_description = ?, status = ?, updated_at = ? WHERE id = ?',
      [body.title, body.content || '', body.seoTitle || '', body.seoDescription || '', body.status || 'published', now(), id],
    )
    return this.listPages().find((page) => page.id === Number(id)) ?? null
  },
  listPosts() {
    return all('SELECT * FROM posts ORDER BY updated_at DESC').map((row) => ({
      id: row.id,
      title: row.title,
      slug: row.slug,
      excerpt: row.excerpt,
      content: row.content,
      category: row.category,
      image: row.image,
      status: row.status,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }))
  },
  createPost(body) {
    const title = String(body.title || '').trim()
    if (!title) {
      const error = new Error('Post title is required.')
      error.status = 400
      throw error
    }
    run(
      'INSERT INTO posts (title, slug, excerpt, content, category, image, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [title, uniqueSlug('posts', body.slug || title), body.excerpt || '', body.content || '', body.category || '', body.image || '', body.status || 'draft', now(), now()],
    )
    return this.listPosts()[0]
  },
  updatePost(id, body) {
    run(
      'UPDATE posts SET title = ?, slug = ?, excerpt = ?, content = ?, category = ?, image = ?, status = ?, updated_at = ? WHERE id = ?',
      [body.title, uniqueSlug('posts', body.slug || body.title, id), body.excerpt || '', body.content || '', body.category || '', body.image || '', body.status || 'draft', now(), id],
    )
    return this.listPosts().find((post) => post.id === Number(id)) ?? null
  },
  deletePost(id) {
    run('DELETE FROM posts WHERE id = ?', [id])
    return true
  },
  listBookings() {
    return all('SELECT * FROM bookings ORDER BY created_at DESC').map((row) => ({
      id: row.id,
      name: row.name,
      email: row.email,
      phone: row.phone,
      service: row.service,
      message: row.message,
      status: row.status,
      scheduledAt: row.scheduled_at,
      createdAt: row.created_at,
    }))
  },
  createBooking(body) {
    run(
      'INSERT INTO bookings (name, email, phone, service, message, status, scheduled_at, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [body.name || 'Website visitor', body.email || '', body.phone || '', body.service || '', body.message || '', body.status || 'open', body.scheduledAt || '', now()],
    )
    return this.listBookings()[0]
  },
  updateBooking(id, body) {
    run('UPDATE bookings SET name = ?, email = ?, phone = ?, service = ?, message = ?, status = ?, scheduled_at = ? WHERE id = ?', [
      body.name,
      body.email || '',
      body.phone || '',
      body.service || '',
      body.message || '',
      body.status || 'open',
      body.scheduledAt || '',
      id,
    ])
    return this.listBookings().find((booking) => booking.id === Number(id)) ?? null
  },
  listUsers() {
    return all('SELECT id, email, name, created_at FROM admins ORDER BY id ASC').map((row) => ({
      id: row.id,
      email: row.email,
      name: row.name,
      role: 'Owner',
      createdAt: row.created_at,
    }))
  },
  listSettings() {
    return {
      ...defaultSettings(),
      ...Object.fromEntries(all('SELECT key, value FROM settings ORDER BY key ASC').map((row) => [row.key, row.value])),
    }
  },
  updateSettings(body) {
    for (const [key, value] of Object.entries(body)) {
      run(
        `INSERT INTO settings (key, value, updated_at) VALUES (?, ?, ?)
         ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
        [key, String(value), now()],
      )
    }
    return this.listSettings()
  },
}
