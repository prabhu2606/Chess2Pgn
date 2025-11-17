# Chess2Pgn - Next.js + Tailwind + AWS

A modern, responsive web application for converting chess score sheets to PGN format, built with Next.js 14, TypeScript, Tailwind CSS, AWS Amplify, and Amazon Textract.

## Features

- 🎨 Modern UI with smooth animations and micro-interactions
- 📱 Fully responsive design
- ⚡ Fast performance with Next.js App Router
- 🎭 Framer Motion animations
- 🎯 TypeScript for type safety
- 🎨 Tailwind CSS for styling
- ☁️ AWS Amplify backend integration
- 🔍 Amazon Textract OCR processing
- 📦 S3 storage for images and results
- ⚙️ Serverless Lambda processing

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm, yarn, or pnpm
- AWS account (for backend services)
- AWS CLI installed and configured
- Amplify CLI installed

### AWS Setup

Before running the application, you need to set up AWS services. Follow the detailed guide in [docs/AWS_SETUP.md](docs/AWS_SETUP.md).

**Important**: If you don't have an AWS account yet, start with **Step 0** in the setup guide to create one (it's free to sign up).

Quick setup steps:

1. **Create AWS Account** (if needed): Go to https://aws.amazon.com/ and sign up
2. Install AWS CLI: https://aws.amazon.com/cli/
3. Configure AWS credentials: `aws configure`
4. Install Amplify CLI: `npm install -g @aws-amplify/cli`
5. Configure Amplify: `amplify configure`
6. Initialize Amplify in project: `amplify init`
7. Add storage: `amplify add storage`
8. Add Lambda function: `amplify add function`
9. Deploy: `amplify push`

### Installation

1. Install dependencies:

```bash
npm install
# or
yarn install
# or
pnpm install
```

2. Set up environment variables:

```bash
cp env.example .env.local
```

Edit `.env.local` and add your AWS configuration (bucket name will be provided after `amplify push`).

3. Run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
```

4. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

```
chess2pgn/
├── app/
│   ├── layout.tsx          # Root layout
│   ├── page.tsx            # Home page
│   ├── convert/
│   │   └── page.tsx        # Convert page with upload & processing
│   ├── api/
│   │   └── process/
│   │       └── route.ts    # API route for processing status
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
│   ├── aws/
│   │   ├── amplify-config.ts  # Amplify configuration
│   │   └── storage.ts          # S3 storage utilities
│   ├── pgn/
│   │   ├── parser.ts           # Textract result parser
│   │   └── converter.ts        # PGN conversion logic
│   └── utils.ts            # Utility functions
├── amplify/
│   └── backend/
│       └── function/
│           └── textractProcessor/  # Lambda function for OCR
├── docs/
│   └── AWS_SETUP.md        # AWS setup instructions
└── public/                 # Static assets
```

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Animations**: Framer Motion
- **Font**: Poppins (Google Fonts)
- **Backend**: AWS Amplify
- **Storage**: Amazon S3
- **OCR**: Amazon Textract
- **Compute**: AWS Lambda

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

## Deployment

### Deploy with Amplify

1. Push backend changes:
   ```bash
   amplify push
   ```

2. Deploy frontend:
   ```bash
   amplify publish
   ```

Or use Amplify Console for continuous deployment from Git.

### Environment Variables

Make sure to set the following environment variables in your deployment:

- `NEXT_PUBLIC_AWS_REGION` - AWS region (e.g., us-east-1)
- `NEXT_PUBLIC_AWS_S3_BUCKET` - S3 bucket name (from Amplify output)

## How It Works

1. **Upload**: User uploads a chess score sheet image
2. **Storage**: Image is stored in S3 via Amplify Storage
3. **Trigger**: S3 upload triggers Lambda function
4. **OCR**: Lambda calls Amazon Textract to extract text
5. **Processing**: Lambda parses text and stores results in S3
6. **Retrieval**: Frontend polls API to get processing results
7. **Conversion**: Extracted text is converted to PGN format
8. **Display**: User can review and download the PGN file

## AWS Services Used

- **AWS Amplify**: Backend-as-a-Service platform
- **Amazon S3**: Object storage for images and results
- **AWS Lambda**: Serverless function for OCR processing
- **Amazon Textract**: OCR service for text extraction

## License

© 2025 Chess2Pgn. All rights reserved.

