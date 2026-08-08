import type { SVGProps } from 'react'

export function FacebookIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...props}>
      <path d="M13.5 22v-9h3l.5-3.5h-3.5V7.3c0-1 .3-1.7 1.8-1.7h1.8V2.5c-.3 0-1.4-.1-2.6-.1-2.6 0-4.4 1.6-4.4 4.5v2.6H8V13h3.1v9h2.4z" />
    </svg>
  )
}

export function InstagramIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      aria-hidden="true"
      {...props}
    >
      <rect x="2.5" y="2.5" width="19" height="19" rx="5.5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.4" cy="6.6" r="1.1" fill="currentColor" stroke="none" />
    </svg>
  )
}

export function GoogleIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...props}>
      <path d="M21.6 12.2c0-.7-.06-1.4-.18-2H12v3.87h5.37a4.6 4.6 0 0 1-2 3v2.5h3.23c1.89-1.74 3-4.31 3-7.4z" />
      <path d="M12 22c2.7 0 4.95-.9 6.6-2.43l-3.23-2.5c-.9.6-2.05.95-3.37.95-2.58 0-4.77-1.74-5.55-4.09H3.14v2.58A10 10 0 0 0 12 22z" />
      <path d="M6.45 13.93a5.99 5.99 0 0 1 0-3.87V7.5H3.14a9.98 9.98 0 0 0 0 9l3.31-2.57z" />
      <path d="M12 6.15c1.46 0 2.77.5 3.81 1.5l2.9-2.9A9.98 9.98 0 0 0 12 3a10 10 0 0 0-8.86 5.5l3.31 2.58c.78-2.36 2.97-4.1 5.55-4.1z" />
    </svg>
  )
}

export function YelpIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...props}>
      <path d="M10 14.7c-.2 1.2-.5 2.4-.7 3.6l-1.3.6c-.9 1.1-2.3 1.5-3.5.4-.9-.8-1.4-1.9-1.3-3.1.1-1.6.8-3 2.1-4l3.2.6c.5.1.8.6.8 1.2.2.2.3.7.7 7z" fillRule="evenodd" />
      <path d="M12.8 7.1c1.6-1.1 3.2-2 5-3.1.4 0 .9-.1 1.3.1 1 .3 1.9.9 2.5 3.2.2.8 0 1.5-.4 2.1l-.8 1.6c-.4.1-.8.2-1.2.3-1-.4-1.9-.6-2.8-.9-1-.3-1.7-1.2-1.9-2.2-.2-1.8-.4-2.6-.8.2z" fillRule="evenodd" />
      <path d="M5.3 14.2c-1.6-.2-3.8-1-5-2.3.2-.9.8-1.5 1.5-2 .8-.5 1.8-.8 2.7-1l1.4.2c.5.6.7 1.3.5 2-.6 1.3-1.1 2.3-1.1 3.1z" fillRule="evenodd" />
      <path d="M12.2 9.7c1.6-.4 3.1-.9 4.6-1.2.9 0 1.7.6 1.9 1.5.3.8 0 1.6-.9 2.2l-.7 2-.1.4c-1.2-.6-1.3-1.4-1.5-2.7-.2-1.3-.8-1.8-3.3-2.2z" fillRule="evenodd" />
    </svg>
  )
}