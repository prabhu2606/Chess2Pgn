const { Chess } = require('chess.js');
const levenshtein = require('fast-levenshtein');

/**
 * Chess Validator Module
 * Validates and corrects OCR errors in chess moves using hybrid fuzzy matching:
 * 1. Pattern-based substitutions (fast, handles common OCR errors)
 * 2. Levenshtein distance matching (flexible, catches unknown errors)
 */

/**
 * Common OCR character confusion mappings
 * Maps common OCR errors to possible correct characters
 */
const OCR_SUBSTITUTIONS = {
  'H': ['4'],           // eH → e4
  'h': ['4'],           // eh → e4
  'b': ['6'],           // eb → e6
  'l': ['1'],           // cl → c1
  'o': ['0'],           // o-o → 0-0
  'O': ['0'],           // O-O → 0-0
  'I': ['1'],           // I → 1
  'S': ['5'],           // S → 5
  'Z': ['2'],           // Z → 2
  'G': ['6'],           // G → 6
};

/**
 * Generate fuzzy match candidates for a move
 * Creates variations by substituting common OCR confusion characters
 */
function generateFuzzyMatches(move) {
  const candidates = new Set([move]); // Always include original
  
  // Generate single character substitutions
  for (let i = 0; i < move.length; i++) {
    const char = move[i];
    if (OCR_SUBSTITUTIONS[char]) {
      for (const replacement of OCR_SUBSTITUTIONS[char]) {
        const candidate = move.substring(0, i) + replacement + move.substring(i + 1);
        candidates.add(candidate);
      }
    }
  }
  
  // Generate multiple character substitutions (for castling: o-o → 0-0)
  // Handle common castling patterns
  const castlingPatterns = [
    { pattern: /o-o/i, replacement: '0-0' },
    { pattern: /O-O/g, replacement: '0-0' },
    { pattern: /0-0-0/g, replacement: '0-0-0' },
    { pattern: /o-o-o/i, replacement: '0-0-0' },
    { pattern: /00/g, replacement: '0-0' },
    { pattern: /000/g, replacement: '0-0-0' },
  ];
  
  for (const { pattern, replacement } of castlingPatterns) {
    if (pattern.test(move)) {
      candidates.add(move.replace(pattern, replacement));
    }
  }
  
  return Array.from(candidates);
}

/**
 * Extract move notation from a text string (removes move numbers)
 * Examples: "1. e4" → "e4", "1.e4" → "e4", "e4" → "e4"
 */
function extractMoveNotation(text) {
  // Remove move numbers and dots (e.g., "1. e4" → "e4")
  const cleaned = text.replace(/^\d+\.?\s*/, '').trim();
  
  // Split by spaces and take first valid move (handles "e4 e5" → "e4")
  const parts = cleaned.split(/\s+/);
  return parts[0] || cleaned;
}

/**
 * Validate a move using chess.js
 * @param {Chess} board - Chess board instance
 * @param {string} moveText - Move notation (e.g., "e4", "Nf3", "0-0")
 * @returns {Object} { valid: boolean, move: string, error?: string }
 */
function validateMove(board, moveText) {
  try {
    const moveNotation = extractMoveNotation(moveText);
    
    // Try the move as-is first
    const move = board.move(moveNotation);
    if (move) {
      return { valid: true, move: moveNotation, corrected: false };
    }
  } catch (error) {
    // Move is invalid, will try fuzzy matching
  }
  
  return { valid: false, move: moveText, error: 'Invalid move' };
}

/**
 * Find valid move using hybrid fuzzy matching
 * Strategy: 
 * 1. First try pattern-based substitutions (fast, handles common OCR errors)
 * 2. If that fails, use Levenshtein distance to find closest legal move
 * 3. Only accept corrections with distance <= 2 (threshold for safety)
 * 
 * @param {Chess} board - Chess board instance
 * @param {string} invalidMove - Invalid move from OCR
 * @returns {Object} { valid: boolean, move: string, corrected: boolean, original: string, method?: string, distance?: number }
 */
function fuzzyMatchMove(board, invalidMove) {
  const originalMove = invalidMove;
  const moveNotation = extractMoveNotation(invalidMove);
  
  // Step 1: Try direct validation first
  const directResult = validateMove(board, moveNotation);
  if (directResult.valid) {
    return {
      valid: true,
      move: directResult.move,
      corrected: false,
      original: originalMove
    };
  }
  
  // Step 2: Try pattern-based substitutions (fast, handles known OCR errors)
  const candidates = generateFuzzyMatches(moveNotation);
  
  for (const candidate of candidates) {
    if (candidate === moveNotation) continue; // Already tried
    
    try {
      // Create a new board instance for testing (preserve original state)
      const testBoard = new Chess();
      testBoard.loadPgn(board.pgn() || '');
      
      const move = testBoard.move(candidate);
      if (move) {
        // Found valid move via pattern matching! Apply it to the original board
        board.move(candidate);
        
        return {
          valid: true,
          move: candidate,
          corrected: true,
          original: originalMove,
          correction: `${moveNotation} → ${candidate}`,
          method: 'pattern-based'
        };
      }
    } catch (error) {
      // Try next candidate
      continue;
    }
  }
  
  // Step 3: Pattern-based failed, try Levenshtein distance matching
  // Get all legal moves for current position
  const legalMoves = board.moves();
  
  if (legalMoves.length === 0) {
    // No legal moves available (checkmate/stalemate)
    return {
      valid: false,
      move: moveNotation,
      corrected: false,
      original: originalMove,
      error: 'No legal moves available'
    };
  }
  
  // Find closest legal move using Levenshtein distance
  let bestMatch = null;
  let lowestDistance = 99;
  
  // Threshold: Only accept if 1 or 2 characters are wrong
  // e.g. "eH" (dist 1 to "e4") is good. "QxH7" (dist 3) is too risky.
  const MAX_DISTANCE_THRESHOLD = 2;
  
  for (const validMove of legalMoves) {
    const dist = levenshtein.get(moveNotation, validMove);
    
    // Check if this is the best match within threshold
    if (dist < lowestDistance && dist <= MAX_DISTANCE_THRESHOLD) {
      lowestDistance = dist;
      bestMatch = validMove;
    }
  }
  
  // Step 4: Apply the best Levenshtein match if found
  if (bestMatch) {
    try {
      // Create a new board instance for testing
      const testBoard = new Chess();
      testBoard.loadPgn(board.pgn() || '');
      
      const move = testBoard.move(bestMatch);
      if (move) {
        // Found valid move via Levenshtein! Apply it to the original board
        board.move(bestMatch);
        
        return {
          valid: true,
          move: bestMatch,
          corrected: true,
          original: originalMove,
          correction: `${moveNotation} → ${bestMatch}`,
          method: 'levenshtein',
          distance: lowestDistance
        };
      }
    } catch (error) {
      // Fall through to failure case
    }
  }
  
  // No valid move found after both pattern-based and Levenshtein matching
  return {
    valid: false,
    move: moveNotation,
    corrected: false,
    original: originalMove,
    error: 'No valid move found after fuzzy matching'
  };
}

/**
 * Extract moves from table cells in Textract response
 * Simplified move extraction for Lambda (basic pattern matching)
 */
function extractMovesFromBlocks(blocks) {
  const moves = [];
  const movePattern = /(\d+\.?\s*[a-h1-8NBRQKx=+#O-]+\s*[a-h1-8NBRQKx=+#O-]*)/gi;
  
  // Extract from CELL blocks (table structure)
  const cellBlocks = (blocks || []).filter(
    block => block.BlockType === 'CELL' && block.Text && block.RowIndex !== undefined && block.RowIndex > 0
  );
  
  // Group by row and extract moves
  const rows = {};
  cellBlocks.forEach(cell => {
    const rowIndex = cell.RowIndex || 0;
    if (!rows[rowIndex]) {
      rows[rowIndex] = [];
    }
    rows[rowIndex].push(cell);
  });
  
  // Extract moves from each row
  Object.values(rows).forEach(rowCells => {
    rowCells.sort((a, b) => (a.ColumnIndex || 0) - (b.ColumnIndex || 0));
    const rowText = rowCells.map(cell => cell.Text || '').join(' ').trim();
    
    const matches = rowText.match(movePattern);
    if (matches) {
      matches.forEach(match => {
        const cleaned = match.trim();
        // Split if contains two moves (e.g., "1. e4 e5")
        if (cleaned.includes(' ')) {
          const parts = cleaned.split(/\s+/);
          parts.forEach(part => {
            if (/\d+\./.test(part)) {
              moves.push(part);
            } else if (/[a-h1-8NBRQKx=+#O-]/.test(part)) {
              moves.push(part);
            }
          });
        } else {
          moves.push(cleaned);
        }
      });
    }
  });
  
  return moves;
}

/**
 * Correct OCR errors in moves using chess validation
 * @param {Array} blocks - Textract blocks (filtered TABLE/CELL blocks)
 * @returns {Object} { moves: Array, corrections: Array, stats: Object }
 */
function correctOCRErrors(blocks) {
  const board = new Chess();
  const originalMoves = extractMovesFromBlocks(blocks);
  const correctedMoves = [];
  const corrections = [];
  const stats = {
    total: originalMoves.length,
    valid: 0,
    corrected: 0,
    invalid: 0
  };
  
  for (const originalMove of originalMoves) {
    const result = fuzzyMatchMove(board, originalMove);
    
    if (result.valid) {
      correctedMoves.push(result.move);
      
      if (result.corrected) {
        corrections.push({
          original: result.original,
          corrected: result.move,
          correction: result.correction
        });
        stats.corrected++;
      } else {
        stats.valid++;
      }
    } else {
      // Keep original move even if invalid (with flag)
      correctedMoves.push(result.move);
      corrections.push({
        original: result.original,
        corrected: null,
        error: result.error || 'Invalid move'
      });
      stats.invalid++;
    }
  }
  
  return {
    originalMoves,
    correctedMoves,
    corrections,
    stats
  };
}

module.exports = {
  validateMove,
  fuzzyMatchMove,
  correctOCRErrors,
  generateFuzzyMatches,
  extractMoveNotation,
  Chess
};

