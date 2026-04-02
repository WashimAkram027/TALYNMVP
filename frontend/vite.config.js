import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'node',
    globals: true
  },
  server: {
    port: 5173,
    open: true,
    headers: {
      // Required for Stripe Financial Connections OAuth popups.
      // Must NOT be 'same-origin' which blocks popup communication.
      'Cross-Origin-Opener-Policy': 'same-origin-allow-popups'
    }
  },
  preview: {
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin-allow-popups'
    }
  }
})
