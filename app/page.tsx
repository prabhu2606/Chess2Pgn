'use client'

import { useEffect } from 'react'
import Header from '@/components/layout/Header'
import Footer from '@/components/layout/Footer'
import Hero from '@/components/sections/Hero'
import Features from '@/components/sections/Features'
import Workflow from '@/components/sections/Workflow'
import Pricing from '@/components/sections/Pricing'
import Testimonials from '@/components/sections/Testimonials'
import FAQ from '@/components/sections/FAQ'
import Contact from '@/components/sections/Contact'
import { smoothScrollTo } from '@/lib/utils'

export default function Home() {
  useEffect(() => {
    // Handle hash navigation when page loads with a hash
    const hash = window.location.hash
    if (hash) {
      // Small delay to ensure page is rendered
      setTimeout(() => {
        smoothScrollTo(hash.substring(1))
      }, 100)
    }
  }, [])

  return (
    <>
      <Header />
      <main>
        <Hero />
        <Features />
        <Workflow />
        <Pricing />
        <Testimonials />
        <FAQ />
        <Contact />
      </main>
      <Footer />
    </>
  )
}

