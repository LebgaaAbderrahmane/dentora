import { useEffect, useRef, useState } from 'react'

function cubicBezier(x1: number, y1: number, x2: number, y2: number) {
  const cx = 3 * x1
  const bx = 3 * (x2 - x1) - cx
  const ax = 1 - cx - bx
  const cy = 3 * y1
  const by = 3 * (y2 - y1) - cy
  const ay = 1 - cy - by
  const sampleX = (t: number) => ((ax * t + bx) * t + cx) * t
  const sampleY = (t: number) => ((ay * t + by) * t + cy) * t
  return (x: number) => {
    let t = x
    for (let i = 0; i < 8; i++) {
      const xVal = sampleX(t)
      const d = sampleX(t + 0.0001) - sampleX(t)
      if (Math.abs(d) < 1e-6) break
      t -= (xVal - x) / d
      if (t < 0) t = 0
      if (t > 1) t = 1
    }
    return sampleY(t)
  }
}

export function useInViewOnce<T extends Element>(threshold = 0.3) {
  const ref = useRef<T | null>(null)
  const [inView, setInView] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true)
          observer.disconnect()
        }
      },
      { threshold },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [threshold])

  return { ref, inView }
}

export function useCountUp(target: number, start: boolean, duration = 1400) {
  const [value, setValue] = useState(0)

  useEffect(() => {
    if (!start) return
    const ease = cubicBezier(0.25, 0.1, 0.25, 1)
    let raf = 0
    const t0 = performance.now()
    const tick = (now: number) => {
      const p = Math.min(1, (now - t0) / duration)
      setValue(target * ease(p))
      if (p < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [start, target, duration])

  return value
}