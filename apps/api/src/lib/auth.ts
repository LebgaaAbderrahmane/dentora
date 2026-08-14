import type { NextFunction, Request, Response } from 'express'
import type { Role, SafeUser } from '@dentora/contracts'
import { prisma } from './prisma'
import { getCookie, hashSessionToken, SESSION_COOKIE } from './session'

export interface AuthContext {
  sessionId: string
  user: SafeUser
}

declare global {
  namespace Express {
    interface Request {
      auth?: AuthContext
    }
  }
}

export interface AuthedModel {
  id: string
  email: string
  name: string
  role: Role
  branchId: string
  active: boolean
}

export function toSafeUser(user: AuthedModel): SafeUser {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    branchId: user.branchId,
    active: user.active,
  }
}

export async function loadSession(req: Request): Promise<AuthContext | null> {
  const token = getCookie(req, SESSION_COOKIE)
  if (!token) return null
  const session = await prisma.session.findUnique({
    where: { tokenHash: hashSessionToken(token) },
    include: { user: true },
  })
  if (!session) return null
  if (
    session.revokedAt !== null ||
    session.expiresAt.getTime() < Date.now() ||
    !session.user.active
  ) {
    return null
  }
  return { sessionId: session.id, user: toSafeUser(session.user) }
}

type AuthRequest = Request & { auth?: AuthContext }

export function requireAuth(req: AuthRequest, res: Response, next: NextFunction): void {
  void (async () => {
    const auth = await loadSession(req)
    if (!auth) {
      res.status(401).json({ error: 'UNAUTHORIZED' })
      return
    }
    req.auth = auth
    next()
  })()
}

export function requireRole(...roles: Role[]) {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.auth) {
      res.status(401).json({ error: 'UNAUTHORIZED' })
      return
    }
    if (!roles.includes(req.auth.user.role)) {
      res.status(403).json({ error: 'FORBIDDEN' })
      return
    }
    next()
  }
}

export function assertAuth(req: Request): AuthContext {
  if (!req.auth) throw new Error('assertAuth: no auth context (expected after requireAuth)')
  return req.auth
}
