import { BookingProvider } from '@/lib/booking-context'

export default function BookLayout({ children }: { children: React.ReactNode }) {
  return (
    <BookingProvider>
      <div className="min-h-screen bg-[#FBF6F0]">
        {children}
      </div>
    </BookingProvider>
  )
}
