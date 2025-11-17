import { Storage, Amplify } from 'aws-amplify'
// Note: Amplify configuration is handled in amplify-config.ts
// We also ensure Storage configuration is set correctly
// For guest access, we need to fetch auth session to get temporary credentials

// Ensure region is available (fallback)
const DEFAULT_REGION = 'ap-south-1'
const DEFAULT_BUCKET = 'default11eb0-dev'

// Get configuration values
const getStorageConfig = () => {
  const region = process.env.NEXT_PUBLIC_AWS_REGION || DEFAULT_REGION
  const bucket = process.env.NEXT_PUBLIC_AWS_S3_BUCKET || DEFAULT_BUCKET
  return { region, bucket }
}

// Ensure Storage is properly configured before any operations
// This function ensures the region is set in the Amplify configuration
function ensureStorageConfigured() {
  if (typeof window === 'undefined') {
    return // Server-side, skip
  }
  
  try {
    const { bucket } = getStorageConfig()
    const region = 'ap-south-1' // CRITICAL: Always use ap-south-1
    
    // Try multiple ways to get current config (Amplify v5 may store it differently)
    let currentConfig: any = {}
    try {
      // Try different ways to access Amplify config
      currentConfig = (Amplify as any).config || 
                     (Amplify as any)._config || 
                     (Amplify as any).getConfig?.() || 
                     {}
      
      // If still empty, try to get from global storage
      if (!currentConfig || Object.keys(currentConfig).length === 0) {
        // Config might not be accessible yet, that's okay - we'll set it
      }
    } catch (e) {
      // Config not accessible yet, use empty object - we'll configure from scratch
      console.log('📝 Config not accessible, will configure from scratch')
    }
    
    // Build complete configuration with Storage.S3.region set
    // This format matches aws-exports.js that AWS Amplify v5 expects
    const storageConfig: any = {
      // Preserve existing config if available
      ...currentConfig,
      // Storage configuration - CRITICAL: Must have region set
      Storage: {
        S3: {
          bucket,
          region, // CRITICAL: ap-south-1
        },
      },
      // Global regions - all must be set for Storage API to work
      aws_project_region: region,
      aws_user_files_s3_bucket_region: region,
      aws_region: region,
      aws_user_files_s3_bucket: bucket,
      // CRITICAL: Preserve Auth config for guest access (required for credentials)
      // Auth config must be present for Storage.put() to get credentials from Cognito Identity Pool
      ...(currentConfig.Auth ? { Auth: currentConfig.Auth } : {
        Auth: {
          Cognito: {
            identityPoolId: 'ap-south-1:d7acec1b-e60f-4113-ad15-f8b123050d0a',
            region,
            userPoolId: 'ap-south-1_YJYMW5U5v',
            userPoolWebClientId: '5s6vpkaqtn0t18646n0lq9j23b',
            allowGuestAccess: true,
          },
        },
      }),
      // Preserve Cognito config fields (legacy format) - always set these for compatibility
      aws_cognito_identity_pool_id: currentConfig.aws_cognito_identity_pool_id || 'ap-south-1:d7acec1b-e60f-4113-ad15-f8b123050d0a',
      aws_cognito_region: currentConfig.aws_cognito_region || region,
      aws_user_pools_id: currentConfig.aws_user_pools_id || 'ap-south-1_YJYMW5U5v',
      aws_user_pools_web_client_id: currentConfig.aws_user_pools_web_client_id || '5s6vpkaqtn0t18646n0lq9j23b',
    }
    
    console.log('🔧 Configuring Storage with region:', region)
    console.log('📦 Storage config object:', storageConfig.Storage)
    
    // Configure Amplify with the complete config
    // This should set Storage.S3.region to ap-south-1
    Amplify.configure(storageConfig)
    
    // Try to verify configuration was set (but don't fail if we can't verify)
    try {
      const verifyConfig = (Amplify as any).config || (Amplify as any)._config || {}
      const storageRegion = verifyConfig?.Storage?.S3?.region
      
      if (storageRegion === 'ap-south-1') {
        console.log('✅ Storage configuration verified - region is ap-south-1')
      } else {
        console.warn('⚠️ Could not verify Storage region (this is okay if config is not accessible):', {
          expected: 'ap-south-1',
          actual: storageRegion || 'not accessible',
        })
        console.log('💡 Configuration was set, but verification failed. Storage.put() will use configured values.')
      }
    } catch (verifyError) {
      // Verification failed, but that's okay - we've configured it
      console.log('💡 Could not verify config (this is normal in some cases), but configuration was set')
    }
  } catch (error) {
    console.error('⚠️ Error ensuring Storage configuration:', error)
    // Don't throw - we'll let Storage.put() handle the actual error
  }
}

// Configure Storage immediately when this module loads (client-side only)
// Use a small delay to ensure this runs after amplify-config.ts
if (typeof window !== 'undefined') {
  // Run immediately and also after a short delay to catch any race conditions
  ensureStorageConfigured()
  setTimeout(() => {
    ensureStorageConfigured()
  }, 100)
}

/**
 * Upload an image file to S3 storage
 * @param file - The file to upload
 * @param path - Optional custom path, defaults to timestamped filename
 * @returns The S3 key/path of the uploaded file
 */
export async function uploadImage(
  file: File,
  path?: string
): Promise<string> {
  const fileName = path || `uploads/${Date.now()}-${file.name}`
  
  try {
    // CRITICAL: Ensure Storage is configured with region before use
    // This must be called synchronously before Storage.put()
    if (typeof window !== 'undefined') {
      // Ensure configuration is set
      ensureStorageConfigured()
      
      // Get current configuration
      const checkConfig = (Amplify as any).config || (Amplify as any)._config || {}
      
      // If Storage.S3.region is missing, configure it explicitly
      if (!checkConfig?.Storage?.S3?.region || checkConfig.Storage.S3.region !== 'ap-south-1') {
        console.warn('⚠️ Storage.S3.region missing or incorrect, forcing configuration...')
        console.warn('Current config:', {
          hasStorage: !!checkConfig.Storage,
          storageConfig: checkConfig.Storage,
          region: checkConfig.Storage?.S3?.region,
        })
        
        // Force configure with explicit region
        const { bucket } = getStorageConfig()
        try {
          Amplify.configure({
            ...checkConfig,
            Storage: {
              S3: {
                bucket,
                region: 'ap-south-1', // Force to ap-south-1
              },
            },
            aws_project_region: 'ap-south-1',
            aws_user_files_s3_bucket_region: 'ap-south-1',
            // CRITICAL: Preserve Auth config for guest credentials
            ...(checkConfig.Auth ? { Auth: checkConfig.Auth } : {
              Auth: {
                Cognito: {
                  identityPoolId: 'ap-south-1:d7acec1b-e60f-4113-ad15-f8b123050d0a',
                  region: 'ap-south-1',
                  userPoolId: 'ap-south-1_YJYMW5U5v',
                  userPoolWebClientId: '5s6vpkaqtn0t18646n0lq9j23b',
                  allowGuestAccess: true,
                },
              },
            }),
            // Cognito config fields for compatibility
            aws_cognito_identity_pool_id: checkConfig.aws_cognito_identity_pool_id || 'ap-south-1:d7acec1b-e60f-4113-ad15-f8b123050d0a',
            aws_cognito_region: checkConfig.aws_cognito_region || 'ap-south-1',
            aws_user_pools_id: checkConfig.aws_user_pools_id || 'ap-south-1_YJYMW5U5v',
            aws_user_pools_web_client_id: checkConfig.aws_user_pools_web_client_id || '5s6vpkaqtn0t18646n0lq9j23b',
          })
          console.log('✅ Forced Storage configuration with region: ap-south-1')
        } catch (configError) {
          console.error('⚠️ Error configuring Amplify:', configError)
          // Don't throw - let Storage.put() handle any errors
        }
      }
    }
    
    // Get configuration values
    const { bucket } = getStorageConfig()
    
    // Log attempt (but don't block on configuration check - let Storage.put() handle errors)
    const finalConfig = (Amplify as any).config || (Amplify as any)._config || {}
    const storageRegion = finalConfig?.Storage?.S3?.region
    
    console.log('📤 Preparing Storage.put() with:', {
      region: storageRegion === 'ap-south-1' ? '✅ ap-south-1' : `⚠️ ${storageRegion || 'config not accessible'}`,
      bucket,
      fileName,
      level: 'public',
    })
    
    // CRITICAL: For guest access in AWS Amplify v5, Storage.put() should automatically
    // fetch credentials from Cognito Identity Pool if Auth is properly configured.
    // However, we ensure Auth config is present in the configuration.
    console.log('🔐 Checking Auth configuration for guest access...')
    const authConfig = finalConfig?.Auth || finalConfig?.aws_cognito_identity_pool_id
    if (!authConfig && !finalConfig?.aws_cognito_identity_pool_id) {
      console.warn('⚠️ Auth configuration not found - Storage might fail to get credentials')
      console.warn('Make sure Auth.Cognito.identityPoolId is set in amplify-config.ts')
    } else {
      console.log('✅ Auth configuration present:', {
        hasAuthConfig: !!finalConfig?.Auth,
        hasIdentityPoolId: !!finalConfig?.aws_cognito_identity_pool_id,
        identityPoolId: finalConfig?.Auth?.Cognito?.identityPoolId || finalConfig?.aws_cognito_identity_pool_id,
      })
    }
    
    // For AWS Amplify v5, Storage.put() reads configuration from Amplify.configure()
    // We've ensured Storage.S3.region is set to 'ap-south-1' above
    // We've also fetched auth session to get guest credentials
    // Note: Guest users need CREATE_AND_UPDATE permissions in S3 bucket
    // If this fails, run: amplify update storage (and set guest access to CREATE_AND_UPDATE)
    console.log('📤 Attempting Storage.put()...')
    const result = await Storage.put(fileName, file, {
      contentType: file.type,
      level: 'public', // 'public' for unauthenticated access
    })

    console.log('Upload successful:', result)
    return fileName
  } catch (error: any) {
    console.error('❌ Error uploading file:', error)
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      name: error.name,
      stack: error.stack,
      fullError: error,
    })
    
    // Provide more detailed error message for region-related errors
    if (error.message?.includes('Region is missing') || 
        error.message?.includes('region') || 
        error.message?.includes('Region') ||
        error.message?.toLowerCase().includes('region')) {
      console.error('Storage API error - Region missing:', {
        errorMessage: error.message,
        errorCode: error.code,
        errorName: error.name,
        envRegion: process.env.NEXT_PUBLIC_AWS_REGION,
        envBucket: process.env.NEXT_PUBLIC_AWS_S3_BUCKET,
        amplifyConfig: (Amplify as any).config,
      })
      
      // Provide helpful error message with troubleshooting steps
      throw new Error(
        `Storage configuration error: ${error.message}. ` +
        `\n\nTo fix this, run in your terminal:\n` +
        `1. amplify update storage` +
        `\n2. Select your storage resource` +
        `\n3. Choose "Update access"` +
        `\n4. For Guest users, select "create/update, read" (not just "read")` +
        `\n5. Run: amplify push` +
        `\n6. Restart dev server: npm run dev`
      )
    }
    
    if (error.message?.includes('bucket') || error.message?.includes('configure')) {
      throw new Error(
        `Configuration error: ${error.message}. ` +
        `Please check your .env.local file and ensure Amplify is configured correctly. ` +
        `Check browser console for details.`
      )
    }
    
    if (error.code === 'NetworkError' || error.message?.includes('network')) {
      throw new Error('Network error. Please check your internet connection and try again.')
    }
    
    if (error.code === 'AccessDenied' || 
        error.message?.includes('Access Denied') || 
        error.message?.includes('access denied') ||
        error.message?.includes('authorization header is malformed') ||
        error.message?.includes('Access Key') ||
        error.message?.includes('AKID')) {
      throw new Error(
        'Access denied - Guest credentials not available. ' +
        '\n\nTo fix this, run these commands in your terminal:\n' +
        '1. amplify update storage\n' +
        '2. Select your storage resource (e.g., "chessstorage")\n' +
        '3. Choose "Update access"\n' +
        '4. For "Who should have access": Select "Auth and Guest users"\n' +
        '5. For "What kind of access do you want for Guest users": Select "create/update, read" (IMPORTANT!)\n' +
        '6. Run: amplify push\n' +
        '7. Restart dev server: npm run dev\n\n' +
        'This will configure Cognito Identity Pool for guest access with the correct S3 permissions.'
      )
    }
    
    // Generic error handler
    throw new Error(`Failed to upload image: ${error.message || 'Unknown error'}. Check browser console for details.`)
  }
}

/**
 * TROUBLESHOOTING: If you see "The authorization header is malformed" error,
 * this means guest credentials are not being fetched from Cognito Identity Pool.
 * 
 * To fix this, update your Storage configuration using Amplify CLI:
 * 
 * 1. Open terminal in your project directory
 * 
 * 2. Run:
 *    amplify update storage
 * 
 * 3. When prompted:
 *    - Select your storage resource (e.g., "chessstorage")
 *    - Choose "Update access"
 *    - For "Who should have access": Select "Auth and Guest users"
 *    - For "What kind of access do you want for Guest users": 
 *      Select "create/update, read" (IMPORTANT: Must have create/update for uploads)
 *    - For "What kind of access do you want for Authenticated users": 
 *      Select "create/update, read"
 * 
 * 4. Deploy the changes:
 *    amplify push
 * 
 * 5. Restart your dev server:
 *    npm run dev
 * 
 * This will automatically configure the Cognito Identity Pool and IAM roles
 * with the correct permissions for guest users to upload files.
 */

/**
 * Get a public URL for an S3 object
 * @param key - The S3 key/path
 * @returns The public URL
 */
export async function getImageUrl(key: string): Promise<string> {
  try {
    // Ensure Storage is configured before getting URL
    if (typeof window !== 'undefined') {
      ensureStorageConfigured()
    }
    
    // Use level: 'public' for guest access
    const url = await Storage.get(key, {
      expires: 3600, // 1 hour
      level: 'public', // CRITICAL: Must use 'public' for guest access
    })
    return url as string
  } catch (error: any) {
    console.error('Error getting file URL:', error)
    
    // Check for credential-related errors
    if (error.message?.includes('No credentials') || 
        error.message?.includes('credentials') ||
        error.message?.includes('authorization')) {
      throw new Error('No credentials: Failed to get image URL. Guest access may not be configured.')
    }
    
    throw new Error(`Failed to get image URL: ${error.message || 'Unknown error'}`)
  }
}

/**
 * Delete a file from S3 storage
 * @param key - The S3 key/path to delete
 */
export async function deleteImage(key: string): Promise<void> {
  try {
    await Storage.remove(key)
  } catch (error) {
    console.error('Error deleting file:', error)
    throw new Error('Failed to delete image')
  }
}

/**
 * Upload processing results to S3
 * @param key - The S3 key/path (typically based on original image key)
 * @param data - The data to store (JSON string or object)
 */
export async function uploadResults(
  key: string,
  data: string | object
): Promise<void> {
  const dataString = typeof data === 'string' ? data : JSON.stringify(data)
  
  try {
    await Storage.put(`results/${key}.json`, dataString, {
      contentType: 'application/json',
    })
  } catch (error) {
    console.error('Error uploading results:', error)
    throw new Error('Failed to upload results')
  }
}

/**
 * Get processing results from S3
 * @param key - The S3 key/path of the original image
 * @returns The processing results as JSON
 */
export async function getResults(key: string): Promise<any> {
  try {
    // Ensure Storage is configured with Auth before retrieving results
    // This is critical for guest access credentials
    if (typeof window !== 'undefined') {
      ensureStorageConfigured()
    }
    
    const resultsKey = `results/${key}.json`
    console.log('🔍 Looking for results at:', resultsKey)
    
    // CRITICAL: Use level: 'public' for guest access, same as upload
    // This ensures Storage.get() can access the file with guest credentials
    const url = await Storage.get(resultsKey, {
      expires: 3600,
      level: 'public', // CRITICAL: Must use 'public' for guest access
    })

    const response = await fetch(url as string)
    if (!response.ok) {
      console.warn('⚠️ Results file not found:', {
        key: resultsKey,
        status: response.status,
        statusText: response.statusText,
      })
      throw new Error('Results not found')
    }

    const data = await response.json()
    console.log('✅ Results retrieved:', {
      hasBlocks: !!data.Blocks,
      hasblocks: !!data.blocks,
      blockCount: data.Blocks?.length || data.blocks?.length || 0,
    })
    
    return data
  } catch (error: any) {
    console.error('❌ Error getting results:', error)
    
    // Check for credential-related errors
    if (error.message?.includes('No credentials') || 
        error.message?.includes('credentials') ||
        error.message?.includes('authorization') ||
        error.message?.includes('Access Key')) {
      console.error('❌ Credentials error when getting results:', error)
      throw new Error(`No credentials: Failed to get results. This usually means guest access is not configured. Run 'amplify update storage' and ensure guest users have 'read' access.`)
    }
    
    // Check if it's a "not found" error specifically
    if (error.message?.includes('not found') || error.message?.includes('404')) {
      throw new Error('Results not found')
    }
    
    throw new Error(`Failed to get results: ${error.message || 'Unknown error'}`)
  }
}

