import { describe, expect, it } from "vitest";
import { applyCustomRequestEntry } from "../../apps/worker/src/services/proxy/custom-request-entry";

describe("custom request entry", () => {
	it("responses 自定义入口会匹配 responses 请求", () => {
		const entry = applyCustomRequestEntry({
			entry: {
				path: "/codex",
				format: "openai_responses",
			},
			endpointType: "responses",
		});

		expect(entry).toEqual({ path: "/codex", upstreamProvider: "openai" });
	});

	it("自动入口会按当前 responses 请求解析为 openai_responses", () => {
		const entry = applyCustomRequestEntry({
			entry: {
				path: "/codex",
				format: null,
			},
			downstreamProvider: "openai",
			endpointType: "responses",
		});

		expect(entry).toEqual({
			path: "/codex",
			upstreamProvider: "openai",
			requestEntryFormatToPersist: "openai_responses",
		});
	});

	it("responses 自定义入口不会接收 chat 请求", () => {
		const entry = applyCustomRequestEntry({
			entry: {
				path: "/codex",
				format: "openai_responses",
			},
			endpointType: "chat",
		});

		expect(entry).toBeNull();
	});

	it("完整 URL 入口会作为绝对地址", () => {
		const entry = applyCustomRequestEntry({
			entry: {
				path: "https://example.com/codex",
				format: "openai_responses",
			},
			endpointType: "responses",
		});

		expect(entry).toEqual({
			absoluteUrl: "https://example.com/codex",
			upstreamProvider: "openai",
		});
	});

	it("anthropic 自定义入口只匹配 Anthropic chat 请求", () => {
		const entry = applyCustomRequestEntry({
			entry: {
				path: "/v1/messages",
				format: "anthropic_messages",
			},
			downstreamProvider: "anthropic",
			endpointType: "chat",
		});

		expect(entry).toEqual({
			path: "/v1/messages",
			upstreamProvider: "anthropic",
		});
	});

	it("anthropic 自定义入口不会接收 OpenAI chat 请求", () => {
		const entry = applyCustomRequestEntry({
			entry: {
				path: "/v1/messages",
				format: "anthropic_messages",
			},
			downstreamProvider: "openai",
			endpointType: "chat",
		});

		expect(entry).toBeNull();
	});

	it("gemini 自定义入口只匹配 Gemini chat 请求", () => {
		const entry = applyCustomRequestEntry({
			entry: {
				path: "/v1beta/models/{model}:generateContent",
				format: "gemini_generate_content",
			},
			downstreamProvider: "gemini",
			endpointType: "chat",
		});

		expect(entry).toEqual({
			path: "/v1beta/models/{model}:generateContent",
			upstreamProvider: "gemini",
		});
	});
});
