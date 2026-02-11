import app from './app.js'
import { env, validateEnv } from './config/env.js'

// Validate environment variables
validateEnv()

const PORT = env.port

app.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════╗
║           Talyn API Server                ║
╠═══════════════════════════════════════════╣
║  Status:  Running                         ║
║  Port:    ${PORT}                            ║
║  Mode:    ${env.nodeEnv.padEnd(11)}                   ║
║  URL:     http://localhost:${PORT}           ║
╚═══════════════════════════════════════════╝
  `)

  if (env.isDev) {
    console.log('API Endpoints:')
    console.log('  GET  /api/health          - Health check')
    console.log('  POST /api/auth/signup     - Register')
    console.log('  POST /api/auth/login      - Login')
    console.log('  GET  /api/auth/me         - Current user')
    console.log('  GET  /api/profile         - Get profile')
    console.log('  PUT  /api/profile         - Update profile')
    console.log('')
  }
})
