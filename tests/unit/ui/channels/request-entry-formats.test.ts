import { describe, expect, it } from "vitest";
import {
	getRequestEntryFormatOptions,
	isRequestEntryFormatAllowedForSiteType,
} from "../../../../apps/ui/src/features/channels/request-entry-formats";

describe("request entry format options", () => {
	it("OpenAI 兼容站点展示显式 OpenAI 请求格式", () => {
		expect(getRequestEntryFormatOptions("openai")).toEqual([
			{ value: "", label: "自动" },
			{ value: "openai_chat", label: "OpenAI Chat" },
			{ value: "openai_responses", label: "OpenAI Responses" },
		]);
	});

	it("自动请求格式在校验中保持可用", () => {
		expect(isRequestEntryFormatAllowedForSiteType("openai", "")).toBe(true);
	});

	it("Anthropic 站点只展示 Anthropic Messages 请求格式", () => {
		expect(getRequestEntryFormatOptions("anthropic")).toEqual([
			{ value: "", label: "自动" },
			{ value: "anthropic_messages", label: "Anthropic Messages" },
		]);
	});

	it("Sub API 站点展示多协议请求格式", () => {
		expect(getRequestEntryFormatOptions("subapi").map((option) => option.value))
			.toEqual([
				"",
				"openai_chat",
				"openai_responses",
				"anthropic_messages",
				"gemini_generate_content",
			]);
	});

	it("Gemini 站点只展示 Gemini Generate Content 请求格式", () => {
		expect(getRequestEntryFormatOptions("gemini")).toEqual([
			{ value: "", label: "自动" },
			{ value: "gemini_generate_content", label: "Gemini Generate Content" },
		]);
	});

	it("站点类型切换后可以判断原请求格式是否仍可用", () => {
		expect(
			isRequestEntryFormatAllowedForSiteType("anthropic", "openai_chat"),
		).toBe(false);
		expect(
			isRequestEntryFormatAllowedForSiteType(
				"anthropic",
				"anthropic_messages",
			),
		).toBe(true);
	});
});
