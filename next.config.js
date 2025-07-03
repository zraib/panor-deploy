/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Increase timeout for API routes
  api: {
    responseLimit: false,
    bodyParser: {
      sizeLimit: '2gb',
    },
  },
  // Set max duration for serverless functions
  maxDuration: 300, // 5 minutes
};

module.exports = nextConfig;
