# Scripts Directory

Utility scripts for cost optimization and maintenance.

## Available Scripts

### S3 Cleanup Script (`cleanup-s3.js`)

Helps manage and clean up files in your S3 bucket to reduce storage costs.

#### Usage:

```bash
# List all files in the bucket
npm run cleanup:s3:list
# or
node scripts/cleanup-s3.js --list

# Show bucket statistics and cost estimate
npm run cleanup:s3:stats
# or
node scripts/cleanup-s3.js --stats

# Delete files older than 7 days
npm run cleanup:s3:old
# or
node scripts/cleanup-s3.js --delete-older-than 7

# Delete all files (requires confirmation)
npm run cleanup:s3:all
# or
node scripts/cleanup-s3.js --delete-all
```

#### Environment Variables:

The script uses these environment variables (same as your Next.js app):

- `NEXT_PUBLIC_AWS_S3_BUCKET` or `AWS_S3_BUCKET` - Your S3 bucket name
- `NEXT_PUBLIC_AWS_REGION` or `AWS_REGION` - AWS region (default: ap-south-1)

#### AWS Credentials:

The script uses AWS CLI credentials. Make sure you've run:
```bash
aws configure
```

### Cost Monitoring Setup (`setup-cost-monitoring.sh`)

Helps set up AWS billing alerts and cost monitoring.

#### Usage:

```bash
bash scripts/setup-cost-monitoring.sh
```

**Note**: This script provides guidance and creates configuration templates. You'll need to:

1. Enable billing alerts in AWS Console
2. Create budgets manually via AWS Console (recommended) or AWS CLI

See `COST_OPTIMIZATION.md` for detailed setup instructions.

## Examples

### Weekly Cleanup Routine

```bash
# Check bucket status
npm run cleanup:s3:stats

# Delete files older than 7 days
npm run cleanup:s3:old

# Verify cleanup
npm run cleanup:s3:stats
```

### Before Long Break

```bash
# See what's in the bucket
npm run cleanup:s3:list

# Delete everything (be careful!)
npm run cleanup:s3:all
```

### Quick Cost Check

```bash
# Get statistics and estimated costs
npm run cleanup:s3:stats
```

## Notes

- All scripts require AWS credentials to be configured
- The cleanup script will ask for confirmation before deleting files
- Files deleted cannot be recovered (unless versioning is enabled)
- The S3 lifecycle policy (7-day expiration) will automatically delete old files, but these scripts provide manual control

## Troubleshooting

### "BUCKET_NAME not set" Error

Make sure you have the bucket name set in your environment:
```bash
export NEXT_PUBLIC_AWS_S3_BUCKET=your-bucket-name
export NEXT_PUBLIC_AWS_REGION=ap-south-1
```

Or create a `.env.local` file:
```env
NEXT_PUBLIC_AWS_S3_BUCKET=your-bucket-name
NEXT_PUBLIC_AWS_REGION=ap-south-1
```

### "Access Denied" Error

Check your AWS credentials and permissions:
```bash
aws sts get-caller-identity
aws s3 ls s3://your-bucket-name
```

### Script Not Found

Make sure you're running from the project root directory:
```bash
cd /path/to/Chess2Pgn_3
node scripts/cleanup-s3.js --help
```

