import type { ParsedChessGame, GameMetadata } from './parser'

/**
 * Convert parsed chess game data to PGN format
 */

export interface PGNOptions {
  includeMetadata?: boolean
  includeComments?: boolean
}

/**
 * Format a single move in PGN format
 */
function formatMove(move: string): string {
  // Clean up the move - remove move numbers if present
  // "1. e4" -> "e4"
  let cleaned = move.replace(/^\d+\.?\s*/, '').trim()
  
  // Split into white and black moves if both present
  const parts = cleaned.split(/\s+/)
  
  return parts.join(' ')
}

/**
 * Convert moves array to PGN move text
 */
function formatMoves(moves: string[]): string {
  if (moves.length === 0) {
    return '*'
  }

  const formattedMoves: string[] = []
  let moveNumber = 1

  for (const move of moves) {
    // Extract move number from the move string
    const moveNumberMatch = move.match(/^(\d+)\.?\s*/)
    if (moveNumberMatch) {
      moveNumber = parseInt(moveNumberMatch[1], 10)
    }

    // Remove move number prefix
    const moveText = move.replace(/^\d+\.?\s*/, '').trim()
    
    // Split into white and black moves
    const parts = moveText.split(/\s+/)
    
    if (parts.length >= 2) {
      // Both white and black moves
      formattedMoves.push(`${moveNumber}. ${parts[0]} ${parts[1]}`)
      moveNumber++
    } else if (parts.length === 1) {
      // Only white move (last move of game)
      formattedMoves.push(`${moveNumber}. ${parts[0]}`)
    }
  }

  return formattedMoves.join(' ')
}

/**
 * Format metadata tags for PGN
 */
function formatMetadata(metadata: GameMetadata): string {
  const tags: string[] = []

  if (metadata.event) {
    tags.push(`[Event "${metadata.event}"]`)
  }

  if (metadata.site) {
    tags.push(`[Site "${metadata.site}"]`)
  }

  if (metadata.date) {
    tags.push(`[Date "${metadata.date}"]`)
  }

  if (metadata.whitePlayer) {
    tags.push(`[White "${metadata.whitePlayer}"]`)
  } else {
    tags.push(`[White "?"]`)
  }

  if (metadata.blackPlayer) {
    tags.push(`[Black "${metadata.blackPlayer}"]`)
  } else {
    tags.push(`[Black "?"]`)
  }

  if (metadata.result) {
    tags.push(`[Result "${metadata.result}"]`)
  } else {
    tags.push(`[Result "*"]`)
  }

  return tags.join('\n')
}

/**
 * Convert parsed chess game to PGN format
 */
export function convertToPGN(
  parsedGame: ParsedChessGame,
  options: PGNOptions = {}
): string {
  const { includeMetadata = true, includeComments = false } = options

  const pgnParts: string[] = []

  // Add metadata tags
  if (includeMetadata) {
    pgnParts.push(formatMetadata(parsedGame.metadata))
    pgnParts.push('') // Empty line between tags and moves
  }

  // Add move text
  const moveText = formatMoves(parsedGame.moves)
  pgnParts.push(moveText)

  // Add result if not already in moves
  if (!moveText.includes(parsedGame.metadata.result || '*')) {
    if (parsedGame.metadata.result) {
      pgnParts.push(parsedGame.metadata.result)
    } else {
      pgnParts.push('*')
    }
  }

  // Add confidence comment if requested
  if (includeComments && parsedGame.confidence > 0) {
    pgnParts.push(`{Confidence: ${Math.round(parsedGame.confidence)}%}`)
  }

  return pgnParts.join('\n')
}

/**
 * Validate PGN format
 */
export function validatePGN(pgn: string): { valid: boolean; errors: string[] } {
  const errors: string[] = []

  // Check for basic PGN structure
  if (!pgn.trim()) {
    errors.push('PGN is empty')
    return { valid: false, errors }
  }

  // Check for metadata tags (optional but recommended)
  const hasMetadata = pgn.includes('[') && pgn.includes(']')
  
  // Check for move text
  const hasMoves = /^\d+\./.test(pgn) || pgn.includes('*')

  if (!hasMoves && !hasMetadata) {
    errors.push('PGN must contain either metadata tags or move text')
  }

  return {
    valid: errors.length === 0,
    errors,
  }
}

/**
 * Download PGN as file
 */
export function downloadPGN(pgn: string, filename: string = 'game.pgn'): void {
  const blob = new Blob([pgn], { type: 'text/plain' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

