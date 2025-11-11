'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Pill from '@/components/ui/Pill'

const faqs = [
  {
    question: 'Which score sheet formats are supported?',
    answer:
      'Standard tournament sheets, custom club layouts, and digital PDFs. Upload JPG, PNG, HEIC, or PDF files.',
    defaultOpen: true,
  },
  {
    question: 'Can I edit the PGN after conversion?',
    answer:
      'Absolutely. The built-in editor lets you tweak moves, add comments, and include time annotations before exporting.',
  },
  {
    question: 'Do you store my games?',
    answer:
      'Free accounts keep files locally. Pro and Club members can enable secure cloud storage with granular privacy controls.',
  },
  {
    question: 'Is there a mobile app?',
    answer:
      'A companion capture app is in beta. Join the waitlist inside the dashboard to test it early.',
  },
]

export default function FAQ() {
  const [openIndex, setOpenIndex] = useState(0)

  return (
    <section id="faq" className="py-20 bg-accent1">
      <div className="container">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-50px' }}
          transition={{ duration: 0.6 }}
          className="text-center max-w-[680px] mx-auto mb-12"
        >
          <Pill variant="ghost" className="mb-4">
            FAQ
          </Pill>
          <h2 className="text-3xl md:text-4xl font-bold">
            Answers Before You Upload
          </h2>
        </motion.div>

        <div className="grid gap-6 max-w-[760px] mx-auto">
          {faqs.map((faq, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
              className="bg-white rounded-2xl p-5 pl-6 border border-accent2/60 shadow-[0_14px_30px_rgba(88,88,88,0.08)] hover:-translate-y-0.5 hover:shadow-[0_18px_36px_rgba(88,88,88,0.12)] hover:border-primary/80 transition-all duration-300"
            >
              <button
                onClick={() =>
                  setOpenIndex(openIndex === index ? -1 : index)
                }
                className="w-full flex items-center justify-between gap-4 cursor-pointer font-semibold text-left"
              >
                <span>{faq.question}</span>
                <span
                  className={`inline-flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-xl transition-all duration-300 ${
                    openIndex === index
                      ? 'rotate-45 bg-primary/20'
                      : ''
                  }`}
                >
                  +
                </span>
              </button>
              <AnimatePresence>
                {openIndex === index && (
                  <motion.p
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className="mt-4 text-contrast/85 overflow-hidden"
                  >
                    {faq.answer}
                  </motion.p>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}

