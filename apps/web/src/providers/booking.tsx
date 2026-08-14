import { createContext, useContext, useState, type ReactNode } from 'react'

interface BookingContextValue {
  open: boolean
  service: string
  openBooking: (service?: string) => void
  closeBooking: () => void
}

const BookingContext = createContext<BookingContextValue | null>(null)

export function BookingProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false)
  const [service, setService] = useState('')

  const openBooking = (next?: string) => {
    setService(next ?? '')
    setOpen(true)
  }

  const closeBooking = () => setOpen(false)

  return (
    <BookingContext.Provider value={{ open, service, openBooking, closeBooking }}>
      {children}
    </BookingContext.Provider>
  )
}

// oxlint-disable-next-line react/only-export-components
export function useBooking() {
  const ctx = useContext(BookingContext)
  if (!ctx) throw new Error('useBooking must be used within BookingProvider')
  return ctx
}
