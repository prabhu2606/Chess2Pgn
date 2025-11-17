'use client'

import { motion } from 'framer-motion'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Pill from '@/components/ui/Pill'

const plans = [
  {
    name: 'Free',
    price: '$0',
    description: 'Perfect for casual play and rapid tests.',
    features: [
      '3 conversions per month',
      'Live PGN editor',
      'Download PGN & share link',
    ],
    cta: 'Get Started',
    ctaHref: '/convert',
    emphasis: true,
  },
  {
    name: 'Pro',
    price: '$9',
    pricePeriod: '/mo',
    description: 'Ideal for active tournament players.',
    features: [
      'Unlimited conversions',
      'Cloud sheet storage',
      'Smart repair suggestions',
      'Export to Lichess & Chess.com',
    ],
    cta: 'Upgrade',
    ctaHref: '#cta',
    variant: 'secondary' as const,
  },
  {
    name: 'Club',
    price: '$29',
    pricePeriod: '/mo',
    description: 'For schools, coaches, and event organizers.',
    features: [
      'Team workspace',
      'Batch processing',
      'Priority support',
      'Dedicated onboarding',
    ],
    cta: 'Talk To Us',
    ctaHref: '#cta',
    variant: 'secondary' as const,
  },
]

export default function Pricing() {
  return (
    <section
      id="pricing"
      className="py-20 bg-gradient-to-br from-primary/18 to-white"
    >
      <div className="container">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-50px' }}
          transition={{ duration: 0.6 }}
          className="text-center max-w-[680px] mx-auto mb-12"
        >
          <Pill variant="ghost" className="mb-4">
            Simple Pricing
          </Pill>
          <h2 className="text-3xl md:text-4xl font-bold">
            Flexible Plans For Players, Coaches, and Clubs
          </h2>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {plans.map((plan, index) => (
            <motion.div
              key={plan.name}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
            >
              <Card emphasis={plan.emphasis}>
                <h3 className="text-2xl font-bold text-contrast">
                  {plan.name}
                </h3>
                <p className="text-[2.5rem] text-primary font-bold my-1">
                  {plan.price}
                  {plan.pricePeriod && (
                    <span className="text-base text-contrast/70">
                      {plan.pricePeriod}
                    </span>
                  )}
                </p>
                <p className="text-contrast/80 mb-4">{plan.description}</p>
                <ul className="list-none p-0 m-4 mb-6 grid gap-3">
                  {plan.features.map((feature) => (
                    <li
                      key={feature}
                      className="flex items-center gap-2.5 before:content-['✓'] before:text-primary before:font-bold"
                    >
                      {feature}
                    </li>
                  ))}
                </ul>
                <Button
                  href={plan.ctaHref}
                  variant={plan.variant || 'primary'}
                  className="w-full"
                >
                  {plan.cta}
                </Button>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}

