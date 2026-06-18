import { defineConfig } from "@playwright/test";

const reuseExistingServer = process.env.CI ? false : true;

export default defineConfig({
	testDir: "./tests/e2e",
	timeout: 60_000,
	fullyParallel: false,
	workers: 1,
	reporter: [["list"], ["html", { open: "never" }]],
	use: {
		baseURL: "http://localhost:4173",
		trace: "on-first-retry",
	},
	webServer: [
		{
			command: "bun run dev:attempt-worker",
			url: "http://127.0.0.1:8788/health",
			reuseExistingServer,
			timeout: 120_000,
		},
		{
			command: "bun run dev:worker",
			url: "http://127.0.0.1:8787/health",
			reuseExistingServer,
			timeout: 120_000,
		},
		{
			command: "bun run dev:ui",
			url: "http://localhost:4173",
			reuseExistingServer,
			timeout: 120_000,
		},
	],
});
