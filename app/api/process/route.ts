import { NextRequest, NextResponse } from 'next/server'
import { getResults } from '@/lib/aws/storage'

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic'

/**
 * API route to check processing status and retrieve results
 * GET /api/process?key=<s3-key>
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const key = searchParams.get('key')

    if (!key) {
      return NextResponse.json(
        { error: 'Missing key parameter' },
        { status: 400 }
      )
    }

    // Try to get results from S3
    try {
      const results = await getResults(key)
      console.log('✅ Results found for key:', key)
      return NextResponse.json({
        status: 'completed',
        results,
      })
    } catch (error: any) {
      // Results not found - processing might still be in progress
      if (error.message === 'Results not found' || error.message?.includes('not found')) {
        console.log('⏳ Results not found yet for key:', key, '- processing may still be in progress')
        return NextResponse.json({
          status: 'processing',
          message: 'Processing in progress',
        })
      }
      
      // Log other errors for debugging
      console.error('❌ Error getting results for key:', key, error)
      throw error
    }
  } catch (error: any) {
    console.error('Error in process API:', error)
    return NextResponse.json(
      { error: 'Failed to check processing status', details: error.message },
      { status: 500 }
    )
  }
}

