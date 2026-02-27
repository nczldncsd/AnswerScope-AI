export const MOTION_MS = {
  fast: 150,
  normal: 200,
  slow: 300,
  chart: 300,
} as const;

export const TRANSITIONS = {
  fast: `${MOTION_MS.fast}ms`,
  normal: `${MOTION_MS.normal}ms`,
  slow: `${MOTION_MS.slow}ms`,
} as const;
