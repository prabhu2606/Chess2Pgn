'use client'

import { ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface CardProps {
  children: ReactNode
  className?: string
  emphasis?: boolean
  hover?: boolean
}

export default function Card({
  children,
  className,
  emphasis = false,
  hover = true,
}: CardProps) {
  return (
    <article
      className={cn(
        'rounded-[18px] p-8 grid gap-3 border transition-all duration-400',
        emphasis
          ? 'bg-white border-primary/55 shadow-[0_22px_45px_rgba(129,182,76,0.18)]'
          : 'bg-accent3 border-accent2/60 shadow-[0_16px_35px_rgba(88,88,88,0.08)]',
        hover &&
          'hover:-translate-y-2 hover:scale-[1.02] hover:shadow-[0_24px_48px_rgba(88,88,88,0.15)] hover:border-primary/80',
        className
      )}
    >
      {children}
    </article>
  )
}

