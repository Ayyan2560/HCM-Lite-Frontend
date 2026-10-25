import path from 'node:path'
import fs from 'node:fs'
import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import cookieParser from 'cookie-parser'

import env, { repoRoot } from './config/env.mjs'
import { databaseState } from './config/db.mjs'
import { apiLimiter } from './middleware/rateLimit.mjs'
import { errorHandler, notFoundHandler } from './middleware/error.mjs'
import { Organization } from './models/Organization.mjs'

import authRoutes from './routes/authRoutes.mjs'
import orgRoutes from './routes/orgRoutes.mjs'
import employeeRoutes from './routes/employeeRoutes.mjs'
import attendanceRoutes from './routes/attendanceRoutes.mjs'
import leaveRoutes from './routes/leaveRoutes.mjs'
import payrollRoutes from './routes/payrollRoutes.mjs'
import dashboardRoutes from './routes/dashboardRoutes.mjs'
import announcementRoutes from './routes/announcementRoutes.mjs'
import notificationRoutes from './routes/notificationRoutes.mjs'
import auditRoutes from './routes/auditRoutes.mjs'
import aiRoutes from './routes/aiRoutes.mjs'

// Normalize origins so accidental trailing slashes do not cause mismatches.
const normalizeOrigin = value => {
  try {
    return new URL(value).origin
  } catch {
    return ''
  }
}

// Keep configured origins and explicitly allow the deployed frontend.
const allowedClientOrigins = new Set(
  [...env.clientOrigins, 'https://hcm-lite-frontend-five.vercel.app']
    .map(normalizeOrigin)
    .filter(Boolean)
)

export function createApp () {
  const app = express()

  app.disable('x-powered-by')
  app.set('trust proxy', 1)

  app.use(
    helmet({
      contentSecurityPolicy: false,
      crossOriginResourcePolicy: {
        policy: 'cross-origin'
      }
    })
  )

  app.use(
    cors({
      origin (origin, callback) {
        // Allow requests that do not provide an Origin header.
        if (!origin) {
          return callback(null, true)
        }

        const normalizedOrigin = normalizeOrigin(origin)

        // Allow explicitly configured frontend origins.
        if (allowedClientOrigins.has(normalizedOrigin)) {
          return callback(null, true)
        }

        // Allow localhost only during development.
        if (
          !env.isProduction &&
          /^http:\/\/(?:localhost|127\.0\.0\.1):\d+$/.test(normalizedOrigin)
        ) {
          return callback(null, true)
        }

        return callback(new Error(`Origin ${origin} is not allowed by CORS.`))
      },
      credentials: true
    })
  )

  app.use(express.json({ limit: '2mb' }))
  app.use(cookieParser())

  // Backend API root.
  app.get('/', (_req, res) => {
    res.json({
      success: true,
      service: 'hcm-lite-api',
      message: 'HCM Lite backend is running.',
      health: '/api/health',
      auth: '/api/auth'
    })
  })

  // API health check.
  app.get('/api/health', async (_req, res) => {
    let setupRequired = true

    try {
      setupRequired = !(await Organization.exists({ singleton: 'primary' }))
    } catch {
      setupRequired = true
    }

    res.json({
      success: true,
      data: {
        status: 'ok',
        service: 'hcm-lite-api',
        database: databaseState(),
        setupRequired,
        aiConfigured: Boolean(env.aiApiKey),
        uptimeSeconds: Math.round(process.uptime()),
        version: '1.0.0'
      }
    })
  })

  // API rate limiting.
  app.use('/api', apiLimiter)

  // API routes.
  app.use('/api/auth', authRoutes)
  app.use('/api/organization', orgRoutes)
  app.use('/api/employees', employeeRoutes)
  app.use('/api/attendance', attendanceRoutes)
  app.use('/api/leaves', leaveRoutes)
  app.use('/api/payroll', payrollRoutes)
  app.use('/api/dashboard', dashboardRoutes)
  app.use('/api/announcements', announcementRoutes)
  app.use('/api/notifications', notificationRoutes)
  app.use('/api/audit', auditRoutes)
  app.use('/api/ai', aiRoutes)

  // Serve the frontend only if its build exists in this deployment.
  const clientDistCandidates = [
    path.join(repoRoot, 'client', 'dist'),
    path.join(repoRoot, 'Frontend', 'dist'),
    path.join(repoRoot, 'frontend', 'dist')
  ]

  const clientDist = clientDistCandidates.find(dir =>
    fs.existsSync(path.join(dir, 'index.html'))
  )

  if (clientDist) {
    app.use(express.static(clientDist))

    app.get(/^\/(?!api).*/, (_req, res) => {
      res.sendFile(path.join(clientDist, 'index.html'))
    })
  }

  // API 404 and centralized error handling.
  app.use('/api', notFoundHandler)
  app.use(errorHandler)

  return app
}

export default createApp
