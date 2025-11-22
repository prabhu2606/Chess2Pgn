#!/usr/bin/env node

/**
 * S3 Cleanup Script for Cost Optimization
 * 
 * This script helps clean up old files in your S3 bucket to reduce storage costs.
 * It can:
 * - List all files in the bucket
 * - Delete files older than specified days
 * - Delete all files (with confirmation)
 * - Show bucket size and file count
 * 
 * Usage:
 *   node scripts/cleanup-s3.js --list
 *   node scripts/cleanup-s3.js --delete-older-than 7
 *   node scripts/cleanup-s3.js --delete-all
 *   node scripts/cleanup-s3.js --stats
 */

const { S3Client, ListObjectsV2Command, DeleteObjectsCommand, HeadObjectCommand } = require('@aws-sdk/client-s3');
const readline = require('readline');

// Configuration
const REGION = process.env.NEXT_PUBLIC_AWS_REGION || process.env.AWS_REGION || 'ap-south-1';
const BUCKET_NAME = process.env.NEXT_PUBLIC_AWS_S3_BUCKET || process.env.AWS_S3_BUCKET;

// Initialize S3 client
const s3Client = new S3Client({ region: REGION });

// Create readline interface for user input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

async function listAllObjects() {
  if (!BUCKET_NAME) {
    console.error('❌ Error: BUCKET_NAME not set. Please set NEXT_PUBLIC_AWS_S3_BUCKET or AWS_S3_BUCKET environment variable.');
    process.exit(1);
  }

  console.log(`📋 Listing all objects in bucket: ${BUCKET_NAME}`);
  console.log(`📍 Region: ${REGION}\n`);

  const allObjects = [];
  let continuationToken = undefined;
  let totalSize = 0;

  try {
    do {
      const command = new ListObjectsV2Command({
        Bucket: BUCKET_NAME,
        ContinuationToken: continuationToken
      });

      const response = await s3Client.send(command);
      
      if (response.Contents && response.Contents.length > 0) {
        allObjects.push(...response.Contents);
        response.Contents.forEach(obj => {
          totalSize += obj.Size || 0;
        });
      }

      continuationToken = response.NextContinuationToken;
    } while (continuationToken);

    console.log(`📊 Found ${allObjects.length} objects (${formatBytes(totalSize)} total)\n`);

    if (allObjects.length === 0) {
      console.log('✅ Bucket is empty!\n');
      return [];
    }

    // Group by prefix/folder
    const byPrefix = {};
    allObjects.forEach(obj => {
      const prefix = obj.Key.split('/')[0] || 'root';
      if (!byPrefix[prefix]) {
        byPrefix[prefix] = { count: 0, size: 0, files: [] };
      }
      byPrefix[prefix].count++;
      byPrefix[prefix].size += obj.Size || 0;
      byPrefix[prefix].files.push(obj);
    });

    // Show summary
    console.log('📁 Files by folder:');
    Object.keys(byPrefix).sort().forEach(prefix => {
      const { count, size } = byPrefix[prefix];
      console.log(`   ${prefix}/: ${count} files, ${formatBytes(size)}`);
    });
    console.log();

    // Show recent files
    const recentFiles = allObjects
      .sort((a, b) => (b.LastModified || new Date(0)) - (a.LastModified || new Date(0)))
      .slice(0, 10);

    if (recentFiles.length > 0) {
      console.log('🕐 Most recently modified files:');
      recentFiles.forEach(obj => {
        const age = getAge(obj.LastModified);
        console.log(`   ${obj.Key} (${formatBytes(obj.Size)}, ${age})`);
      });
      console.log();
    }

    return allObjects;
  } catch (error) {
    console.error('❌ Error listing objects:', error.message);
    if (error.name === 'NoSuchBucket') {
      console.error(`   Bucket "${BUCKET_NAME}" does not exist.`);
    } else if (error.name === 'AccessDenied') {
      console.error('   Access denied. Check your AWS credentials and permissions.');
    }
    process.exit(1);
  }
}

async function deleteOldFiles(days) {
  if (!BUCKET_NAME) {
    console.error('❌ Error: BUCKET_NAME not set.');
    process.exit(1);
  }

  console.log(`🗑️  Deleting files older than ${days} days from bucket: ${BUCKET_NAME}`);
  console.log(`📍 Region: ${REGION}\n`);

  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - days);

  const allObjects = await listAllObjects();
  const filesToDelete = allObjects.filter(obj => {
    if (!obj.LastModified) return false;
    return obj.LastModified < cutoffDate;
  });

  if (filesToDelete.length === 0) {
    console.log(`✅ No files older than ${days} days found.\n`);
    return;
  }

  const totalSize = filesToDelete.reduce((sum, obj) => sum + (obj.Size || 0), 0);
  console.log(`⚠️  Found ${filesToDelete.length} files to delete (${formatBytes(totalSize)} total)\n`);

  // Show preview
  console.log('📋 Files to be deleted:');
  filesToDelete.slice(0, 10).forEach(obj => {
    const age = getAge(obj.LastModified);
    console.log(`   ${obj.Key} (${age})`);
  });
  if (filesToDelete.length > 10) {
    console.log(`   ... and ${filesToDelete.length - 10} more files`);
  }
  console.log();

  const answer = await question(`⚠️  Are you sure you want to delete ${filesToDelete.length} files? (yes/no): `);
  if (answer.toLowerCase() !== 'yes') {
    console.log('❌ Deletion cancelled.\n');
    rl.close();
    return;
  }

  // Delete in batches of 1000 (S3 limit)
  const batchSize = 1000;
  let deletedCount = 0;
  let deletedSize = 0;

  for (let i = 0; i < filesToDelete.length; i += batchSize) {
    const batch = filesToDelete.slice(i, i + batchSize);
    const deleteCommand = new DeleteObjectsCommand({
      Bucket: BUCKET_NAME,
      Delete: {
        Objects: batch.map(obj => ({ Key: obj.Key })),
        Quiet: false
      }
    });

    try {
      const response = await s3Client.send(deleteCommand);
      deletedCount += batch.length;
      deletedSize += batch.reduce((sum, obj) => sum + (obj.Size || 0), 0);
      
      if (response.Errors && response.Errors.length > 0) {
        console.error('⚠️  Some files could not be deleted:');
        response.Errors.forEach(err => {
          console.error(`   ${err.Key}: ${err.Message}`);
        });
      }
      
      process.stdout.write(`\r🗑️  Deleted ${deletedCount}/${filesToDelete.length} files...`);
    } catch (error) {
      console.error(`\n❌ Error deleting batch:`, error.message);
    }
  }

  console.log(`\n✅ Successfully deleted ${deletedCount} files (${formatBytes(deletedSize)})\n`);
  rl.close();
}

async function deleteAllFiles() {
  if (!BUCKET_NAME) {
    console.error('❌ Error: BUCKET_NAME not set.');
    process.exit(1);
  }

  console.log(`⚠️  WARNING: This will delete ALL files in bucket: ${BUCKET_NAME}`);
  console.log(`📍 Region: ${REGION}\n`);

  const allObjects = await listAllObjects();

  if (allObjects.length === 0) {
    console.log('✅ Bucket is already empty.\n');
    rl.close();
    return;
  }

  const answer1 = await question(`⚠️  Are you ABSOLUTELY SURE you want to delete ALL ${allObjects.length} files? (yes/no): `);
  if (answer1.toLowerCase() !== 'yes') {
    console.log('❌ Deletion cancelled.\n');
    rl.close();
    return;
  }

  const answer2 = await question(`⚠️  Type "${BUCKET_NAME}" to confirm: `);
  if (answer2 !== BUCKET_NAME) {
    console.log('❌ Bucket name mismatch. Deletion cancelled.\n');
    rl.close();
    return;
  }

  // Delete in batches
  const batchSize = 1000;
  let deletedCount = 0;

  for (let i = 0; i < allObjects.length; i += batchSize) {
    const batch = allObjects.slice(i, i + batchSize);
    const deleteCommand = new DeleteObjectsCommand({
      Bucket: BUCKET_NAME,
      Delete: {
        Objects: batch.map(obj => ({ Key: obj.Key })),
        Quiet: false
      }
    });

    try {
      await s3Client.send(deleteCommand);
      deletedCount += batch.length;
      process.stdout.write(`\r🗑️  Deleted ${deletedCount}/${allObjects.length} files...`);
    } catch (error) {
      console.error(`\n❌ Error deleting batch:`, error.message);
    }
  }

  console.log(`\n✅ Successfully deleted all ${deletedCount} files.\n`);
  rl.close();
}

async function showStats() {
  if (!BUCKET_NAME) {
    console.error('❌ Error: BUCKET_NAME not set.');
    process.exit(1);
  }

  console.log(`📊 Bucket Statistics: ${BUCKET_NAME}`);
  console.log(`📍 Region: ${REGION}\n`);

  const allObjects = await listAllObjects();

  if (allObjects.length === 0) {
    console.log('✅ Bucket is empty!\n');
    rl.close();
    return;
  }

  const totalSize = allObjects.reduce((sum, obj) => sum + (obj.Size || 0), 0);
  const avgSize = totalSize / allObjects.length;
  const oldestFile = allObjects.reduce((oldest, obj) => 
    (!oldest || (obj.LastModified && obj.LastModified < oldest.LastModified)) ? obj : oldest
  );
  const newestFile = allObjects.reduce((newest, obj) => 
    (!newest || (obj.LastModified && obj.LastModified > newest.LastModified)) ? obj : newest
  );

  // Group by age
  const now = new Date();
  const ageGroups = {
    'Today': 0,
    'This week': 0,
    'This month': 0,
    'Older': 0
  };

  allObjects.forEach(obj => {
    if (!obj.LastModified) {
      ageGroups['Older']++;
      return;
    }
    const ageMs = now - obj.LastModified;
    const ageDays = ageMs / (1000 * 60 * 60 * 24);
    
    if (ageDays < 1) ageGroups['Today']++;
    else if (ageDays < 7) ageGroups['This week']++;
    else if (ageDays < 30) ageGroups['This month']++;
    else ageGroups['Older']++;
  });

  console.log('📊 Statistics:');
  console.log(`   Total files: ${allObjects.length}`);
  console.log(`   Total size: ${formatBytes(totalSize)}`);
  console.log(`   Average file size: ${formatBytes(avgSize)}`);
  console.log(`   Oldest file: ${oldestFile.Key} (${getAge(oldestFile.LastModified)})`);
  console.log(`   Newest file: ${newestFile.Key} (${getAge(newestFile.LastModified)})`);
  console.log();
  console.log('📅 Files by age:');
  Object.entries(ageGroups).forEach(([age, count]) => {
    console.log(`   ${age}: ${count} files`);
  });
  console.log();
  console.log(`💰 Estimated monthly storage cost: ~$${(totalSize / (1024 * 1024 * 1024) * 0.023).toFixed(4)}`);
  console.log('   (First 5 GB are free in free tier)\n');

  rl.close();
}

// Helper functions
function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function getAge(date) {
  if (!date) return 'unknown age';
  const now = new Date();
  const ageMs = now - date;
  const ageDays = Math.floor(ageMs / (1000 * 60 * 60 * 24));
  const ageHours = Math.floor(ageMs / (1000 * 60 * 60));
  const ageMinutes = Math.floor(ageMs / (1000 * 60));

  if (ageDays > 0) return `${ageDays} day${ageDays !== 1 ? 's' : ''} ago`;
  if (ageHours > 0) return `${ageHours} hour${ageHours !== 1 ? 's' : ''} ago`;
  if (ageMinutes > 0) return `${ageMinutes} minute${ageMinutes !== 1 ? 's' : ''} ago`;
  return 'just now';
}

// Main
async function main() {
  const args = process.argv.slice(2);

  if (args.includes('--help') || args.includes('-h')) {
    console.log(`
S3 Cleanup Script for Cost Optimization

Usage:
  node scripts/cleanup-s3.js [command] [options]

Commands:
  --list                        List all files in the bucket
  --delete-older-than <days>    Delete files older than specified days
  --delete-all                  Delete all files (requires confirmation)
  --stats                       Show bucket statistics and cost estimate

Environment Variables:
  NEXT_PUBLIC_AWS_S3_BUCKET     S3 bucket name (or AWS_S3_BUCKET)
  NEXT_PUBLIC_AWS_REGION        AWS region (or AWS_REGION)
  AWS_ACCESS_KEY_ID             AWS access key (or use AWS CLI profile)
  AWS_SECRET_ACCESS_KEY         AWS secret key (or use AWS CLI profile)

Examples:
  node scripts/cleanup-s3.js --list
  node scripts/cleanup-s3.js --delete-older-than 7
  node scripts/cleanup-s3.js --stats
  node scripts/cleanup-s3.js --delete-all

Note: Make sure AWS credentials are configured via AWS CLI or environment variables.
`);
    process.exit(0);
  }

  try {
    if (args.includes('--list')) {
      await listAllObjects();
    } else if (args.includes('--delete-older-than')) {
      const daysIndex = args.indexOf('--delete-older-than');
      const days = parseInt(args[daysIndex + 1]);
      if (isNaN(days) || days < 1) {
        console.error('❌ Error: Please provide a valid number of days (e.g., --delete-older-than 7)');
        process.exit(1);
      }
      await deleteOldFiles(days);
    } else if (args.includes('--delete-all')) {
      await deleteAllFiles();
    } else if (args.includes('--stats')) {
      await showStats();
    } else {
      console.error('❌ Error: No command specified. Use --help for usage information.');
      process.exit(1);
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

main();

