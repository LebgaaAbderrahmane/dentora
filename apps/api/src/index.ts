import express from 'express'
import { healthSchema, type Health } from '@dentora/contracts'

const app = express()
const port = Number(process.env.PORT ?? 4000)

app.use(express.json())

const api = express.Router()

api.get('/health', (_req, res) => {
  const health: Health = healthSchema.parse({
    status: 'ok',
    service: 'api',
    version: '0.1.0',
    timestamp: new Date().toISOString(),
  })
  res.json(health)
})

app.use('/api', api)

app.listen(port, () => {
  console.log(`[dentora:api] listening on :${port}`)
})
