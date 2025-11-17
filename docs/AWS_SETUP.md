# AWS Setup Instructions

This guide will help you set up AWS services for the Chess2Pgn application, including AWS Amplify, S3 storage, Lambda functions, and Amazon Textract.

## Prerequisites

1. **Node.js 18+** installed (required for Next.js 14)
2. **npm, yarn, or pnpm** package manager
3. **A credit card** (for AWS account verification - won't be charged unless you exceed free tier)
4. **Git** installed (recommended for version control)

## Step 0: Create an AWS Account

If you don't have an AWS account yet, follow these steps:

### 0.1: Sign Up for AWS

1. Go to https://aws.amazon.com/
2. Click **"Create an AWS Account"** (top right corner)
3. Enter your email address and choose a password
4. Choose an account name (e.g., "Chess2Pgn" or your name)

### 0.2: Account Details

You'll need to provide:
- **Email address** - Use a valid email you can access
- **Phone number** - For verification (AWS will call you)
- **Credit card** - Required for verification (won't be charged unless you exceed free tier)
- **Address** - Your billing address

### 0.3: Payment Information

- A credit card is required for account verification
- **You won't be charged** unless you exceed the AWS Free Tier limits
- AWS Free Tier includes:
  - **5 GB S3 storage** (first 12 months)
  - **1M Lambda requests/month** (always free)
  - **1,000 Textract pages/month** (first 3 months)

### 0.4: Identity Verification

1. AWS will call your phone number
2. Enter the verification code when prompted
3. Complete the verification process

### 0.5: Choose Support Plan

- Select **"Basic Plan"** (free) - This is sufficient for development
- You can upgrade later if needed

### 0.6: Account Created

- You'll be redirected to the AWS Console
- Your account is ready to use!

**Note**: It may take a few minutes for your account to be fully activated.

## Step 1: Install AWS CLI

1. Download and install AWS CLI from: https://aws.amazon.com/cli/
   - **Windows**: Download the MSI installer from the AWS website
   - **macOS**: Use Homebrew: `brew install awscli`
   - **Linux**: Follow platform-specific instructions on AWS documentation

2. Verify installation:
   ```bash
   aws --version
   ```
   You should see output like: `aws-cli/2.x.x`

**Note**: AWS CLI v2 is recommended for better performance and features.

## Step 2: Configure AWS Credentials

1. **Create an IAM User** (if you don't have one):
   - Go to AWS Console → IAM → Users
   - Click "Add users" or "Create user"
   - Enter a username (e.g., `amplify-user`)
   - Select "Provide user access to the AWS Management Console" (optional) or "Command Line Interface (CLI)" access
   - Click "Next"

2. **Set Permissions**:
   - For development/testing: Select "Attach policies directly" → Choose `AdministratorAccess`
   - **OR** for production: Create a custom policy with minimum required permissions:
     - `AmazonS3FullAccess`
     - `AWSLambda_FullAccess`
     - `AmazonTextractFullAccess`
     - `IAMFullAccess` (for creating roles)
     - `AWSAmplifyFullAccess`

3. **Create Access Keys**:
   - Go to the user's "Security credentials" tab
   - Scroll to "Access keys" section
   - Click "Create access key"
   - Choose "CLI" as the use case
   - Click "Next" and then "Create access key"
   - **IMPORTANT**: Download the CSV file or copy both keys immediately (you won't be able to see the secret key again)

4. **Configure AWS CLI**:
   ```bash
   aws configure
   ```
   Enter your credentials:
   - **AWS Access Key ID**: Paste your access key ID
   - **AWS Secret Access Key**: Paste your secret access key
   - **Default region name**: `us-east-1` (or your preferred region - e.g., `us-west-2`, `eu-west-1`)
   - **Default output format**: `json`

5. **Verify configuration**:
   ```bash
   aws sts get-caller-identity
   ```
   This should return your account ID and user ARN.

## Step 3: Install Amplify CLI

1. **Install Amplify CLI globally**:
   ```bash
   npm install -g @aws-amplify/cli
   ```
   
   **Note**: On some systems, you may need to use `sudo`:
   ```bash
   sudo npm install -g @aws-amplify/cli
   ```

2. **Verify installation**:
   ```bash
   amplify --version
   ```
   You should see output like: `12.x.x` or higher

3. **Troubleshooting**:
   - If command not found, ensure npm global bin directory is in your PATH
   - Check npm prefix: `npm config get prefix`
   - Add to PATH if needed (varies by OS)

## Step 4: Configure Amplify

1. Run the Amplify configuration:
   ```bash
   amplify configure
   ```

2. Follow the prompts:
   - Sign in to your AWS account
   - Select a region (e.g., `us-east-1`)
   - Create or select an IAM user for Amplify
   - The CLI will open AWS Console for you to create the user
   - Grant AdministratorAccess or the following permissions:
     - AmazonS3FullAccess
     - AWSLambda_FullAccess
     - AmazonTextractFullAccess
     - IAMFullAccess (for creating roles)

## Step 5: Initialize Amplify in Your Project

1. **Navigate to your project directory**:
   ```bash
   cd path/to/Chess2Pgn_3
   ```

2. **Ensure project dependencies are installed**:
   ```bash
   npm install
   ```

3. **Initialize Amplify**:
   ```bash
   amplify init
   ```

4. **Answer the prompts**:
   - **Enter a name for the project**: `chess2pgn` (or your preferred name)
   - **Initialize the project with the above settings?**: `Yes`
   - **Select the authentication method**: Choose `AWS profile` and select the profile you created
   - **Choose your default editor**: Select your preferred editor (e.g., `Visual Studio Code`, `vim`)
   - **Choose the type of app**: `javascript`
   - **What javascript framework**: `react`
   - **Source Directory Path**: `app`
   - **Distribution Directory Path**: `.next` (Next.js output directory)
   - **Build Command**: `npm run build`
   - **Start Command**: `npm run start`
   - **Do you want to use an AWS profile?**: `Yes`
   - **Select the profile**: Choose the profile you configured in Step 2

5. **What happens next**:
   - Amplify creates an `amplify/` directory in your project
   - Creates backend configuration files
   - Sets up CloudFormation templates for AWS resources
   - Initializes Git tracking (if not already initialized)

## Step 6: Add Storage (S3)

1. **Add S3 storage**:
   ```bash
   amplify add storage
   ```

2. **Select options**:
   - **Select from one of the below mentioned services**: `Content (Images, audio, video, etc.)`
   - **Provide a friendly name**: `chessstorage` (or your preferred name - note: this will be used as the resource identifier)
   - **Provide bucket name**: Accept default (Amplify will generate a unique name) or enter custom name
   - **Who should have access**: `Auth and Guest users`
   - **What kind of access do you want for Authenticated users**: 
     - Select `create/update`, `read` (default for auth users)
   - **What kind of access do you want for Guest users**: 
     - Select `read` (default for guest users - sufficient for file uploads via Amplify)
   - **Do you want to add a Lambda Trigger for this S3 bucket**: `Yes` (important - this enables automatic processing)
   - **Select from the following options**: `Create new function`
   - **Do you want to edit the local Lambda function now?**: `No` (we'll edit it after creation)

**Important Notes**:
- The bucket name will be auto-generated as: `{project-name}{random}-{resource-name}-{env}`
- Example: `chess2pgn12345678-chessstorage-dev`
- Guest users can upload files through Amplify Storage API even with `read` permission
- The Lambda trigger will be automatically configured to fire on file uploads

## Step 7: Configure Lambda Function for Textract

**Note**: If you selected "Create new function" in Step 6, Amplify has already created a Lambda function with an auto-generated name (e.g., `S3Triggerc8c93dc4`). This function is automatically triggered when files are uploaded to your S3 bucket.

1. **Navigate to the Lambda function directory**:
   ```bash
   cd amplify/backend/function/S3Triggerc8c93dc4/src
   ```
   *(Replace `S3Triggerc8c93dc4` with your actual function name - check the `amplify/backend/function/` directory)*

2. **Update the function code** (`index.js`):
   Replace the default code with the Textract processing logic:
   ```javascript
   const AWS = require('aws-sdk');
   const s3 = new AWS.S3();
   const textract = new AWS.Textract();

   exports.handler = async (event) => {
     const bucket = event.Records[0].s3.bucket.name;
     const key = decodeURIComponent(event.Records[0].s3.object.key.replace(/\+/g, ' '));

     const params = {
       Document: {
         S3Object: {
           Bucket: bucket,
           Name: key
         }
       }
     };

     try {
       const textractData = await textract.detectDocumentText(params).promise();
       const resultKey = `results/${key}.json`;

       await s3.putObject({
         Bucket: bucket,
         Key: resultKey,
         Body: JSON.stringify(textractData),
         ContentType: 'application/json'
       }).promise();

       console.log(`OCR result saved to ${resultKey}`);
       return { statusCode: 200, body: 'Processing complete' };
     } catch (error) {
       console.error('Error processing document:', error);
       throw error;
     }
   };
   ```

3. **Install AWS SDK dependency**:
   ```bash
   npm install aws-sdk
   ```
   Or manually create/edit `package.json`:
   ```json
   {
     "name": "S3Triggerc8c93dc4",
     "version": "1.0.0",
     "description": "Lambda function for Textract processing",
     "main": "index.js",
     "dependencies": {
       "aws-sdk": "^2.1500.0"
     }
   }
   ```
   Then run:
   ```bash
   npm install
   ```

4. **Return to project root**:
   ```bash
   cd ../../../../..
   ```

**Alternative**: If you want to create a separate Lambda function (not as an S3 trigger):

1. Run `amplify add function`
2. Select `Lambda function (serverless function)`
3. Name it `textractProcessor` (or your preferred name)
4. Choose `NodeJS` runtime
5. Select `Hello World` template
6. Configure to access storage with `read` and `write` permissions
7. Then manually configure it as an S3 trigger (see Step 8)

## Step 8: Verify S3 Trigger Configuration

**Note**: If you selected "Create new function" during storage setup (Step 6), the trigger is already configured automatically. Verify the configuration:

1. **Check storage configuration**:
   Open `amplify/backend/storage/chessstorage/cli-inputs.json` and verify:
   ```json
   {
     "triggerFunction": "S3Triggerc8c93dc4"
   }
   ```
   (Your trigger function name may differ - check the actual name in your `amplify/backend/function/` directory)

2. **Verify in backend-config.json**:
   The storage should have a dependency on the Lambda function:
   ```json
   {
     "storage": {
       "chessstorage": {
         "dependsOn": [
           {
             "category": "function",
             "resourceName": "S3Triggerc8c93dc4"
           }
         ]
       }
     }
   }
   ```

3. **If trigger is not configured**, you can update storage:
   ```bash
   amplify update storage
   ```
   - Select your storage resource
   - Choose to add/edit trigger function
   - Select your Lambda function

**The trigger will be automatically deployed when you run `amplify push` in Step 10.**

## Step 9: Set Up IAM Permissions for Lambda

The Lambda function needs permissions to:
- Read from S3 (to get uploaded images)
- Write to S3 (to store results)
- Call Textract API

**Amplify will automatically create an IAM role for your Lambda function**, but you need to ensure it has the correct permissions:

1. **After deploying** (in Step 10), verify permissions:
   - Go to AWS Console → Lambda → Functions
   - Find your function (e.g., `S3Triggerc8c93dc4-dev`)
   - Go to Configuration → Permissions
   - Click on the execution role name (e.g., `S3Triggerc8c93dc4LambdaRolec8c93dc4-dev`)

2. **Add required policies**:
   - Click "Add permissions" → "Attach policies"
   - Add the following managed policies:
     - `AmazonS3FullAccess` (or create custom policy with read/write access to your specific bucket)
     - `AmazonTextractFullAccess` (or create custom policy with only `textract:DetectDocumentText` permission)
   - Click "Add permissions"

3. **Alternative: Use AWS CLI** (after deployment):
   ```bash
   # Find your Lambda role name from Amplify output or AWS Console
   aws iam attach-role-policy \
     --role-name S3Triggerc8c93dc4LambdaRolec8c93dc4-dev \
     --policy-arn arn:aws:iam::aws:policy/AmazonS3FullAccess

   aws iam attach-role-policy \
     --role-name S3Triggerc8c93dc4LambdaRolec8c93dc4-dev \
     --policy-arn arn:aws:iam::aws:policy/AmazonTextractFullAccess
   ```

**Security Best Practice**: For production, create custom IAM policies with least-privilege access:
- S3: Only access to your specific bucket
- Textract: Only `DetectDocumentText` permission
- No unnecessary permissions

## Step 10: Deploy to AWS

1. **Push all changes to AWS**:
   ```bash
   amplify push
   ```

2. **Review the changes**:
   - Amplify will show you a summary of resources to be created/updated
   - Review carefully and confirm with `Y` if everything looks correct
   - The deployment may take 5-15 minutes depending on resources

3. **This will create**:
   - ✅ S3 bucket for storage (with auto-generated name)
   - ✅ Lambda function for Textract processing
   - ✅ IAM roles and policies
   - ✅ S3 event trigger (automatically configured)
   - ✅ CloudFormation stack for infrastructure

4. **Important outputs to note**:
   - **S3 Bucket Name**: Look for output like `StorageBucketName: chess2pgn12345678-chessstorage-dev`
   - **Lambda Function Name**: Look for output like `FunctionName: S3Triggerc8c93dc4-dev`
   - **AWS Region**: Note the region you're using

5. **Save the outputs** - You'll need the S3 bucket name for Step 11

**Troubleshooting**:
- If deployment fails, check CloudFormation console for detailed error messages
- Ensure your IAM user has sufficient permissions (AdministratorAccess recommended for setup)
- Verify AWS credentials are correctly configured

## Step 11: Update Environment Variables

1. **Get the S3 bucket name** from `amplify push` output:
   - Look for `StorageBucketName` in the terminal output
   - Or find it in: `amplify/backend/amplify-meta.json` under `storage.chessstorage.output.bucketName`
   - Or check AWS Console → S3 → Buckets (look for bucket with your project name)

2. **Create `.env.local` file** in your project root:
   ```bash
   cp env.example .env.local
   ```

3. **Edit `.env.local`** and update with your actual values:
   ```env
   NEXT_PUBLIC_AWS_REGION=us-east-1
   NEXT_PUBLIC_AWS_S3_BUCKET=chess2pgn12345678-chessstorage-dev
   ```
   *(Replace with your actual bucket name from Step 10 output)*

4. **Verify the bucket name format**:
   - Should be: `{project-name}{random}-{resource-name}-{env}`
   - Example: `chess2pgn12345678-chessstorage-dev`

5. **Important Notes**:
   - `.env.local` is git-ignored by default (keep your credentials safe!)
   - These are client-side environment variables (NEXT_PUBLIC_ prefix)
   - The region should match the region you selected during `amplify init`

## Step 12: Install Project Dependencies

1. **Install npm packages** (if not already done):
   ```bash
   npm install
   ```

2. **Verify key dependencies** are installed:
   - `aws-amplify` (v5.x for Amplify v5 API)
   - `@aws-sdk/client-s3`
   - `@aws-sdk/client-textract`
   - `next`, `react`, `react-dom`

3. **Check package.json** to ensure all dependencies are listed:
   ```bash
   cat package.json
   ```

**Note**: The project uses AWS Amplify v5, which has a different API than v4. Make sure you're using:
- `aws-amplify/storage` instead of `aws-amplify` for storage operations
- See `lib/aws/storage.ts` for correct import patterns

## Step 13: Test the Setup

1. **Start the development server**:
   ```bash
   npm run dev
   ```

2. **Open the application**:
   - Navigate to `http://localhost:3000` (home page)
   - Go to `http://localhost:3000/convert` (upload page)

3. **Test the upload flow**:
   - Click "Upload Photo" or "Take Photo"
   - Select a chess score sheet image (JPEG, PNG, etc.)
   - Watch the progress bar
   - The app will:
     - Upload image to S3 (you'll see "Uploading..." status)
     - Trigger Lambda function automatically
     - Process image with Textract
     - Poll for results
     - Display extracted text and PGN output

4. **Verify in AWS Console**:
   - **S3 Console**:
     - Go to your bucket → `uploads/` folder
     - You should see the uploaded image file
     - Check `results/` folder for JSON output
   - **Lambda Console**:
     - Go to Functions → Your function
     - Check "Monitor" tab → "CloudWatch Logs"
     - You should see execution logs with "OCR result saved to..." message
   - **CloudWatch Logs**:
     - Go to Log groups → `/aws/lambda/S3Triggerc8c93dc4-dev`
     - Check for any errors or processing messages

5. **Expected flow**:
   ```
   User uploads image → S3 stores file → S3 event triggers Lambda → 
   Lambda calls Textract → Textract processes image → 
   Lambda saves results to S3 → Frontend polls API → 
   Results displayed to user
   ```

**Troubleshooting**:
- If upload fails: Check browser console for errors, verify `.env.local` has correct bucket name
- If Lambda not triggered: Verify S3 event notification is configured in bucket properties
- If Textract fails: Check Lambda execution role has Textract permissions
- If results not found: Check CloudWatch logs for Lambda errors

## Troubleshooting

### Lambda function not triggered
- Check S3 bucket event notifications are configured
- Verify Lambda function has correct permissions
- Check CloudWatch logs for errors

### Textract access denied
- Ensure Lambda execution role has `AmazonTextractFullAccess` policy
- Check that Textract is available in your region

### S3 upload fails
- Verify Amplify configuration is correct
- Check that `.env.local` has correct bucket name and region
- Ensure Amplify is properly configured in `lib/aws/amplify-config.ts`
- Check browser console for CORS errors (Amplify should handle CORS automatically)
- Verify AWS credentials are accessible to the frontend (Amplify Storage handles this)

### Results not appearing
- Check Lambda CloudWatch logs for errors
- Verify S3 bucket has `results/` folder with JSON files
- Check API route `/api/process` is working (check browser Network tab)
- Verify Lambda function has correct permissions (S3 read/write, Textract access)
- Check that Textract is available in your selected region
- Ensure Lambda function code is correctly deployed (verify `index.js` content)

### Lambda function not executing
- Check S3 bucket → Properties → Event notifications (should list your Lambda function)
- Verify Lambda function permissions allow S3 to invoke it
- Check CloudWatch logs for any invocation errors
- Verify Lambda function is in the same region as S3 bucket

### Textract errors
- Ensure Textract service is available in your selected region
- Check Lambda execution role has `AmazonTextractFullAccess` policy
- Verify image format is supported (JPEG, PNG, PDF, TIFF)
- Check image size limits (Textract has file size limits)

## Cost Considerations

- **S3 Storage**: ~$0.023 per GB/month
- **Lambda**: First 1M requests free, then $0.20 per 1M requests
- **Textract**: $1.50 per 1,000 pages (first 1,000 pages free tier)
- **Data Transfer**: First 100 GB free, then varies by region

Monitor your usage in AWS Cost Explorer.

## Next Steps

- Set up CloudWatch alarms for monitoring
- Configure S3 lifecycle policies for old files
- Set up error notifications
- Consider adding authentication if needed

## Additional Resources

### Official Documentation
- [AWS Amplify Documentation](https://docs.amplify.aws/)
- [AWS Amplify CLI Documentation](https://docs.amplify.aws/cli/)
- [Amazon Textract Documentation](https://docs.aws.amazon.com/textract/)
- [AWS Lambda Documentation](https://docs.aws.amazon.com/lambda/)
- [Amazon S3 Documentation](https://docs.aws.amazon.com/s3/)
- [AWS IAM Documentation](https://docs.aws.amazon.com/iam/)

### Project-Specific Files
- `amplify/backend/backend-config.json` - Backend resource configuration
- `amplify/backend/amplify-meta.json` - Deployed resource metadata
- `lib/aws/amplify-config.ts` - Amplify client configuration
- `lib/aws/storage.ts` - Storage utility functions using Amplify v5 API

### Common Commands
```bash
# View Amplify status
amplify status

# Pull latest backend changes
amplify pull

# View CloudFormation stack
amplify console

# Delete all resources (careful!)
amplify delete
```

## Important Notes

### AWS Amplify v5 vs v4
This project uses AWS Amplify v5, which has breaking changes from v4:
- Storage API: Use `aws-amplify/storage` instead of `aws-amplify`
- Import pattern: `import { uploadData } from 'aws-amplify/storage'`
- Configuration: Manual config via environment variables (not `aws-exports.js`)

### Lambda Function Naming
- Amplify auto-generates Lambda function names when added as S3 triggers
- Function names look like: `S3Trigger{hash}` (e.g., `S3Triggerc8c93dc4`)
- Use `amplify status` to see actual resource names

### Storage Bucket Naming
- Bucket names are auto-generated to ensure uniqueness
- Format: `{project-name}{random}-{resource-name}-{env}`
- Always check actual bucket name from `amplify push` output

### Cost Monitoring
- Set up AWS Budget alerts in AWS Console
- Monitor usage in AWS Cost Explorer
- Set up CloudWatch alarms for Lambda invocations
- Consider S3 lifecycle policies to delete old files automatically

