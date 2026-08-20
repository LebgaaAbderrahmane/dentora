// Registers the generated Workbox service worker (/sw.js) in production. In dev
// the app runs through the Vite dev server and the SW is intentionally not
// registered (devOptions disabled in vite.config.ts), so hot-reload stays intact.
// Registration failure is non-fatal: the site works without the SW.
export function registerServiceWorker(): void {
  if (!('serviceWorker' in navigator) || !import.meta.env.PROD) return
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch((err: unknown) => {
      console.warn('service worker registration failed', err)
    })
  })
}
