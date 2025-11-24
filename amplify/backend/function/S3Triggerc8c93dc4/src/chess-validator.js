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
    
    // Early exit: if distance is 1, this is the best possible match
    if (dist === 1) {
      bestMatch = validMove;
      lowestDistance = 1;
      break; // Exit early - no need to check further
    }
    
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
 * Handles both numbered moves ("1. e4 e5") and standalone moves in separate cells
 */
function extractMovesFromBlocks(blocks) {
  const moves = [];
  
  // Debug: Log what blocks we received
  const blockTypes = {};
  (blocks || []).forEach(block => {
    const type = block.BlockType || 'UNKNOWN';
    blockTypes[type] = (blockTypes[type] || 0) + 1;
  });
  console.log('🔍 extractMovesFromBlocks called with:', {
    totalBlocks: (blocks || []).length,
    blockTypes: blockTypes,
    sampleBlocks: (blocks || []).slice(0, 5).map(b => ({
      type: b.BlockType,
      hasText: !!(b.Text && b.Text.trim()),
      text: b.Text ? b.Text.substring(0, 30) : null,
      hasRelationships: !!b.Relationships,
      rowIndex: b.RowIndex,
      colIndex: b.ColumnIndex
    }))
  });
  
  // Pattern 1: Moves with numbers (e.g., "1. e4 e5")
  const movePatternWithNumber = /(\d+\.?\s*[a-h1-8NBRQKx=+#O-]+\s*[a-h1-8NBRQKx=+#O-]*)/gi;
  // Pattern 2: Standalone moves (e.g., "e4", "Nf3", "Qe2", "fxe6", "O-O")
  const movePatternStandalone = /\b([a-h][1-8](?:x[a-h][1-8])?[+#=]?|O-O(?:-O)?|0-0(?:-0)?|[NBRQK][a-h1-8]?x?[a-h][1-8](?:x[a-h][1-8])?[+#=]?|[a-h]x[a-h][1-8][+#=]?)\b/gi;
  
  // Extract from CELL blocks (table structure)
  // First try with Text property (may have been populated from relationships in index.js)
  let cellBlocks = (blocks || []).filter(
    block => block.BlockType === 'CELL' && block.Text && block.Text.trim().length > 0 && block.RowIndex !== undefined
  );
  
  console.log('📋 CELL blocks found:', {
    total: cellBlocks.length,
    sample: cellBlocks.slice(0, 10).map(c => ({
      text: c.Text,
      row: c.RowIndex,
      col: c.ColumnIndex
    }))
  });
  
  // If no CELL blocks with text, try to extract from WORD blocks as fallback
  if (cellBlocks.length === 0) {
    console.log('⚠️ No CELL blocks with text found, checking WORD blocks...');
    const wordBlocks = (blocks || []).filter(
      block => block.BlockType === 'WORD' && block.Text && block.Text.trim().length > 0
    );
    
    if (wordBlocks.length > 0) {
      console.log(`📝 Found ${wordBlocks.length} WORD blocks, attempting to reconstruct table structure...`);
      
      // Build block map for relationship resolution
      const blockMap = {};
      blocks.forEach(block => {
        if (block.Id) {
          blockMap[block.Id] = block;
        }
      });
      
      // Try to find TABLE blocks and extract their WORD children
      const tableBlocks = (blocks || []).filter(b => b.BlockType === 'TABLE');
      if (tableBlocks.length > 0) {
        console.log(`📊 Found ${tableBlocks.length} TABLE blocks, extracting words from tables...`);
        
        // For each table, find all WORD blocks that are children
        tableBlocks.forEach(table => {
          const tableWords = [];
          if (table.Relationships) {
            table.Relationships.forEach(rel => {
              if (rel.Type === 'CHILD' && rel.Ids) {
                rel.Ids.forEach(childId => {
                  const childBlock = blockMap[childId];
                  // Check if child is a CELL, and if so, get its WORD children
                  if (childBlock && childBlock.BlockType === 'CELL') {
                    if (childBlock.Relationships) {
                      childBlock.Relationships.forEach(cellRel => {
                        if (cellRel.Type === 'CHILD' && cellRel.Ids) {
                          cellRel.Ids.forEach(wordId => {
                            const wordBlock = blockMap[wordId];
                            if (wordBlock && wordBlock.BlockType === 'WORD' && wordBlock.Text) {
                              tableWords.push({
                                text: wordBlock.Text.trim(),
                                row: childBlock.RowIndex,
                                col: childBlock.ColumnIndex,
                                geometry: wordBlock.Geometry
                              });
                            }
                          });
                        }
                      });
                    }
                  } else if (childBlock && childBlock.BlockType === 'WORD' && childBlock.Text) {
                    // Direct WORD child of table
                    tableWords.push({
                      text: childBlock.Text.trim(),
                      geometry: childBlock.Geometry
                    });
                  }
                });
              }
            });
          }
          
          // Group words by row if we have row information
          if (tableWords.length > 0) {
            const rows = {};
            tableWords.forEach(word => {
              const rowKey = word.row !== undefined ? word.row : 'unknown';
              if (!rows[rowKey]) {
                rows[rowKey] = [];
              }
              rows[rowKey].push(word);
            });
            
            // Extract moves from each row
            Object.values(rows).forEach(rowWords => {
              // Sort by column if available
              rowWords.sort((a, b) => (a.col || 0) - (b.col || 0));
              const rowText = rowWords.map(w => w.text).join(' ').trim();
              
              // Try numbered pattern
              const matchesWithNumber = rowText.match(movePatternWithNumber);
              if (matchesWithNumber) {
                matchesWithNumber.forEach(match => {
                  const cleaned = match.replace(/^\d+\.?\s*/, '').trim();
                  const parts = cleaned.split(/\s+/).filter(p => p.length > 0);
                  moves.push(...parts);
                });
              } else {
                // Try standalone pattern
                const standaloneMatches = rowText.match(movePatternStandalone);
                if (standaloneMatches && standaloneMatches.length > 0) {
                  moves.push(...standaloneMatches.map(m => m.trim()));
                } else {
                  // Extract from individual words in row
                  rowWords.forEach(word => {
                    const wordText = word.text;
                    if (/^\d+$/.test(wordText) || wordText.length < 2) return;
                    
                    const wordMatches = wordText.match(movePatternStandalone);
                    if (wordMatches && wordMatches.length > 0) {
                      moves.push(...wordMatches.map(m => m.trim()));
                    } else if (wordText.length >= 2 && wordText.length <= 10 && 
                               !/^\d+$/.test(wordText) && 
                               /[a-h1-8NBRQKx=+#O-]/.test(wordText)) {
                      moves.push(wordText);
                    }
                  });
                }
              }
            });
          }
        });
      }
      
      // If still no moves, try grouping WORD blocks by Y position (rows)
      if (moves.length === 0 && wordBlocks.length > 0) {
        console.log('🔄 No moves from table structure, trying geometric grouping...');
        
        // Group words by approximate Y position (same row)
        const rowsByY = {};
        wordBlocks.forEach(word => {
          if (word.Geometry && word.Geometry.BoundingBox) {
            // Use top Y coordinate to group into rows
            const y = word.Geometry.BoundingBox.Top;
            const rowKey = Math.round(y * 1000); // Round to nearest 0.001
            if (!rowsByY[rowKey]) {
              rowsByY[rowKey] = [];
            }
            rowsByY[rowKey].push(word);
          }
        });
        
        // Sort rows by Y position
        const sortedRowKeys = Object.keys(rowsByY).sort((a, b) => parseFloat(a) - parseFloat(b));
        
        // Extract moves from each row
        sortedRowKeys.forEach(rowKey => {
          const rowWords = rowsByY[rowKey];
          // Sort words in row by X position
          rowWords.sort((a, b) => {
            const aX = a.Geometry?.BoundingBox?.Left || 0;
            const bX = b.Geometry?.BoundingBox?.Left || 0;
            return aX - bX;
          });
          
          const rowText = rowWords.map(w => w.Text.trim()).join(' ').trim();
          
          // Skip if row looks like a header
          if (/^(move|round|white|black|result|date|event)/i.test(rowText)) {
            return;
          }
          
          // Try numbered pattern
          const matchesWithNumber = rowText.match(movePatternWithNumber);
          if (matchesWithNumber) {
            matchesWithNumber.forEach(match => {
              const cleaned = match.replace(/^\d+\.?\s*/, '').trim();
              const parts = cleaned.split(/\s+/).filter(p => p.length > 0);
              moves.push(...parts);
            });
          } else {
            // Try standalone pattern
            const standaloneMatches = rowText.match(movePatternStandalone);
            if (standaloneMatches && standaloneMatches.length > 0) {
              moves.push(...standaloneMatches.map(m => m.trim()));
            } else {
              // Extract from individual words
              rowWords.forEach(word => {
                const wordText = word.Text.trim();
                if (/^\d+$/.test(wordText) || wordText.length < 2) return;
                
                if (wordText.length >= 2 && wordText.length <= 10 && 
                    !/^\d+$/.test(wordText) && 
                    /[a-h1-8NBRQKx=+#O-]/.test(wordText)) {
                  moves.push(wordText);
                }
              });
            }
          }
        });
      }
      
      if (moves.length > 0) {
        console.log(`✅ Extracted ${moves.length} moves from WORD blocks`);
        return moves;
      } else {
        console.log('❌ No moves found in WORD blocks after table/geometric grouping');
      }
    } else {
      console.log('❌ No WORD blocks found either');
    }
    
    // Still no moves? Return empty
    return moves;
  }
  
  // Filter out header row (row 0) for CELL blocks
  cellBlocks = cellBlocks.filter(cell => (cell.RowIndex || 0) > 0);
  
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
  let debugSampleRows = [];
  Object.values(rows).forEach((rowCells, rowIdx) => {
    rowCells.sort((a, b) => (a.ColumnIndex || 0) - (b.ColumnIndex || 0));
    const rowText = rowCells.map(cell => cell.Text || '').join(' ').trim();
    
    // Debug: Log first few rows to see what we're working with
    if (rowIdx < 5) {
      debugSampleRows.push({
        rowIndex: rowCells[0]?.RowIndex,
        cells: rowCells.map(c => ({ text: c.Text, col: c.ColumnIndex })),
        rowText: rowText
      });
    }
    
    // Try numbered pattern first
    const matchesWithNumber = rowText.match(movePatternWithNumber);
    if (matchesWithNumber) {
      matchesWithNumber.forEach(match => {
        const cleaned = match.replace(/^\d+\.?\s*/, '').trim();
        const parts = cleaned.split(/\s+/).filter(p => p.length > 0);
        moves.push(...parts);
      });
    } else {
      // Try standalone pattern on row text
      const standaloneMatches = rowText.match(movePatternStandalone);
      if (standaloneMatches && standaloneMatches.length > 0) {
        moves.push(...standaloneMatches.map(m => m.trim()));
      } else {
        // Extract from individual cells (handles separate columns for move number, white, black)
        rowCells.forEach(cell => {
          const cellText = (cell.Text || '').trim();
          
          // Skip if it's just a move number (e.g., "23", "24")
          if (/^\d+$/.test(cellText)) {
            return;
          }
          
          // Skip empty cells
          if (!cellText || cellText.length === 0) {
            return;
          }
          
          // Try numbered pattern first
          const cellMatchesWithNumber = cellText.match(movePatternWithNumber);
          if (cellMatchesWithNumber) {
            cellMatchesWithNumber.forEach(match => {
              const cleaned = match.replace(/^\d+\.?\s*/, '').trim();
              const parts = cleaned.split(/\s+/).filter(p => p.length > 0);
              moves.push(...parts);
            });
          } else {
            // Try standalone pattern - be more permissive
            const cellMatchesStandalone = cellText.match(movePatternStandalone);
            if (cellMatchesStandalone && cellMatchesStandalone.length > 0) {
              // Filter out false positives but be more lenient
              const validMoves = cellMatchesStandalone.filter(m => {
                const trimmed = m.trim();
                // More permissive: accept anything that looks like a chess move
                return trimmed.length >= 2 && (
                  /^[a-h][1-8]/.test(trimmed) || // e4, e5, etc.
                  /^[NBRQK]/.test(trimmed) || // Nf3, Bb5, etc.
                  /^O-O/.test(trimmed) || // Castling
                  /^0-0/.test(trimmed) || // Castling (numeric)
                  /^[a-h]x/.test(trimmed) || // Captures like exd5
                  /^[a-h][a-h]/.test(trimmed) || // Pawn moves like "ab" might be "a4" misread
                  /^[NBRQK][a-h]/.test(trimmed) // Piece moves like "Nf", "Bb"
                );
              });
              if (validMoves.length > 0) {
                moves.push(...validMoves.map(m => m.trim()));
              } else {
                // If no pattern matched but cell has text, try a very simple check
                // Sometimes OCR gives us moves without proper formatting
                if (cellText.length >= 2 && cellText.length <= 6) {
                  // Could be a move, add it and let validation handle it
                  if (!/^\d+$/.test(cellText) && !/^[A-Z]{2,}$/.test(cellText)) {
                    moves.push(cellText);
                  }
                }
              }
            } else {
              // No pattern matched - try very simple heuristic
              // If cell text is short and looks like it could be a move, include it
              if (cellText.length >= 2 && cellText.length <= 6 && 
                  !/^\d+$/.test(cellText) && 
                  /[a-h1-8NBRQKx=+#O-]/.test(cellText)) {
                moves.push(cellText);
              }
            }
          }
        });
      }
    }
  });
  
  // Log debug info if no moves found
  if (moves.length === 0) {
    console.log('⚠️ No moves extracted. Debug info:', {
      totalCellBlocks: cellBlocks.length,
      totalRows: Object.keys(rows).length,
      sampleRows: debugSampleRows,
      sampleCellTexts: cellBlocks.slice(0, 30).map(c => c.Text).filter(t => t && t.trim().length > 0)
    });
    
    // Last resort: extract ALL non-empty, non-numeric cells that might be moves
    // This is very permissive but better than returning nothing
    console.log('🔄 Attempting permissive extraction as last resort...');
    cellBlocks.forEach(cell => {
      const cellText = (cell.Text || '').trim();
      // Skip if it's just a number or empty
      if (!cellText || /^\d+$/.test(cellText) || cellText.length < 2) {
        return;
      }
      // Skip if it looks like a header
      if (/^(move|round|white|black|result|date|event|tournament|site|player)/i.test(cellText)) {
        return;
      }
      // If it's short (2-10 chars) and contains any chess notation characters, include it
      if (cellText.length >= 2 && cellText.length <= 10 && /[a-h1-8NBRQKx=+#O-]/.test(cellText)) {
        moves.push(cellText);
      }
    });
    
    if (moves.length > 0) {
      console.log(`✅ Permissive extraction found ${moves.length} potential moves:`, moves.slice(0, 20));
    }
  }
  
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

