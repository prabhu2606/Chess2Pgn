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
- 🔍 Amazon Textract OCR processing (optimized table structure extraction)
- ♟️ Smart chess move validation with fuzzy matching (corrects OCR errors)
- 📦 S3 storage for images and results with automatic cleanup
- ⚙️ Serverless Lambda processing
- 💰 Cost optimization features (lifecycle policies, cleanup scripts)

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
9. Configure S3 lifecycle policy: `amplify override storage` (select storage resource)
10. Deploy: `amplify push`

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
│       ├── function/
│       │   └── S3Triggerc8c93dc4/  # Lambda function for Textract OCR
│       │       ├── src/
│       │       │   ├── index.js         # Main Lambda handler
│       │       │   └── chess-validator.js  # Chess move validation & hybrid fuzzy matching
│       │       └── package.json          # Includes chess.js and fast-levenshtein dependencies
│       └── storage/
│           └── chessstorage/
│               └── overrides.ts     # S3 lifecycle policy configuration
├── scripts/
│   ├── cleanup-s3.js       # S3 cleanup utility script
│   ├── setup-cost-monitoring.sh  # Cost monitoring setup script
│   └── README.md            # Scripts documentation
├── docs/
│   └── AWS_SETUP.md        # AWS setup instructions
├── COST_OPTIMIZATION.md    # Comprehensive cost optimization guide
├── COST_OPTIMIZATION_SUMMARY.md  # Quick cost optimization reference
└── public/                 # Static assets
```

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Animations**: Framer Motion
- **Font**: Poppins (Google Fonts)
- **Backend**: AWS Amplify
- **Storage**: Amazon S3 (with lifecycle policies for automatic cleanup)
- **OCR**: Amazon Textract (Tables mode with FeatureTypes=['TABLES'] only)
- **Compute**: AWS Lambda
- **Chess Validation**: chess.js (JavaScript chess library for move validation)
- **Fuzzy Matching**: fast-levenshtein (Levenshtein distance algorithm for OCR error correction)

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
3. **Trigger**: S3 upload triggers Lambda function automatically
4. **OCR**: Lambda calls Amazon Textract `analyzeDocument` with `FeatureTypes=['TABLES']` to extract table structure
5. **Filtering**: Lambda filters response to only TABLE and CELL blocks (optimized for cost)
6. **Validation**: Lambda validates and corrects chess moves using hybrid fuzzy matching:
   - Extracts moves from table cells
   - Validates each move using chess.js
   - **Pattern-based correction**: Fast correction of common OCR errors (e.g., "eH" → "e4", "o-o" → "0-0")
   - **Levenshtein distance matching**: Finds closest valid move for unknown OCR errors (distance ≤ 2 threshold)
   - Tracks correction method and statistics
7. **Storage**: Filtered table data + validated moves are stored in S3 as JSON results
8. **Retrieval**: Frontend polls API to get processing results
9. **Parsing**: Parser uses validated/corrected moves from results
10. **Conversion**: Validated moves are converted to PGN format
11. **Display**: User can review and download the PGN file

### Textract Optimization

The Lambda function is optimized for cost by:
- Using `analyzeDocument` with **only** `FeatureTypes=['TABLES']` (excludes FORMS/QUERIES)
- Filtering response blocks to only TABLE and CELL types (reduces data size)
- Ignoring header/metadata rows when extracting moves

### OCR Error Correction

The Lambda function includes intelligent chess move validation using a **hybrid fuzzy matching approach**:

- **Chess Validation**: Uses chess.js to validate move legality
- **Hybrid Fuzzy Matching** (two-stage approach):
  1. **Pattern-Based Matching** (fast, handles known OCR errors):
     - `eH` → `e4` (H mistaken for 4)
     - `eb` → `e6` (b mistaken for 6)
     - `cl` → `c1` (l mistaken for 1)
     - `o-o` → `0-0` (castling notation)
     - And many more common OCR confusions via character substitution patterns
  2. **Levenshtein Distance Matching** (flexible, catches unknown errors):
     - If pattern-based fails, calculates edit distance to all legal moves
     - Selects closest valid move with distance ≤ 2 (safety threshold)
     - Handles errors not covered by predefined patterns
- **Error Handling**: Tracks original moves, corrections, correction method, and validation statistics
- **Results**: Stores both original OCR moves and corrected moves in results JSON

## AWS Services Used

- **AWS Amplify**: Backend-as-a-Service platform
- **Amazon S3**: Object storage for images and results (with 7-day lifecycle policy for automatic cleanup)
- **AWS Lambda**: Serverless function for OCR processing and chess move validation
- **Amazon Textract**: OCR service with Tables mode (`analyzeDocument` with `FeatureTypes=['TABLES']`)
- **chess.js**: JavaScript chess library for move validation
- **fast-levenshtein**: Levenshtein distance algorithm for flexible OCR error correction

## Cost Optimization

**Important for Paid Plans**: The cost estimates below show actual costs for users on paid AWS plans. Free tier benefits apply during trial periods (Textract: 3 months, S3: 12 months) and permanently for some services (Lambda). If you're past the free tier trial period, you'll pay the actual costs listed.

This project includes several cost optimization features:

### Automatic Cleanup
- **S3 Lifecycle Policy**: Automatically deletes files older than 7 days (configured via Amplify Overrides)
- **Location**: `amplify/backend/storage/chessstorage/overrides.ts`
- **To Apply**: Run `amplify override storage`, then `amplify push`

### Manual Cleanup Scripts
Cleanup utilities for managing S3 bucket:

```bash
# List all files in bucket
npm run cleanup:s3:list

# Show bucket statistics and cost estimate
npm run cleanup:s3:stats

# Delete files older than 7 days
npm run cleanup:s3:old

# Delete all files (requires confirmation)
npm run cleanup:s3:all
```

See `scripts/README.md` for detailed usage instructions.

### Cost Monitoring
- **Setup Script**: `scripts/setup-cost-monitoring.sh` - Guides through AWS billing alert setup
- **Documentation**: See `COST_OPTIMIZATION.md` for comprehensive cost strategies
- **Quick Reference**: See `COST_OPTIMIZATION_SUMMARY.md` for key points

### Textract Cost Optimization
- Uses Tables mode with **only** TABLES feature ($15.00/1k pages vs $65.00/1k if FORMS+QUERIES included)
- Filters blocks to only TABLE/CELL types (reduces data transfer and storage)
- Processes only structured table data, ignoring headers/metadata
- **Free Tier**: 100 pages/month FREE for first 3 months (trial period, applies to all AWS accounts)
- **Paid Plan**: All pages are charged at $15.00 per 1,000 pages

### Lambda Cost Optimization
- Chess validation using chess.js and fast-levenshtein adds minimal processing overhead (~100-500ms per document)
- **Free Tier**: First 1M requests/month are FREE (permanent free tier, not time-limited)
- **Paid Plan**: If exceeding 1M requests, costs are ~$0.20 per 1M requests after free tier
- Package size increase from chess.js (~150KB) and fast-levenshtein (~10KB) is negligible
- **Typical Development**: Usually within free tier limits, so no Lambda costs

### Free Tier Monitoring

You can monitor your Free Tier usage in the AWS Console:

1. Go to **AWS Console** → **Billing and Cost Management** → **Free Tier**
2. View your current usage for each service
3. Check usage percentages to see how close you are to free tier limits
4. Monitor forecasted usage to plan ahead

**Example Free Tier Limits**:
- **Textract**: 100 pages/month (trial period: first 3 months)
- **Lambda**: 1M requests/month (permanent free tier)
- **S3**: 5 GB storage (trial period: first 12 months)

### Estimated Monthly Costs (After Free Tier)

**Note on Free Tier**: Free tier benefits apply during trial periods (Textract: 3 months, S3: 12 months) and permanently for some services (Lambda). The costs below apply after free tier limits are exceeded. Check your Free Tier usage in AWS Console to see your current status.

#### Light Usage (100 pages/month):
- **Textract**: ~$1.50 (100 pages @ $0.015/page)
- **S3 Storage**: ~$0.02 (< 1 GB typical)
- **S3 Requests**: FREE (< 2,000 PUT, 20,000 GET free tier)
- **Lambda**: FREE (< 1M requests/month free tier)
- **Total**: **~$1.52/month**

#### Moderate Usage (1,000 pages/month):
- **Textract**: ~$15.00 (1,000 pages @ $0.015/page)
- **S3 Storage**: ~$0.10 (few GB after lifecycle cleanup)
- **S3 Requests**: FREE
- **Lambda**: FREE
- **Total**: **~$15.10/month**

#### Heavy Usage (5,000 pages/month):
- **Textract**: ~$75.00 (5,000 pages @ $0.015/page)
- **S3 Storage**: ~$0.50
- **S3 Requests**: FREE
- **Lambda**: FREE (still within free tier)
- **Total**: **~$75.50/month**

#### Free Tier Benefits:
- **Textract**: 100 pages/month FREE for first 3 months (trial period, applies to all AWS accounts)
- **S3**: 5 GB storage FREE for first 12 months (trial period)
- **Lambda**: 1M requests/month FREE (permanent free tier, not time-limited)

**Main Cost Driver**: Textract at $15.00 per 1,000 pages. All other services typically remain within free tier for development usage.

For detailed cost optimization strategies and cost breakdowns, see [COST_OPTIMIZATION.md](COST_OPTIMIZATION.md).

## Chess Move Validation & OCR Error Correction

Handwriting OCR is never 100% accurate. Textract may mistake handwritten notation, such as:
- `0-0` (castling) → `o-o` or `20-20`
- `e4` → `eH`
- `e6` → `eb`
- `Rc1` → `Rcl`

This application includes intelligent error correction:

### How It Works

1. **Move Extraction**: Lambda extracts moves from table cells after OCR processing
2. **Direct Validation**: Each move is first validated using chess.js as-is
3. **Hybrid Fuzzy Matching**: If a move is invalid, the system uses a two-stage approach:
   - **Stage 1 - Pattern-Based**: Generates candidate moves by substituting common OCR confusion characters (H→4, b→6, l→1, o→0). Tests each candidate for validity. Fast and handles known errors.
   - **Stage 2 - Levenshtein Distance**: If pattern-based fails, calculates edit distance to all legal moves. Selects closest valid move with distance ≤ 2 (safety threshold). Flexible and catches unknown errors.
4. **Results Storage**: Both original and corrected moves are stored in results JSON, along with correction method (pattern-based or levenshtein) and distance metrics

### Example Corrections

```
Original (OCR)    →  Corrected (Valid)
──────────────────────────────────────
eH                →  e4
eb                →  e6
cl                →  c1
o-o               →  0-0
O-O               →  0-0
Rcl               →  Rc1
```

### Results Structure

The processed results include:
- `originalMoves`: Moves as extracted from OCR
- `correctedMoves`: Validated and corrected moves
- `corrections`: Array of corrections with metadata
- `stats`: Validation statistics (total, valid, corrected, invalid)

This ensures that even with imperfect OCR, the resulting PGN files are accurate and valid.

## Additional Documentation

- **[AWS Setup Guide](docs/AWS_SETUP.md)**: Detailed instructions for setting up AWS services
- **[Cost Optimization Guide](COST_OPTIMIZATION.md)**: Comprehensive guide for minimizing AWS costs
- **[Cost Optimization Summary](COST_OPTIMIZATION_SUMMARY.md)**: Quick reference for cost optimization
- **[Scripts Documentation](scripts/README.md)**: Usage guide for utility scripts
- **[Enable Textract](ENABLE_TEXTRACT.md)**: Instructions for enabling Textract service
- **[Troubleshooting Upload](TROUBLESHOOTING_UPLOAD.md)**: Solutions for common upload issues
- **[Debug Lambda](DEBUG_LAMBDA.md)**: Guide for debugging Lambda function issues

## License

© 2025 Chess2Pgn. All rights reserved.

