'use client'

import { useRef, useState, useEffect, useCallback } from 'react'
import Header from '@/components/layout/Header'
import Footer from '@/components/layout/Footer'
import Stepper from '@/components/ui/Stepper'
import { uploadImage, getResults } from '@/lib/aws/storage'
import { parseTextractResponse } from '@/lib/pgn/parser'
import { convertToPGN, downloadPGN } from '@/lib/pgn/converter'
import { Chess } from 'chess.js'

const steps = [
  { label: 'Upload', number: 1 },
  { label: 'Moves', number: 2 },
  { label: 'Info', number: 3 },
  { label: 'Done', number: 4 },
]

type ProcessingStatus = 'idle' | 'uploading' | 'processing' | 'completed' | 'validated' | 'error'

type MoveData = {
  moveNumber: number
  white: string
  black: string | null
  whiteValid: boolean
  blackValid: boolean
  whiteError: string | null
  blackError: string | null
  whiteOriginal?: string
  blackOriginal?: string
}

type EditableMove = {
  moveNumber: number
  color: 'white' | 'black'
} | null

type ContextMenuState = {
  show: boolean
  x: number
  y: number
  moveNumber: number
  color: 'white' | 'black'
} | null

export default function ConvertPage() {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const cameraInputRef = useRef<HTMLInputElement>(null)
  const pollingCancelledRef = useRef<boolean>(false)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  
  const [status, setStatus] = useState<ProcessingStatus>('idle')
  const [uploadedKey, setUploadedKey] = useState<string | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [extractedText, setExtractedText] = useState<string>('')
  const [pgnOutput, setPgnOutput] = useState<string>('')
  const [error, setError] = useState<string | null>(null)
  const [progress, setProgress] = useState(0)
  
  // Moves table state
  const [movesData, setMovesData] = useState<MoveData[]>([])
  const [invalidMovesCount, setInvalidMovesCount] = useState<number>(0)
  const [editableMove, setEditableMove] = useState<EditableMove>(null)
  const [contextMenu, setContextMenu] = useState<ContextMenuState>(null)
  const [editedMoveValue, setEditedMoveValue] = useState<string>('')
  const contextMenuRef = useRef<HTMLDivElement>(null)

  // Cleanup polling on unmount or status change
  useEffect(() => {
    return () => {
      pollingCancelledRef.current = true
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [])

  const handleUploadClick = () => {
    fileInputRef.current?.click()
  }

  const handleTakePhotoClick = () => {
    cameraInputRef.current?.click()
  }

  // Transform moves array into paired format with validation status
  const transformMovesToPairs = useCallback((moves: string[], corrections: any[] = []) => {
    const pairs: MoveData[] = []
    const correctionMap = new Map<string, { corrected: string | null, error?: string, original: string }>()
    
    // Filter out header words and invalid entries
    const headerWords = ['WHITE', 'BLACK', 'MOVE', 'ROUND', 'RESULT', 'DATE', 'EVENT', 'TOURNAMENT', 'SITE', 'PLAYER']
    const filteredMoves = moves.filter(move => {
      const upperMove = move.trim().toUpperCase()
      // Skip if it's a header word
      if (headerWords.includes(upperMove)) return false
      // Skip if it's too short or doesn't look like a move
      if (move.trim().length < 2) return false
      // Skip if it's just a number
      if (/^\d+$/.test(move.trim())) return false
      return true
    })
    
    // Build correction map for quick lookup - map both original and corrected moves
    corrections.forEach(correction => {
      correctionMap.set(correction.original, {
        corrected: correction.corrected,
        error: correction.error,
        original: correction.original
      })
      // Also map the corrected move back to the original for lookup
      if (correction.corrected) {
        correctionMap.set(correction.corrected, {
          corrected: correction.corrected,
          error: correction.error,
          original: correction.original
        })
      }
    })
    
    // Pair moves: even index = white, odd index = black
    for (let i = 0; i < filteredMoves.length; i += 2) {
      const whiteMove = filteredMoves[i] || ''
      const blackMove = i + 1 < filteredMoves.length ? filteredMoves[i + 1] : null
      const moveNumber = Math.floor(i / 2) + 1
      
      // Check validation status - if move is in corrections, check if it has error
      const whiteCorrection = correctionMap.get(whiteMove)
      const blackCorrection = blackMove ? correctionMap.get(blackMove) : null
      
      // A move is valid if:
      // 1. It's not in corrections (was valid from start), OR
      // 2. It's in corrections but has no error (was corrected successfully)
      const whiteValid = !whiteCorrection || !whiteCorrection.error
      const blackValid = !blackMove || !blackCorrection || !blackCorrection.error
      
      pairs.push({
        moveNumber,
        white: whiteMove,
        black: blackMove,
        whiteValid: whiteValid,
        blackValid: blackValid,
        whiteError: whiteCorrection?.error || null,
        blackError: blackCorrection?.error || null,
        whiteOriginal: whiteCorrection && whiteCorrection.original !== whiteMove ? whiteCorrection.original : undefined,
        blackOriginal: blackCorrection && blackCorrection.original !== blackMove ? blackCorrection.original : undefined
      })
    }
    
    return pairs
  }, [])

  // Validate move using chess.js
  const validateMoveOnBoard = useCallback((moveText: string, gameHistory: string[]) => {
    try {
      const board = new Chess()
      // Replay all previous moves
      for (const move of gameHistory) {
        const result = board.move(move)
        if (!result) return { valid: false, error: 'Invalid move in history' }
      }
      // Try the new move
      const result = board.move(moveText)
      return result ? { valid: true } : { valid: false, error: 'Invalid move' }
    } catch (err: any) {
      return { valid: false, error: err.message || 'Invalid move' }
    }
  }, [])

  const processFile = async (file: File) => {
    try {
      // Reset cancellation flag
      pollingCancelledRef.current = false
      setError(null)
      setStatus('uploading')
      setProgress(0)

      // Create preview
      const previewUrl = URL.createObjectURL(file)
      setImagePreview(previewUrl)

      // Upload to S3
      const key = await uploadImage(file)
      console.log('📤 File uploaded successfully. Key:', key)
      console.log('💡 Lambda should be triggered automatically. Check CloudWatch logs if processing fails.')
      
      // Check if cancelled during upload
      if (pollingCancelledRef.current) {
        return
      }
      
      setUploadedKey(key)
      setProgress(50)
      setStatus('processing')

      // Poll for results
      console.log('🔄 Starting to poll for results. Expected result path:', `results/${key}.json`)
      await pollForResults(key)
    } catch (err: any) {
      // Only set error if not cancelled
      if (!pollingCancelledRef.current) {
        console.error('Error processing file:', err)
        setError(err.message || 'Failed to process image')
        setStatus('error')
      }
    }
  }

  const pollForResults = async (key: string, maxAttempts = 90) => {
    console.log('🔄 Starting to poll for results:', { key, maxAttempts })
    
    // Set a hard timeout of 200 seconds total (Lambda timeout is 180s, add buffer)
    const hardTimeout = 200000 // 200 seconds
    const startTime = Date.now()
    
    const timeoutId = setTimeout(() => {
      if (!pollingCancelledRef.current) {
        pollingCancelledRef.current = true
        const elapsed = Math.round((Date.now() - startTime) / 1000)
        console.error('⏱️ Hard timeout reached after', elapsed, 'seconds')
        const debugInfo = `\n\nDebug Info:\n- Uploaded key: ${key}\n- Expected results path: results/${key}.json\n- Check CloudWatch logs: AWS Console → Lambda → S3Triggerc8c93dc4-dev → Logs\n- See DEBUG_LAMBDA.md for detailed troubleshooting steps`
        setError(
          `Processing timeout after ~${elapsed} seconds. ` +
          'The Lambda function may not be processing the image.\n\n' +
          'Possible causes:\n' +
          '1. Lambda function not triggered - Check if the S3 trigger is configured\n' +
          '2. Lambda function failing - Check CloudWatch logs for errors\n' +
          '3. Missing permissions - Lambda needs Textract and S3 permissions\n' +
          '4. Lambda timeout - Check Lambda function timeout settings (should be 180s)\n\n' +
          'To debug:\n' +
          '1. Check CloudWatch logs for Lambda function: ' + 
          'AWS Console → Lambda → Your function → Logs\n' +
          '2. Verify S3 trigger is configured: ' +
          'AWS Console → S3 → Your bucket → Properties → Event notifications\n' +
          '3. Check Lambda permissions: ' +
          'AWS Console → Lambda → Your function → Configuration → Permissions' +
          debugInfo
        )
        setStatus('error')
        setProgress(0)
      }
    }, hardTimeout)
    
    timeoutRef.current = timeoutId
    
    try {
      for (let attempt = 0; attempt < maxAttempts; attempt++) {
        // Check if cancelled before each attempt
        if (pollingCancelledRef.current) {
          console.log('🛑 Polling cancelled')
          clearTimeout(timeoutId)
          return
        }
        
        // Check if hard timeout reached
        if (Date.now() - startTime >= hardTimeout) {
          console.log('⏱️ Hard timeout reached during polling')
          clearTimeout(timeoutId)
          return
        }
        
        try {
          // Call getResults directly from client-side instead of using API route
          // This ensures we can use Amplify Storage with guest credentials
          try {
            const results = await getResults(key)
            
            // Check if cancelled during getResults
            if (pollingCancelledRef.current) {
              clearTimeout(timeoutId)
              return
            }
            
            console.log('✅ Results received:', {
              hasBlocks: !!results.Blocks,
              hasblocks: !!results.blocks,
              blockCount: results.Blocks?.length || results.blocks?.length || 0,
              hasChessValidation: !!results.chessValidation,
              hasCorrectedMoves: !!(results.chessValidation?.correctedMoves?.length),
              correctedMovesCount: results.chessValidation?.correctedMoves?.length || 0,
              resultKeys: Object.keys(results)
            })
            
            // Debug: Log sample blocks to see what we're working with
            const blocks = results.Blocks || results.blocks || [];
            if (blocks.length > 0) {
              const sampleBlocks = blocks.slice(0, 5);
              console.log('📋 Sample blocks:', sampleBlocks.map((b: any) => ({
                type: b.BlockType,
                text: b.Text?.substring(0, 50),
                rowIndex: b.RowIndex,
                columnIndex: b.ColumnIndex
              })));
            }
            
            // Process the results
            // Use ORIGINAL moves from OCR (not corrected) for display - user wants to see actual OCR text
            let parsed;
            if (results.chessValidation && results.chessValidation.originalMoves && results.chessValidation.originalMoves.length > 0) {
              // Use original OCR moves for display
              console.log('✅ Using original OCR moves from Lambda:', {
                total: results.chessValidation.originalMoves.length,
                valid: results.chessValidation.stats?.valid || 0,
                corrected: results.chessValidation.stats?.corrected || 0,
                invalid: results.chessValidation.stats?.invalid || 0,
                sampleMoves: results.chessValidation.originalMoves.slice(0, 10)
              });
              
              // Create parsed game with original OCR moves
              const textractResponse = {
                Blocks: results.Blocks || results.blocks || [],
              };
              const baseParsed = parseTextractResponse(textractResponse);
              
              // Use original moves for display (user wants to see actual OCR text)
              parsed = {
                ...baseParsed,
                moves: results.chessValidation.originalMoves
              };
            } else {
              // Fallback to parsing blocks
              console.log('⚠️ No validated moves found, parsing blocks...', {
                hasBlocks: blocks.length > 0,
                blockTypes: [...new Set(blocks.map((b: any) => b.BlockType))],
                hasTableStructure: blocks.some((b: any) => b.BlockType === 'TABLE' || b.BlockType === 'CELL')
              });
              const textractResponse = {
                Blocks: results.Blocks || results.blocks || [],
              };
              parsed = parseTextractResponse(textractResponse);
              
              // If still no moves, try to extract from raw text
              if (parsed.moves.length === 0 && parsed.rawText) {
                console.log('⚠️ No moves extracted from blocks, trying raw text extraction...', {
                  rawTextLength: parsed.rawText.length,
                  rawTextSample: parsed.rawText.substring(0, 200)
                });
                // Try extracting moves from raw text as last resort
                const textMoves = parsed.rawText.match(/\b([a-h][1-8]|O-O|O-O-O|[NBRQK][a-h]?[1-8]?x?[a-h][1-8])\b/g) || [];
                if (textMoves.length > 0) {
                  console.log('✅ Found moves in raw text:', textMoves.slice(0, 10));
                  parsed.moves = textMoves;
                }
              }
            }
            
            console.log('📊 Parsed game:', {
              movesCount: parsed.moves.length,
              moves: parsed.moves.slice(0, 10),
              hasBlocks: blocks.length > 0,
              blockCount: blocks.length,
              rawTextLength: parsed.rawText?.length || 0
            });
            
            // Warn if no moves found
            if (parsed.moves.length === 0) {
              console.error('❌ No moves extracted!', {
                hasBlocks: blocks.length > 0,
                hasChessValidation: !!results.chessValidation,
                blockTypes: [...new Set(blocks.map((b: any) => b.BlockType))],
                rawText: parsed.rawText?.substring(0, 500),
                sampleCells: blocks.filter((b: any) => b.BlockType === 'CELL').slice(0, 10).map((b: any) => ({
                  text: b.Text,
                  row: b.RowIndex,
                  col: b.ColumnIndex
                }))
              });
            } else {
              console.log('✅ Moves extracted successfully!', {
                totalMoves: parsed.moves.length,
                first10Moves: parsed.moves.slice(0, 10),
                last10Moves: parsed.moves.slice(-10)
              });
            }
            
            // Transform moves into pairs for moves table
            const corrections = results.chessValidation?.corrections || []
            const transformedMoves = transformMovesToPairs(parsed.moves, corrections)
            const invalidCount = transformedMoves.reduce((count, move) => {
              if (!move.whiteValid) count++
              if (move.black && !move.blackValid) count++
              return count
            }, 0)

            console.log('📊 Moves transformed:', {
              totalPairs: transformedMoves.length,
              invalidMoves: invalidCount
            })

            clearTimeout(timeoutId)
            setExtractedText(parsed.rawText)
            setMovesData(transformedMoves)
            setInvalidMovesCount(invalidCount)
            setStatus('validated')
            setProgress(100)
            console.log('✅ Processing complete! Moves ready for validation.')
            return
          } catch (resultsError: any) {
            // Check if cancelled
            if (pollingCancelledRef.current) {
              clearTimeout(timeoutId)
              return
            }
            
            // Check if it's a "not found" error (still processing)
            if (resultsError.message === 'Results not found' || resultsError.message?.includes('not found')) {
              // Aggressive polling strategy for fast response:
              // - First 10 attempts: 500ms (5 seconds total) - catches quick processing
              // - Next 15 attempts: 1 second (15 seconds total) - normal processing
              // - Remaining attempts: 2 seconds - slow processing or timeout
              
              let pollInterval: number
              if (attempt < 10) {
                pollInterval = 500 // 500ms for first 10 attempts (5 seconds)
              } else if (attempt < 25) {
                pollInterval = 1000 // 1 second for next 15 attempts (15 seconds)
              } else {
                pollInterval = 2000 // 2 seconds for remaining attempts
              }
              
            console.log(`⏳ Results not found yet (attempt ${attempt + 1}/${maxAttempts}, next poll in ${pollInterval}ms)`)
            console.log(`   Looking for: results/${key}.json`)
            if (attempt === 0) {
              console.log('💡 Tip: Check CloudWatch logs to see if Lambda is processing the image')
              console.log('   AWS Console → Lambda → S3Triggerc8c93dc4-dev → Logs')
            }
            
            // Still processing, wait and retry
            if (attempt < maxAttempts - 1) {
                await new Promise((resolve) => {
                  const timeout = setTimeout(resolve, pollInterval)
                  timeoutRef.current = timeout
                })
                
                // Check if cancelled during wait
                if (pollingCancelledRef.current) {
                  clearTimeout(timeoutId)
                  return
                }
                
                // Progress calculation: 50% base + 40% based on attempts (capped at 90%)
                setProgress(Math.min(50 + (attempt / maxAttempts) * 40, 90))
                continue
              }
            } else {
              // Other error (credentials, etc.)
              console.error(`❌ Error getting results (attempt ${attempt + 1}/${maxAttempts}):`, resultsError)
              
              // If this is the last attempt, show error
              if (attempt === maxAttempts - 1) {
                clearTimeout(timeoutId)
                if (!pollingCancelledRef.current) {
                  setError(`Processing error: ${resultsError.message || 'Failed to get results'}`)
                  setStatus('error')
                }
                return
              }
              
              // Otherwise, wait and continue polling (might be temporary)
              // Use longer interval for errors to avoid hammering the API
              await new Promise((resolve) => {
                const timeout = setTimeout(resolve, 2000)
                timeoutRef.current = timeout
              })
              
              // Check if cancelled during wait
              if (pollingCancelledRef.current) {
                clearTimeout(timeoutId)
                return
              }
              
              setProgress(50 + (attempt / maxAttempts) * 40)
              continue
            }
          }
        } catch (err: any) {
          // Check if cancelled
          if (pollingCancelledRef.current) {
            clearTimeout(timeoutId)
            return
          }
          
          console.error(`❌ Error polling (attempt ${attempt + 1}/${maxAttempts}):`, err)
          
          // If this is the last attempt, show error
          if (attempt === maxAttempts - 1) {
            clearTimeout(timeoutId)
            if (!pollingCancelledRef.current) {
              setError(`Failed to check processing status: ${err.message || 'Unknown error'}`)
              setStatus('error')
            }
            return
          }
          
          // Otherwise, wait and continue polling
          await new Promise((resolve) => {
            const timeout = setTimeout(resolve, 2000)
            timeoutRef.current = timeout
          })
          
          // Check if cancelled during wait
          if (pollingCancelledRef.current) {
            clearTimeout(timeoutId)
            return
          }
          
          setProgress(50 + (attempt / maxAttempts) * 40)
        }
      }

      // Timeout after all attempts
      clearTimeout(timeoutId)
      const elapsed = Math.round((Date.now() - startTime) / 1000)
      console.error('⏱️ Processing timeout after', maxAttempts, 'attempts (~' + elapsed + ' seconds)')
      
      if (!pollingCancelledRef.current) {
        const debugInfo = `\n\nDebug Info:\n- Uploaded key: ${key}\n- Expected results path: results/${key}.json\n- Check CloudWatch logs: AWS Console → Lambda → S3Triggerc8c93dc4-dev → Logs\n- See DEBUG_LAMBDA.md for detailed troubleshooting steps`
        setError(
          `Processing timeout after ~${elapsed} seconds. ` +
          'The Lambda function may not be processing the image.\n\n' +
          'Possible causes:\n' +
          '1. Lambda function not triggered - Check if the S3 trigger is configured\n' +
          '2. Lambda function failing - Check CloudWatch logs for errors\n' +
          '3. Missing permissions - Lambda needs Textract and S3 permissions\n' +
          '4. Lambda timeout - Check Lambda function timeout settings (should be 180s)\n\n' +
          'To debug:\n' +
          '1. Check CloudWatch logs for Lambda function: ' + 
          'AWS Console → Lambda → Your function → Logs\n' +
          '2. Verify S3 trigger is configured: ' +
          'AWS Console → S3 → Your bucket → Properties → Event notifications\n' +
          '3. Check Lambda permissions: ' +
          'AWS Console → Lambda → Your function → Configuration → Permissions' +
          debugInfo
        )
        setStatus('error')
        setProgress(0)
      }
    } finally {
      // Ensure timeout is cleared
      clearTimeout(timeoutId)
      timeoutRef.current = null
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      processFile(file)
    }
  }

  const handleCameraChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      processFile(file)
    }
  }

  const handleDownloadPGN = () => {
    if (pgnOutput) {
      const filename = `chess-game-${Date.now()}.pgn`
      downloadPGN(pgnOutput, filename)
    }
  }

  const handleReset = () => {
    // Cancel any ongoing polling
    pollingCancelledRef.current = true
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }
    
    setStatus('idle')
    setUploadedKey(null)
    setImagePreview(null)
    setExtractedText('')
    setPgnOutput('')
    setError(null)
    setProgress(0)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
    if (cameraInputRef.current) {
      cameraInputRef.current.value = ''
    }
    setMovesData([])
    setInvalidMovesCount(0)
    setEditableMove(null)
    setContextMenu(null)
    setEditedMoveValue('')
  }

  // Handle double-click to edit
  const handleMoveDoubleClick = (moveNumber: number, color: 'white' | 'black') => {
    const move = movesData.find(m => m.moveNumber === moveNumber)
    if (!move) return
    
    setEditableMove({ moveNumber, color })
    setEditedMoveValue(color === 'white' ? move.white : (move.black || ''))
    setContextMenu(null)
  }

  // Handle right-click for context menu
  const handleMoveRightClick = (e: React.MouseEvent, moveNumber: number, color: 'white' | 'black') => {
    e.preventDefault()
    setContextMenu({
      show: true,
      x: e.clientX,
      y: e.clientY,
      moveNumber,
      color
    })
    setEditableMove(null)
  }

  // Close context menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (contextMenuRef.current && !contextMenuRef.current.contains(e.target as Node)) {
        setContextMenu(null)
      }
    }

    if (contextMenu) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [contextMenu])

  // Handle context menu actions
  const handleContextMenuAction = (action: 'edit' | 'insertBefore' | 'insertAfter' | 'delete') => {
    if (!contextMenu) return
    
    const { moveNumber, color } = contextMenu
    
    if (action === 'edit') {
      const move = movesData.find(m => m.moveNumber === moveNumber)
      if (move) {
        setEditableMove({ moveNumber, color })
        setEditedMoveValue(color === 'white' ? move.white : (move.black || ''))
      }
    } else if (action === 'delete') {
      // TODO: Implement delete move
      console.log('Delete move:', moveNumber, color)
    } else if (action === 'insertBefore' || action === 'insertAfter') {
      // TODO: Implement insert move
      console.log('Insert move:', action, moveNumber, color)
    }
    
    setContextMenu(null)
  }

  // Save edited move
  const handleSaveMove = (moveNumber: number, color: 'white' | 'black') => {
    const newValue = editedMoveValue.trim()
    if (!newValue) return

    const moveIndex = movesData.findIndex(m => m.moveNumber === moveNumber)
    if (moveIndex === -1) return

    const gameHistory: string[] = []
    for (let i = 0; i < moveIndex; i++) {
      const m = movesData[i]
      gameHistory.push(m.white)
      if (m.black) gameHistory.push(m.black)
    }
    
    if (color === 'black') {
      gameHistory.push(movesData[moveIndex].white)
    }

    const validation = validateMoveOnBoard(newValue, gameHistory)
    
    const updatedMoves = [...movesData]
    const moveToUpdate = updatedMoves[moveIndex]
    
    if (color === 'white') {
      updatedMoves[moveIndex] = {
        ...moveToUpdate,
        white: newValue,
        whiteValid: validation.valid,
        whiteError: validation.valid ? null : (validation.error || 'Invalid move')
      }
    } else {
      updatedMoves[moveIndex] = {
        ...moveToUpdate,
        black: newValue,
        blackValid: validation.valid,
        blackError: validation.valid ? null : (validation.error || 'Invalid move')
      }
    }

    const invalidCount = updatedMoves.reduce((count, move) => {
      if (!move.whiteValid) count++
      if (move.black && !move.blackValid) count++
      return count
    }, 0)

    setMovesData(updatedMoves)
    setInvalidMovesCount(invalidCount)
    setEditableMove(null)
    setEditedMoveValue('')
  }

  const handleCancelEdit = () => {
    setEditableMove(null)
    setEditedMoveValue('')
  }

  const handleGeneratePGN = () => {
    if (invalidMovesCount > 0) {
      setError('Please fix all invalid moves before generating PGN')
      return
    }

    const movesArray: string[] = []
    movesData.forEach(move => {
      movesArray.push(move.white)
      if (move.black) {
        movesArray.push(move.black)
      }
    })

    const parsed = {
      metadata: {},
      moves: movesArray,
      rawText: extractedText,
      confidence: 100
    }

    const pgn = convertToPGN(parsed)
    setPgnOutput(pgn)
    setStatus('completed')
  }

  const activeStep = status === 'idle' || status === 'error' ? 0 : 
                     status === 'uploading' || status === 'processing' ? 1 :
                     status === 'validated' || status === 'completed' ? 2 : 0

  return (
    <>
      <Header />
      <main>
        <section className="py-12 min-h-[calc(100vh-80px)] flex items-center justify-center bg-white">
          <div className="container">
            <Stepper steps={steps} activeStep={activeStep} />
            
            <div className="max-w-[1400px] mx-auto mt-12 px-4">
              {/* Title Section */}
              <div className="text-center mb-8">
                <h1 className="text-[clamp(2rem,4vw,2.5rem)] font-bold text-contrast mb-2">
                  {status === 'completed' ? 'Processing Complete' : 
                   status === 'validated' ? 'Review and Fix Moves' :
                   status === 'processing' || status === 'uploading' ? 'Processing...' :
                   'Upload Your First Page'}
                </h1>
                <p className="text-lg text-contrast/60">
                  {status === 'completed' ? 'Review and download your PGN' :
                   status === 'validated' ? 'Double-click to edit, right-click for more options' :
                   status === 'processing' || status === 'uploading' ? 'Please wait while we process your image' :
                   'One page at a time.'}
                </p>
              </div>

              {/* Error Message */}
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6">
                  <p className="text-red-800 text-sm font-semibold mb-2">{error}</p>
                  {error.includes('Access denied') || error.includes('CREATE_AND_UPDATE') ? (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mt-2 mb-2">
                      <p className="text-yellow-800 text-xs mb-2">
                        <strong>Solution:</strong> Run <code className="bg-yellow-100 px-1 rounded">amplify update storage</code> and set Guest users to have <strong>CREATE_AND_UPDATE</strong> access.
                      </p>
                      <p className="text-yellow-700 text-xs">
                        Then run <code className="bg-yellow-100 px-1 rounded">amplify push</code> to deploy the changes.
                      </p>
                    </div>
                  ) : null}
                  <button
                    onClick={handleReset}
                    className="mt-2 text-red-600 hover:text-red-800 text-sm font-semibold"
                  >
                    Try Again
                  </button>
                </div>
              )}

              {/* Progress Bar */}
              {(status === 'uploading' || status === 'processing') && (
                <div className="mb-8">
                  <div className="w-full bg-gray-200 rounded-full h-2.5">
                    <div
                      className="bg-primary h-2.5 rounded-full transition-all duration-300"
                      style={{ width: `${progress}%` }}
                    ></div>
                  </div>
                  <p className="text-sm text-contrast/60 mt-2 text-center">
                    {status === 'uploading' ? 'Uploading image...' : 'Extracting text with OCR...'}
                  </p>
                </div>
              )}

              {/* Image Preview - Hide when in validated or completed status (shown in side-by-side) */}
              {imagePreview && status !== 'validated' && status !== 'completed' && (
                <div className="mb-6">
                  <img
                    src={imagePreview}
                    alt="Uploaded score sheet"
                    className="w-full rounded-xl border-2 border-primary"
                  />
                </div>
              )}

              {/* Upload Options - Only show when idle or error */}
              {(status === 'idle' || status === 'error') && (
                <>
                  {/* Info Box */}
                  <div className="bg-accent1 border border-primary rounded-xl p-6 mb-8">
                    <div className="flex items-start gap-3 mb-4">
                      <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center flex-shrink-0 mt-0.5">
                        <span className="text-white text-xs font-bold">i</span>
                      </div>
                      <p className="text-contrast text-sm">
                        Write like you want a friend to read it.
                      </p>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center flex-shrink-0 mt-0.5">
                        <span className="text-white text-xs font-bold">i</span>
                      </div>
                      <p className="text-contrast text-sm">
                        Want better accuracy? Legible writing and sharp photo.{' '}
                        <span className="text-primary font-semibold cursor-pointer hover:underline">
                          (Good Example)
                        </span>
                      </p>
                    </div>
                  </div>

                  {/* Upload Options */}
                  <div className="space-y-4">
                    {/* Upload Photo - Always visible */}
                    <button
                      onClick={handleUploadClick}
                      className="w-full bg-white border-2 border-primary rounded-xl p-8 flex flex-col items-center justify-center gap-4 hover:bg-accent1/30 transition-colors duration-300 cursor-pointer"
                    >
                      <div className="w-16 h-16 flex items-center justify-center">
                        <svg
                          viewBox="0 0 24 24"
                          fill="none"
                          className="w-full h-full text-primary"
                        >
                          {/* Sun/Moon */}
                          <circle
                            cx="6"
                            cy="6"
                            r="3"
                            fill="currentColor"
                          />
                          {/* Mountains/Hills */}
                          <path
                            d="M2 20L8 12L14 16L22 8V20H2Z"
                            fill="currentColor"
                          />
                        </svg>
                      </div>
                      <span className="text-primary font-semibold text-lg">
                        Upload Photo
                      </span>
                    </button>

                    {/* Take Photo - Mobile only */}
                    <button
                      onClick={handleTakePhotoClick}
                      className="w-full bg-white border-2 border-primary rounded-xl p-8 flex flex-col items-center justify-center gap-4 hover:bg-accent1/30 transition-colors duration-300 cursor-pointer md:hidden"
                    >
                      <div className="w-16 h-16 flex items-center justify-center">
                        <svg
                          viewBox="0 0 24 24"
                          fill="none"
                          className="w-full h-full text-primary"
                        >
                          <path
                            d="M23 19C23 19.5304 22.7893 20.0391 22.4142 20.4142C22.0391 20.7893 21.5304 21 21 21H3C2.46957 21 1.96086 20.7893 1.58579 20.4142C1.21071 20.0391 1 19.5304 1 19V8C1 7.46957 1.21071 6.96086 1.58579 6.58579C1.96086 6.21071 2.46957 6 3 6H7L9 4H15L17 6H21C21.5304 6 22.0391 6.21071 22.4142 6.58579C22.7893 6.96086 23 7.46957 23 8V19Z"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                          <circle
                            cx="12"
                            cy="13"
                            r="4"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      </div>
                      <span className="text-primary font-semibold text-lg">
                        Take Photo
                      </span>
                    </button>
                  </div>
                </>
              )}

              {/* Moves Table Display */}
              {status === 'validated' && (
                <div className="space-y-6">
                  {/* Invalid Moves Alert */}
                  {invalidMovesCount > 0 && (
                    <div className="bg-red-50 border-2 border-red-300 rounded-xl p-4">
                      <p className="text-red-800 font-semibold text-lg">
                        {invalidMovesCount} {invalidMovesCount === 1 ? 'Move needs to be fixed!!' : 'Moves need to be fixed!!'}
                      </p>
                    </div>
                  )}

                  {/* Side-by-side Layout: Score Sheet Image and Moves Table */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Score Sheet Image */}
                    {imagePreview && (
                      <div className="bg-white border-2 border-primary rounded-xl p-4 overflow-hidden flex flex-col h-[600px]">
                        <h3 className="text-lg font-semibold text-contrast mb-3">Score Sheet</h3>
                        <div className="overflow-auto flex-1 border border-gray-200 rounded-lg">
                          <img
                            src={imagePreview}
                            alt="Uploaded score sheet"
                            className="w-full h-auto"
                          />
                        </div>
                      </div>
                    )}

                    {/* Moves Table */}
                    <div className="bg-white border-2 border-primary rounded-xl overflow-hidden flex flex-col h-[600px]">
                      <div className="p-4 pb-2 border-b border-gray-200">
                        <h3 className="text-lg font-semibold text-contrast">Moves</h3>
                        {movesData.length > 10 && (
                          <p className="text-xs text-gray-500 mt-1">Total: {movesData.length} moves (scroll to view all)</p>
                        )}
                      </div>
                      <div className="overflow-x-auto overflow-y-auto flex-1">
                        <table className="w-full table-fixed">
                        <thead>
                          <tr className="bg-gray-100">
                            <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 border-b border-gray-300 w-20">
                              Move
                            </th>
                            <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 border-b border-gray-300">
                              White
                            </th>
                            <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 border-b border-gray-300">
                              Black
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {movesData.map((move) => (
                            <tr key={move.moveNumber} className="hover:bg-gray-50">
                              <td className="px-4 py-3 text-sm text-gray-600 border-b border-gray-200">
                                {move.moveNumber}
                              </td>
                              {/* White Move Cell */}
                              <td className="px-4 py-3 border-b border-gray-200 overflow-hidden">
                                <div className="min-h-[40px] flex items-center">
                                  {editableMove?.moveNumber === move.moveNumber && editableMove?.color === 'white' ? (
                                    <div className="flex items-center gap-2 w-full">
                                      <input
                                        type="text"
                                        value={editedMoveValue}
                                        onChange={(e) => setEditedMoveValue(e.target.value)}
                                        onKeyDown={(e) => {
                                          if (e.key === 'Enter') {
                                            handleSaveMove(move.moveNumber, 'white')
                                          } else if (e.key === 'Escape') {
                                            handleCancelEdit()
                                          }
                                        }}
                                        autoFocus
                                        className="w-1/2 max-w-[50%] px-2 py-1.5 border border-primary rounded text-sm"
                                      />
                                      <button
                                        onClick={() => handleSaveMove(move.moveNumber, 'white')}
                                        className="px-2 py-1.5 bg-primary text-white rounded text-xs hover:bg-primary/90 whitespace-nowrap flex-shrink-0"
                                      >
                                        ✓
                                      </button>
                                      <button
                                        onClick={handleCancelEdit}
                                        className="px-2 py-1.5 bg-gray-300 text-gray-700 rounded text-xs hover:bg-gray-400 whitespace-nowrap flex-shrink-0"
                                      >
                                        ✕
                                      </button>
                                    </div>
                                  ) : (
                                    <div
                                      className={`flex items-center px-2 py-1.5 rounded cursor-pointer w-full min-h-[40px] ${
                                        !move.whiteValid ? 'border-2 border-red-500 bg-red-50' : ''
                                      }`}
                                      onDoubleClick={() => handleMoveDoubleClick(move.moveNumber, 'white')}
                                      onContextMenu={(e) => handleMoveRightClick(e, move.moveNumber, 'white')}
                                    >
                                      <span className="text-sm">{move.white}</span>
                                      {move.whiteValid && (
                                        <span className="text-green-600 font-bold ml-1">✓</span>
                                      )}
                                    </div>
                                  )}
                                </div>
                              </td>
                              {/* Black Move Cell */}
                              <td className="px-4 py-3 border-b border-gray-200 overflow-hidden">
                                <div className="min-h-[40px] flex items-center">
                                  {editableMove?.moveNumber === move.moveNumber && editableMove?.color === 'black' ? (
                                    <div className="flex items-center gap-2 w-full">
                                      <input
                                        type="text"
                                        value={editedMoveValue}
                                        onChange={(e) => setEditedMoveValue(e.target.value)}
                                        onKeyDown={(e) => {
                                          if (e.key === 'Enter') {
                                            handleSaveMove(move.moveNumber, 'black')
                                          } else if (e.key === 'Escape') {
                                            handleCancelEdit()
                                          }
                                        }}
                                        autoFocus
                                        className="w-1/2 max-w-[50%] px-2 py-1.5 border border-primary rounded text-sm"
                                      />
                                      <button
                                        onClick={() => handleSaveMove(move.moveNumber, 'black')}
                                        className="px-2 py-1.5 bg-primary text-white rounded text-xs hover:bg-primary/90 whitespace-nowrap flex-shrink-0"
                                      >
                                        ✓
                                      </button>
                                      <button
                                        onClick={handleCancelEdit}
                                        className="px-2 py-1.5 bg-gray-300 text-gray-700 rounded text-xs hover:bg-gray-400 whitespace-nowrap flex-shrink-0"
                                      >
                                        ✕
                                      </button>
                                    </div>
                                  ) : (
                                    <div
                                      className={`flex items-center px-2 py-1.5 rounded w-full min-h-[40px] ${move.black ? 'cursor-pointer' : ''} ${
                                        move.black && !move.blackValid ? 'border-2 border-red-500 bg-red-50' : ''
                                      }`}
                                      onDoubleClick={() => move.black && handleMoveDoubleClick(move.moveNumber, 'black')}
                                      onContextMenu={(e) => move.black && handleMoveRightClick(e, move.moveNumber, 'black')}
                                    >
                                      <span className="text-sm">{move.black || '-'}</span>
                                      {move.black && move.blackValid && (
                                        <span className="text-green-600 font-bold ml-1">✓</span>
                                      )}
                                    </div>
                                  )}
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                  </div>

                  {/* Hint */}
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                    <p className="text-blue-800 text-sm">
                      ⓘ Double-click to edit, right-click for more options
                    </p>
                  </div>

                  {/* Continue to PGN Button */}
                  <button
                    onClick={handleGeneratePGN}
                    disabled={invalidMovesCount > 0}
                    className={`w-full py-3 px-4 rounded-xl font-semibold transition-colors ${
                      invalidMovesCount > 0
                        ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                        : 'bg-primary text-white hover:bg-primary/90'
                    }`}
                  >
                    Continue to PGN
                  </button>

                  {/* Extracted Text */}
                  {extractedText && (
                    <div className="bg-accent1 border border-primary rounded-xl p-6">
                      <h3 className="text-lg font-semibold text-contrast mb-3">
                        Extracted Text
                      </h3>
                      <p className="text-sm text-contrast/80 whitespace-pre-wrap max-h-64 overflow-y-auto">
                        {extractedText}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Results Display */}
              {status === 'completed' && (
                <div className="space-y-6">
                  {/* PGN Output */}
                  {pgnOutput && (
                    <div className="bg-white border-2 border-primary rounded-xl p-6">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="text-lg font-semibold text-contrast">
                          PGN Output
                        </h3>
                        <button
                          onClick={handleDownloadPGN}
                          className="bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors text-sm font-semibold"
                        >
                          Download PGN
                        </button>
                      </div>
                      <textarea
                        readOnly
                        value={pgnOutput}
                        className="w-full h-64 p-4 border border-gray-300 rounded-lg font-mono text-sm bg-gray-50 resize-none"
                      />
                    </div>
                  )}

                  {/* Reset Button */}
                  <button
                    onClick={handleReset}
                    className="w-full bg-white border-2 border-primary rounded-xl p-4 text-primary font-semibold hover:bg-accent1/30 transition-colors"
                  >
                    Process Another Image
                  </button>
                </div>
              )}

              {/* Hidden file inputs */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
                disabled={status === 'uploading' || status === 'processing'}
              />
              <input
                ref={cameraInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleCameraChange}
                className="hidden"
                disabled={status === 'uploading' || status === 'processing'}
              />
            </div>
          </div>
        </section>
      </main>
      <Footer />

      {/* Context Menu */}
      {contextMenu && (
        <div
          ref={contextMenuRef}
          className="fixed bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50"
          style={{
            left: `${contextMenu.x}px`,
            top: `${contextMenu.y}px`,
            minWidth: '200px'
          }}
        >
          <button
            onClick={() => handleContextMenuAction('edit')}
            className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            Edit
          </button>
          <button
            onClick={() => handleContextMenuAction('insertBefore')}
            className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Insert before this move
          </button>
          <button
            onClick={() => handleContextMenuAction('insertAfter')}
            className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
            </svg>
            Insert after this move
          </button>
          <button
            onClick={() => handleContextMenuAction('delete')}
            className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            Delete
          </button>
        </div>
      )}
    </>
  )
}

