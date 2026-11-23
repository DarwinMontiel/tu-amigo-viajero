import { defineConfig } from '@playwright/test';
import base from '../playwright.config.ts';

/** Regenera las capturas de docs/: `npx playwright test --config scripts/capturas.config.ts`. */
export default defineConfig({
  ...base,
  testDir: '.',
  testMatch: 'capturas.spec.ts',
  projects: [{ name: 'capturas', use: { browserName: 'chromium', deviceScaleFactor: 1 } }],
  reporter: 'list',
});
