// Tiny logger — writes to console only in development so production stays quiet
// while still giving us actionable debug info while building.

const isProd = import.meta.env?.PROD ?? (typeof process !== "undefined" && process?.env?.NODE_ENV === "production");

export const logError = (...args) => {
  if (isProd) return;
  // eslint-disable-next-line no-console
  console.error(...args);
};

export const logWarn = (...args) => {
  if (isProd) return;
  // eslint-disable-next-line no-console
  console.warn(...args);
};
