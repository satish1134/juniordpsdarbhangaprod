/**
 * Admin Session & Inactivity Timeout Manager
 * Enforces automatic logout after 5 minutes (300 seconds) of inactivity.
 */

export const INACTIVITY_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes
export const INACTIVITY_WARNING_MS = 60 * 1000; // Warning threshold: 1 minute remaining before logout

export const TOKEN_KEY = "jdps_admin_token";
export const LAST_ACTIVITY_KEY = "jdps_admin_last_activity";
export const ADMIN_USER_KEY = "jdps_admin_username";

let lastWriteTime = 0;

/**
 * Updates the last activity timestamp in localStorage.
 * Throttled to prevent high-frequency storage writes on rapid mouse moves.
 */
export function recordAdminActivity(force = false) {
  if (typeof window === "undefined") return;

  const now = Date.now();
  // Throttle writes to at most once every 1000ms unless forced
  if (!force && now - lastWriteTime < 1000) {
    return;
  }

  const token = localStorage.getItem(TOKEN_KEY);
  if (token) {
    lastWriteTime = now;
    try {
      localStorage.setItem(LAST_ACTIVITY_KEY, now.toString());
    } catch {
      // storage quota or private mode safe fallback
    }
  }
}

/**
 * Retrieves the timestamp of the last recorded activity.
 */
export function getLastAdminActivity() {
  if (typeof window === "undefined") return 0;
  const raw = localStorage.getItem(LAST_ACTIVITY_KEY);
  if (!raw) return 0;
  const ts = parseInt(raw, 10);
  return isNaN(ts) ? 0 : ts;
}

/**
 * Returns the milliseconds remaining until the 5-minute inactivity timeout expires.
 */
export function getRemainingSessionTime() {
  if (typeof window === "undefined") return 0;
  const token = localStorage.getItem(TOKEN_KEY);
  if (!token) return 0;

  const lastActive = getLastAdminActivity();
  if (!lastActive) return 0;

  const elapsed = Date.now() - lastActive;
  const remaining = INACTIVITY_TIMEOUT_MS - elapsed;
  return Math.max(0, remaining);
}

/**
 * Checks if the current admin session is expired due to inactivity.
 */
export function isSessionExpired() {
  if (typeof window === "undefined") return false;
  const token = localStorage.getItem(TOKEN_KEY);
  if (!token) return true;

  const lastActive = getLastAdminActivity();
  if (!lastActive) {
    // If token exists but no activity record exists, treat as expired
    return true;
  }

  return Date.now() - lastActive >= INACTIVITY_TIMEOUT_MS;
}

/**
 * Initializes a new admin session with a fresh 5-minute inactivity window.
 */
export function initAdminSession(token, username = "") {
  if (typeof window === "undefined") return;
  const now = Date.now();
  lastWriteTime = now;
  if (token) {
    localStorage.setItem(TOKEN_KEY, token);
  }
  if (username) {
    localStorage.setItem(ADMIN_USER_KEY, username);
  }
  localStorage.setItem(LAST_ACTIVITY_KEY, now.toString());
}

/**
 * Clears all admin authentication and session state.
 */
export function clearAdminSession() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(LAST_ACTIVITY_KEY);
  localStorage.removeItem(ADMIN_USER_KEY);
  sessionStorage.removeItem(TOKEN_KEY);
}

/**
 * Checks whether an active and non-expired session exists.
 */
export function hasValidAdminSession() {
  if (typeof window === "undefined") return false;
  const token = localStorage.getItem(TOKEN_KEY);
  if (!token) return false;
  return !isSessionExpired();
}
