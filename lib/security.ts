/**
 * Security module for Dashboard B
 * Blocks console access and detects DevTools in production
 */

const isProduction = import.meta.env.PROD;

// Store original console methods for internal use only
const originalConsole = {
  log: console.log.bind(console),
  warn: console.warn.bind(console),
  error: console.error.bind(console),
  info: console.info.bind(console),
  debug: console.debug.bind(console),
  table: console.table.bind(console),
  trace: console.trace.bind(console),
};

/**
 * Initialize console protection
 * Replaces console methods with no-ops in production
 */
export const initConsoleProtection = (): void => {
  if (!isProduction) {
    originalConsole.info('[Security] Console protection disabled in development mode');
    return;
  }

  // Replace all console methods with no-ops
  const noop = () => {};

  console.log = noop;
  console.warn = noop;
  console.error = noop;
  console.info = noop;
  console.debug = noop;
  console.table = noop;
  console.trace = noop;
  console.dir = noop;
  console.dirxml = noop;
  console.group = noop;
  console.groupCollapsed = noop;
  console.groupEnd = noop;
  console.time = noop;
  console.timeEnd = noop;
  console.timeLog = noop;
  console.assert = noop;
  console.count = noop;
  console.countReset = noop;
  console.clear = noop;
  console.profile = noop;
  console.profileEnd = noop;

  // Add a warning message for anyone who opens console
  Object.defineProperty(window, 'console', {
    get: () => {
      return new Proxy(console, {
        get: (target, prop) => {
          if (typeof target[prop as keyof Console] === 'function') {
            return noop;
          }
          return target[prop as keyof Console];
        }
      });
    },
    configurable: false
  });
};

/**
 * DevTools detection using various methods
 */
let devToolsOpen = false;

const detectDevTools = (): void => {
  if (!isProduction) return;

  // Method 1: Console timing detection
  const checkConsole = () => {
    const startTime = performance.now();
    // debugger statement detection (commented out to avoid interrupting flow)
    // eval('debugger');
    const endTime = performance.now();

    if (endTime - startTime > 100) {
      devToolsOpen = true;
      handleDevToolsOpen();
    }
  };

  // Method 2: Window size detection
  const threshold = 160;
  const checkWindowSize = () => {
    const widthDiff = window.outerWidth - window.innerWidth > threshold;
    const heightDiff = window.outerHeight - window.innerHeight > threshold;

    if (widthDiff || heightDiff) {
      if (!devToolsOpen) {
        devToolsOpen = true;
        handleDevToolsOpen();
      }
    } else {
      devToolsOpen = false;
    }
  };

  // Method 3: Console.log detection with object getter
  const element = new Image();
  Object.defineProperty(element, 'id', {
    get: function() {
      devToolsOpen = true;
      handleDevToolsOpen();
      return '';
    }
  });

  // Run detection periodically
  setInterval(() => {
    checkWindowSize();
    // Trigger console check without being too aggressive
    console.log(element);
    console.clear();
  }, 1000);
};

const handleDevToolsOpen = (): void => {
  // Log for internal monitoring (won't show in blocked console)
  originalConsole.warn('[Security] DevTools detected');

  // Optional: Add visual warning or redirect
  // This is less aggressive than redirecting
  document.body.innerHTML = `
    <div style="
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 100vh;
      background: #0a0a0a;
      color: white;
      font-family: system-ui, -apple-system, sans-serif;
      text-align: center;
      padding: 20px;
    ">
      <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2">
        <circle cx="12" cy="12" r="10"></circle>
        <line x1="12" y1="8" x2="12" y2="12"></line>
        <line x1="12" y1="16" x2="12.01" y2="16"></line>
      </svg>
      <h1 style="margin-top: 24px; font-size: 24px; font-weight: bold;">Acceso No Autorizado</h1>
      <p style="margin-top: 12px; color: #888; max-width: 400px;">
        Las herramientas de desarrollador no están permitidas en esta aplicación.
        Por favor cierre DevTools y recargue la página.
      </p>
      <button onclick="location.reload()" style="
        margin-top: 24px;
        padding: 12px 24px;
        background: #007AFF;
        color: white;
        border: none;
        border-radius: 8px;
        cursor: pointer;
        font-weight: bold;
      ">Recargar Página</button>
    </div>
  `;
};

/**
 * Prevent common web scraping techniques
 */
export const initAntiScraping = (): void => {
  if (!isProduction) return;

  // Disable right-click context menu
  document.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    return false;
  });

  // Disable text selection (optional - may affect UX)
  document.addEventListener('selectstart', (e) => {
    const target = e.target as HTMLElement;
    // Allow selection in input fields
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
      return true;
    }
    e.preventDefault();
    return false;
  });

  // Disable copy (except in inputs)
  document.addEventListener('copy', (e) => {
    const target = e.target as HTMLElement;
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
      return true;
    }
    e.preventDefault();
    return false;
  });

  // Disable keyboard shortcuts for DevTools
  document.addEventListener('keydown', (e) => {
    // F12
    if (e.key === 'F12') {
      e.preventDefault();
      return false;
    }
    // Ctrl+Shift+I, Ctrl+Shift+J, Ctrl+Shift+C
    if (e.ctrlKey && e.shiftKey && ['I', 'J', 'C'].includes(e.key.toUpperCase())) {
      e.preventDefault();
      return false;
    }
    // Ctrl+U (View Source)
    if (e.ctrlKey && e.key.toUpperCase() === 'U') {
      e.preventDefault();
      return false;
    }
  });
};

/**
 * Initialize all security measures
 */
export const initSecurity = (): void => {
  initConsoleProtection();
  initAntiScraping();

  // DevTools detection is more aggressive - only enable if needed
  // detectDevTools();

  if (isProduction) {
    originalConsole.info('[Security] Security measures initialized');
  }
};

// Auto-initialize when module is imported
initSecurity();

export default { initSecurity, initConsoleProtection, initAntiScraping };
