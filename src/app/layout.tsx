import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import './globals.css'
import { Navbar } from '@/components/layout/navbar'
import { Footer } from '@/components/layout/footer'
import { GeoCityProvider } from '@/components/geo/city-context'

const geistSans = Geist({ variable: '--font-geist-sans', subsets: ['latin'] })
const geistMono = Geist_Mono({ variable: '--font-geist-mono', subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Alaga Wellness — Wellness, delivered with care.',
  description:
    'Book verified wellness professionals for premium massage and home spa rituals. Safe, convenient, and designed for Filipino families in BGC and Makati.',
  keywords: 'home massage BGC, home massage Makati, wellness at home Philippines, hilot at home, mobile massage Metro Manila',
  icons: {
    icon: [
      { url: '/favicon.png', type: 'image/png' },
    ],
    apple: '/favicon.png',
  },
  openGraph: {
    title: 'Alaga Wellness',
    description: 'Wellness, delivered with care.',
    siteName: 'Alaga Wellness',
    locale: 'en_PH',
    type: 'website',
    images: [{ url: '/logo.png', width: 2000, height: 2000, alt: 'Alaga Wellness' }],
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable}`}>
      <body className="antialiased min-h-screen flex flex-col">
        <GeoCityProvider>
          <Navbar />
          <main className="flex-1">{children}</main>
          <Footer />
        </GeoCityProvider>
      </body>
    </html>
  )
}
