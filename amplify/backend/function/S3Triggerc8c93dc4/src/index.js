const AWS = require('aws-sdk');

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

    // Configure Textract parameters - using synchronous API for fast processing
    const textractParams = {
      Document: {
        S3Object: {
          Bucket: bucket,
          Name: key
        }
      }
    };

    // Call Textract - synchronous API returns results in 1-3 seconds typically
    console.log('🔍 Starting Textract OCR...', { bucket, key });
    const textractStartTime = Date.now();
    
    let textractData;
    try {
      textractData = await textract.detectDocumentText(textractParams).promise();
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
    console.log(`✅ Textract completed in ${textractDuration}ms`, {
      blocksCount: textractData.Blocks?.length || 0
    });

    // Save results to S3
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
      blocksCount: textractData.Blocks?.length || 0
    });

    return { 
      statusCode: 200, 
      body: JSON.stringify({ 
        message: 'Processing complete',
        duration: totalDuration,
        blocksCount: textractData.Blocks?.length || 0,
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