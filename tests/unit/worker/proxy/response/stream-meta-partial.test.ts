import { describe, expect, it, vi } from "vitest";

vi.mock("../../../../../apps/worker/src/utils/usage", () => ({
	parseUsageFromSse: vi.fn(),
}));
vi.mock("../../../../../apps/worker/src/domains/proxy/adapters", () => ({
	adaptChatResponse: vi.fn(async ({ response }) => response),
}));
vi.mock("../../../../../apps/worker/src/services/provider-transform", () => ({}));
vi.mock("../../../../../apps/worker/src/wasm/core", () => ({
	adaptChatJsonViaWasm: vi.fn(),
	adaptSseLineViaWasm: vi.fn(),
	applyGeminiModelToPathViaWasm: vi.fn(),
	buildUpstreamChatRequestViaWasm: vi.fn(),
	createWeightedOrderIndicesViaWasm: vi.fn(),
	detectDownstreamProviderViaWasm: vi.fn(),
	detectEndpointTypeViaWasm: vi.fn(),
	geminiUsageTokensViaWasm: vi.fn(),
	normalizeChatRequestViaWasm: vi.fn(),
	normalizeUsageViaWasm: vi.fn(),
	parseDownstreamModelViaWasm: vi.fn(),
	parseDownstreamStreamViaWasm: vi.fn(),
	parseUsageFromJsonViaWasm: vi.fn(),
	parseUsageFromSseLineViaWasm: vi.fn(),
}));

describe("stream meta partial handling", () => {
	it("成功流式响应缺少 usage 时只记录告警，不写成请求错误码", async () => {
		const { finalizeSelectedResponse } = await import(
			"../../../../../apps/worker/src/domains/proxy/response/finalizer"
		);
		const attemptLogs: Array<Record<string, unknown>> = [];
		const usageRecords: Array<Record<string, unknown>> = [];
		const metaMarks: Array<Record<string, unknown>> = [];
		const response = new Response(
			'data: {"choices":[{"delta":{"content":"hello"}}]}\n\n',
			{
				status: 200,
				headers: { "content-type": "text/event-stream" },
			},
		);

		const result = await finalizeSelectedResponse({
			selectedResponse: response,
			selectedChannel: { id: "channel_1" },
			isStream: true,
			selectedImmediateUsage: null,
			selectedParsedStreamUsage: {
				usage: null,
				firstTokenLatencyMs: 12,
				eventsSeen: 1,
				timedOut: false,
			},
			selectedHasUsageHeaders: false,
			streamUsageMode: "lite",
			streamUsageOptions: { mode: "lite" },
			streamUsageParseTimeoutMs: 0,
			selectedRequestPath: "/v1/chat/completions",
			markStreamMetaPartial: (payload: Record<string, unknown>) =>
				metaMarks.push(payload),
			recordAttemptLog: (payload: Record<string, unknown>) =>
				attemptLogs.push(payload),
			selectedAttemptIndex: 1,
			selectedAttemptStartedAt: "2026-05-31T00:00:00.000Z",
			selectedAttemptLatencyMs: 42,
			selectedAttemptUpstreamRequestId: null,
			selectedUpstreamProvider: null,
			selectedUpstreamModel: "gpt-test",
			downstreamModel: "gpt-test",
			endpointType: "chat",
			STREAM_META_PARTIAL_CODE: "stream_meta_partial",
			USAGE_OBSERVE_FAILURE_STAGE: "usage_observe",
			canResolveResponsesAffinity: false,
			downstreamProvider: "openai",
			tokenRecord: { id: "token_1" },
			c: { env: {} },
			responsesAffinityTtlSeconds: 60,
			selectedUpstreamEndpoint: null,
			traceId: "trace_1",
			selectedHasUsageSignal: false,
			selectedImmediateUsageSource: "none",
			buildDirectErrorResponse: () => new Response("error", { status: 502 }),
			recordAttemptUsage: (payload: Record<string, unknown>) =>
				usageRecords.push(payload),
			requestStart: Date.now(),
			downstreamSignal: null,
			recordSelectedClientDisconnect: () => undefined,
			recordSelectedStreamUsage: (payload: Record<string, unknown>) =>
				usageRecords.push(payload),
			DOWNSTREAM_CLIENT_ABORT_ERROR_CODE: "client_disconnected",
			RESPONSE_ADAPT_FAILED_CODE: "response_adapt_failed",
			jsonErrorWithTrace: () => new Response("error", { status: 502 }),
		});

		expect(result.status).toBe(200);
		await result.text();

		expect(metaMarks).toHaveLength(1);
		expect(attemptLogs).toHaveLength(0);
		expect(usageRecords).toHaveLength(1);
		expect(usageRecords[0]).toMatchObject({
			status: "warn",
			errorCode: null,
			errorMessage: null,
			failureStage: "usage_observe",
			failureReason: "usage_missing.stream.signal_absent",
		});
	});
});
