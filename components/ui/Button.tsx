'use client'

import Link from 'next/link'
import { ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface ButtonProps {
  children: ReactNode
  href?: string
  variant?: 'primary' | 'ghost' | 'secondary'
  className?: string
  onClick?: () => void
  type?: 'button' | 'submit'
}

export default function Button({
  children,
  href,
  variant = 'primary',
  className,
  onClick,
  type = 'button',
}: ButtonProps) {
  const baseStyles =
    'inline-flex items-center justify-center px-6 py-3 rounded-full font-semibold text-[0.95rem] transition-all duration-300 cursor-pointer relative overflow-hidden group'

  const variants = {
    primary:
      'bg-primary text-white hover:-translate-y-[3px] hover:scale-[1.02] hover:shadow-[0_12px_24px_rgba(129,182,76,0.35)] active:translate-y-[-1px] active:scale-[0.98]',
    ghost:
      'bg-transparent text-primary border border-primary/40 hover:bg-primary/8',
    secondary:
      'bg-accent4 text-white shadow-[0_6px_14px_rgba(106,207,199,0.35)] hover:bg-[#5fbeb7] hover:shadow-[0_10px_20px_rgba(95,190,183,0.35)]',
  }

  const buttonContent = (
    <>
      <span className="absolute inset-0 rounded-full bg-white/20 scale-0 group-hover:scale-100 transition-transform duration-600 origin-center" />
      <span className="relative z-10">{children}</span>
    </>
  )

  if (href) {
    return (
      <Link
        href={href}
        className={cn(baseStyles, variants[variant], className)}
      >
        {buttonContent}
      </Link>
    )
  }

  return (
    <button
      type={type}
      onClick={onClick}
      className={cn(baseStyles, variants[variant], className)}
    >
      {buttonContent}
    </button>
  )
}

