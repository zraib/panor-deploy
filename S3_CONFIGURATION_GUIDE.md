# S3 Configuration Guide for Panorama Viewer

## 🚨 Critical Issue Resolution

### Problem
The application is experiencing 408 timeout errors and files are not being uploaded to S3 because S3 is not properly configured.

### Root Cause
The environment variables contain placeholder values instead of actual AWS S3 configuration:
- `S3_BUCKET_NAME=your-panorama-app-bucket` (placeholder)
- `CLOUD_ACCESS_KEY_ID=your_access_key_here` (placeholder)
- `CLOUD_SECRET_ACCESS_KEY=your_secret_key_here` (placeholder)

## 🔧 Solution

### For AWS Amplify Deployment (Recommended)

1. **Set up AWS Amplify Environment Variables:**
   ```
   CLOUD_REGION=us-east-1
   S3_BUCKET_NAME=your-actual-bucket-name
   ```
   
2. **Configure AWS Amplify Compute Role:**
   - Go to AWS Amplify Console
   - Navigate to your app → General → App settings
   - Set up a service role with S3 permissions
   - Attach the following IAM policy:
   
   ```json
   {
     "Version": "2012-10-17",
     "Statement": [
       {
         "Effect": "Allow",
         "Action": [
           "s3:GetObject",
           "s3:PutObject",
           "s3:DeleteObject",
           "s3:ListBucket"
         ],
         "Resource": [
           "arn:aws:s3:::your-actual-bucket-name",
           "arn:aws:s3:::your-actual-bucket-name/*"
         ]
       }
     ]
   }
   ```

### For Local Development

1. **Update `.env` file:**
   ```
   CLOUD_REGION=us-east-1
   CLOUD_ACCESS_KEY_ID=your_actual_access_key
   CLOUD_SECRET_ACCESS_KEY=your_actual_secret_key
   S3_BUCKET_NAME=your-actual-bucket-name
   ```

2. **Create S3 Bucket:**
   - Create a new S3 bucket in AWS Console
   - Configure appropriate permissions
   - Note the bucket name and region

## 🔍 Verification

### Check S3 Configuration Status
The application now includes improved logging to help diagnose S3 configuration issues:

1. **Check Browser Console** for upload errors
2. **Check Server Logs** for S3 configuration status
3. **Look for these log messages:**
   - `S3 is configured, uploading images to S3...` ✅
   - `S3 is not configured, using local file storage...` ❌

### Test Upload
1. Try uploading a small project with CSV and images
2. Check if files appear in your S3 bucket
3. Verify the folder structure: `projects/{projectId}/images/` and `projects/{projectId}/csv/`

## 🚀 Benefits of Proper S3 Configuration

- ✅ **Scalable Storage**: No local disk space limitations
- ✅ **Fast Uploads**: Optimized for large file handling
- ✅ **Reliable**: Built-in redundancy and durability
- ✅ **Cost-Effective**: Pay only for what you use
- ✅ **Global Access**: Files accessible from anywhere

## 🔧 Troubleshooting

### Common Issues

1. **"Storage configuration error"**
   - S3 bucket name contains placeholder values
   - Missing AWS credentials or IAM role
   - Solution: Update environment variables with actual values

2. **"Access Denied" errors**
   - IAM permissions insufficient
   - Bucket policy too restrictive
   - Solution: Review and update IAM policies

3. **"Bucket does not exist"**
   - Bucket name incorrect or bucket in different region
   - Solution: Verify bucket name and region

### Debug Commands

To test S3 configuration manually:

```bash
# Test S3 access
aws s3 ls s3://your-actual-bucket-name --region us-east-1

# Test upload
echo "test" > test.txt
aws s3 cp test.txt s3://your-actual-bucket-name/test.txt
```

## 📞 Support

If you continue to experience issues:
1. Check the application logs for detailed error messages
2. Verify your AWS credentials and permissions
3. Ensure your S3 bucket exists and is accessible
4. Contact your AWS administrator for assistance with IAM roles and policies