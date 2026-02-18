import { defineConfig } from "@playwright/test";

const BASE_URL = process.env.BASE_URL ?? "http://localhost:3000";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: "html",
  use: {
    baseURL: BASE_URL,
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "iPhone SE",
      use: { viewport: { width: 375, height: 667 }, isMobile: true },
    },
    {
      name: "iPhone 14",
      use: { viewport: { width: 390, height: 844 }, isMobile: true },
    },
    {
      name: "Galaxy S21",
      use: { viewport: { width: 360, height: 800 }, isMobile: true },
    },
    {
      name: "iPad Mini",
      use: { viewport: { width: 768, height: 1024 } },
    },
    {
      name: "iPad Pro 12.9",
      use: { viewport: { width: 1024, height: 1366 } },
    },
    {
      name: "Desktop 1080p",
      use: { viewport: { width: 1920, height: 1080 } },
    },
  ],
});
