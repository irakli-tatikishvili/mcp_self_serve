import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import type { IncomingMessage, ServerResponse } from 'node:http'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import {
  buildOpenQuestionsFile,
  rowsFromOpenQuestionsFile,
  rowsFromPutBody,
} from './src/openQuestionsStorage'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const OPEN_QUESTIONS_PATH = path.join(__dirname, 'data', 'open-questions.json')

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = []
    req.on('data', (c) => chunks.push(c))
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')))
    req.on('error', reject)
  })
}

function sendJson(res: ServerResponse, status: number, data: unknown) {
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.end(JSON.stringify(data))
}

let buildOutDir = path.join(__dirname, 'dist')

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'open-questions-static-to-dist',
      apply: 'build',
      configResolved(config) {
        const o = config.build.outDir
        buildOutDir = path.isAbsolute(o) ? o : path.resolve(config.root, o)
      },
      closeBundle() {
        fs.copyFileSync(
          OPEN_QUESTIONS_PATH,
          path.join(buildOutDir, 'open-questions.json'),
        )
      },
    },
    {
      name: 'open-questions-file-api',
      configureServer(server) {
        server.middlewares.use(async (req, res, next) => {
          const pathname = req.url?.split('?')[0] ?? ''

          if (pathname === '/open-questions.json' && req.method === 'GET') {
            try {
              const raw = fs.readFileSync(OPEN_QUESTIONS_PATH, 'utf8')
              res.statusCode = 200
              res.setHeader('Content-Type', 'application/json; charset=utf-8')
              res.end(raw)
              return
            } catch {
              next()
              return
            }
          }

          if (pathname !== '/api/open-questions') {
            next()
            return
          }

          try {
            if (req.method === 'GET') {
              const raw = fs.readFileSync(OPEN_QUESTIONS_PATH, 'utf8')
              const parsed: unknown = JSON.parse(raw)
              const rows = rowsFromOpenQuestionsFile(parsed)
              if (rows === null) {
                sendJson(res, 500, { error: 'Invalid open-questions.json' })
                return
              }
              const p = parsed as Record<string, unknown>
              const updatedAt =
                typeof p.updatedAt === 'string' ? p.updatedAt : new Date().toISOString()
              const version = typeof p.version === 'number' ? p.version : 1
              sendJson(res, 200, { version, updatedAt, rows })
              return
            }

            if (req.method === 'PUT') {
              const body = await readBody(req)
              let json: unknown
              try {
                json = JSON.parse(body)
              } catch {
                sendJson(res, 400, { error: 'Invalid JSON' })
                return
              }
              const rows = rowsFromPutBody(json)
              if (!rows) {
                sendJson(res, 400, { error: 'Invalid rows payload' })
                return
              }
              const out = buildOpenQuestionsFile(rows)
              fs.mkdirSync(path.dirname(OPEN_QUESTIONS_PATH), { recursive: true })
              fs.writeFileSync(
                OPEN_QUESTIONS_PATH,
                JSON.stringify(out, null, 2) + '\n',
                'utf8',
              )
              sendJson(res, 200, out)
              return
            }

            res.statusCode = 405
            res.end()
          } catch (e) {
            const err = e as NodeJS.ErrnoException
            if (err.code === 'ENOENT') {
              sendJson(res, 404, { error: 'open-questions.json missing under data/' })
              return
            }
            sendJson(res, 500, { error: String(e) })
          }
        })
      },
    },
  ],
})
