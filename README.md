# Chess2Pgn - Next.js + Tailwind

A modern, responsive web application for converting chess score sheets to PGN format, built with Next.js 14, TypeScript, and Tailwind CSS.

## Features

- 🎨 Modern UI with smooth animations and micro-interactions
- 📱 Fully responsive design
- ⚡ Fast performance with Next.js App Router
- 🎭 Framer Motion animations
- 🎯 TypeScript for type safety
- 🎨 Tailwind CSS for styling

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm, yarn, or pnpm

### Installation

1. Install dependencies:

```bash
npm install
# or
yarn install
# or
pnpm install
```

2. Run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
```

3. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

```
chess2pgn/
├── app/
│   ├── layout.tsx          # Root layout
│   ├── page.tsx            # Home page
│   ├── convert/
│   │   └── page.tsx        # Convert page
│   └── globals.css         # Global styles
├── components/
│   ├── layout/
│   │   ├── Header.tsx      # Navigation header
│   │   └── Footer.tsx      # Footer component
│   ├── sections/
│   │   ├── Hero.tsx        # Hero section
│   │   ├── Features.tsx    # Features section
│   │   ├── Workflow.tsx    # How it works
│   │   ├── Pricing.tsx      # Pricing section
│   │   ├── Testimonials.tsx # Testimonials
│   │   ├── FAQ.tsx         # FAQ section
│   │   └── Contact.tsx     # Contact form
│   └── ui/
│       ├── Button.tsx      # Button component
│       ├── Card.tsx        # Card component
│       ├── Icon.tsx         # Icon component
│       ├── Pill.tsx         # Pill badge component
│       └── Stepper.tsx      # Stepper component
├── lib/
│   └── utils.ts            # Utility functions
└── public/                 # Static assets
```

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Animations**: Framer Motion
- **Font**: Poppins (Google Fonts)

## Customization

### Colors

Edit `tailwind.config.ts` to customize the color scheme:

```typescript
colors: {
  primary: '#81b64c',
  accent1: '#e5f9db',
  accent2: '#badfb2',
  accent3: '#fff6e0',
  accent4: '#6acfc7',
  contrast: '#585858',
}
```

## Build for Production

```bash
npm run build
npm start
```

## License

© 2025 Chess2Pgn. All rights reserved.

