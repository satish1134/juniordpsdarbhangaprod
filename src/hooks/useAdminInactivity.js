import { useEffect, useState, useCallback, useRef } from "react";
import {
  recordAdminActivity,
  getRemainingSessionTime,
  isSessionExpired,
  clearAdminSession,
  INACTIVITY_WARNING_MS,
  LAST_ACTIVITY_KEY,
  TOKEN_KEY,
} from "../lib/sessionManager";

/**
 * Hook to monitor admin user activity and enforce 5-minute auto-logout.
 *
 * @param {Object} options
 * @param {Function} options.onTimeout Callback invoked when the 5-minute timeout expires.
 * @param {boolean} options.enabled Whether activity tracking is currently enabled.
 */
export function useAdminInactivity({ onTimeout, enabled = true }) {
  const [remainingMs, setRemainingMs] = useState(getRemainingSessionTime());
  const [showWarning, setShowWarning] = useState(false);
  const timeoutTriggeredRef = useRef(false);

  const resetActivity = useCallback(() => {
    if (!enabled) return;
    recordAdminActivity(true);
    setRemainingMs(getRemainingSessionTime());
    setShowWarning(false);
  }, [enabled]);

  // Handle explicit timeout
  const handleTimeout = useCallback(() => {
    if (timeoutTriggeredRef.current) return;
    timeoutTriggeredRef.current = true;
    clearAdminSession();
    if (typeof onTimeout === "function") {
      onTimeout();
    }
  }, [onTimeout]);

  useEffect(() => {
    if (!enabled) return;

    // Check immediately on mount if session was already expired (e.g. reopened tab from yesterday)
    if (isSessionExpired()) {
      handleTimeout();
      return;
    }

    timeoutTriggeredRef.current = false;
    recordAdminActivity(true);

    const userEvents = [
      "mousemove",
      "mousedown",
      "keydown",
      "touchstart",
      "scroll",
      "wheel",
      "pointerdown",
      "focus",
    ];

    const handleUserInteraction = () => {
      // Record activity
      recordAdminActivity(false);
      const remaining = getRemainingSessionTime();
      setRemainingMs(remaining);
      if (remaining > INACTIVITY_WARNING_MS) {
        setShowWarning(false);
      }
    };

    userEvents.forEach((evt) => {
      window.addEventListener(evt, handleUserInteraction, { passive: true });
    });

    // Cross-tab synchronization via localStorage storage event
    const handleStorageChange = (e) => {
      if (e.key === LAST_ACTIVITY_KEY) {
        const remaining = getRemainingSessionTime();
        setRemainingMs(remaining);
        if (remaining > INACTIVITY_WARNING_MS) {
          setShowWarning(false);
        }
      } else if (e.key === TOKEN_KEY && !e.newValue) {
        // Token was removed in another tab
        handleTimeout();
      }
    };
    window.addEventListener("storage", handleStorageChange);

    // Periodic interval to check remaining time every second
    const interval = setInterval(() => {
      const remaining = getRemainingSessionTime();
      setRemainingMs(remaining);

      if (remaining <= 0) {
        handleTimeout();
      } else if (remaining <= INACTIVITY_WARNING_MS) {
        setShowWarning(true);
      } else {
        setShowWarning(false);
      }
    }, 1000);

    return () => {
      userEvents.forEach((evt) => {
        window.removeEventListener(evt, handleUserInteraction);
      });
      window.removeEventListener("storage", handleStorageChange);
      clearInterval(interval);
    };
  }, [enabled, handleTimeout]);

  const remainingSeconds = Math.max(0, Math.ceil(remainingMs / 1000));
  const remainingMinutes = Math.floor(remainingSeconds / 60);
  const remainingSecondsFormatted = (remainingSeconds % 60).toString().padStart(2, "0");

  return {
    remainingMs,
    remainingSeconds,
    remainingFormatted: `${remainingMinutes}:${remainingSecondsFormatted}`,
    showWarning,
    resetActivity,
  };
}
