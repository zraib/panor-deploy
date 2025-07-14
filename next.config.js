/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'standalone', // Required for AWS Amplify serverless deployment
  
  // Optimize for production deployment
  experimental: {
    outputFileTracingRoot: undefined,
  },
  
  // Configure for AWS Amplify
  trailingSlash: false,
  
  // API configuration should be handled in individual API route files
  // Body parser and response limits are configured per route
  webpack: (config, { isServer }) => {
    // Handle PDF.js worker files
    if (!isServer) {
      config.resolve.alias = {
        ...config.resolve.alias,
        canvas: false,
      };
    }
    
    // Copy PDF.js worker files
    config.module.rules.push({
      test: /pdf\.worker\.(min\.)?js/,
      type: 'asset/resource',
      generator: {
        filename: 'static/worker/[hash][ext][query]',
      },
    });
    
    return config;
  },
  
  // Environment variables for build time
  env: {
    CUSTOM_KEY: process.env.CUSTOM_KEY,
  },
};

module.exports = nextConfig;
