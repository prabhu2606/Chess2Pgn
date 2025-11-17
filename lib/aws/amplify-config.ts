import { Amplify } from 'aws-amplify'

// Use values from aws-exports.js format
// The aws-exports.js file has: aws_user_files_s3_bucket_region: "ap-south-1"
// We'll use this format in our configuration

// Amplify configuration
// This uses aws-exports.js if available, otherwise uses environment variables or hardcoded values
const getAmplifyConfig = () => {
  // Get values from environment variables or use defaults (matching aws-exports.js)
  // CRITICAL: Region must be 'ap-south-1' as specified
  const bucket = process.env.NEXT_PUBLIC_AWS_S3_BUCKET || 'default11eb0-dev'
  const finalRegion = 'ap-south-1' // Hard-coded to ap-south-1 as required
  
  // Log configuration for debugging (only on client side)
  if (typeof window !== 'undefined') {
    console.log('Amplify config values:', {
      bucket,
      region: finalRegion,
      hasEnvBucket: !!process.env.NEXT_PUBLIC_AWS_S3_BUCKET,
      hasEnvRegion: !!process.env.NEXT_PUBLIC_AWS_REGION,
    })
  }
  
  // Cognito Identity Pool configuration for guest access (from aws-exports.js values)
  const identityPoolId = 'ap-south-1:d7acec1b-e60f-4113-ad15-f8b123050d0a'
  
  // Configure Amplify with Storage and Auth (for guest access)
  // Match aws-exports.js format exactly but add Storage object which Storage API needs
  const config: any = {
    // Storage configuration - REQUIRED by AWS Amplify v5 Storage API
    // This is the format the Storage.put() method looks for
    Storage: {
      S3: {
        bucket,
        region: finalRegion, // CRITICAL: Must be ap-south-1
      },
    },
    // Global AWS region fields (from aws-exports.js format)
    aws_project_region: finalRegion,
    aws_user_files_s3_bucket_region: finalRegion,
    aws_user_files_s3_bucket: bucket,
    aws_region: finalRegion,
    // Auth configuration for guest access via Cognito Identity Pool
    Auth: {
      Cognito: {
        identityPoolId,
        region: finalRegion,
        userPoolId: 'ap-south-1_YJYMW5U5v',
        userPoolWebClientId: '5s6vpkaqtn0t18646n0lq9j23b',
        allowGuestAccess: true,
      },
    },
    // AWS Cognito configuration (from aws-exports.js format)
    aws_cognito_region: finalRegion,
    aws_user_pools_id: 'ap-south-1_YJYMW5U5v',
    aws_user_pools_web_client_id: '5s6vpkaqtn0t18646n0lq9j23b',
    aws_cognito_identity_pool_id: identityPoolId,
  }
  
  // Log full config for debugging
  if (typeof window !== 'undefined') {
    console.log('Full Amplify configuration:', config)
    console.log('Storage.S3 configuration:', config.Storage?.S3)
  }
  
  return config
}

const amplifyConfig = getAmplifyConfig()

// Configure Amplify only on client side
if (typeof window !== 'undefined') {
  try {
    // Configure Amplify with the config object
    // This must be called before any Storage API calls
    Amplify.configure(amplifyConfig)
    
    // Verify the configuration was applied correctly
    // Check if Storage configuration is accessible
    const storageRegion = amplifyConfig.Storage?.S3?.region
    const storageBucket = amplifyConfig.Storage?.S3?.bucket
    
    // Log successful configuration with detailed info
    console.log('✅ Amplify configured successfully', {
      'Storage.S3.bucket': storageBucket,
      'Storage.S3.region': storageRegion,
      'aws_project_region': amplifyConfig.aws_project_region,
      'aws_user_files_s3_bucket_region': amplifyConfig.aws_user_files_s3_bucket_region,
      'aws_region': amplifyConfig.aws_region,
      'aws_user_files_s3_bucket': amplifyConfig.aws_user_files_s3_bucket,
      hasAuth: !!amplifyConfig.Auth,
    })
    
    // Verify configuration is complete
    if (!storageRegion) {
      console.error('❌ ERROR: Storage.S3.region is missing from configuration!')
      console.error('Configuration object:', JSON.stringify(amplifyConfig, null, 2))
    } else if (storageRegion !== 'ap-south-1') {
      console.warn(`⚠️ WARNING: Storage.S3.region is ${storageRegion}, expected ap-south-1`)
    } else {
      console.log('✅ Region confirmed: ap-south-1')
    }
  } catch (error: any) {
    console.error('❌ Error configuring Amplify:', error)
    console.error('Configuration was:', JSON.stringify(amplifyConfig, null, 2))
    throw error // Re-throw to make the error visible
  }
}

export default amplifyConfig

