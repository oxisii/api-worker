import { describe, expect, it } from "vitest";
import {
	canRequestEntryFormatHandleDownstream,
	buildAutomaticRequestEntryFormatOrder,
	getRequestEntryFormatDefaultPath,
	getRequestEntryFormatDescriptor,
	getRequestEntryFormatLabel,
	getRequestEntryFormatRequestEndpointType,
	normalizeRequestEntryFormat,
	resolveRequestEntryFormatUpstreamProvider,
} from "../../../apps/shared-core/src";

describe("request entry format registry", () => {
	it("为请求格式集中提供 provider、endpoint、默认路径和标签", () => {
		expect(getRequestEntryFormatDescriptor("anthropic_messages")).toMatchObject({
			format: "anthropic_messages",
			label: "Anthropic Messages",
			upstreamProvider: "anthropic",
			requestEndpointType: "chat",
			defaultPath: "/v1/messages",
		});
		expect(getRequestEntryFormatLabel("openai_responses")).toBe(
			"OpenAI Responses",
		);
		expect(getRequestEntryFormatRequestEndpointType("openai_responses")).toBe(
			"responses",
		);
		expect(
			resolveRequestEntryFormatUpstreamProvider("gemini_generate_content"),
		).toBe("gemini");
		expect(getRequestEntryFormatDefaultPath("openai_chat")).toBe(
			"/v1/chat/completions",
		);
	});

	it("集中判断显式格式和 override 场景的兼容性", () => {
		expect(
			canRequestEntryFormatHandleDownstream({
				format: "openai_responses",
				downstreamProvider: "openai",
				endpointType: "chat",
			}),
		).toBe(false);
		expect(
			canRequestEntryFormatHandleDownstream({
				format: "openai_responses",
				downstreamProvider: "openai",
				endpointType: "chat",
				allowEndpointOverride: true,
			}),
		).toBe(true);
		expect(
			canRequestEntryFormatHandleDownstream({
				format: "anthropic_messages",
				downstreamProvider: "openai",
				endpointType: "chat",
				allowEndpointOverride: true,
			}),
		).toBe(false);
	});

	it("集中解析请求格式别名并给出自动排序", () => {
		expect(normalizeRequestEntryFormat("chat")).toBe("openai_chat");
		expect(normalizeRequestEntryFormat("responses")).toBe(
			"openai_responses",
		);
		expect(normalizeRequestEntryFormat("messages")).toBe(
			"anthropic_messages",
		);
		expect(normalizeRequestEntryFormat("generate_content")).toBe(
			"gemini_generate_content",
		);
		expect(
			buildAutomaticRequestEntryFormatOrder({
				formats: [
					"gemini_generate_content",
					"openai_chat",
					"openai_responses",
				],
				endpointType: "chat",
			}),
		).toEqual([
			"openai_chat",
			"openai_responses",
			"gemini_generate_content",
		]);
		expect(
			buildAutomaticRequestEntryFormatOrder({
				formats: [
					"gemini_generate_content",
					"openai_chat",
					"openai_responses",
				],
				endpointType: "responses",
			}),
		).toEqual([
			"openai_responses",
			"openai_chat",
			"gemini_generate_content",
		]);
	});
});
