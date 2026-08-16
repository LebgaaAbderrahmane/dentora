// minimal in-memory fixed-window rate limiter for the public endpoints.
// Edge-level enforcement (Caddy/nginx) can replace this later; this only needs
// to deter casual spam of the public booking form, not be a distributed limit.
const WINDOW_MS = 60 * 60 * 1000
const DEFAULT_MAX = 5

const hits = new Map<string, { count: number; windowStart: number }>()

export function allowRequest(key: string, max = DEFAULT_MAX): boolean {
  const now = Date.now()
  const bucket = hits.get(key)
  if (!bucket || now - bucket.windowStart >= WINDOW_MS) {
    hits.set(key, { count: 1, windowStart: now })
    return true
  }
  if (bucket.count >= max) return false
  bucket.count += 1
  return true
}
