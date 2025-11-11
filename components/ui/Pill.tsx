import { ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface PillProps {
  children: ReactNode
  variant?: 'default' | 'ghost' | 'accent'
  className?: string
}

export default function Pill({
  children,
  variant = 'default',
  className,
}: PillProps) {
  const variants = {
    default: 'bg-accent2 text-contrast',
    ghost: 'bg-accent1 text-contrast',
    accent: 'bg-accent4 text-white',
  }

  return (
    <span
      className={cn(
        'inline-flex items-center gap-2 px-[0.9rem] py-[0.4rem] rounded-full text-xs font-semibold uppercase tracking-wider',
        'before:content-["•"] before:text-primary',
        variants[variant],
        className
      )}
    >
      {children}
    </span>
  )
}

