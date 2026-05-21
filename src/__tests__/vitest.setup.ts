/// <reference types="@testing-library/jest-dom" />

// Loaded by vitest before every test file (see vite.config.ts test.setupFiles).
// Adds jest-dom matchers when running in a DOM env; node-env tests skip the
// extension since they have no document and would import unnecessary code.
import { expect } from 'vitest';

if (typeof document !== 'undefined') {
  const mod = await import('@testing-library/jest-dom/matchers');
  // The package exports both a default and individual matchers; pick whichever
  // shape this version ships with (default in v6+, named in older).
  const matchers = (mod as { default?: unknown }).default ?? mod;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  expect.extend(matchers as any);
}
