# Troubleshooting Upload Error

## Issue: "Failed to upload image"

### Root Cause
The S3 bucket is configured with guest users having only **READ** access, but uploads require **CREATE_AND_UPDATE** access.

### Solution: Update Storage Permissions

Run the following command to update storage permissions:

```bash
amplify update storage
```

Then:
1. Select your storage resource: `chessstorage`
2. Select "Content (Images, audio, video, etc.)"
3. When asked "Who should have access?", select **"Auth and Guest users"**
4. For **"What kind of access do you want for Guest users?"**, select:
   - ✅ **CREATE_AND_UPDATE** (required for uploads)
   - ✅ **READ** (already enabled)
5. Continue with the prompts and finish

Then push the changes:

```bash
amplify push
```

### Alternative: Check Current Configuration

Verify the current configuration in:
- `amplify/backend/storage/chessstorage/cli-inputs.json`

It should show:
```json
{
  "guestAccess": ["CREATE_AND_UPDATE", "READ"]
}
```

If it only shows `["READ"]`, run `amplify update storage` as described above.

### Verify Bucket Name

Make sure your `.env.local` file has the correct bucket name:
```env
NEXT_PUBLIC_AWS_S3_BUCKET=default11eb0-dev
NEXT_PUBLIC_AWS_REGION=ap-south-1
```

You can find the actual bucket name in:
- `amplify/backend/amplify-meta.json` → `storage.chessstorage.output.BucketName`

### Check Browser Console

Open browser Developer Tools (F12) and check:
1. Console tab for error messages
2. Network tab to see if the upload request is being made
3. Check for any CORS errors

### Test After Fix

After updating permissions and running `amplify push`, restart your dev server:
```bash
npm run dev
```

Then try uploading again.

