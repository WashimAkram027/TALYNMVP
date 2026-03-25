import { env } from './env.js'

export const corsOptions = {
  origin: env.isDev
    ? [env.frontendUrl, env.adminFrontendUrl, 'http://localhost:5173', 'http://localhost:5174', 'http://localhost:5175', 'http://127.0.0.1:5173', 'http://127.0.0.1:5174', 'http://127.0.0.1:5175']
    : [env.frontendUrl, env.adminFrontendUrl],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}
