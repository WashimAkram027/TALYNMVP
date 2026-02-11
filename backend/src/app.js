import express from 'express'
import cors from 'cors'
import { corsOptions } from './config/cors.js'
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js'
import routes from './routes/index.js'
import { env } from './config/env.js'

const app = express()

// Trust proxy (for rate limiting behind reverse proxy)
app.set('trust proxy', 1)

// CORS
app.use(cors(corsOptions))

// Body parsing
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))

// Request logging in development
if (env.isDev) {
  app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} ${req.method} ${req.path}`)
    next()
  })
}

// API routes
app.use('/api', routes)

// Root route
app.get('/', (req, res) => {
  res.json({
    name: 'Talyn API',
    version: '1.0.0',
    status: 'running',
    docs: '/api/health'
  })
})

// 404 handler
app.use(notFoundHandler)

// Global error handler
app.use(errorHandler)

export default app
