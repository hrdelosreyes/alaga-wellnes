import type { Service } from '@/types'

export const SERVICES: Service[] = [
  {
    id: 'relax-60',
    name: 'Alaga Relax',
    duration: 60,
    price: 629,
    therapistPayout: 385,
    description: 'Full-body relaxation massage. Perfect for unwinding after a long week.',
    tag: 'Most Popular',
  },
  {
    id: 'hilot-75',
    name: 'Alaga Hilot',
    duration: 75,
    price: 699,
    therapistPayout: 434,
    description: 'Traditional Filipino healing massage using coconut oil and time-honored Hilot techniques.',
    tag: 'Filipino Heritage',
  },
  {
    id: 'recovery-90',
    name: 'Alaga Recovery',
    duration: 90,
    price: 909,
    therapistPayout: 525,
    description: 'Deep tissue massage targeting back, shoulders, and neck tension.',
  },
]

export const TIME_SLOTS = [
  '09:00', '09:30',
  '10:00', '10:30',
  '11:00', '11:30',
  '12:00', '12:30',
  '13:00', '13:30',
  '14:00', '14:30',
  '15:00', '15:30',
  '16:00', '16:30',
  '17:00', '17:30',
  '18:00', '18:30',
  '19:00', '19:30',
  '20:00', '20:30',
  '21:00', '21:30',
  '22:00',
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
