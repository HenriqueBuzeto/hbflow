import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig: NextConfig = {
  /* config options here */
};

export default withSentryConfig(nextConfig, {
  // Sentry SDK configuration options
  org: process.env.SENTRY_ORG || "hbflow",
  project: process.env.SENTRY_PROJECT || "hbflow",
  
  // Only print logs for uploading source maps in production
  silent: !process.env.CI,
  
  widenClientFileUpload: true,
  hideSourceMaps: true,
  disableLogger: true,
  automaticVercelMonitors: true,
});
