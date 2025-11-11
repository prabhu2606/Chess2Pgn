'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import Button from '@/components/ui/Button'

export default function Contact() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    message: '',
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    // Handle form submission
    console.log('Form submitted:', formData)
  }

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    })
  }

  return (
    <section
      id="cta"
      className="py-20 bg-gradient-to-br from-accent4/24 to-white"
    >
      <div className="container flex justify-center items-center min-h-[60vh]">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-50px' }}
          transition={{ duration: 0.6 }}
          className="bg-white rounded-[20px] p-12 max-w-[600px] w-full shadow-[0_20px_60px_rgba(88,88,88,0.15)] border border-accent2/30"
        >
          <h2 className="text-3xl font-bold text-contrast mb-3">Contact Us</h2>
          <p className="text-contrast/85 mb-8 text-sm leading-relaxed">
            You can reach us anytime via{' '}
            <a
              href="mailto:support@chess2pgn.com"
              className="text-primary underline font-medium hover:text-[#6a9a3f] transition-colors"
            >
              support@chess2pgn.com
            </a>
          </p>
          <form onSubmit={handleSubmit} className="grid gap-5">
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="Your name"
              required
              className="w-full px-4 py-3.5 border border-accent2/50 rounded-lg font-sans text-[0.95rem] bg-white text-contrast transition-all duration-300 focus:outline-none focus:border-primary focus:shadow-[0_0_0_3px_rgba(129,182,76,0.1)] focus:-translate-y-0.5"
            />
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="Email address"
              required
              className="w-full px-4 py-3.5 border border-accent2/50 rounded-lg font-sans text-[0.95rem] bg-white text-contrast transition-all duration-300 focus:outline-none focus:border-primary focus:shadow-[0_0_0_3px_rgba(129,182,76,0.1)] focus:-translate-y-0.5"
            />
            <textarea
              id="message"
              name="message"
              value={formData.message}
              onChange={handleChange}
              placeholder="Message (issues, suggestions, questions, or, just saying Hi)"
              rows={6}
              required
              className="w-full px-4 py-3.5 border border-accent2/50 rounded-lg font-sans text-[0.95rem] bg-white text-contrast resize-y min-h-[120px] transition-all duration-300 focus:outline-none focus:border-primary focus:shadow-[0_0_0_3px_rgba(129,182,76,0.1)] focus:-translate-y-0.5"
            />
            <Button type="submit" className="mt-2 w-full">
              Send a message
            </Button>
          </form>
        </motion.div>
      </div>
    </section>
  )
}

