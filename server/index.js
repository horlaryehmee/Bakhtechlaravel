import 'dotenv/config'
import bcrypt from 'bcryptjs'
import cors from 'cors'
import express from 'express'
import jwt from 'jsonwebtoken'
import multer from 'multer'
import fs from 'node:fs'
import path from 'node:path'
import { database, initDb } from './db.js'

const app = express()
const port = Number(process.env.PORT || process.env.API_PORT || 4174)
const jwtSecret = process.env.JWT_SECRET || 'dev-only-change-this-secret'
const uploadDir = process.env.UPLOAD_DIR ? path.resolve(process.env.UPLOAD_DIR) : path.resolve('public/uploads')
const distDir = path.resolve('dist')
const allowedOrigins = process.env.CLIENT_ORIGIN
  ? process.env.CLIENT_ORIGIN.split(',').map((origin) => origin.trim()).filter(Boolean)
  : true

fs.mkdirSync(uploadDir, { recursive: true })

const upload = multer({
  storage: multer.diskStorage({
    destination: uploadDir,
    filename: (_req, file, callback) => {
      const safeName = file.originalname.replace(/[^a-zA-Z0-9.]+/g, '-').toLowerCase()
      callback(null, `${Date.now()}-${safeName}`)
    },
  }),
  limits: { fileSize: 80 * 1024 * 1024 },
})

app.use(cors({ origin: allowedOrigins, credentials: true }))
app.use(express.json({ limit: '1mb' }))
app.use('/uploads', express.static(uploadDir))

function signToken(admin) {
  return jwt.sign({ sub: admin.id, email: admin.email }, jwtSecret, { expiresIn: '7d' })
}

function requireAdmin(req, res, next) {
  const token = req.headers.authorization?.replace(/^Bearer\s+/i, '')

  if (!token) {
    return res.status(401).json({ message: 'Authentication required.' })
  }

  try {
    const payload = jwt.verify(token, jwtSecret)
    const admin = database.getAdminById(payload.sub)

    if (!admin) {
      return res.status(401).json({ message: 'Invalid admin session.' })
    }

    req.admin = admin
    next()
  } catch {
    res.status(401).json({ message: 'Invalid or expired session.' })
  }
}

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, service: 'bakhtech-api' })
})

app.post('/api/admin/login', async (req, res) => {
  const email = String(req.body.email || '').trim().toLowerCase()
  const password = String(req.body.password || '')
  const admin = database.getAdminByEmail(email)

  if (!admin || !(await bcrypt.compare(password, admin.password_hash))) {
    return res.status(401).json({ message: 'Invalid email or password.' })
  }

  res.json({
    token: signToken(admin),
    admin: { id: admin.id, email: admin.email, name: admin.name },
  })
})

app.get('/api/admin/me', requireAdmin, (req, res) => {
  res.json({ admin: req.admin })
})

app.get('/api/admin/dashboard', requireAdmin, (_req, res) => {
  res.json(database.dashboard())
})

app.get('/api/admin/projects', requireAdmin, (_req, res) => {
  res.json({ projects: database.listProjects({ includeDrafts: true }) })
})

app.get('/api/admin/cms', requireAdmin, (_req, res) => {
  res.json({
    pages: database.listPages(),
    posts: database.listPosts(),
    bookings: database.listBookings(),
    users: database.listUsers(),
    settings: database.listSettings(),
    media: database.listMedia(),
  })
})

app.put('/api/admin/pages/:id', requireAdmin, (req, res) => {
  const page = database.updatePage(Number(req.params.id), req.body)
  if (!page) return res.status(404).json({ message: 'Page not found.' })
  res.json({ page })
})

app.post('/api/admin/posts', requireAdmin, (req, res, next) => {
  try {
    res.status(201).json({ post: database.createPost(req.body) })
  } catch (error) {
    next(error)
  }
})

app.put('/api/admin/posts/:id', requireAdmin, (req, res) => {
  const post = database.updatePost(Number(req.params.id), req.body)
  if (!post) return res.status(404).json({ message: 'Post not found.' })
  res.json({ post })
})

app.delete('/api/admin/posts/:id', requireAdmin, (req, res) => {
  database.deletePost(Number(req.params.id))
  res.status(204).end()
})

app.post('/api/admin/bookings', requireAdmin, (req, res) => {
  res.status(201).json({ booking: database.createBooking(req.body) })
})

app.put('/api/admin/bookings/:id', requireAdmin, (req, res) => {
  const booking = database.updateBooking(Number(req.params.id), req.body)
  if (!booking) return res.status(404).json({ message: 'Booking not found.' })
  res.json({ booking })
})

app.put('/api/admin/settings', requireAdmin, (req, res) => {
  res.json({ settings: database.updateSettings(req.body) })
})

app.get('/api/admin/media', requireAdmin, (_req, res) => {
  res.json({ media: database.listMedia() })
})

app.post('/api/admin/media', requireAdmin, upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ message: 'File is required.' })
  res.status(201).json({ media: database.createMedia(req.file) })
})

app.delete('/api/admin/media/:id', requireAdmin, (req, res) => {
  const media = database.deleteMedia(Number(req.params.id))
  if (!media) return res.status(404).json({ message: 'Media not found.' })

  const filePath = path.join(uploadDir, media.filename)
  if (fs.existsSync(filePath)) fs.unlinkSync(filePath)
  res.status(204).end()
})

app.post('/api/admin/projects', requireAdmin, (req, res, next) => {
  try {
    res.status(201).json({ project: database.createProject(req.body) })
  } catch (error) {
    next(error)
  }
})

app.put('/api/admin/projects/:id', requireAdmin, (req, res, next) => {
  try {
    const project = database.updateProject(Number(req.params.id), req.body)

    if (!project) {
      return res.status(404).json({ message: 'Project not found.' })
    }

    res.json({ project })
  } catch (error) {
    next(error)
  }
})

app.delete('/api/admin/projects/:id', requireAdmin, (req, res) => {
  const deleted = database.deleteProject(Number(req.params.id))

  if (!deleted) {
    return res.status(404).json({ message: 'Project not found.' })
  }

  res.status(204).end()
})

app.get('/api/projects', (_req, res) => {
  res.json({ projects: database.listProjects() })
})

app.get('/api/settings', (_req, res) => {
  res.json({ settings: database.listSettings() })
})

app.post('/api/visits', (req, res) => {
  database.createVisit({
    path: req.body.path,
    referrer: req.body.referrer,
    userAgent: req.headers['user-agent'],
    ip: req.ip,
  })
  res.status(204).end()
})

if (fs.existsSync(path.join(distDir, 'index.html'))) {
  app.use(express.static(distDir))
  app.get(/^(?!\/api).*/, (_req, res) => {
    res.sendFile(path.join(distDir, 'index.html'))
  })
}

app.use((error, _req, res, _next) => {
  const status = error.status || 500
  res.status(status).json({ message: error.message || 'Something went wrong.' })
})

await initDb()

app.listen(port, () => {
  console.log(`Bakhtech API running at http://127.0.0.1:${port}`)
})
