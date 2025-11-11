'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { smoothScrollTo } from '@/lib/utils'
import Button from '@/components/ui/Button'

export default function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isScrolled, setIsScrolled] = useState(false)
  const pathname = usePathname()

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50)
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const handleNavClick = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    if (href.startsWith('#')) {
      e.preventDefault()
      // If we're not on the home page, navigate to home first
      if (pathname !== '/') {
        window.location.href = `/${href}`
      } else {
        smoothScrollTo(href.substring(1))
      }
      setIsMenuOpen(false)
    }
  }

  const handleLogoClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault()
    if (pathname !== '/') {
      window.location.href = '/#demo'
    } else {
      smoothScrollTo('demo')
    }
  }

  const getNavLabel = (href: string) => {
    if (href === '#cta') return 'Contact'
    return href.substring(1).charAt(0).toUpperCase() + href.substring(2)
  }

  return (
    <header
      className={`sticky top-0 z-20 bg-white/96 backdrop-blur-md border-b border-accent2/60 transition-all duration-300 ${
        isScrolled ? 'shadow-[0_4px_20px_rgba(88,88,88,0.08)] bg-white/98' : ''
      }`}
    >
      <div className="container flex items-center justify-between py-4 gap-4 relative">
        <Link
          href="/#demo"
          onClick={handleLogoClick}
          className="text-xl font-bold text-primary tracking-wider transition-all duration-300 hover:scale-105 hover:text-[#6a9a3f] active:scale-95"
        >
          Chess2Pgn
        </Link>

        <nav className="hidden md:flex items-center gap-6">
          {['#demo', '#features', '#workflow', '#pricing', '#cta'].map((href) => (
            <Link
              key={href}
              href={href}
              onClick={(e) => handleNavClick(e, href)}
              className="font-medium relative inline-block transition-all duration-300 hover:text-primary hover:-translate-y-[1px] after:content-[''] after:absolute after:bottom-[-4px] after:left-0 after:w-0 after:h-0.5 after:bg-primary after:transition-all duration-300 hover:after:w-full"
            >
              {getNavLabel(href)}
            </Link>
          ))}
        </nav>

        <div className="hidden md:flex items-center gap-6">
          <Button href="#signin" variant="ghost">
            Sign In
          </Button>
          <Button href="#signup">Sign Up</Button>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="md:hidden absolute top-full left-0 right-0 bg-white border-b border-accent2/60 shadow-lg">
            <nav className="container flex flex-col py-4 gap-4">
              {['#demo', '#features', '#workflow', '#pricing', '#cta'].map((href) => (
                <Link
                  key={href}
                  href={href}
                  onClick={(e) => handleNavClick(e, href)}
                  className="font-medium text-contrast hover:text-primary transition-colors"
                >
                  {getNavLabel(href)}
                </Link>
              ))}
              <div className="flex gap-4 pt-2">
                <Button href="#signin" variant="ghost" className="flex-1">
                  Sign In
                </Button>
                <Button href="#signup" className="flex-1">Sign Up</Button>
              </div>
            </nav>
          </div>
        )}

        <button
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          className="md:hidden flex flex-col gap-1.5 bg-transparent border-none cursor-pointer"
          aria-label="Toggle navigation"
        >
          <span
            className={`w-6 h-0.5 bg-contrast transition-all duration-200 ${
              isMenuOpen ? 'translate-y-1.5 rotate-45' : ''
            }`}
          />
          <span
            className={`w-6 h-0.5 bg-contrast transition-all duration-200 ${
              isMenuOpen ? 'opacity-0' : ''
            }`}
          />
          <span
            className={`w-6 h-0.5 bg-contrast transition-all duration-200 ${
              isMenuOpen ? '-translate-y-1.5 -rotate-45' : ''
            }`}
          />
        </button>
      </div>
    </header>
  )
}
