export function getSafePostAuthRedirect(
  redirect: string | null | undefined,
  fallback = "/dashboard",
) {
  if (!redirect) {
    return fallback;
  }

  if (!redirect.startsWith("/") || redirect.startsWith("//")) {
    return fallback;
  }

  return redirect;
}

export function navigateAfterAuth(target: string) {
  if (typeof window === "undefined") {
    return;
  }

  window.location.assign(target);
}
