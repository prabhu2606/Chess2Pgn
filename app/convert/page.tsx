'use client'

import { useRef, useState, useEffect } from 'react'
import Header from '@/components/layout/Header'
import Footer from '@/components/layout/Footer'
import Stepper from '@/components/ui/Stepper'
import { uploadImage, getResults } from '@/lib/aws/storage'
import { parseTextractResponse } from '@/lib/pgn/parser'
import { convertToPGN, downloadPGN } from '@/lib/pgn/converter'

const steps = [
  { label: 'Upload', number: 1 },
  { label: 'Moves', number: 2 },
  { label: 'Info', number: 3 },
  { label: 'Done', number: 4 },
]

type ProcessingStatus = 'idle' | 'uploading' | 'processing' | 'completed' | 'error'

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

  const pollForResults = async (key: string, maxAttempts = 40) => {
    console.log('🔄 Starting to poll for results:', { key, maxAttempts })
    
    // Set a hard timeout of 60 seconds total
    const hardTimeout = 60000 // 60 seconds
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
          '4. Lambda timeout - Check Lambda function timeout settings (should be 30s)\n\n' +
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
            })
            
            // Process the results
            const textractResponse = {
              Blocks: results.Blocks || results.blocks || [],
            }
            const parsed = parseTextractResponse(textractResponse)
            const pgn = convertToPGN(parsed)

            clearTimeout(timeoutId)
            setExtractedText(parsed.rawText)
            setPgnOutput(pgn)
            setStatus('completed')
            setProgress(100)
            console.log('✅ Processing complete!')
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
          '4. Lambda timeout - Check Lambda function timeout settings (should be 30s)\n\n' +
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
  }

  const activeStep = status === 'idle' || status === 'error' ? 0 : 
                     status === 'uploading' || status === 'processing' ? 1 :
                     status === 'completed' ? 2 : 0

  return (
    <>
      <Header />
      <main>
        <section className="py-12 min-h-[calc(100vh-80px)] flex items-center justify-center bg-white">
          <div className="container">
            <Stepper steps={steps} activeStep={activeStep} />
            
            <div className="max-w-[600px] mx-auto mt-12">
              {/* Title Section */}
              <div className="text-center mb-8">
                <h1 className="text-[clamp(2rem,4vw,2.5rem)] font-bold text-contrast mb-2">
                  {status === 'completed' ? 'Processing Complete' : 
                   status === 'processing' || status === 'uploading' ? 'Processing...' :
                   'Upload Your First Page'}
                </h1>
                <p className="text-lg text-contrast/60">
                  {status === 'completed' ? 'Review and download your PGN' :
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

              {/* Image Preview */}
              {imagePreview && (
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

              {/* Results Display */}
              {status === 'completed' && (
                <div className="space-y-6">
                  {/* Extracted Text */}
                  {extractedText && (
                    <div className="bg-accent1 border border-primary rounded-xl p-6">
                      <h3 className="text-lg font-semibold text-contrast mb-3">
                        Extracted Text
                      </h3>
                      <p className="text-sm text-contrast/80 whitespace-pre-wrap">
                        {extractedText}
                      </p>
                    </div>
                  )}

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
    </>
  )
}

