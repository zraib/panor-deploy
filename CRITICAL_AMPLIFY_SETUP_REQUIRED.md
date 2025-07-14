# 🚨 CRITICAL: AWS Amplify Environment Variables Setup Required

## Current Status
**The 500 Internal Server Error persists because environment variables are NOT configured in the AWS Amplify Console.**

## ⚠️ IMMEDIATE ACTION REQUIRED

The persistent **500 Internal Server Error** is due to missing IAM permissions for AWS Amplify to access S3. The code implementation is correct, but AWS Amplify requires manual configuration of a Compute Role for secure S3 access.

### Step 1: Create IAM Compute Role (One-time setup)

1. **Navigate to AWS IAM Console**:
   - Go to: https://console.aws.amazon.com/iam/
   - Click **Roles** → **Create role**
   - Select **Custom trust policy**

2. **Add Trust Policy**:
   ```json
   {
     "Version": "2012-10-17",
     "Statement": [
       {
         "Effect": "Allow",
         "Principal": {
           "Service": "amplify.amazonaws.com"
         },
         "Action": "sts:AssumeRole"
       }
     ]
   }
   ```

3. **Attach S3 Permissions**:
   - Add **AmazonS3FullAccess** policy (or create custom S3 policy)
   - Name the role: `amplify-s3-compute-role`
   - Create the role

### Step 2: Configure Compute Role in AWS Amplify Console

1. **Navigate to AWS Amplify Console**:
   - Go to: https://console.aws.amazon.com/amplify/
   - Select your application
   - Go to **App settings** → **IAM roles**

2. **Configure Compute Role**:
   - In the **Compute role** section (separate from Service role)
   - Click **Edit** next to "Default role"
   - Select: `amplify-s3-compute-role`
   - Click **Save**

3. **Redeploy Application**:
   - Save and redeploy your application
   - This will trigger a new deployment with secure S3 access

## Why This Is Critical

According to AWS documentation <mcreference link="https://docs.aws.amazon.com/amplify/latest/userguide/ssr-environment-variables.html" index="1">1</mcreference>:

> "A Next.js server component doesn't have access to those environment variables by default. This behavior is intentional to protect any secrets stored in environment variables."

The API routes are deployed as Lambda functions that cannot access Amplify environment variables without explicit configuration <mcreference link="https://www.thisdot.co/blog/utilizing-api-environment-variables-on-next-js-apps-deployed-to-aws-amplify" index="3">3</mcreference>.

## Current Error Analysis

The `/api/projects` endpoint fails because:
1. **S3 Client Initialization**: Requires AWS credentials
2. **Environment Variables Missing**: `CLOUD_ACCESS_KEY_ID`, `CLOUD_SECRET_ACCESS_KEY`, etc. are undefined
3. **Lambda Function Isolation**: Serverless functions don't inherit Amplify build environment

## Verification After Setup

### 1. Check Build Logs
After adding variables and redeploying:
- Monitor build logs for environment variable injection
- Look for: `CLOUD_ACCESS_KEY_ID=***` in build output

### 2. Test API Endpoint
```bash
# Should return project list instead of 500 error
curl https://main.dqpveyq49jtde.amplifyapp.com/api/projects
```

### 3. Test Project Creation
```bash
curl -X POST https://main.dqpveyq49jtde.amplifyapp.com/api/projects \
  -H "Content-Type: application/json" \
  -d '{"name": "test-project"}'
```

## S3 Bucket Requirements

Ensure your S3 bucket:
1. **Exists** in the specified region
2. **Has proper IAM permissions** for the provided credentials
3. **Allows** the required operations: `ListObjects`, `PutObject`, `DeleteObject`

### Sample IAM Policy
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
        "arn:aws:s3:::your-bucket-name",
        "arn:aws:s3:::your-bucket-name/*"
      ]
    }
  ]
}
```

## Expected Resolution Timeline

- **Environment Variable Setup**: 2-3 minutes
- **Redeploy Process**: 5-10 minutes
- **DNS Propagation**: 1-2 minutes
- **Total**: ~15 minutes maximum

## Troubleshooting

If the error persists after setup:

1. **Check Variable Names**: Must match exactly (case-sensitive)
2. **Verify Credentials**: Test AWS credentials independently
3. **Check S3 Bucket**: Ensure bucket exists and is accessible
4. **Review Build Logs**: Look for environment variable injection errors
5. **Check CloudWatch**: Review Lambda function logs for detailed errors

---

**🔥 This is the missing piece that will resolve the 500 error. The code changes are correct, but the runtime environment needs these variables configured in the Amplify Console.**