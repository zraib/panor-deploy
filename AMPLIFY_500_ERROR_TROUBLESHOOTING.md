# AWS Amplify 500 Error Troubleshooting Guide

## Issue Description
The `/api/projects` endpoint returns a 500 Internal Server Error when deployed to AWS Amplify, despite working correctly in local development.

## Root Cause Analysis
The primary cause of 500 errors in AWS Amplify with Next.js API routes is typically:
1. **Missing Environment Variables**: Server-side API routes cannot access required environment variables
2. **Serverless Environment Limitations**: File system write operations are not supported
3. **Build Configuration Issues**: Environment variables not properly passed to the runtime

## Solution Implementation

### 1. Environment Variable Configuration
Updated `amplify.yml` to properly inject environment variables during build:

```yaml
build:
  commands:
    # Set environment variables for Next.js
    - env | grep -e CLOUD_ACCESS_KEY_ID -e CLOUD_SECRET_ACCESS_KEY -e CLOUD_REGION -e S3_BUCKET_NAME >> .env.production
    - env | grep -e AWS_ACCESS_KEY_ID -e AWS_SECRET_ACCESS_KEY -e AWS_REGION -e AWS_S3_BUCKET_NAME >> .env.production
    - env | grep -e NEXT_PUBLIC_ >> .env.production
    # Build the Next.js application
    - npm run build
```

### 2. Required Environment Variables
Ensure these environment variables are configured in AWS Amplify Console:

#### Primary Variables (CLOUD_* format):
- `CLOUD_REGION`: AWS region (e.g., us-east-1)
- `CLOUD_ACCESS_KEY_ID`: AWS access key ID
- `CLOUD_SECRET_ACCESS_KEY`: AWS secret access key
- `S3_BUCKET_NAME`: S3 bucket name for file storage

#### Alternative Variables (AWS_* format):
- `AWS_REGION`: AWS region
- `AWS_ACCESS_KEY_ID`: AWS access key ID
- `AWS_SECRET_ACCESS_KEY`: AWS secret access key
- `AWS_S3_BUCKET_NAME`: S3 bucket name

### 3. AWS Amplify Console Configuration

1. **Navigate to Environment Variables**:
   - Go to AWS Amplify Console
   - Select your app
   - Go to "App settings" > "Environment variables"

2. **Add Required Variables**:
   ```
   CLOUD_REGION = us-east-1
   CLOUD_ACCESS_KEY_ID = [your-access-key]
   CLOUD_SECRET_ACCESS_KEY = [your-secret-key]
   S3_BUCKET_NAME = [your-bucket-name]
   ```

3. **Save and Redeploy**:
   - Click "Save"
   - Trigger a new deployment

## Verification Steps

### 1. Check Build Logs
- Monitor the build process in Amplify Console
- Verify environment variables are being set
- Look for any build errors

### 2. Test API Endpoint
```bash
# Test the projects API
curl -X GET https://your-app.amplifyapp.com/api/projects

# Test project creation
curl -X POST https://your-app.amplifyapp.com/api/projects \
  -H "Content-Type: application/json" \
  -d '{"name": "test-project"}'
```

### 3. Check CloudWatch Logs
- Access AWS CloudWatch
- Look for Lambda function logs
- Check for specific error messages

## Common Issues and Solutions

### Issue 1: Environment Variables Not Available
**Symptoms**: `undefined` values for environment variables
**Solution**: 
- Verify variables are set in Amplify Console
- Check variable names match exactly
- Ensure build configuration includes variable injection

### Issue 2: S3 Access Denied
**Symptoms**: AWS S3 permission errors
**Solution**:
- Verify AWS credentials have S3 permissions
- Check bucket policy allows access
- Ensure bucket exists in the specified region

### Issue 3: Build Failures
**Symptoms**: Build process fails during deployment
**Solution**:
- Check build logs for specific errors
- Verify all dependencies are properly installed
- Ensure Node.js version compatibility

## Debugging Commands

### Add Debug Logging
Temporarily add to your API route:
```javascript
console.log('Environment check:', {
  CLOUD_REGION: process.env.CLOUD_REGION,
  CLOUD_ACCESS_KEY_ID: process.env.CLOUD_ACCESS_KEY_ID ? 'SET' : 'MISSING',
  S3_BUCKET_NAME: process.env.S3_BUCKET_NAME
});
```

### Check Runtime Environment
```javascript
console.log('All env vars:', Object.keys(process.env).filter(key => 
  key.includes('CLOUD') || key.includes('AWS') || key.includes('S3')
));
```

## Next Steps

1. **Monitor Deployment**: Watch the build process after applying these changes
2. **Test Functionality**: Verify all API endpoints work correctly
3. **Check Performance**: Monitor response times and error rates
4. **Update Documentation**: Keep this guide updated with any new findings

## Additional Resources

- [AWS Amplify Environment Variables](https://docs.aws.amazon.com/amplify/latest/userguide/environment-variables.html)
- [Next.js Environment Variables](https://nextjs.org/docs/basic-features/environment-variables)
- [AWS S3 SDK Documentation](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/clients/client-s3/)

## Support

If issues persist after following this guide:
1. Check AWS Amplify build logs
2. Review CloudWatch logs for detailed error messages
3. Verify S3 bucket permissions and policies
4. Consider reaching out to AWS Support for infrastructure-specific issues