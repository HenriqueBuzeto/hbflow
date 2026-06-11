import { NextResponse } from "next/server";

export async function GET() {
  // An intentional error to verify Sentry catches route errors
  console.log("Triggering Sentry test error...");
  throw new Error("Sentry Debug Test: An intentional error thrown to verify instrumentation is active.");
}
