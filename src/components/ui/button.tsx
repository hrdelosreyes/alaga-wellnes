import { cn } from '@/lib/utils'
import { forwardRef } from 'react'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'outline' | 'ghost' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', loading, children, disabled, ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={cn(
          'inline-flex items-center justify-center font-semibold rounded-xl transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed',
          {
            // variants
            'bg-[#C4714A] hover:bg-[#A05938] text-white shadow-sm': variant === 'primary',
            'border-2 border-[#C4714A] text-[#C4714A] hover:bg-[#F2D9CC] bg-transparent': variant === 'outline',
            'text-[#8C7B70] hover:text-[#2C2420] hover:bg-[#F2D9CC] bg-transparent': variant === 'ghost',
            'bg-red-500 hover:bg-red-600 text-white': variant === 'danger',
            // sizes
            'px-3 py-1.5 text-sm': size === 'sm',
            'px-5 py-2.5 text-base': size === 'md',
            'px-7 py-3.5 text-lg': size === 'lg',
          },
          className
        )}
        {...props}
      >
        {loading ? (
          <span className="flex items-center gap-2">
            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
            {children}
          </span>
        ) : children}
      </button>
    )
  }
)

Button.displayName = 'Button'
export { Button }
