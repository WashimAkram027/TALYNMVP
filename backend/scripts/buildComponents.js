/**
 * Build Components Script
 *
 * Compiles frontend React JSX components into plain JS for server-side rendering.
 * Output goes to backend/src/services/compiled/
 *
 * Usage: node scripts/buildComponents.js
 */

import { build } from 'esbuild'
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const BACKEND_ROOT = path.resolve(__dirname, '..')
const FRONTEND_COMPONENTS = path.resolve(BACKEND_ROOT, '../frontend/src/components')
const OUTPUT_DIR = path.resolve(BACKEND_ROOT, 'src/services/compiled')

// Ensure output dir exists
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true })
}

const entryPoints = [
  path.join(FRONTEND_COMPONENTS, 'FinancialDocuments.jsx'),
  path.join(FRONTEND_COMPONENTS, 'QuoteDocument.jsx'),
]

async function main() {
  try {
    await build({
      entryPoints,
      outdir: OUTPUT_DIR,
      format: 'esm',
      platform: 'node',
      jsx: 'automatic',
      bundle: true,
      // Keep react as external — resolved from backend's node_modules at runtime
      external: ['react', 'react-dom', 'react/jsx-runtime'],
      // Replace asset imports with empty string (logo passed as prop at runtime)
      plugins: [{
        name: 'strip-asset-imports',
        setup(b) {
          b.onResolve({ filter: /\.(png|jpe?g|svg|gif|webp)$/ }, () => ({
            path: 'stripped-asset',
            namespace: 'stripped',
          }))
          b.onLoad({ filter: /.*/, namespace: 'stripped' }, () => ({
            contents: 'export default ""',
            loader: 'js',
          }))
        },
      }],
    })

    console.log('Components compiled successfully → src/services/compiled/')
  } catch (err) {
    console.error('Component compilation failed:', err)
    process.exit(1)
  }
}

main()
