/**
 * Parse Textract response to extract chess notation
 */

export interface TextractBlock {
  BlockType: string
  Text?: string
  Geometry?: {
    BoundingBox: {
      Width: number
      Height: number
      Left: number
      Top: number
    }
  }
  Confidence?: number
}

export interface TextractResponse {
  Blocks: TextractBlock[]
}

/**
 * Extract all text from Textract response, ordered by position
 */
export function extractTextFromTextract(response: TextractResponse): string {
  const textBlocks = response.Blocks.filter(
    (block) => block.BlockType === 'LINE' && block.Text
  )

  // Sort by position (top to bottom, left to right)
  textBlocks.sort((a, b) => {
    if (!a.Geometry || !b.Geometry) return 0
    const topDiff = a.Geometry.BoundingBox.Top - b.Geometry.BoundingBox.Top
    if (Math.abs(topDiff) > 0.05) {
      // Different rows
      return topDiff
    }
    // Same row, sort by left position
    return (
      a.Geometry.BoundingBox.Left - b.Geometry.BoundingBox.Left
    )
  })

  return textBlocks.map((block) => block.Text).join(' ')
}

/**
 * Extract chess moves from text
 * Looks for patterns like "1. e4 e5", "1.e4 e5", "1 e4 e5", etc.
 */
export function extractChessMoves(text: string): string[] {
  // Normalize text - remove extra whitespace
  const normalized = text.replace(/\s+/g, ' ').trim()

  // Pattern to match move sequences
  // Matches: "1. e4 e5", "1.e4 e5", "1 e4 e5", etc.
  const movePattern = /(\d+\.?\s*[a-h1-8NBRQKx=+#O-]+\s*[a-h1-8NBRQKx=+#O-]*)/gi

  const matches = normalized.match(movePattern)
  if (!matches) {
    return []
  }

  return matches.map((match) => match.trim())
}

/**
 * Extract game metadata from text
 */
export interface GameMetadata {
  whitePlayer?: string
  blackPlayer?: string
  date?: string
  result?: string
  event?: string
  site?: string
}

export function extractMetadata(text: string): GameMetadata {
  const metadata: GameMetadata = {}

  // Extract player names (common patterns)
  const whiteMatch = text.match(/white[:\s]+([A-Za-z\s]+)/i)
  const blackMatch = text.match(/black[:\s]+([A-Za-z\s]+)/i)

  if (whiteMatch) {
    metadata.whitePlayer = whiteMatch[1].trim()
  }
  if (blackMatch) {
    metadata.blackPlayer = blackMatch[1].trim()
  }

  // Extract date (various formats)
  const dateMatch = text.match(/(\d{4}[./-]\d{1,2}[./-]\d{1,2})|(\d{1,2}[./-]\d{1,2}[./-]\d{4})/)
  if (dateMatch) {
    metadata.date = dateMatch[0]
  }

  // Extract result (1-0, 0-1, 1/2-1/2)
  const resultMatch = text.match(/(1-0|0-1|1\/2-1\/2|\*)/)
  if (resultMatch) {
    metadata.result = resultMatch[0]
  }

  return metadata
}

/**
 * Parse full Textract response and extract chess game data
 */
export interface ParsedChessGame {
  rawText: string
  moves: string[]
  metadata: GameMetadata
  confidence: number
}

export function parseTextractResponse(
  response: TextractResponse
): ParsedChessGame {
  const rawText = extractTextFromTextract(response)
  const moves = extractChessMoves(rawText)
  const metadata = extractMetadata(rawText)

  // Calculate average confidence
  const textBlocks = response.Blocks.filter(
    (block) => block.BlockType === 'LINE' && block.Confidence
  )
  const avgConfidence =
    textBlocks.reduce((sum, block) => sum + (block.Confidence || 0), 0) /
    textBlocks.length

  return {
    rawText,
    moves,
    metadata,
    confidence: avgConfidence || 0,
  }
}

