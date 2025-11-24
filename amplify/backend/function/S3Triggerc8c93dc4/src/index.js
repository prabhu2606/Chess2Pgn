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
    const originalKey = decodeURIComponent(s3Record.object.key.replace(/\+/g, ' '));
    
    console.log('📄 Processing document:', { bucket, originalKey });

    // Skip processing results files to avoid infinite loops
    if (originalKey.startsWith('results/') || originalKey.startsWith('public/results/')) {
      console.log('⏭️ Skipping results file:', originalKey);
      return {
        statusCode: 200,
        body: JSON.stringify({ message: 'Skipped results file' })
      };
    }

    // IMPORTANT: Use originalKey for Textract (file is stored with 'public/' prefix in S3)
    // But normalize key for results path (frontend expects results without 'public/' prefix)
    const normalizedKey = originalKey.startsWith('public/') 
      ? originalKey.substring(7) // Remove 'public/' prefix for results path
      : originalKey;
    
    if (originalKey !== normalizedKey) {
      console.log('📝 Key normalization:', { 
        original: originalKey, 
        normalized: normalizedKey,
        note: 'Using originalKey for Textract, normalizedKey for results path'
      });
    }

    // Configure Textract parameters - using analyzeDocument with TABLES feature only for cost optimization
    // CRITICAL: Use originalKey here because the file is stored with 'public/' prefix in S3
    const textractParams = {
      Document: {
        S3Object: {
          Bucket: bucket,
          Name: originalKey  // Use original key (with public/ prefix) for Textract
        }
      },
      FeatureTypes: ['TABLES']  // Strictly TABLES only - excludes FORMS/QUERIES to save cost
    };

    // Call Textract analyzeDocument API - optimized for table structure extraction
    console.log('🔍 Starting Textract OCR with TABLES feature...', { bucket, key: originalKey });
    const textractStartTime = Date.now();
    
    const textractPromise = textract.analyzeDocument(textractParams).promise();
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Textract timeout after 30 seconds')), 30000)
    );

    let textractData;
    try {
      textractData = await Promise.race([textractPromise, timeoutPromise]);
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

    // CRITICAL: Keep WORD blocks too - CELL blocks may reference them via relationships
    // Filter blocks to TABLE, CELL, and WORD types
    // WORD blocks are needed to extract text from CELL blocks that use relationships
    const allBlocks = textractData.Blocks || [];
    const blockMap = {}; // Map block Id to block for relationship resolution
    allBlocks.forEach(block => {
      if (block.Id) {
        blockMap[block.Id] = block;
      }
    });
    
    const filteredBlocks = allBlocks.filter(
      block => block.BlockType === 'TABLE' || block.BlockType === 'CELL' || block.BlockType === 'WORD'
    );

    // Build text for CELL blocks that don't have direct Text property
    // Some CELL blocks use Relationships to reference WORD blocks
    filteredBlocks.forEach(block => {
      if (block.BlockType === 'CELL' && !block.Text && block.Relationships) {
        // Extract text from related WORD blocks
        const wordTexts = [];
        block.Relationships.forEach(rel => {
          if (rel.Type === 'CHILD' && rel.Ids) {
            rel.Ids.forEach(wordId => {
              const wordBlock = blockMap[wordId];
              if (wordBlock && wordBlock.BlockType === 'WORD' && wordBlock.Text) {
                wordTexts.push(wordBlock.Text);
              }
            });
          }
        });
        if (wordTexts.length > 0) {
          block.Text = wordTexts.join(' ').trim();
        }
      }
    });

    // Update response to only include filtered table blocks
    textractData.Blocks = filteredBlocks;
    
    const filteredBlocksCount = filteredBlocks.length;
    const tableBlocks = filteredBlocks.filter(b => b.BlockType === 'TABLE').length;
    const cellBlocks = filteredBlocks.filter(b => b.BlockType === 'CELL');
    const wordBlocks = filteredBlocks.filter(b => b.BlockType === 'WORD').length;
    
    console.log(`📊 Block filtering: ${originalBlocksCount} total blocks → ${filteredBlocksCount} blocks (TABLE/CELL/WORD)`, {
      originalBlocksCount,
      filteredBlocksCount,
      tableBlocks,
      cellBlocks: cellBlocks.length,
      wordBlocks,
      filteredPercent: originalBlocksCount > 0 ? ((filteredBlocksCount / originalBlocksCount) * 100).toFixed(1) + '%' : '0%'
    });

    // Extract, validate, and correct chess moves using fuzzy matching
    console.log('♟️ Starting chess move validation and OCR correction...');
    const cellsWithText = cellBlocks.filter(b => b.Text && b.Text.trim().length > 0);
    console.log('📋 Filtered blocks info:', {
      totalBlocks: filteredBlocks.length,
      cellBlocks: cellBlocks.length,
      cellsWithText: cellsWithText.length,
      tableBlocks: tableBlocks,
      wordBlocks: wordBlocks,
      sampleCells: cellsWithText.slice(0, 20).map(b => ({
        text: b.Text,
        row: b.RowIndex,
        col: b.ColumnIndex,
        confidence: b.Confidence,
        hasRelationships: !!b.Relationships
      })),
      allCellTexts: cellsWithText.map(b => b.Text).filter(t => t && t.trim().length > 0).slice(0, 50),
      // Debug: Show sample CELL blocks without text
      cellsWithoutText: cellBlocks.filter(b => !b.Text || !b.Text.trim()).slice(0, 5).map(b => ({
        id: b.Id,
        row: b.RowIndex,
        col: b.ColumnIndex,
        hasRelationships: !!b.Relationships,
        relationshipTypes: b.Relationships ? b.Relationships.map(r => r.Type) : []
      }))
    });
    const validationStartTime = Date.now();
    
    let validationResult;
    try {
      validationResult = correctOCRErrors(filteredBlocks);
      
      console.log('📊 Extracted moves before validation:', {
        totalMoves: validationResult.originalMoves.length,
        sampleMoves: validationResult.originalMoves.slice(0, 20)
      });
      
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
    // IMPORTANT: Use 'public/results/' prefix to match Amplify Storage behavior
    // When frontend uses Storage.get() with level: 'public', it automatically adds 'public/' prefix
    // So we need to save with 'public/' prefix so the paths match
    // Use normalizedKey (without public/) for results path consistency
    const resultKey = `public/results/${normalizedKey}.json`;
    console.log('💾 Saving results to S3:', { bucket, resultKey });
    
    try {
      const putObjectParams = {
        Bucket: bucket,
        Key: resultKey,
        Body: JSON.stringify(textractData),
        ContentType: 'application/json',
        CacheControl: 'max-age=3600'
      };
      
      console.log('💾 Attempting to save results with params:', {
        bucket,
        key: resultKey,
        bodySize: JSON.stringify(textractData).length,
        contentType: 'application/json'
      });
      
      await s3.putObject(putObjectParams).promise();
      console.log('✅ Results saved successfully to:', resultKey);
      
      // Verify the file was actually saved (wait a moment for eventual consistency)
      await new Promise(resolve => setTimeout(resolve, 500));
      
      try {
        const headResult = await s3.headObject({
          Bucket: bucket,
          Key: resultKey
        }).promise();
        console.log('✅ Verified file exists in S3:', {
          key: resultKey,
          size: headResult.ContentLength,
          lastModified: headResult.LastModified,
          etag: headResult.ETag
        });
      } catch (verifyError) {
        console.error('⚠️ Warning: Could not verify saved file:', {
          error: verifyError.message,
          code: verifyError.code,
          key: resultKey
        });
        // Don't throw - file might still be saved but not immediately visible (eventual consistency)
      }
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