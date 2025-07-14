# AWS Amplify Compute Role Setup for S3 Access

## 🚨 CRITICAL: Missing IAM Permissions for S3 Access

### Problem
Your AWS Amplify Next.js application is experiencing 500 Internal Server Errors because the Lambda functions running your API routes **do not have IAM permissions to access S3**, even though environment variables are correctly configured.

### Root Cause
AWS Amplify Next.js API routes run as Lambda functions that require explicit IAM permissions to access AWS services like S3. Environment variables alone are insufficient - you need a **Compute Role** with proper S3 permissions.

## Solution: Configure AWS Amplify Compute Role

### Step 1: Create IAM Compute Role

1. **Open AWS IAM Console**
   - Go to [AWS IAM Console](https://console.aws.amazon.com/iam/)
   - Navigate to **Roles** → **Create role**

2. **Configure Trust Policy**
   - Select **Custom trust policy**
   - Enter the following trust policy:

```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Principal": {
                "Service": [
                    "amplify.amazonaws.com"
                ]
            },
            "Action": "sts:AssumeRole"
        }
    ]
}
```

3. **Add S3 Permissions**
   - Attach **AmazonS3FullAccess** policy (or create custom policy with specific bucket permissions)
   - For production, use least-privilege principle with custom policy:

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
                "arn:aws:s3:::YOUR_BUCKET_NAME",
                "arn:aws:s3:::YOUR_BUCKET_NAME/*"
            ]
        }
    ]
}
```

4. **Name the Role**
   - Role name: `amplify-s3-compute-role`
   - Click **Create role**

### Step 2: Attach Compute Role to Amplify App

1. **Open AWS Amplify Console**
   - Go to [AWS Amplify Console](https://console.aws.amazon.com/amplify/)
   - Select your application

2. **Configure Compute Role**
   - Navigate to **App settings** → **IAM roles**
   - Look for "Compute role" section (separate from Service role)
   - Select **Compute role**: `amplify-s3-compute-role`
   - Click **Save**

3. **Redeploy Application**
   - Go to **App settings** → **Rewrites and redirects**
   - Click **Redeploy this version** or push a new commit

### Step 3: Update S3 Client Configuration (Optional)

Modify your S3 client to use the default credential provider chain:

```typescript
// src/lib/aws-s3.ts
import { S3Client } from '@aws-sdk/client-s3';

// Remove explicit credentials, let AWS SDK use IAM role
const s3Client = new S3Client({
  region: process.env.CLOUD_REGION || 'us-east-1',
  // credentials will be automatically provided by the compute role
});

export { s3Client };
```

## Verification Steps

### 1. Check Compute Role Assignment
```bash
# In AWS Amplify Console
# App settings → Environment variables → Compute settings
# Verify: Compute role is set to "amplify-s3-compute-role"
```

### 2. Test API Endpoints
```bash
# Test project creation
curl -X POST https://your-app.amplifyapp.com/api/projects \
  -H "Content-Type: application/json" \
  -d '{"name":"test-project","description":"Test"}'

# Should return 200 OK instead of 500 error
```

### 3. Monitor CloudWatch Logs
```bash
# Check Lambda function logs in CloudWatch
# Look for successful S3 operations instead of credential errors
```

## Security Best Practices

### 1. Least Privilege Principle
- Grant only necessary S3 permissions
- Restrict to specific bucket ARNs
- Avoid using `AmazonS3FullAccess` in production

### 2. Bucket-Specific Permissions
```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": [
                "s3:GetObject",
                "s3:PutObject",
                "s3:DeleteObject"
            ],
            "Resource": "arn:aws:s3:::YOUR_SPECIFIC_BUCKET/*"
        },
        {
            "Effect": "Allow",
            "Action": "s3:ListBucket",
            "Resource": "arn:aws:s3:::YOUR_SPECIFIC_BUCKET"
        }
    ]
}
```

### 3. Environment-Specific Roles
- Use different compute roles for dev/staging/prod
- Implement resource tagging for better management

## Troubleshooting

### Common Issues

1. **"Could not load credentials from any providers"**
   - ✅ **Solution**: Compute role not attached or incorrect trust policy
   - ✅ **Fix**: Verify compute role assignment in Amplify Console

2. **"Access Denied" errors**
   - ✅ **Solution**: Insufficient S3 permissions in IAM role
   - ✅ **Fix**: Add required S3 actions to role policy

3. **Role not appearing in Amplify Console**
   - ✅ **Solution**: Trust policy doesn't include `amplify.amazonaws.com`
   - ✅ **Fix**: Update trust policy with correct service principal

### Debug Commands

```bash
# Check IAM role trust policy
aws iam get-role --role-name amplify-s3-compute-role

# List attached policies
aws iam list-attached-role-policies --role-name amplify-s3-compute-role

# Test S3 access (from Lambda environment)
aws s3 ls s3://your-bucket-name
```

## Expected Resolution Timeline

1. **IAM Role Creation**: 2-3 minutes
2. **Amplify Configuration**: 1-2 minutes  
3. **Deployment**: 5-10 minutes
4. **Propagation**: 1-2 minutes

**Total**: ~10-15 minutes

## Next Steps After Setup

1. ✅ **Test all API endpoints** (`/api/projects`)
2. ✅ **Verify S3 operations** (create, list, delete projects)
3. ✅ **Monitor CloudWatch logs** for successful operations
4. ✅ **Remove hardcoded credentials** from environment variables (optional)
5. ✅ **Implement error handling** for S3 operations

## Additional Resources

- [AWS Amplify Compute Roles Documentation](https://aws.amazon.com/blogs/mobile/iam-compute-roles-for-server-side-rendering-with-aws-amplify-hosting/)
- [AWS IAM Best Practices](https://docs.aws.amazon.com/IAM/latest/UserGuide/best-practices.html)
- [S3 Bucket Policies](https://docs.aws.amazon.com/AmazonS3/latest/userguide/bucket-policies.html)

---

**⚠️ IMPORTANT**: This compute role setup is **mandatory** for S3 access from Amplify Next.js API routes. Environment variables alone are insufficient for AWS service authentication in the Lambda runtime environment.