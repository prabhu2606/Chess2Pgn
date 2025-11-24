/**
 * Parse Textract response to extract chess notation
 */

export interface TextractBlock {
  BlockType: string
  Id?: string
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
  // Table-specific fields
  RowIndex?: number
  ColumnIndex?: number
  RowSpan?: number
  ColumnSpan?: number
  Relationships?: Array<{
    Type: string
    Ids: string[]
  }>
}

export interface TextractResponse {
  Blocks: TextractBlock[]
}

/**
 * Extract all text from Textract response, ordered by position
 * Supports both LINE blocks (legacy) and CELL blocks (table structure)
 */
export function extractTextFromTextract(response: TextractResponse): string {
  // First, try to extract from table structure (CELL blocks) if available
  const cellBlocks = response.Blocks.filter(
    (block) => block.BlockType === 'CELL' && block.Text
  )

  if (cellBlocks.length > 0) {
    // Extract from table cells, sorted by row and column
    cellBlocks.sort((a, b) => {
      const rowDiff = (a.RowIndex || 0) - (b.RowIndex || 0)
      if (rowDiff !== 0) return rowDiff
      return (a.ColumnIndex || 0) - (b.ColumnIndex || 0)
    })

    return cellBlocks.map((block) => block.Text).join(' ')
  }

  // Fallback to LINE blocks for legacy compatibility
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
 * Extract chess moves from table cells (optimized for table structure)
 * Extracts moves from CELL blocks, ignoring header/metadata rows (typically row 0)
 */
export function extractMovesFromTable(response: TextractResponse): string[] {
  const cellBlocks = response.Blocks.filter(
    (block) => block.BlockType === 'CELL' && block.Text && block.RowIndex !== undefined
  )

  if (cellBlocks.length === 0) {
    return []
  }

  // Filter out header row (row 0) and other metadata rows
  // Typically, move data starts from row 1 or row 2
  // We'll skip rows that contain common header text patterns
  const headerPatterns = [
    /^(move|round|white|black|result|date|event|tournament|site|player)/i,
    /^\d+\s*$/,  // Just row numbers
    /^[-=\s]+$/   // Separators
  ]

  const isHeaderCell = (text: string): boolean => {
    return headerPatterns.some(pattern => pattern.test(text.trim()))
  }

  // Group cells by row
  const rows: { [rowIndex: number]: TextractBlock[] } = {}
  cellBlocks.forEach(cell => {
    const rowIndex = cell.RowIndex || 0
    if (!rows[rowIndex]) {
      rows[rowIndex] = []
    }
    rows[rowIndex].push(cell)
  })

  // Extract moves from non-header rows
  const moves: string[] = []
  const sortedRowIndices = Object.keys(rows)
    .map(Number)
    .sort((a, b) => a - b)

  for (const rowIndex of sortedRowIndices) {
    const rowCells = rows[rowIndex]
      .sort((a, b) => (a.ColumnIndex || 0) - (b.ColumnIndex || 0))

    // Skip header rows (row 0 or rows where all cells match header patterns)
    const rowText = rowCells.map(cell => cell.Text || '').join(' ').trim()
    
    if (rowIndex === 0 || rowCells.every(cell => isHeaderCell(cell.Text || ''))) {
      continue
    }

    // Extract move notation from cells in this row
    // Try multiple patterns to catch different formats:
    // 1. With move numbers: "1. e4 e5", "1.e4 e5"
    // 2. Without move numbers: "e4", "e5", "Nf3"
    // 3. Castling: "O-O", "O-O-O", "0-0", "0-0-0"
    
    // Pattern 1: Moves with numbers (e.g., "1. e4 e5")
    const movePatternWithNumber = /(\d+\.?\s*[a-h1-8NBRQKx=+#O-]+\s*[a-h1-8NBRQKx=+#O-]*)/gi
    // Pattern 2: Standalone moves without numbers - more comprehensive pattern
    // Matches: "e4", "Nf3", "O-O", "Qe2", "fxe6", "Rxf7", "dxc3", "Kh8", etc.
    const movePatternStandalone = /\b([a-h][1-8](?:x[a-h][1-8])?[+#=]?|O-O(?:-O)?|0-0(?:-0)?|[NBRQK][a-h1-8]?x?[a-h][1-8](?:x[a-h][1-8])?[+#=]?|[a-h]x[a-h][1-8][+#=]?)\b/gi
    
    const rowMatches = rowText.match(movePatternWithNumber)
    
    if (rowMatches) {
      // Extract moves from numbered format
      rowMatches.forEach(match => {
        const cleaned = match.replace(/^\d+\.?\s*/, '').trim()
        const parts = cleaned.split(/\s+/).filter(p => p.length > 0)
        moves.push(...parts)
      })
    } else {
      // Try standalone move pattern (no move numbers) on row text first
      const standaloneMatches = rowText.match(movePatternStandalone)
      if (standaloneMatches && standaloneMatches.length > 0) {
        moves.push(...standaloneMatches.map(match => match.trim()))
      } else {
        // If no pattern found in row text, try each cell individually
        // This handles cases where moves are in separate columns (move number, white, black)
        rowCells.forEach(cell => {
          const cellText = (cell.Text || '').trim()
          if (cellText && !isHeaderCell(cellText)) {
            // Skip if it's just a move number (e.g., "23", "24")
            if (/^\d+$/.test(cellText)) {
              return // Skip move number cells
            }
            
            // Try numbered pattern first
            const cellMatchesWithNumber = cellText.match(movePatternWithNumber)
            if (cellMatchesWithNumber) {
              cellMatchesWithNumber.forEach(match => {
                const cleaned = match.replace(/^\d+\.?\s*/, '').trim()
                const parts = cleaned.split(/\s+/).filter(p => p.length > 0)
                moves.push(...parts)
              })
            } else {
              // Try standalone pattern - this should catch moves like "Qe2", "fxe6", "Rxf7"
              const cellMatchesStandalone = cellText.match(movePatternStandalone)
              if (cellMatchesStandalone && cellMatchesStandalone.length > 0) {
                // Filter out false positives (like single digits, etc.)
                const validMoves = cellMatchesStandalone.filter(m => {
                  const trimmed = m.trim()
                  // Must be a valid chess move pattern
                  return trimmed.length >= 2 && (
                    /^[a-h][1-8]/.test(trimmed) || // e4, e5, etc.
                    /^[NBRQK]/.test(trimmed) || // Nf3, Bb5, etc.
                    /^O-O/.test(trimmed) || // Castling
                    /^[a-h]x/.test(trimmed) // Captures like exd5
                  )
                })
                if (validMoves.length > 0) {
                  moves.push(...validMoves.map(match => match.trim()))
                }
              }
            }
          }
        })
      }
    }
  }

  return moves
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
 * Optimized for table structure (TABLE/CELL blocks) but supports legacy LINE blocks
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
  // Check if we have table structure (TABLE/CELL blocks)
  const hasTableStructure = response.Blocks.some(
    block => block.BlockType === 'TABLE' || block.BlockType === 'CELL'
  )

  let moves: string[]
  let rawText: string
  let confidenceBlocks: TextractBlock[]

  if (hasTableStructure) {
    // Use table-based extraction (optimized for cost - ignores header/metadata)
    moves = extractMovesFromTable(response)
    rawText = extractTextFromTextract(response) // Will use CELL blocks
    
    // Calculate confidence from CELL blocks only (not headers)
    confidenceBlocks = response.Blocks.filter(
      (block) => block.BlockType === 'CELL' && 
                 block.Confidence !== undefined &&
                 block.RowIndex !== undefined &&
                 block.RowIndex > 0  // Exclude row 0 (header)
    )
  } else {
    // Fallback to legacy LINE-based extraction
    rawText = extractTextFromTextract(response)
    moves = extractChessMoves(rawText)
    confidenceBlocks = response.Blocks.filter(
      (block) => block.BlockType === 'LINE' && block.Confidence
    )
  }

  // Calculate average confidence from relevant blocks
  const avgConfidence = confidenceBlocks.length > 0
    ? confidenceBlocks.reduce((sum, block) => sum + (block.Confidence || 0), 0) / confidenceBlocks.length
    : 0

  // Extract metadata (if needed, but typically ignored per requirement #2)
  // For cost optimization, we skip metadata extraction from headers
  const metadata: GameMetadata = {}

  return {
    rawText,
    moves,
    metadata,  // Empty by default - ignores header/metadata per requirement
    confidence: avgConfidence,
  }
}

