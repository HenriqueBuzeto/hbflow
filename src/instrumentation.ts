import * as Sentry from '@sentry/nextjs';

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    Sentry.init({
      dsn: process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN,
      tracesSampleRate: 1.0,
      debug: false,
      enabled: process.env.NODE_ENV === "production" || !!(process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN),
    });
  }

  if (process.env.NEXT_RUNTIME === 'edge') {
    Sentry.init({
      dsn: process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN,
      tracesSampleRate: 1.0,
      debug: false,
      enabled: process.env.NODE_ENV === "production" || !!(process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN),
    });
  }
}
