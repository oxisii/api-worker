import { describe, expect, it } from "vitest";
import { formatSiteRequestEntrySummary } from "../../../apps/ui/src/core/sites";

describe("site request entry display", () => {
	it("未配置请求入口时不展示摘要", () => {
		expect(
			formatSiteRequestEntrySummary({
				id: "site-1",
				name: "Site 1",
				base_url: "https://example.com",
				weight: 1,
				status: "active",
				site_type: "openai",
				call_tokens: [],
			}),
		).toBeNull();
	});

	it("自动请求格式显示为自动", () => {
		expect(
			formatSiteRequestEntrySummary({
				id: "site-2",
				name: "Site 2",
				base_url: "https://example.com",
				weight: 1,
				status: "active",
				site_type: "openai",
				request_entry_path: "/codex",
				request_entry_format: null,
				call_tokens: [],
			}),
		).toBe("/codex · 自动");
	});

	it("显式请求格式显示具体协议名称", () => {
		expect(
			formatSiteRequestEntrySummary({
				id: "site-3",
				name: "Site 3",
				base_url: "https://example.com",
				weight: 1,
				status: "active",
				site_type: "openai",
				request_entry_path: "/codex",
				request_entry_format: "openai_chat",
				call_tokens: [],
			}),
		).toBe("/codex · OpenAI Chat");
	});

	it("仅配置请求格式时显示默认端点摘要", () => {
		expect(
			formatSiteRequestEntrySummary({
				id: "site-4",
				name: "Site 4",
				base_url: "https://example.com",
				weight: 1,
				status: "active",
				site_type: "openai",
				request_entry_path: null,
				request_entry_format: "openai_responses",
				call_tokens: [],
			}),
		).toBe("默认端点 · OpenAI Responses");
	});
});
