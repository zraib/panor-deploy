# AWS Amplify Deployment Guide for Panorama Viewer

This comprehensive guide will walk you through deploying your panorama viewer application to AWS Amplify with full support for CSV uploads, panorama images, POI assets, and configuration file generation.

## 🎯 What This Deployment Includes

- **File Upload System**: CSV, panorama images, POI assets (PDFs, videos, images)
- **S3 Integration**: Secure cloud storage with automatic organization
- **Config Generation**: Automatic panorama configuration from uploaded data
- **Batch Upload**: Efficient handling of multiple files
- **Real-time Progress**: Upload progress tracking and status updates
- **Error Handling**: Comprehensive error reporting and recovery
- **Scalable Architecture**: Auto-scaling with global CDN distribution

## 📋 Prerequisites

### 1. AWS Account Setup
- Active AWS account with billing enabled
- AWS CLI installed and configured (optional but recommended)
- Basic understanding of AWS services (S3, Amplify, IAM)

### 2. Local Development Environment
- Node.js 18+ installed
- Git repository with your code
- Python 3.7+ (for configuration generation)
- Required Python packages: `numpy`

### 3. Repository Requirements
- Code pushed to a Git repository (GitHub, GitLab, Bitbucket, or AWS CodeCommit)
- All dependencies properly defined in `package.json`
- Environment variables configured

## 🔧 Pre-Deployment Setup

### Step 1: Create S3 Bucket for File Storage

1. **Log into AWS Console** and navigate to S3
2. **Create a new bucket** with these settings:
   ```
   Bucket name: your-panorama-app-bucket-[unique-suffix]
   Region: us-east-1 (or your preferred region)
   Block all public access: UNCHECKED (we need public read access)
   Bucket versioning: Enabled (recommended)
   ```

3. **Configure bucket policy** for public read access:
   ```json
   {
     "Version": "2012-10-17",
     "Statement": [
       {
         "Sid": "PublicReadGetObject",
         "Effect": "Allow",
         "Principal": "*",
         "Action": "s3:GetObject",
         "Resource": "arn:aws:s3:::your-panorama-app-bucket-[unique-suffix]/*"
       }
     ]
   }
   ```

4. **Enable CORS** for web access:
   ```json
   [
     {
       "AllowedHeaders": ["*"],
       "AllowedMethods": ["GET", "PUT", "POST", "DELETE", "HEAD"],
       "AllowedOrigins": ["*"],
       "ExposeHeaders": ["ETag"]
     }
   ]
   ```

### Step 2: Create IAM User for Amplify

1. **Navigate to IAM Console**
2. **Create new user** with these settings:
   ```
   Username: amplify-panorama-user
   Access type: Programmatic access
   ```

3. **Attach policies**:
   - `AWSAmplifyFullAccess`
   - Custom policy for S3 access:
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
           "arn:aws:s3:::your-panorama-app-bucket-[unique-suffix]",
           "arn:aws:s3:::your-panorama-app-bucket-[unique-suffix]/*"
         ]
       }
     ]
   }
   ```

4. **Save credentials** (Access Key ID and Secret Access Key)

### Step 3: Prepare Your Repository

1. **Ensure all files are committed**:
   ```bash
   git add .
   git commit -m "Prepare for AWS Amplify deployment"
   git push origin main
   ```

2. **Verify required files exist**:
   - ✅ `amplify.yml` (build configuration)
   - ✅ `next.config.js` (with standalone output)
   - ✅ `.env.example` (environment template)
   - ✅ `package.json` (with all dependencies)
   - ✅ `src/lib/aws-s3.ts` (S3 utility functions)
   - ✅ `src/pages/api/s3-upload.ts` (single file upload API)
   - ✅ `src/pages/api/s3-batch-upload.ts` (batch upload API)
   - ✅ `src/pages/api/generate-config.ts` (config generation API)
   - ✅ `src/components/upload/S3UploadManager.tsx` (upload component)
   - ✅ `src/components/upload/S3UploadManager.module.css` (upload styles)

3. **Verify API Routes Structure**:
   ```
   src/pages/api/
   ├── s3-upload.ts          # Single file upload to S3
   ├── s3-batch-upload.ts    # Batch file upload to S3
   ├── generate-config.ts    # Generate panorama config
   ├── files/[...path].ts    # Static file serving
   └── poi/
       ├── upload.ts         # POI file upload
       ├── save.ts           # POI data saving
       └── import-single.ts  # Single POI import
   ```

## 🚀 AWS Amplify Deployment

### Step 4: Create Amplify Application

1. **Open AWS Amplify Console**
2. **Click "New app" → "Host web app"**
3. **Select your Git provider** and authorize access
4. **Choose your repository** and branch (usually `main` or `master`)

### Step 5: Configure Build Settings

1. **Review the auto-detected build settings**
   - Amplify should detect the `amplify.yml` file
   - Verify it matches our configuration

2. **If needed, manually configure**:
   ```yaml
   version: 1
   frontend:
     phases:
       preBuild:
         commands:
           - npm ci
           - python -m pip install --upgrade pip
           - python -m pip install numpy
       build:
         commands:
           - npm run build
     artifacts:
       baseDirectory: .next
       files:
         - '**/*'
     cache:
       paths:
         - node_modules/**/*
         - .next/cache/**/*
   ```

### Step 6: Configure Environment Variables

1. **In Amplify Console, go to "Environment variables"**
2. **Add the following variables**:

   | Variable Name | Value | Description |
   |---------------|-------|-------------|
   | `CLOUD_REGION` | `us-east-1` | Your S3 bucket region |
   | `CLOUD_ACCESS_KEY_ID` | `[Your Access Key]` | IAM user access key |
   | `CLOUD_SECRET_ACCESS_KEY` | `[Your Secret Key]` | IAM user secret key |
   | `S3_BUCKET_NAME` | `your-panorama-app-bucket-[suffix]` | Your S3 bucket name |
   | `PANORAMA_CONFIG_MODE` | `standard` | Panorama configuration mode |
   | `PANORAMA_YAW_OFFSET` | `0` | Default yaw offset |
   | `PANORAMA_PITCH_OFFSET` | `0` | Default pitch offset |
   | `PANORAMA_CAMERA_OFFSET` | `1.2` | Camera height offset |
   | `PANORAMA_MAX_DISTANCE` | `10.0` | Maximum connection distance |
   | `PANORAMA_MAX_CONNECTIONS` | `6` | Maximum scene connections |
   | `NEXT_PUBLIC_DEV_MODE` | `false` | Disable dev mode in production |
   | `NEXT_PUBLIC_SHOW_DEBUG_INFO` | `false` | Hide debug info in production |
   | `MAX_FILE_SIZE_PANORAMA` | `52428800` | Max panorama file size (50MB) |
   | `MAX_FILE_SIZE_CSV` | `10485760` | Max CSV file size (10MB) |
   | `MAX_FILE_SIZE_POI` | `20971520` | Max POI file size (20MB) |
   | `MAX_FILE_SIZE_CONFIG` | `5242880` | Max config file size (5MB) |
   | `MAX_TOTAL_BATCH_SIZE` | `524288000` | Max total batch size (500MB) |

### Step 7: Deploy the Application

1. **Click "Save and deploy"**
2. **Monitor the build process**:
   - Provisioning: ~2-3 minutes
   - Build: ~5-10 minutes
   - Deploy: ~2-3 minutes

3. **Verify deployment success**:
   - Build logs should show no errors
   - Application should be accessible via the provided URL

## 🔧 Post-Deployment Configuration

### Step 8: Test File Upload Functionality

1. **Access your deployed application**
   - Navigate to `/upload` page
   - Verify the S3UploadManager component loads correctly

2. **Test Single File Uploads**:
   - ✅ CSV file upload (pano-poses.csv) - Test via `/api/s3-upload`
   - ✅ Panorama image upload (.jpg, .png) - Test via `/api/s3-upload`
   - ✅ POI asset upload (images, PDFs, videos) - Test via `/api/poi/upload`
   - ✅ JSON configuration files - Test via `/api/s3-upload`

3. **Test Batch Upload Functionality**:
   - ✅ Multiple panorama images simultaneously
   - ✅ Mixed file types (CSV + images + POI assets)
   - ✅ Progress tracking during upload
   - ✅ Error handling for oversized files
   - ✅ Automatic file type detection and organization

4. **Test Configuration Generation**:
   - ✅ Upload CSV file with panorama positions
   - ✅ Upload corresponding panorama images
   - ✅ Verify automatic config generation via `/api/generate-config`
   - ✅ Check generated config.json in S3

5. **Verify S3 Storage Structure**:
   - Check your S3 bucket for uploaded files
   - Verify proper folder structure:
     ```
     projects/
     ├── [project-id]/
     │   ├── data/
     │   │   └── pano-poses.csv
     │   ├── panoramas/
     │   │   ├── image1.jpg
     │   │   └── image2.jpg
     │   ├── poi/
     │   │   └── attachments/
     │   │       ├── document.pdf
     │   │       └── video.mp4
     │   └── config/
     │       └── config.json
     ```

6. **Test Error Scenarios**:
   - ✅ Upload files exceeding size limits
   - ✅ Upload unsupported file types
   - ✅ Network interruption during upload
   - ✅ Invalid CSV format
   - ✅ Missing required files for config generation

### Step 9: Configure Custom Domain (Optional)

1. **In Amplify Console, go to "Domain management"**
2. **Add your custom domain**
3. **Follow DNS configuration instructions**
4. **Wait for SSL certificate provisioning**

### Step 10: Set Up Monitoring and Alerts

1. **Enable CloudWatch monitoring**
2. **Set up alerts for**:
   - Build failures
   - High error rates
   - Unusual traffic patterns

## 🔍 Troubleshooting Common Issues

### Build Failures

**Issue**: Python dependencies not installing
```bash
# Solution: Verify Python version in build logs
# Add to amplify.yml preBuild:
- python --version
- python -c "import sys; print(sys.version)"
```

**Issue**: Node.js memory issues
```bash
# Solution: Increase memory in build settings
# Add to amplify.yml preBuild:
- export NODE_OPTIONS="--max-old-space-size=4096"
```

### File Upload Issues

**Issue**: S3 upload permissions denied
- Verify IAM user has correct S3 permissions
- Check bucket policy allows public read access
- Ensure environment variables are correctly set
- Test AWS credentials with AWS CLI: `aws s3 ls s3://your-bucket-name`

**Issue**: File size limits exceeded
- Check API route file size limits:
  - Panoramas: 50MB (`MAX_FILE_SIZE_PANORAMA`)
  - CSV: 10MB (`MAX_FILE_SIZE_CSV`)
  - POI: 20MB (`MAX_FILE_SIZE_POI`)
  - Config: 5MB (`MAX_FILE_SIZE_CONFIG`)
  - Total batch: 500MB (`MAX_TOTAL_BATCH_SIZE`)
- Verify S3 bucket has sufficient storage
- Consider implementing chunked uploads for very large files

**Issue**: Batch upload fails partially
- Check individual file error messages in upload response
- Verify each file meets size and type requirements
- Monitor network stability during large uploads
- Use browser developer tools to inspect failed requests

**Issue**: S3UploadManager component not loading
- Verify `react-dropzone` dependency is installed
- Check browser console for JavaScript errors
- Ensure CSS module is properly imported
- Verify component is properly imported in upload page

**Issue**: Progress tracking not working
- Check if `onUploadProgress` callback is properly configured
- Verify axios is handling progress events correctly
- Monitor network tab in browser developer tools

### Configuration Generation Issues

**Issue**: Python script fails
- Verify numpy is installed in build environment
- Check CSV file format and structure
- Ensure proper file paths in the application

## 📊 Performance Optimization

### 1. Enable CDN Caching
- Amplify automatically provides CloudFront CDN
- Configure appropriate cache headers for different file types
- Set longer cache times for static assets

### 2. Optimize Image Delivery
- Consider using WebP format for panoramas
- Implement progressive JPEG loading
- Use appropriate compression levels

### 3. Database Considerations
- For large-scale deployments, consider using DynamoDB for POI metadata
- Implement caching for frequently accessed configuration files

## 🔒 Security Best Practices

### 1. Environment Variables
- Never commit sensitive data to repository
- Use Amplify's environment variable encryption
- Rotate access keys regularly

### 2. S3 Security
- Implement least-privilege access policies
- Enable S3 access logging
- Consider using signed URLs for sensitive content

### 3. Application Security
- Implement proper input validation
- Use HTTPS for all communications
- Regular security audits and updates

## 🔄 Continuous Deployment

Amplify automatically sets up CI/CD:
- **Automatic builds** on git push
- **Branch-based deployments** for testing
- **Rollback capabilities** for quick recovery

### Branch Strategy
```
main/master → Production deployment
develop → Staging environment
feature/* → Preview deployments
```

## 📈 Monitoring and Maintenance

### Regular Tasks
- Monitor S3 storage costs and usage
- Review CloudWatch logs for errors
- Update dependencies regularly
- Backup critical configuration files

### Scaling Considerations
- Monitor API Gateway limits
- Consider Lambda function timeouts
- Plan for increased S3 storage needs
- Implement proper error handling and retry logic

## 🔗 API Endpoints Reference

Your deployed application will have these key API endpoints:

### File Upload APIs
- **`/api/s3-upload`** - Single file upload to S3
  - Supports: Images, CSV, JSON, PDF, Videos
  - Max size: Varies by file type
  - Returns: S3 URL and metadata

- **`/api/s3-batch-upload`** - Batch file upload to S3
  - Supports: Multiple files simultaneously
  - Auto-categorizes files by type
  - Returns: Batch upload results and summary

- **`/api/generate-config`** - Generate panorama configuration
  - Requires: CSV file and panorama images in S3
  - Generates: config.json with panorama metadata
  - Updates: Image URLs to point to S3

### Legacy Upload APIs (Still Supported)
- **`/api/poi/upload`** - POI file upload
- **`/api/poi/save`** - POI data saving
- **`/api/files/[...path]`** - Static file serving

## 🎯 Success Checklist

### Pre-Deployment
- [ ] S3 bucket created and configured with CORS
- [ ] IAM user created with proper S3 permissions
- [ ] Repository prepared with all required files
- [ ] All new S3 upload components committed to repository
- [ ] Environment variables template (`.env.example`) updated

### Deployment
- [ ] Amplify application created and configured
- [ ] Build settings configured with `amplify.yml`
- [ ] Environment variables set correctly (including file size limits)
- [ ] Application deployed successfully without build errors
- [ ] Python dependencies (numpy) installed correctly

### Testing
- [ ] S3UploadManager component loads on upload page
- [ ] Single file upload functionality tested
- [ ] Batch upload functionality tested
- [ ] Configuration generation working
- [ ] POI system functional
- [ ] Error handling working for oversized files
- [ ] Progress tracking working during uploads
- [ ] S3 bucket shows proper folder structure

### Optional
- [ ] Custom domain configured
- [ ] Monitoring and alerts set up
- [ ] Performance optimization implemented
- [ ] Security best practices applied

## 🆘 Support and Resources

- **AWS Amplify Documentation**: https://docs.amplify.aws/
- **AWS S3 Documentation**: https://docs.aws.amazon.com/s3/
- **Next.js Deployment Guide**: https://nextjs.org/docs/deployment
- **Application-specific issues**: Check the project's GitHub issues

## 🚀 Quick Deployment Summary

For experienced users, here's the condensed deployment process:

1. **AWS Setup** (15 minutes)
   ```bash
   # Create S3 bucket with public read access
   # Create IAM user with S3 permissions
   # Note down: bucket name, access key, secret key
   ```

2. **Repository Preparation** (5 minutes)
   ```bash
   git add .
   git commit -m "Prepare for AWS Amplify deployment"
   git push origin main
   ```

3. **Amplify Deployment** (10 minutes)
   ```bash
   # Connect repository to Amplify
   # Set environment variables (AWS credentials, bucket name, file size limits)
   # Deploy application
   ```

4. **Testing** (10 minutes)
   ```bash
   # Test upload page: /upload
   # Upload CSV + panorama images
   # Verify S3 storage and config generation
   ```

**Total Time: ~40 minutes**

---

**Congratulations!** Your panorama viewer application is now deployed on AWS Amplify with:

✅ **Advanced File Upload System** - Drag & drop, batch upload, progress tracking
✅ **S3 Cloud Storage** - Scalable, secure, globally distributed
✅ **Automatic Config Generation** - From CSV and panorama data
✅ **POI Asset Management** - Support for images, PDFs, videos
✅ **Error Handling & Recovery** - Comprehensive error reporting
✅ **Production-Ready Architecture** - Auto-scaling with CDN distribution

Your application is ready to handle panorama projects at scale!