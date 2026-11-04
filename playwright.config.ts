import { defineConfig } from "@playwright/test";
import { loadEnvConfig } from "@next/env";
loadEnvConfig(process.cwd());
export default defineConfig({
  testDir: "./tests/e2e", fullyParallel: false, workers: 1, timeout: 45_000,
  use: { baseURL: process.env.TEST_BASE_URL || "http://localhost:3001", viewport: { width:1440,height:1000 }, trace: "retain-on-failure" },
  reporter: "list",
});
