import type { Metadata } from 'next'
import { Poppins } from 'next/font/google'
import './globals.css'
import '@/lib/aws/amplify-config'

const poppins = Poppins({
  weight: ['400', '500', '600', '700'],
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-poppins',
})

export const metadata: Metadata = {
  title: 'Chess2Pgn | AI Score Sheet to PGN Converter',
  description: 'Upload photos of your handwritten chess score sheets and instantly convert them into clean, editable PGN files.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={poppins.variable}>
      <body>{children}</body>
    </html>
  )
}

