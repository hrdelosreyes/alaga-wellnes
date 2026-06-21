import type { Service } from '@/types'

export const SERVICES: Service[] = [
  {
    id: 'relax-60',
    name: 'Alaga Relax',
    duration: 60,
    price: 899,
    therapistPayout: 550,
    description: 'Full-body relaxation massage. Perfect for unwinding after a long week.',
    tag: 'Most Popular',
  },
  {
    id: 'hilot-75',
    name: 'Alaga Hilot',
    duration: 75,
    price: 999,
    therapistPayout: 620,
    description: 'Traditional Filipino healing massage using coconut oil and time-honored Hilot techniques.',
    tag: 'Filipino Heritage',
  },
  {
    id: 'recovery-90',
    name: 'Alaga Recovery',
    duration: 90,
    price: 1299,
    therapistPayout: 750,
    description: 'Deep tissue massage targeting back, shoulders, and neck tension.',
  },
]

export const TIME_SLOTS = [
  '09:00', '10:00', '11:00', '13:00',
  '14:00', '15:00', '16:00', '17:00',
  '18:00', '19:00', '20:00',
]

export const TRANSPORT_FEE = 100 // ₱

export const LAUNCH_ZONES = ['BGC', 'Makati', 'Taguig', 'Bonifacio Global City']

export const BOOKING_STATUSES = {
  pending_payment: 'Pending Payment',
  confirmed: 'Confirmed',
  assigned: 'Therapist Assigned',
  en_route: 'On the Way',
  checked_in: 'Session In Progress',
  completed: 'Completed',
  cancelled: 'Cancelled',
} as const

export const RATING_TAGS = [
  'Punctual',
  'Skilled',
  'Professional',
  'Relaxing',
  'Thorough',
  'Gentle',
  'Would Rebook',
]

export const SLOT_HOLD_MINUTES = 10
