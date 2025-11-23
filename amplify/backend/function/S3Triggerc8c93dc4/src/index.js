const AWS = require('aws-sdk');
const { correctOCRErrors } = require('./chess-validator');

// Initialize AWS services with explicit region configuration for optimal performance
const region = process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION || 'ap-south-1';
const s3 = new AWS.S3({ region });
const textract = new AWS.Textract({ region });

exports.handler = async (event) => {
  const startTime = Date.now();
  console.log('🚀 Lambda function invoked:', { 
    eventTime: new Date().toISOString(),
    region,
    recordsCount: event.Records?.length,
    event: JSON.stringify(event, null, 2)
  });

  // Validate event structure
  if (!event.Records || event.Records.length === 0) {
    console.error('❌ Invalid event: No Records found');
    throw new Error('Invalid S3 event: No Records found');
  }

  try {
    // Extract S3 event details
    const s3Record = event.Records[0].s3;
    if (!s3Record || !s3Record.bucket || !s3Record.object) {
      console.error('❌ Invalid S3 event structure:', JSON.stringify(event, null, 2));
      throw new Error('Invalid S3 event structure');
    }

    const bucket = s3Record.bucket.name;
    const key = decodeURIComponent(s3Record.object.key.replace(/\+/g, ' '));
    
    console.log('📄 Processing document:', { bucket, key });

    // Skip processing results files to avoid infinite loops
    if (key.startsWith('results/')) {
      console.log('⏭️ Skipping results file:', key);
      return {
        statusCode: 200,
        body: JSON.stringify({ message: 'Skipped results file' })
      };
    }

    // Configure Textract parameters - using analyzeDocument with TABLES feature only for cost optimization
    const textractParams = {
      Document: {
        S3Object: {
          Bucket: bucket,
          Name: key
        }
      },
      FeatureTypes: ['TABLES']  // Strictly TABLES only - excludes FORMS/QUERIES to save cost
    };

    // Call Textract analyzeDocument API - optimized for table structure extraction
    console.log('🔍 Starting Textract OCR with TABLES feature...', { bucket, key });
    const textractStartTime = Date.now();
    
    let textractData;
    try {
      textractData = await textract.analyzeDocument(textractParams).promise();
    } catch (textractError) {
      console.error('❌ Textract API error:', {
        error: textractError.message,
        code: textractError.code,
        statusCode: textractError.statusCode,
        requestId: textractError.requestId
      });
      
      // Provide helpful error message for subscription/service not enabled
      if (textractError.code === 'SubscriptionRequiredException' || 
          textractError.message?.includes('subscription') ||
          textractError.message?.includes('subscription')) {
        const helpfulMessage = `Textract service is not enabled in your AWS account. ` +
          `Please enable Textract in AWS Console: https://console.aws.amazon.com/textract/ ` +
          `Make sure you're in the ${region} region. ` +
          `See ENABLE_TEXTRACT.md for detailed instructions.`;
        console.error('💡', helpfulMessage);
        throw new Error(helpfulMessage);
      }
      
      throw new Error(`Textract failed: ${textractError.message} (Code: ${textractError.code})`);
    }
    
    const textractDuration = Date.now() - textractStartTime;
    const originalBlocksCount = textractData.Blocks?.length || 0;
    console.log(`✅ Textract completed in ${textractDuration}ms`, {
      originalBlocksCount
    });

    // Filter blocks to only TABLE and CELL types for cost optimization
    // This reduces data size and processing overhead by excluding LINE, WORD, PAGE, etc.
    const filteredBlocks = (textractData.Blocks || []).filter(
      block => block.BlockType === 'TABLE' || block.BlockType === 'CELL'
    );

    // Update response to only include filtered table blocks
    textractData.Blocks = filteredBlocks;
    
    const filteredBlocksCount = filteredBlocks.length;
    console.log(`📊 Block filtering: ${originalBlocksCount} total blocks → ${filteredBlocksCount} table blocks (TABLE/CELL only)`, {
      originalBlocksCount,
      filteredBlocksCount,
      filteredPercent: originalBlocksCount > 0 ? ((filteredBlocksCount / originalBlocksCount) * 100).toFixed(1) + '%' : '0%'
    });

    // Extract, validate, and correct chess moves using fuzzy matching
    console.log('♟️ Starting chess move validation and OCR correction...');
    const validationStartTime = Date.now();
    
    let validationResult;
    try {
      validationResult = correctOCRErrors(filteredBlocks);
      
      const validationDuration = Date.now() - validationStartTime;
      console.log(`✅ Move validation completed in ${validationDuration}ms`, {
        totalMoves: validationResult.stats.total,
        validMoves: validationResult.stats.valid,
        correctedMoves: validationResult.stats.corrected,
        invalidMoves: validationResult.stats.invalid,
        correctionRate: validationResult.stats.total > 0 
          ? ((validationResult.stats.corrected / validationResult.stats.total) * 100).toFixed(1) + '%'
          : '0%'
      });
      
      if (validationResult.corrections.length > 0) {
        console.log('📝 Corrections made:', validationResult.corrections.slice(0, 10).map(c => 
          c.corrected ? `${c.original} → ${c.corrected}` : `${c.original} (invalid)`
        ));
      }
    } catch (validationError) {
      console.error('⚠️ Chess validation error (continuing without validation):', {
        error: validationError.message,
        stack: validationError.stack
      });
      // Continue without validation if there's an error
      validationResult = {
        originalMoves: [],
        correctedMoves: [],
        corrections: [],
        stats: { total: 0, valid: 0, corrected: 0, invalid: 0 }
      };
    }

    // Enhance results with validated and corrected moves
    textractData.chessValidation = {
      originalMoves: validationResult.originalMoves,
      correctedMoves: validationResult.correctedMoves,
      corrections: validationResult.corrections,
      stats: validationResult.stats,
      timestamp: new Date().toISOString()
    };

    // Save filtered results to S3 (only TABLE and CELL blocks + validation results)
    const resultKey = `results/${key}.json`;
    console.log('💾 Saving results to S3:', { bucket, resultKey });
    
    try {
      await s3.putObject({
        Bucket: bucket,
        Key: resultKey,
        Body: JSON.stringify(textractData),
        ContentType: 'application/json',
        CacheControl: 'max-age=3600'
      }).promise();
      console.log('✅ Results saved successfully to:', resultKey);
    } catch (s3Error) {
      console.error('❌ S3 PutObject error:', {
        error: s3Error.message,
        code: s3Error.code,
        bucket,
        key: resultKey
      });
      throw new Error(`Failed to save results to S3: ${s3Error.message}`);
    }

    const totalDuration = Date.now() - startTime;
    console.log(`✅ Processing complete in ${totalDuration}ms`, {
      resultKey,
      textractDuration,
      totalDuration,
      originalBlocksCount,
      filteredBlocksCount: textractData.Blocks?.length || 0,
      movesValidated: validationResult.stats.total,
      movesCorrected: validationResult.stats.corrected
    });

    return { 
      statusCode: 200, 
      body: JSON.stringify({ 
        message: 'Processing complete',
        duration: totalDuration,
        originalBlocksCount,
        filteredBlocksCount: textractData.Blocks?.length || 0,
        movesValidated: validationResult.stats.total,
        movesCorrected: validationResult.stats.corrected,
        resultKey
      })
    };
  } catch (error) {
    const totalDuration = Date.now() - startTime;
    console.error('❌ Error processing document:', {
      error: error.message,
      code: error.code,
      statusCode: error.statusCode,
      stack: error.stack,
      duration: totalDuration,
      event: JSON.stringify(event, null, 2)
    });
    
    // Re-throw to trigger Lambda retry mechanism
    throw error;
  }
};