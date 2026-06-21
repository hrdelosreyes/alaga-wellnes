import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatPrice(amount: number): string {
  return `₱${amount.toLocaleString('en-PH')}`
}

export function formatDate(dateStr: string): string {
  const date = new Date(dateStr + 'T00:00:00')
  return date.toLocaleDateString('en-PH', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

export function formatTime(timeStr: string): string {
  const [h, m] = timeStr.split(':').map(Number)
  const period = h >= 12 ? 'PM' : 'AM'
  const hour = h % 12 || 12
  return `${hour}:${m.toString().padStart(2, '0')} ${period}`
}

export function generateBookingRef(): string {
  return 'AW-' + Math.random().toString(36).substring(2, 8).toUpperCase()
}

export function isSlotExpired(heldUntil: string | null): boolean {
  if (!heldUntil) return false
  return new Date(heldUntil) < new Date()
}
