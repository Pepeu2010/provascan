import { headers } from "next/headers";

/** Reject cross-origin state changes before they reach authenticated handlers. */
export async function hasSameOriginRequest() {
  const requestHeaders = await headers();
  const origin = requestHeaders.get("origin");
  const host = requestHeaders.get("host");
  if (!origin || !host) return false;

  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}
