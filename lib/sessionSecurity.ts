/**
 * Session Security Module for Dashboard B
 * Handles session timeout and activity monitoring
 */

export const SESSION_CONFIG = {
  TIMEOUT_MS: 30 * 60 * 1000, // 30 minutes
  WARNING_MS: 5 * 60 * 1000,  // 5 minutes before timeout
  WARNING_MINUTES: 5,
  CHECK_INTERVAL_MS: 30 * 1000, // Check every 30 seconds
};

type SessionCallback = () => void;
type WarningCallback = (minutesRemaining: number) => void;

interface SessionSecurityManager {
  start: (onTimeout: SessionCallback, onWarning: WarningCallback) => void;
  stop: () => void;
  extendSession: () => void;
  getTimeRemaining: () => number;
  isActive: () => boolean;
}

const createSessionSecurity = (): SessionSecurityManager => {
  let lastActivity = Date.now();
  let timeoutId: NodeJS.Timeout | null = null;
  let checkIntervalId: NodeJS.Timeout | null = null;
  let warningShown = false;
  let onTimeoutCallback: SessionCallback | null = null;
  let onWarningCallback: WarningCallback | null = null;
  let isRunning = false;

  const activityEvents = [
    'mousedown',
    'mousemove',
    'keydown',
    'scroll',
    'touchstart',
    'click',
  ];

  const updateActivity = (): void => {
    lastActivity = Date.now();
    warningShown = false;
  };

  const getTimeRemaining = (): number => {
    const elapsed = Date.now() - lastActivity;
    return Math.max(0, SESSION_CONFIG.TIMEOUT_MS - elapsed);
  };

  const checkSession = (): void => {
    const remaining = getTimeRemaining();

    if (remaining <= 0) {
      // Session expired
      stop();
      if (onTimeoutCallback) {
        onTimeoutCallback();
      }
    } else if (remaining <= SESSION_CONFIG.WARNING_MS && !warningShown) {
      // Show warning
      warningShown = true;
      const minutesRemaining = Math.ceil(remaining / 60000);
      if (onWarningCallback) {
        onWarningCallback(minutesRemaining);
      }
    }
  };

  const start = (onTimeout: SessionCallback, onWarning: WarningCallback): void => {
    if (isRunning) return;

    isRunning = true;
    onTimeoutCallback = onTimeout;
    onWarningCallback = onWarning;
    lastActivity = Date.now();
    warningShown = false;

    // Add activity listeners
    activityEvents.forEach((event) => {
      document.addEventListener(event, updateActivity, { passive: true });
    });

    // Start checking interval
    checkIntervalId = setInterval(checkSession, SESSION_CONFIG.CHECK_INTERVAL_MS);
  };

  const stop = (): void => {
    isRunning = false;

    // Remove activity listeners
    activityEvents.forEach((event) => {
      document.removeEventListener(event, updateActivity);
    });

    // Clear intervals
    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }
    if (checkIntervalId) {
      clearInterval(checkIntervalId);
      checkIntervalId = null;
    }

    onTimeoutCallback = null;
    onWarningCallback = null;
  };

  const extendSession = (): void => {
    lastActivity = Date.now();
    warningShown = false;
  };

  const isActive = (): boolean => isRunning;

  return {
    start,
    stop,
    extendSession,
    getTimeRemaining,
    isActive,
  };
};

// Export singleton instance
export const sessionSecurity = createSessionSecurity();

export default sessionSecurity;
