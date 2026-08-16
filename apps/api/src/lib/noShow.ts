export interface NoShowStats {
  noShowCount: number
  noShowRate: number
}

// no-show rate is the share of resolved visits that ended in a no-show.
// A "resolved visit" is either completed or no-showed — pending/cancelled
// appointments never resolve to a real visit and are excluded.
export function noShowStats(args: { noShowCount: number; completedCount: number }): NoShowStats {
  const resolved = args.noShowCount + args.completedCount
  const noShowRate = resolved === 0 ? 0 : Math.round((args.noShowCount / resolved) * 10000) / 10000
  return { noShowCount: args.noShowCount, noShowRate }
}
