import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig: NextConfig = {
  webpack: (config, { isServer, webpack }) => {
    if (!isServer) {
      // Intercept node:diagnostics_channel and rewrite it to a bypassed module ('net')
      config.plugins.push(
        new webpack.NormalModuleReplacementPlugin(
          /^node:diagnostics_channel$/,
          (resource: any) => {
            resource.request = 'net';
          }
        )
      );

      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        dns: false,
        child_process: false,
        worker_threads: false,
        tls: false,
      };
    }
    return config;
  },
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
