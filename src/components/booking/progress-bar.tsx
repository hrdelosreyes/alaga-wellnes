'use client'

import { cn } from '@/lib/utils'

const STEPS = [
  { label: 'Service',   href: '/book' },
  { label: 'Schedule',  href: '/book/schedule' },
  { label: 'Address',   href: '/book/address' },
  { label: 'Therapist', href: '/book/therapist' },
  { label: 'Details',   href: '/book/preferences' },
  { label: 'Review',    href: '/book/review' },
]

export function ProgressBar({ current }: { current: number }) {
  return (
    <div className="bg-white border-b border-[#EDE5DF] py-4">
      <div className="container-alaga">
        <div className="flex items-center justify-between">
          {STEPS.map((step, i) => {
            const done    = i < current
            const active  = i === current
            const stepNum = i + 1

            return (
              <div key={step.label} className="flex items-center flex-1 last:flex-none">
                {/* Step circle + label */}
                <div className="flex flex-col items-center gap-1">
                  <div className={cn(
                    'w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors',
                    done   && 'bg-[#C4714A] text-white',
                    active && 'bg-[#2C2420] text-white',
                    !done && !active && 'bg-[#EDE5DF] text-[#8C7B70]',
                  )}>
                    {done ? '✓' : stepNum}
                  </div>
                  <span className={cn(
                    'text-[10px] font-medium hidden sm:block',
                    active ? 'text-[#2C2420]' : 'text-[#8C7B70]',
                  )}>
                    {step.label}
                  </span>
                </div>

                {/* Connector line */}
                {i < STEPS.length - 1 && (
                  <div className={cn(
                    'flex-1 h-px mx-2 transition-colors',
                    done ? 'bg-[#C4714A]' : 'bg-[#EDE5DF]',
                  )} />
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
