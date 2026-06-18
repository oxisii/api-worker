import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const refreshDefaultsSql = readFileSync(
	"apps/worker/migrations/0024_refresh_canonical_model_defaults.sql",
	"utf8",
);

const localRepairScript = readFileSync("scripts/repair-local-d1.mjs", "utf8");

describe("canonical model default seeds", () => {
	it("包含 GPT-5.3 主系列和 GPT 包装前缀规则", () => {
		expect(refreshDefaultsSql).toContain("openai/gpt-5.3");
		expect(refreshDefaultsSql).toContain("(?:(?:cc|claude)-)?(?:openai[:/])?gpt-5");
		expect(localRepairScript).toContain('canonicalModel: "openai/gpt-5.3"');
		expect(localRepairScript).toContain(
			'"^(?:(?:cc|claude)-)?(?:openai[:/])?gpt-5',
		);
	});

	it("包含 Gemini preview 的 provider 前缀和 :cloud / :latest 尾缀规则", () => {
		expect(refreshDefaultsSql).toContain("google/gemini-3-flash-preview");
		expect(refreshDefaultsSql).toContain(
			"gemini-3\\.1-pro-preview(?:[-:][\\w.-]+)?",
		);
		expect(refreshDefaultsSql).toContain(
			"gemini-3-flash-preview(?:[-:][\\w.-]+)?",
		);
		expect(localRepairScript).toContain('canonicalModel: "google/gemini-3-flash-preview"');
		expect(localRepairScript).toContain('canonicalModel: "google/gemini-3.1-pro-preview"');
		expect(localRepairScript).toContain(
			'gemini-3\\\\.1-pro-preview(?:[-:][\\\\w.-]+)?$',
		);
	});
});
