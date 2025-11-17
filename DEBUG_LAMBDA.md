# Debugging Lambda Timeout Issue

## Quick Diagnostic Steps

### Step 1: Check if Lambda is Being Triggered

1. **Go to AWS Console → Lambda**
2. **Select your function:** `S3Triggerc8c93dc4-dev` (or similar)
3. **Click "Monitor" tab → "View CloudWatch logs"**
4. **Look for recent log entries** when you upload an image

**What to look for:**
- ✅ **If you see `🚀 Lambda function invoked`** → Lambda IS being triggered
- ❌ **If you see NO logs** → Lambda is NOT being triggered (S3 trigger issue)

### Step 2: Check Lambda Execution Logs

If Lambda IS being triggered, check the logs for:

**Success indicators:**
- `📄 Processing document: { bucket, key }`
- `🔍 Starting Textract OCR...`
- `✅ Textract completed in Xms`
- `✅ Results saved successfully to: results/...`

**Error indicators:**
- `❌ Invalid event: No Records found` → S3 trigger misconfigured
- `❌ Textract API error` → Textract permissions issue
- `❌ S3 PutObject error` → S3 write permissions issue
- `❌ Error processing document` → General error (check details)

### Step 3: Verify S3 Trigger Configuration

1. **Go to AWS Console → S3**
2. **Select your bucket** (e.g., `chess2pgn-xxxxx-chessstorage-dev`)
3. **Click "Properties" tab**
4. **Scroll to "Event notifications"**
5. **Verify there's a Lambda trigger** configured for:
   - Event type: `s3:ObjectCreated:*`
   - Lambda function: `S3Triggerc8c93dc4-dev`

**If trigger is missing:**
- The Lambda won't be invoked when files are uploaded
- You need to reconfigure the storage trigger

### Step 4: Check Lambda Permissions

1. **Go to AWS Console → Lambda → Your function**
2. **Click "Configuration" → "Permissions"**
3. **Click on the Execution role name**
4. **Verify the role has these policies:**
   - ✅ CloudWatch Logs permissions
   - ✅ S3 permissions (GetObject, PutObject)
   - ✅ Textract permissions (DetectDocumentText)

**If permissions are missing:**
- The Lambda will fail silently or throw access denied errors
- You need to run `amplify push` again to apply permissions

### Step 5: Test Lambda Manually

You can test the Lambda function directly:

1. **Go to AWS Console → Lambda → Your function**
2. **Click "Test" tab**
3. **Create a test event** with this JSON:
```json
{
  "Records": [
    {
      "s3": {
        "bucket": {
          "name": "YOUR-BUCKET-NAME"
        },
        "object": {
          "key": "uploads/test-image.jpg"
        }
      }
    }
  ]
}
```
4. **Replace `YOUR-BUCKET-NAME`** with your actual bucket name
5. **Click "Test"**
6. **Check the execution result and logs**

### Step 6: Verify Results File Location

The Lambda saves results to: `results/{upload-key}.json`

1. **Go to AWS Console → S3 → Your bucket**
2. **Navigate to `results/` folder**
3. **Check if files are being created** after uploads

**If files exist but frontend can't access:**
- Check S3 bucket permissions
- Verify guest users have read access to `results/` folder
- Check if the file path matches what frontend expects

## Common Issues and Solutions

### Issue 1: Lambda Not Triggered
**Symptoms:** No logs in CloudWatch when uploading
**Solution:** 
- Verify S3 trigger is configured (Step 3)
- Check if trigger was removed or misconfigured
- May need to run `amplify update storage` and re-add trigger

### Issue 2: Lambda Failing with Permission Errors
**Symptoms:** Logs show "AccessDenied" or "UnauthorizedOperation"
**Solution:**
- Verify IAM role has correct permissions (Step 4)
- Run `amplify push` to update permissions
- Check CloudFormation template has S3 and Textract permissions

### Issue 3: Textract API Errors
**Symptoms:** Logs show "Textract failed" or API errors
**Solution:**
- Verify Textract is available in your region (ap-south-1)
- Check Lambda execution role has Textract permissions
- Verify image format is supported (PNG, JPEG, PDF)

### Issue 4: Results Not Accessible
**Symptoms:** Lambda completes but frontend can't find results
**Solution:**
- Check S3 bucket permissions for guest users
- Verify results are saved to correct location
- Check if file path in frontend matches Lambda output

## Next Steps

Based on what you find:

1. **If Lambda is NOT triggered:**
   - Reconfigure S3 trigger: `amplify update storage`
   - Select your storage resource
   - Re-add Lambda trigger

2. **If Lambda IS triggered but failing:**
   - Check CloudWatch logs for specific error
   - Fix permissions if needed: `amplify push`
   - Verify Textract is available in your region

3. **If Lambda succeeds but results not found:**
   - Check S3 bucket permissions
   - Verify file path matches
   - Check guest user read permissions

## Getting Help

If you're still stuck, provide:
1. CloudWatch log output (last 50 lines)
2. S3 trigger configuration screenshot
3. Lambda execution role permissions
4. Any error messages from browser console

