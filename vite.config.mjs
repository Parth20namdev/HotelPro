import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { createRequire } from 'node:module'
import 'dotenv/config'
const require = createRequire(import.meta.url)
export default defineConfig({
  plugins: [react(), { name: 'hotelpro-api', configureServer(server) {
    const app = require('./server/app.cjs')
    server.middlewares.use((req, res, next) => req.url === '/api' || req.url.startsWith('/api/') ? app(req, res, next) : next())
  } }],
  server: { port: 3000 },
})
