'use client'

import { useEffect, useRef } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import Button from '@/components/ui/Button'

export default function Hero() {
  const visualRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleScroll = () => {
      const currentScroll = window.pageYOffset
      if (visualRef.current && currentScroll < window.innerHeight * 1.5) {
        const parallax = currentScroll * 0.15
        visualRef.current.style.transform = `translateY(${parallax}px)`
      }
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  return (
    <section
      id="demo"
      className="py-20 pb-18 bg-gradient-to-br from-primary/12 to-transparent"
    >
      <div className="container">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-16 items-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2, ease: [0.4, 0, 0.2, 1] }}
            className="hero__text"
          >
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.3, ease: [0.4, 0, 0.2, 1] }}
              className="text-[clamp(2.5rem,4vw,3.5rem)] font-bold mb-4 mt-6"
            >
              Scoresheets to PGNs
              <br />
              In Seconds.
            </motion.h1>
            <p className="text-lg max-w-[520px] mb-8">
              Upload photos of your handwritten chess score sheets and instantly
              convert them into clean, editable PGN files.
            </p>
            <div className="flex gap-4 flex-wrap mb-10">
              <Button href="/convert">Get Started</Button>
            </div>
            <div className="flex gap-8 flex-wrap">
              <div>
                <h3 className="text-primary text-[1.8rem] font-bold mb-1">
                  30K+
                </h3>
                <p className="text-sm text-contrast/80">Games digitized</p>
              </div>
              <div>
                <h3 className="text-primary text-[1.8rem] font-bold mb-1">
                  99.4%
                </h3>
                <p className="text-sm text-contrast/80">
                  Move recognition accuracy
                </p>
              </div>
              <div>
                <h3 className="text-primary text-[1.8rem] font-bold mb-1">
                  45s
                </h3>
                <p className="text-sm text-contrast/80">
                  Average conversion time
                </p>
              </div>
            </div>
          </motion.div>

          <motion.div
            ref={visualRef}
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.4, ease: [0.4, 0, 0.2, 1] }}
            className="flex justify-center will-change-transform"
          >
            <div className="w-full max-w-[440px] bg-white rounded-[26px] shadow-[0_30px_55px_rgba(88,88,88,0.14)] overflow-hidden border border-accent2/70">
              <div className="flex gap-2.5 px-6 py-4 bg-accent2">
                <span className="w-3 h-3 rounded-full bg-contrast/35" />
                <span className="w-3 h-3 rounded-full bg-contrast/35" />
                <span className="w-3 h-3 rounded-full bg-contrast/35" />
              </div>
              <div className="p-7 grid gap-5 bg-gradient-to-br from-accent1 to-white">
                <div className="bg-accent3 rounded-[18px] p-5 border border-primary/25">
                  <div className="flex justify-between items-center mb-4">
                    <div>
                      <h4 className="font-semibold text-contrast">Score Sheet</h4>
                      <p className="text-sm text-contrast/70">White vs Black</p>
                    </div>
                    <span className="px-3 py-1.5 rounded-full bg-primary/18 text-primary font-semibold text-xs">
                      AI Scan
                    </span>
                  </div>
                  <div className="h-[180px] rounded-xl bg-gradient-to-r from-accent4/40 to-accent3/80 relative overflow-hidden">
                    <div
                      className="absolute inset-0"
                      style={{
                        backgroundImage: `repeating-linear-gradient(0deg, rgba(129,182,76,0.15) 0px, rgba(129,182,76,0.15) 16px, rgba(255,255,255,0.4) 16px, rgba(255,255,255,0.4) 32px)`,
                      }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-br from-transparent via-white/85 to-white/85" />
                  </div>
                </div>
                <div className="bg-white rounded-[18px] p-5 border border-accent4/25 grid gap-3.5">
                  <div className="flex justify-between items-center">
                    <h4 className="font-semibold text-contrast">Live PGN Output</h4>
                    <button className="px-3 py-1.5 rounded-full bg-accent4/18 text-accent4 border-none font-semibold text-xs">
                      Editable
                    </button>
                  </div>
                  <div className="grid gap-2 font-mono text-sm text-contrast">
                    {[
                      '1. e4 e5',
                      '2. Nf3 Nc6',
                      '3. Bb5 a6',
                      '4. Ba4 Nf6',
                      '5. O-O Be7',
                      '6. Re1 b5',
                      '7. Bb3 d6',
                      '8. c3 O-O',
                      '9. h3 Nb8',
                      '10. d4 Nbd7',
                    ].map((move, i) => (
                      <span key={i}>{move}</span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}

