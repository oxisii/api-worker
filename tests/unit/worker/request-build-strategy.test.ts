import { describe, expect, it, vi } from "vitest";

vi.mock("../../../apps/worker/src/wasm/core", () => ({
	applyGeminiModelToPathViaWasm: vi.fn((path: string) => path),
	buildUpstreamChatRequestViaWasm: vi.fn(
		(
			_payload: Record<string, unknown>,
			_provider: string,
			model: string,
			_endpoint: string,
			_isStream: boolean,
			endpointOverrides: Record<string, unknown> | null,
		) => ({
			path: "/v1/chat/completions",
			body: {
				model,
				reasoningOverride:
					endpointOverrides && "reasoning" in endpointOverrides
						? endpointOverrides.reasoning
						: null,
			},
		}),
	),
	detectDownstreamProviderViaWasm: vi.fn(() => "openai"),
	detectEndpointTypeViaWasm: vi.fn(() => "chat"),
	normalizeChatRequestViaWasm: vi.fn(),
	parseDownstreamModelViaWasm: vi.fn(),
	parseDownstreamStreamViaWasm: vi.fn(),
}));

const { executeAttemptRequestBuildPlan } = await import(
	"../../../apps/worker/src/services/proxy/request-build-strategy"
);

describe("attempt request build strategy", () => {
	it("重建 chat 请求时会把统一模型思考配置传给 WASM 转换边界", () => {
		const built = executeAttemptRequestBuildPlan({
			plan: {
				upstreamProvider: "openai",
				requestEndpointType: "chat",
				strategy: "rebuild_chat",
				customEntry: null,
			},
			initialPath: "/v1/chat/completions",
			initialTargetPath: "/v1/chat/completions",
			upstreamModel: "qwen/qwen3-max",
			parsedBody: null,
			applyModelToPath: (path) => path,
			normalizedChatRequest: {
				messages: [{ role: "user", content: "hello" }],
				reasoning: { effort: "max" },
			},
			isStream: false,
			endpointOverrides: {},
			reasoningConfig: {
				mode: "manual",
				dialect: "openai_effort",
				max_effort: "medium",
			},
		});

		expect(JSON.parse(built?.upstreamBodyText ?? "{}")).toEqual({
			model: "qwen/qwen3-max",
			reasoningOverride: {
				mode: "manual",
				dialect: "openai_effort",
				max_effort: "medium",
			},
		});
	});
});
