'use client'

import { motion } from 'framer-motion'
import Card from '@/components/ui/Card'
import Icon from '@/components/ui/Icon'
import Pill from '@/components/ui/Pill'

const features = [
  {
    icon: '⚡',
    title: 'Instant AI Conversion',
    description:
      'Upload a photo or PDF and let our AI detect moves, clocks, and annotations automatically.',
  },
  {
    icon: '🛡️',
    title: 'Smart Error Repair',
    description:
      'Fixes ambiguous handwriting and illegal moves with live validation to keep your PGNs tournament-ready.',
  },
  {
    icon: '🌐',
    title: 'Export Anywhere',
    description:
      'One-click export to Lichess, Chess.com, and study tools. Share via link, email, or download.',
  },
  {
    icon: '🗂️',
    title: 'Multi-Page Support',
    description:
      'Stitch long score sheets into a single, editable game without losing context or comments.',
  },
]

export default function Features() {
  return (
    <section id="features" className="py-20 bg-accent1">
      <div className="container">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-50px' }}
          transition={{ duration: 0.6 }}
          className="text-center max-w-[680px] mx-auto mb-12"
        >
          <Pill variant="ghost" className="mb-4">
            Why Chess2Pgn
          </Pill>
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            From Paper To PGN Without Re-Typing
          </h2>
          <p className="text-contrast/90 mt-4">
            Built for tournament players, coaches, and clubs who need clean PGNs
            right away—no manual data entry, no mistakes.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-7">
          {features.map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
            >
              <Card className="group">
                <Icon>{feature.icon}</Icon>
                <h3 className="text-xl font-semibold text-contrast">
                  {feature.title}
                </h3>
                <p className="text-contrast/80">{feature.description}</p>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}

