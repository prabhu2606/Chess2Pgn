# AWS Cost Optimization Guide for Development

This guide provides strategies to minimize AWS costs while developing the Chess2Pgn application. The main cost drivers are Amazon Textract, S3 storage, and data transfer.

## Current AWS Services & Cost Breakdown

### Services Used
1. **Amazon Textract** - OCR processing (~$1.50 per 1,000 pages after free tier)
2. **Amazon S3** - Object storage for images and results
3. **AWS Lambda** - Serverless function processing
4. **AWS Amplify** - Backend-as-a-Service
5. **Amazon Cognito** - Authentication

### Free Tier Limits (First 12 Months)
- **S3**: 5 GB storage, 20,000 GET requests, 2,000 PUT requests
- **Lambda**: 1M requests/month, 400,000 GB-seconds compute time
- **Textract**: 1,000 pages/month (first 3 months only)
- **Amplify**: Free tier available for hosting

## Cost Optimization Strategies

### 1. Textract Cost Control (Highest Priority)

**Cost Impact**: ~$1.50 per 1,000 pages = $0.0015 per page

#### Strategies:
- ✅ **Use Free Tier Wisely**: First 1,000 pages/month are free for 3 months
- ✅ **Monitor Usage**: Set up billing alerts (see section 5)
- ✅ **Optimize Image Sizes**: Smaller images = fewer Textract pages
  - Images are processed page-by-page
  - Reduce image resolution for test uploads
- ✅ **Avoid Unnecessary Processing**: 
  - Delete test images immediately after processing
  - Use mock responses during development when possible
- ✅ **Batch Testing**: Test with multiple images in one session, then clean up

#### Calculate Textract Costs:
```
Pages processed × $0.0015 = Cost
Example: 5,000 pages = $7.50/month
```

### 2. S3 Storage Optimization

**Cost Impact**: 
- Storage: $0.023 per GB/month (first 5 GB free)
- PUT requests: $0.005 per 1,000 requests (first 2,000 free)
- GET requests: $0.0004 per 1,000 requests (first 20,000 free)

#### Automatic Cleanup (Already Configured)
✅ **Lifecycle Policy**: Automatically deletes files older than 7 days
- Applied to all files in the bucket
- Reduces storage costs automatically
- Prevents accumulation of test files

#### Manual Cleanup Scripts:
- Run `scripts/cleanup-s3.js` to manually delete old files
- Use AWS Console to bulk delete files when needed

#### Best Practices:
- ✅ Delete test files immediately after processing
- ✅ Use S3 lifecycle policy (configured in CloudFormation)
- ✅ Monitor bucket size regularly
- ✅ Empty bucket when not actively developing

### 3. Lambda Cost Optimization

**Cost Impact**: Usually FREE for development usage
- First 1M requests/month: FREE
- First 400,000 GB-seconds/month: FREE

#### Optimization:
- ✅ Current usage is minimal - Lambda costs are negligible
- ✅ Function already optimized for quick execution
- ✅ Textract processing is the main compute cost (via Lambda)

### 4. Development Best Practices

#### Minimize Testing Costs:
1. **Use Local Mocking**: 
   - Test UI/UX without uploading to S3
   - Skip Textract calls during early development
   - Use sample JSON responses from `lib/pgn/parser.ts`

2. **Batch Testing Sessions**:
   - Upload multiple images in one session
   - Process all, then clean up all at once
   - Avoid uploading one image, checking, then another

3. **Small Test Images**:
   - Use low-resolution images for testing
   - Smaller images = faster processing = lower costs
   - Test with simple score sheets first

4. **Clean Up Immediately**:
   - Delete test files right after confirming functionality
   - Don't let files accumulate in S3
   - Use the cleanup script regularly

5. **Monitor Before Production**:
   - Test thoroughly before production deployment
   - Fix issues early to avoid repeated uploads
   - Use development environment for iteration

### 5. Set Up Cost Monitoring & Alerts

#### AWS Billing Alerts (Recommended Setup):

1. **Navigate to AWS Billing Console**:
   - Go to: https://console.aws.amazon.com/billing/
   - Click "Billing preferences" in left sidebar
   - Enable "Receive Billing Alerts"

2. **Create Budget Alert**:
   ```bash
   # Using AWS CLI (or use AWS Console)
   aws budgets create-budget \
     --account-id YOUR_ACCOUNT_ID \
     --budget file://budget-config.json \
     --notifications-with-subscribers file://notifications.json
   ```

3. **Recommended Budget Thresholds**:
   - **Development Budget**: $10/month
   - **Warning at**: $5 (50% threshold)
   - **Alert at**: $8 (80% threshold)
   - **Critical at**: $10 (100% threshold)

4. **Monitor Costs Weekly**:
   - Check AWS Cost Explorer: https://console.aws.amazon.com/cost-management/home
   - Review by service (Textract, S3, Lambda)
   - Identify unexpected charges early

#### Quick Cost Check:
```bash
# Check current month costs
aws ce get-cost-and-usage \
  --time-period Start=$(date +%Y-%m-01),End=$(date +%Y-%m-%d) \
  --granularity MONTHLY \
  --metrics "BlendedCost" \
  --group-by Type=SERVICE
```

### 6. Environment Management

#### Development vs Production:
- ✅ Use separate AWS environments
- ✅ Development environment should be the only one active during development
- ✅ Delete/suspend production environment when not needed
- ✅ Use environment tags to track costs by environment

#### Pause Resources When Not Developing:
1. **Stop Amplify Hosting** (if not actively deploying):
   - Go to Amplify Console
   - Stop the app when not testing deployments

2. **Consider Using Dev Environment Only**:
   - Only deploy to production when ready
   - Delete test stacks regularly

### 7. Cost-Saving Quick Actions

#### Weekly Checklist:
- [ ] Review S3 bucket size and delete old files
- [ ] Check Textract usage in AWS Cost Explorer
- [ ] Verify billing alerts are configured
- [ ] Run cleanup script: `node scripts/cleanup-s3.js`
- [ ] Review Lambda invocation counts

#### Before Long Breaks:
- [ ] Empty S3 bucket or set lifecycle to 1 day
- [ ] Check for any running services
- [ ] Review and cancel any scheduled tasks
- [ ] Set budget alerts to $1 (catch any unexpected charges)

### 8. Estimated Monthly Costs (Development)

#### Light Development (Testing 100 images/month):
- **Textract**: ~$0.15 (100 pages @ $0.0015/page) - or FREE if within free tier
- **S3 Storage**: FREE (< 5 GB)
- **S3 Requests**: FREE (< 2,000 PUT, 20,000 GET)
- **Lambda**: FREE (< 1M invocations)
- **Total**: ~$0.15/month or FREE

#### Moderate Development (Testing 1,000 images/month):
- **Textract**: ~$1.50 (1,000 pages) - or FREE if within free tier
- **S3 Storage**: ~$0.10 (few GB after lifecycle cleanup)
- **S3 Requests**: FREE
- **Lambda**: FREE
- **Total**: ~$1.60/month or FREE

#### Heavy Development (Testing 5,000+ images/month):
- **Textract**: ~$7.50 (5,000 pages)
- **S3 Storage**: ~$0.50
- **S3 Requests**: FREE
- **Lambda**: FREE
- **Total**: ~$8.00/month

### 9. Emergency Cost Control

If you notice unexpected charges:

1. **Immediate Actions**:
   ```bash
   # Delete all files in S3 bucket
   aws s3 rm s3://YOUR_BUCKET_NAME --recursive
   
   # Check what's running
   aws lambda list-functions
   aws textract list-detection-jobs
   ```

2. **Disable Textract** (if needed):
   - Stop uploading images
   - The lifecycle policy will clean up existing files

3. **Contact AWS Support**:
   - If charges seem incorrect
   - Request cost review

## Cost Optimization Checklist

### Initial Setup:
- [x] S3 lifecycle policy configured (7-day expiration)
- [ ] Billing alerts configured
- [ ] Cost monitoring dashboard setup
- [ ] Cleanup scripts created

### Daily Development:
- [ ] Use small test images
- [ ] Delete test files immediately after processing
- [ ] Monitor Textract page count

### Weekly:
- [ ] Run cleanup script
- [ ] Review AWS Cost Explorer
- [ ] Check billing alerts

### Monthly:
- [ ] Review total costs
- [ ] Adjust budget thresholds if needed
- [ ] Review and optimize resource usage

## Additional Resources

- **AWS Cost Management**: https://console.aws.amazon.com/cost-management/
- **AWS Free Tier**: https://aws.amazon.com/free/
- **Textract Pricing**: https://aws.amazon.com/textract/pricing/
- **S3 Pricing**: https://aws.amazon.com/s3/pricing/
- **Lambda Pricing**: https://aws.amazon.com/lambda/pricing/

## Questions or Issues?

If you're seeing unexpected costs:
1. Check AWS Cost Explorer to identify the service
2. Review CloudWatch Logs for Lambda invocations
3. Check S3 bucket size and file count
4. Review Textract usage in AWS Console

For cost-related questions, refer to the AWS Billing & Cost Management documentation.

