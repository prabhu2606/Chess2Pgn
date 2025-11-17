# Deployment Instructions - Fix Lambda Timeout Issue

## Problem
The Lambda function is timing out because it was missing IAM permissions for S3 and Textract.

## Changes Made
1. ✅ Added S3 permissions (`GetObject`, `PutObject`) to Lambda execution role
2. ✅ Added Textract permissions (`DetectDocumentText`) to Lambda execution role  
3. ✅ Improved Lambda function error handling and logging
4. ✅ Added protection against infinite loops (skips processing results files)

## Required Actions

### Step 1: Deploy Changes to AWS
Run the following command to deploy all changes:

```bash
amplify push
```

This will:
- Update the Lambda function's IAM role with new permissions
- Deploy the improved Lambda function code
- Apply all CloudFormation changes

**Expected output:** You should see the changes being deployed, including:
- `Update` operation on the Lambda function
- `Update` operation on the Lambda execution role

### Step 2: Verify Deployment
After `amplify push` completes, verify the changes:

1. **Check Lambda Permissions:**
   - Go to AWS Console → Lambda → `S3Triggerc8c93dc4-dev` (or your function name)
   - Click on "Configuration" → "Permissions"
   - Verify the execution role has policies with:
     - S3: `GetObject`, `PutObject`
     - Textract: `DetectDocumentText`

2. **Check S3 Trigger:**
   - Go to AWS Console → S3 → Your bucket
   - Click "Properties" → "Event notifications"
   - Verify there's a Lambda trigger configured for `s3:ObjectCreated:*`

### Step 3: Test the Upload
1. Upload a test image through your application
2. Check CloudWatch Logs:
   - AWS Console → Lambda → Your function → "Monitor" → "View CloudWatch logs"
   - Look for logs showing:
     - `🚀 Lambda function invoked`
     - `📄 Processing document`
     - `✅ Textract completed`
     - `✅ Results saved successfully`

### Step 4: Troubleshooting

If you still see timeouts:

1. **Check CloudWatch Logs:**
   ```bash
   # View recent logs
   aws logs tail /aws/lambda/S3Triggerc8c93dc4-dev --follow
   ```

2. **Verify Lambda is Being Triggered:**
   - Check if you see `🚀 Lambda function invoked` in logs
   - If not, the S3 trigger might not be configured correctly

3. **Check for Permission Errors:**
   - Look for errors like "AccessDenied" or "UnauthorizedOperation"
   - These indicate missing IAM permissions

4. **Verify Textract Access:**
   - Check if Textract API calls are succeeding
   - Look for `✅ Textract completed` in logs

## Files Modified
- `amplify/backend/function/S3Triggerc8c93dc4/S3Triggerc8c93dc4-cloudformation-template.json` - Added IAM permissions
- `amplify/backend/function/S3Triggerc8c93dc4/src/index.js` - Improved error handling

## Expected Behavior After Fix
- Lambda function should process images within 5-10 seconds
- Results should be saved to `results/{upload-key}.json` in S3
- Frontend should retrieve results and display PGN output
- No more timeout errors

## Rollback (if needed)
If something goes wrong, you can rollback:
```bash
amplify env checkout <previous-env>
# or
amplify pull
```

