'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { smoothScrollTo } from '@/lib/utils'

export default function Footer() {
  const pathname = usePathname()

  const handleNavClick = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    if (href.startsWith('#')) {
      e.preventDefault()
      if (pathname !== '/') {
        window.location.href = `/${href}`
      } else {
        smoothScrollTo(href.substring(1))
      }
    }
  }

  const getNavLabel = (href: string) => {
    if (href === '#cta') return 'Contact'
    return href.substring(1).charAt(0).toUpperCase() + href.substring(2)
  }

  return (
    <footer className="bg-white border-t border-accent2/60 py-10">
      <div className="container grid gap-6 text-center">
        <div>
          <div className="text-xl font-bold text-primary tracking-wider mb-2">
            Chess2Pgn
          </div>
          <p className="text-sm text-contrast/70">
            AI-powered score sheet to PGN conversion.
          </p>
        </div>
        <div className="flex justify-center gap-6 flex-wrap">
          {['#demo', '#features', '#workflow', '#pricing', '#cta'].map((href) => (
            <Link
              key={href}
              href={href}
              onClick={(e) => handleNavClick(e, href)}
              className="font-medium text-contrast/90 hover:text-primary transition-colors"
            >
              {getNavLabel(href)}
            </Link>
          ))}
        </div>
        <p className="text-xs text-contrast/70">
          © 2025 Chess2Pgn. All rights reserved.
        </p>
      </div>
    </footer>
  )
}

