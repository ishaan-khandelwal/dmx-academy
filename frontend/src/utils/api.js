/**
 * Resolves the backend API base URL dynamically.
 */
export function getApiBase(fallbackPort = 5472) {
  if (process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL;
  }
  if (typeof window !== "undefined") {
    const hostname = window.location.hostname;
    // Local dev checking
    if (hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1") {
      return "http://127.0.0.1:" + fallbackPort;
    }
  }
  // Production fallback for the VPS server
  return "http://72.61.239.20";
}

/**
 * Builds Authorization headers for API requests.
 * Passes x-bypass-userid so the backend resolves the actual institute-scoped user.
 *
 * @param {string|null} token - JWT token from useAuth()
 * @param {object|null} user  - User object from useAuth() (needs .id and .role)
 * @param {object}      extra - Any extra headers to merge in
 */
export function buildAuthHeaders(token, user, extra = {}) {
  const hasRealToken = token && !token.startsWith("demo-") && !token.startsWith("local-");
  const base = { "Content-Type": "application/json" };

  if (hasRealToken) {
    return { ...base, Authorization: "Bearer " + token, ...extra };
  }

  // Dev / demo bypass -- send userid so backend finds the actual institute-scoped user
  const bypassRole =
    user?.role === "MENTOR" ? "MENTOR" :
    user?.role === "USER"   ? "USER"   : "ADMIN";

  const userId = user?.id;
  const isRealDbId =
    userId &&
    !String(userId).startsWith("demo-") &&
    !String(userId).startsWith("local-");

  const bypass = {
    "x-bypass-auth": "true",
    "x-bypass-role": bypassRole,
    ...(isRealDbId ? { "x-bypass-userid": String(userId) } : {}),
  };

  return { ...base, ...bypass, ...extra };
}
