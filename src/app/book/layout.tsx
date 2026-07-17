import { BookingProvider } from '@/lib/booking-context'
import { BookGate } from '@/components/book/book-gate'

export default function BookLayout({ children }: { children: React.ReactNode }) {
  return (
    <BookingProvider>
      <BookGate>
        <div className="min-h-screen bg-[#FBF6F0]">
          {children}
        </div>
      </BookGate>
    </BookingProvider>
  )
}
