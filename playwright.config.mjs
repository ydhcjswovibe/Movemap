import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/browser",
  reporter: "list",
  use: {
    baseURL: "http://127.0.0.1:5174/",
    trace: "retain-on-failure",
    ...devices["Desktop Chrome"]
  },
  projects: [
    {
      name: "chromium",
      use: { browserName: "chromium" }
    }
  ],
  webServer: {
    command: "env -u NO_COLOR VITE_SUPABASE_URL=https://movemap-test.supabase.co VITE_SUPABASE_ANON_KEY=test-anon vite --host 127.0.0.1 --port 5174 --strictPort",
    url: "http://127.0.0.1:5174/",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000
  }
});
