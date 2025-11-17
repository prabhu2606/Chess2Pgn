# How to Enable Amazon Textract Service

## The Problem

Your Lambda function is failing with this error:
```
ERROR: The AWS Access Key Id needs a subscription for the service
```

This means **Amazon Textract is not enabled** in your AWS account. Textract needs to be activated before you can use it.

---

## Solution: Enable Textract via AWS Console

### Step 1: Navigate to Textract Console

1. **Open your web browser** and go to: https://aws.amazon.com/console/
2. **Sign in** to your AWS account
3. **In the top search bar** (where it says "Search for services, features, blogs, help..."), type: `Textract`
4. **Click on "Amazon Textract"** from the search results
   - It should show as a service with the Textract icon

**Alternative method:**
- Direct link: https://console.aws.amazon.com/textract/
- Make sure you're signed in to the correct AWS account

### Step 2: Select the Correct Region

**IMPORTANT:** You must be in the **ap-south-1 (Mumbai)** region.

1. **Look at the top-right corner** of the AWS Console
2. **Click on the region dropdown** (it might show "US East (N. Virginia)" or another region)
3. **Select "Asia Pacific (Mumbai)"** or search for "Mumbai"
4. **Verify** the region shows as `ap-south-1` in the URL or region selector

### Step 3: Enable Textract Service

Once you're in the Textract console in the correct region, you'll see one of these scenarios:

#### Scenario A: Welcome Screen / Get Started

If you see a welcome screen or landing page:

1. **Look for a button** that says:
   - "Get started"
   - "Try Textract"
   - "Start using Textract"
   - Or a large "Get started" button in the center

2. **Click the button**

3. **If prompted to accept terms:**
   - Read the AWS Textract Service Terms
   - Check the box to accept (if required)
   - Click "Accept" or "Continue"

4. **Wait 1-2 minutes** for the service to activate

#### Scenario B: Already in Console (Service May Be Active)

If you see the Textract console with options like:
- "Analyze document"
- "Forms and tables"
- "Expense analysis"
- Or a dashboard with different Textract features

**This means Textract is already enabled!** You can proceed to Step 4.

#### Scenario C: Error or Access Denied

If you see an error message:
- **Check your IAM permissions** - You need permission to access Textract
- **Contact your AWS administrator** if you're using an organization account
- **Try a different AWS account** if this is a restricted account

### Step 4: Verify Textract is Enabled

**Method 1: Test in Console (Recommended)**

1. **In the Textract console**, look for:
   - A button labeled **"Analyze document"** or **"Try Textract"**
   - Or a section with **"Document analysis"**

2. **Click on it** to open the document analysis interface

3. **If you can see the interface** (even if you don't upload anything), Textract is enabled ✅

**Method 2: Check via API (Advanced)**

If you have AWS CLI configured:

```bash
# Test if Textract is accessible
aws textract list-detection-jobs --region ap-south-1
```

- **If it works** (even with empty results) → Textract is enabled ✅
- **If you get subscription error** → Textract is not enabled ❌

### Step 5: Test Your Application

After enabling Textract:

1. **Wait 1-2 minutes** for the service to fully activate
2. **Go back to your application** (the Chess2Pgn upload page)
3. **Upload a test image**
4. **Check the browser console** (F12 → Console tab) for:
   - `📤 File uploaded successfully`
   - `🔄 Starting to poll for results`
5. **Wait 5-10 seconds** - you should see results appear!

**If it still times out:**
- Check CloudWatch logs again (should see `✅ Textract completed` instead of subscription error)
- Wait another minute and try again (activation can take up to 3 minutes)

---

## Troubleshooting

### Issue: "I don't see a 'Get started' button"

**Possible reasons:**
1. **Textract is already enabled** - Check if you can see the analysis interface
2. **Wrong region** - Make sure you're in **ap-south-1 (Mumbai)**
3. **Different UI** - Look for any button that says "Start", "Try", or "Analyze"

**Solution:**
- Try accessing: https://console.aws.amazon.com/textract/home?region=ap-south-1
- If you see the console interface, Textract is likely already enabled

### Issue: "I enabled it but still getting errors"

**Check these:**
1. **Region mismatch:**
   - Verify you enabled Textract in **ap-south-1**
   - Your Lambda is configured for **ap-south-1**
   - They must match!

2. **Wait time:**
   - Service activation can take 2-3 minutes
   - Wait a bit longer and try again

3. **Check CloudWatch logs:**
   - Go to Lambda → Your function → Logs
   - Look for the latest error message
   - If it still says "subscription", wait another minute

4. **IAM Permissions:**
   - Your Lambda role should have Textract permissions (we already added these)
   - Verify in: Lambda → Configuration → Permissions → Execution role

### Issue: "I'm in an organization account"

If you're using AWS Organizations:

1. **Contact your AWS administrator**
2. **Request access** to Textract service
3. **They may need to enable** service control policies (SCPs)

---

## Important Information

### Cost Information

- **Free tier:** First **1,000 pages per month** are free
- **After free tier:** Approximately **$1.50 per 1,000 pages**
- **No monthly subscription fee** - you only pay for what you use
- **No setup fees** - completely free to enable

### Service Availability

- **Textract is available** in ap-south-1 (Mumbai) region ✅
- **Activation is instant** - usually 1-2 minutes
- **No account restrictions** for standard AWS accounts

### What Happens After Enabling

Once Textract is enabled:
- ✅ Your Lambda function will be able to call Textract API
- ✅ Images will be processed successfully
- ✅ Results will be saved to S3
- ✅ Your application will work as expected

---

## Quick Reference

**Direct Links:**
- Textract Console: https://console.aws.amazon.com/textract/
- Textract in Mumbai: https://console.aws.amazon.com/textract/home?region=ap-south-1
- CloudWatch Logs: https://console.aws.amazon.com/cloudwatch/

**Required Region:** ap-south-1 (Asia Pacific - Mumbai)

**Activation Time:** 1-3 minutes

**Free Tier:** 1,000 pages/month

---

## Still Need Help?

If you're still having issues after following these steps:

1. **Check CloudWatch Logs** for the exact error message
2. **Verify region** is ap-south-1 everywhere
3. **Wait 5 minutes** and try again (sometimes activation takes longer)
4. **Check AWS Service Health Dashboard** for any Textract outages

The most common issue is being in the wrong region - make sure everything is set to **ap-south-1 (Mumbai)**!
