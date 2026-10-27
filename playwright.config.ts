import { defineConfig, devices } from "@playwright/test";

/**
 * End-to-end tests against a running app + a local Supabase with the test phone
 * numbers from supabase/config.toml (code 123456). See README → "Tests".
 */
export default defineConfig({
  testDir: "e2e",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [["list"]],
  use: {
    baseURL: process.env.E2E_BASE_URL ?? "http://localhost:3000",
    locale: "he-IL",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [{ name: "mobile", use: { ...devices["Pixel 7"] } }],
});
