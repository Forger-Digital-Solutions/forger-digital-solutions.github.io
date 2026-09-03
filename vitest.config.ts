import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['test/**/*.test.ts'],
    // Playwright suites live alongside these as *.spec.ts and must not be
    // collected by vitest; they need a browser and their own runner.
    exclude: ['**/node_modules/**', '**/dist/**', 'test/**/*.spec.ts'],
    globals: true
  }
});
