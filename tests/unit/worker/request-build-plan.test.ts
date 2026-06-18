import { describe, expect, it } from "vitest";
import { resolveAttemptRequestBuildPlan } from "../../../apps/worker/src/services/proxy/request-build-plan";

describe("attempt request build plan", () => {
	it("同 provider 的自定义 chat 入口也会标准化重建 body", () => {
		const plan = resolveAttemptRequestBuildPlan({
			attemptUpstreamProvider: "openai",
			siteType: "openai",
			requestEntry: {
				path: "/codex",
				format: null,
			},
			downstreamProvider: "openai",
			endpointType: "chat",
			requestEntryFormatOverride: null,
		});

		expect(plan).toMatchObject({
			upstreamProvider: "openai",
			requestEndpointType: "chat",
			strategy: "rebuild_chat",
			customEntry: {
				path: "/codex",
				upstreamProvider: "openai",
				requestEntryFormatToPersist: "openai_chat",
			},
			requestEntryFormatToPersist: "openai_chat",
		});
	});

	it("同 provider 的 responses 自动尝试会标准化重建 body", () => {
		const plan = resolveAttemptRequestBuildPlan({
			attemptUpstreamProvider: "openai",
			siteType: "openai",
			requestEntry: {
				path: null,
				format: null,
			},
			downstreamProvider: "openai",
			endpointType: "responses",
			requestEntryFormatOverride: "openai_responses",
		});

		expect(plan).toMatchObject({
			upstreamProvider: "openai",
			requestEndpointType: "responses",
			strategy: "rebuild_chat",
			requestEntryFormatToPersist: "openai_responses",
		});
	});

	it("跨 provider 的 chat 请求会走重建策略", () => {
		const plan = resolveAttemptRequestBuildPlan({
			attemptUpstreamProvider: "openai",
			siteType: "subapi",
			requestEntry: {
				path: null,
				format: null,
			},
			downstreamProvider: "openai",
			endpointType: "chat",
			requestEntryFormatOverride: "anthropic_messages",
		});

		expect(plan).toMatchObject({
			upstreamProvider: "anthropic",
			requestEndpointType: "chat",
			strategy: "rebuild_chat",
		});
	});

	it("同 provider 的 embeddings 请求只做模型改写", () => {
		const plan = resolveAttemptRequestBuildPlan({
			attemptUpstreamProvider: "openai",
			siteType: "openai",
			requestEntry: {
				path: null,
				format: null,
			},
			downstreamProvider: "openai",
			endpointType: "embeddings",
			requestEntryFormatOverride: null,
		});

		expect(plan).toMatchObject({
			upstreamProvider: "openai",
			requestEndpointType: "embeddings",
			strategy: "rewrite_model",
		});
	});

	it("跨 provider 的 passthrough 请求直接跳过", () => {
		const plan = resolveAttemptRequestBuildPlan({
			attemptUpstreamProvider: "openai",
			siteType: "subapi",
			requestEntry: {
				path: null,
				format: null,
			},
			downstreamProvider: "openai",
			endpointType: "passthrough",
			requestEntryFormatOverride: "anthropic_messages",
		});

		expect(plan).toBeNull();
	});
});
