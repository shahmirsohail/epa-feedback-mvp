import { defineConfig, devices } from "@playwright/test";

const baseURL = process.env.BASE_URL || "http://localhost:3000";

export default defineConfig({
  testDir: "./e2e",
  timeout: 60_000,
  retries: 2,
  use: {
    baseURL,
    headless: true,
    screenshot: "only-on-failure",
    video: "retain-on-failure"
  },
  projects: [
    {
      // Browser-free API tests — runs anywhere with network access
      name: "api",
      testMatch: "**/*-api.spec.ts",
      use: { baseURL }
    },
    {
      // Full browser E2E — requires Chromium (npx playwright install chromium)
      name: "chromium",
      testMatch: "**/*.spec.ts",
      use: { ...devices["Desktop Chrome"] }
    }
  ]
});
