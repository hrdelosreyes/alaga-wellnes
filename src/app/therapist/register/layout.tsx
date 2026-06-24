import type { Metadata } from 'next'

const TITLE = 'Join Alaga Wellness as a Therapist'
const DESCRIPTION = 'Set your own rates and get home-service wellness bookings near you. Apply to become a verified Alaga therapist — NBI & TESDA verified.'
const URL = 'https://alagawellness.care/therapist/register'
const IMAGE = 'https://alagawellness.care/therapist-hero.png'

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: URL,
    siteName: 'Alaga Wellness',
    type: 'website',
    locale: 'en_PH',
    images: [{ url: IMAGE, width: 1672, height: 941, alt: 'Become an Alaga Wellness therapist' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: TITLE,
    description: DESCRIPTION,
    images: [IMAGE],
  },
}

export default function RegisterLayout({ children }: { children: React.ReactNode }) {
  return children
}
