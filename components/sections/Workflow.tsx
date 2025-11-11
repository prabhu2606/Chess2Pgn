'use client'

import { motion } from 'framer-motion'
import Button from '@/components/ui/Button'
import Pill from '@/components/ui/Pill'

const steps = [
  {
    number: '01',
    title: 'Upload or Snap',
    description:
      'Drag in a score sheet photo, scan, or use the mobile capture companion for crisp input.',
  },
  {
    number: '02',
    title: 'Review Suggestions',
    description:
      'The AI highlights uncertain moves with recommended fixes. Accept, edit, or annotate instantly.',
  },
  {
    number: '03',
    title: 'Export Clean PGN',
    description:
      'Finalize your game, download as PGN, or send directly to your training platforms.',
  },
]

export default function Workflow() {
  return (
    <section id="workflow" className="py-20">
      <div className="container">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-50px' }}
            transition={{ duration: 0.6 }}
          >
            <Pill variant="accent" className="mb-4">
              Three-Step Workflow
            </Pill>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Just Capture, Confirm, and Export
            </h2>
            <p className="text-contrast/90 mb-10">
              Chess2Pgn guides you from first snapshot to polished PGN with clear
              review checkpoints and inline fixes.
            </p>
            <ul className="list-none p-0 m-0 grid gap-6 mt-10">
              {steps.map((step, index) => (
                <motion.li
                  key={step.number}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6, delay: index * 0.1 }}
                  className="grid grid-cols-[auto_1fr] gap-5 items-start group"
                >
                  <span className="w-[46px] h-[46px] rounded-[14px] bg-accent2 text-primary font-bold grid place-items-center transition-all duration-300 group-hover:scale-110 group-hover:rotate-[5deg] group-hover:bg-primary group-hover:text-white">
                    {step.number}
                  </span>
                  <div>
                    <h3 className="text-xl font-semibold text-contrast mb-2">
                      {step.title}
                    </h3>
                    <p className="text-contrast/80">{step.description}</p>
                  </div>
                </motion.li>
              ))}
            </ul>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-50px' }}
            transition={{ duration: 0.6 }}
            className="bg-accent3 rounded-[22px] p-8 border border-accent4/35 shadow-[0_28px_44px_rgba(88,88,88,0.12)] grid gap-5 hover:-translate-y-1.5 hover:shadow-[0_32px_52px_rgba(88,88,88,0.18)] transition-all duration-400"
          >
            <h4 className="text-xl font-semibold text-contrast">
              Validation Preview
            </h4>
            <div className="bg-white rounded-2xl border border-dashed border-primary/50 p-5 grid gap-3.5">
              <div className="flex items-center justify-between font-mono text-sm">
                <span className="text-contrast/60">15.</span>
                <span>Qh5+</span>
                <span className="text-primary">✔</span>
              </div>
              <div className="flex items-center justify-between font-mono text-sm">
                <span className="text-contrast/60">16.</span>
                <span>g6</span>
                <span className="text-primary">✔</span>
              </div>
              <div className="flex items-center justify-between font-mono text-sm bg-primary/12 rounded-xl px-2.5 py-1.5">
                <span className="text-contrast/60">17.</span>
                <span>Qxe5??</span>
                <span>⚠</span>
              </div>
              <div className="bg-accent4/18 p-4 rounded-xl text-sm">
                <strong>AI Suggestion:</strong> Did you mean{' '}
                <span className="font-semibold">Qxe5+</span>? Update or keep as
                is.
              </div>
            </div>
            <Button variant="secondary">Resolve & Continue</Button>
          </motion.div>
        </div>
      </div>
    </section>
  )
}

