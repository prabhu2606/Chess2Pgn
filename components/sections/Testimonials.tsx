'use client'

import { motion } from 'framer-motion'
import Image from 'next/image'

const testimonials = [
  {
    quote:
      'Chess2Pgn saves my students hours after weekend tournaments. The AI is scary accurate—even with messy handwriting.',
    author: 'Maria Lopez',
    role: 'National Chess Coach',
    image: 'https://i.pravatar.cc/64?img=12',
  },
  {
    quote:
      'I digitized my entire season in a single afternoon. Exporting to Lichess study is seamless.',
    author: 'Daniel Kim',
    role: 'USCF 2100',
    image: 'https://i.pravatar.cc/64?img=33',
  },
  {
    quote:
      "The validation flow catches every missed symbol. It's like having an arbiter double-check your scores.",
    author: 'Priya Menon',
    role: 'Tournament Director',
    image: 'https://i.pravatar.cc/64?img=47',
  },
]

export default function Testimonials() {
  return (
    <section id="testimonials" className="py-20 bg-accent1">
      <div className="container">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-7">
          {testimonials.map((testimonial, index) => (
            <motion.div
              key={testimonial.author}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
              className="bg-white p-8 rounded-[18px] border border-accent2/60 shadow-[0_20px_40px_rgba(88,88,88,0.1)] grid gap-6 hover:-translate-y-1.5 hover:shadow-[0_28px_50px_rgba(88,88,88,0.15)] transition-all duration-400"
            >
              <p className="text-contrast/90 leading-relaxed">
                &ldquo;{testimonial.quote}&rdquo;
              </p>
              <div className="flex items-center gap-4">
                <Image
                  src={testimonial.image}
                  alt={testimonial.author}
                  width={52}
                  height={52}
                  className="rounded-full"
                />
                <div>
                  <strong className="block text-contrast font-semibold">
                    {testimonial.author}
                  </strong>
                  <span className="text-sm text-contrast/70">
                    {testimonial.role}
                  </span>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}

