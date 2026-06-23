export type ServiceId = 'relax-60' | 'recovery-90' | 'hilot-75'

export interface Service {
  id: ServiceId
  name: string
  duration: number // minutes
  price: number
  therapistPayout: number
  description: string
  tag?: string
}

export type TherapistGender = 'male' | 'female'
export type GenderPreference = 'any' | 'male' | 'female'
export type TherapistSelectionMode = 'best_available' | 'customer_pick' | 'favorite'

export type BookingStatus =
  | 'pending_payment'
  | 'confirmed'
  | 'assigned'
  | 'en_route'
  | 'checked_in'
  | 'completed'
  | 'cancelled'

export interface Therapist {
  id: string
  name: string
  photo_url: string | null
  gender: TherapistGender
  zone: string
  rating_avg: number
  total_bookings: number
  is_active: boolean
  nbi_cleared: boolean
  tesda_certified: boolean
  specialties: string[]
  bio: string | null
  created_at: string
}

export interface Customer {
  id: string
  name: string
  phone: string
  email: string
  favorite_therapist_id: string | null
  created_at: string
}

export interface Booking {
  id: string
  customer_id: string
  service_id: ServiceId
  therapist_id: string | null
  booking_date: string // YYYY-MM-DD
  time_slot: string   // HH:MM
  address: string
  lat: number | null
  lng: number | null
  unit_notes: string | null
  therapist_gender_pref: GenderPreference
  customer_notes: string | null
  has_table: boolean
  transport_fee: number
  subtotal: number
  discount: number
  total: number
  status: BookingStatus
  therapist_selection_mode: TherapistSelectionMode
  slot_held_until: string | null
  payment_status: 'pending' | 'paid' | 'refunded'
  hitpay_payment_id: string | null
  checked_in_at: string | null
  checked_out_at: string | null
  created_at: string
  // joined
  therapist?: Therapist
  customer?: Customer
}

export interface Rating {
  id: string
  booking_id: string
  customer_id: string
  therapist_id: string
  stars: number
  tags: string[]
  review_text: string | null
  tip_amount: number
  created_at: string
}

export interface TimeSlot {
  time: string  // HH:MM
  available: boolean
}

// Booking flow state (held in-memory / sessionStorage during booking)
export interface BookingDraft {
  serviceId: ServiceId | null
  date: string | null         // YYYY-MM-DD
  timeSlot: string | null     // HH:MM
  cityId: string | null
  cityName: string | null
  barangayPsgc: string | null
  address: string | null
  resolvedPrice: number | null  // actual service price once city + therapist are known
  lat: number | null
  lng: number | null
  unitNotes: string | null
  therapistId: string | null  // null = best available
  selectionMode: TherapistSelectionMode
  genderPreference: GenderPreference
  customerId: string | null
  customerName: string | null
  customerPhone: string | null
  customerEmail: string | null
  customerNotes: string | null
  hasTable: boolean
  promoCode: string | null
}
