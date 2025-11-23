import { AmplifyS3ResourceTemplate } from '@aws-amplify/cli-extensibility-helper';

/**
 * Amplify Override for S3 Storage
 * 
 * This override adds a lifecycle policy to automatically delete files older than 7 days.
 * This helps minimize AWS storage costs during development by preventing accumulation
 * of test files.
 * 
 * IMPORTANT: This file uses Amplify Overrides, which is the correct way to customize
 * auto-generated CloudFormation templates. Changes made to build/cloudformation-template.json
 * will be overwritten by Amplify on amplify push.
 * 
 * To apply this override:
 * 1. Run: amplify override storage
 * 2. Select the storage resource: chessstorage
 * 3. Run: amplify push
 */
export function override(resources: AmplifyS3ResourceTemplate) {
  // CORRECT WAY to set Lifecycle Policy in Amplify Gen 1
  // This override will be applied to the S3 bucket configuration
  resources.s3Bucket.lifecycleConfiguration = {
    rules: [
      {
        id: "auto-delete-7-days",
        status: "Enabled",
        expirationInDays: 7,
        abortIncompleteMultipartUpload: {
          daysAfterInitiation: 1
        }
      }
    ]
  };
}

