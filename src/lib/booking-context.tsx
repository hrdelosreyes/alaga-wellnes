'use client'

import { createContext, useContext, useState, useCallback, type ReactNode } from 'react'
import type { BookingDraft } from '@/types'

const EMPTY: BookingDraft = {
  serviceId:        null,
  date:             null,
  timeSlot:         null,
  cityId:           null,
  cityName:         null,
  barangayPsgc:     null,
  resolvedPrice:    null,
  address:          null,
  lat:              null,
  lng:              null,
  unitNotes:        null,
  therapistId:      null,
  selectionMode:    'best_available',
  genderPreference: 'any',
  customerId:       null,
  customerName:     null,
  customerPhone:    null,
  customerEmail:    null,
  customerNotes:    null,
  hasTable:         false,
  promoCode:        null,
}

interface BookingContextValue {
  draft: BookingDraft
  update: (patch: Partial<BookingDraft>) => void
  reset: () => void
}

const BookingContext = createContext<BookingContextValue | null>(null)

export function BookingProvider({ children }: { children: ReactNode }) {
  const [draft, setDraft] = useState<BookingDraft>(EMPTY)

  const update = useCallback((patch: Partial<BookingDraft>) => {
    setDraft(prev => ({ ...prev, ...patch }))
  }, [])

  const reset = useCallback(() => setDraft(EMPTY), [])

  return (
    <BookingContext.Provider value={{ draft, update, reset }}>
      {children}
    </BookingContext.Provider>
  )
}

export function useBooking() {
  const ctx = useContext(BookingContext)
  if (!ctx) throw new Error('useBooking must be used inside BookingProvider')
  return ctx
}
