'use client'

import { ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface IconProps {
  children: ReactNode
  variant?: 'primary'
  className?: string
}

export default function Icon({
  children,
  variant = 'primary',
  className,
}: IconProps) {
  return (
    <div
      className={cn(
        'w-[52px] h-[52px] rounded-2xl grid place-items-center text-2xl transition-all duration-300',
        variant === 'primary' && 'bg-primary/18 text-primary',
        'group-hover:scale-110 group-hover:rotate-[5deg]',
        className
      )}
    >
      {children}
    </div>
  )
}

