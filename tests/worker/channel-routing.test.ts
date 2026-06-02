import { describe, expect, it } from "vitest";
import {
	buildChannelAttemptPlan,
	selectCandidateChannels,
} from "../../apps/worker/src/services/channel-routing";
import type { ChannelRecord } from "../../apps/worker/src/services/channel-types";

function buildChannel(
	overrides: Partial<ChannelRecord> = {},
): ChannelRecord {
	return {
		id: "channel-a",
		name: "Channel A",
		base_url: "https://example.com",
		api_key: "test-key",
		weight: 1,
		status: "active",
		models_json: "[]",
		metadata_json: null,
		...overrides,
	};
}

describe("channel routing with effective models", () => {
	it("允许手动补充模型参与路由", () => {
		const channel = buildChannel({
			metadata_json: JSON.stringify({
				manual_include_models: ["manual-model"],
			}),
		});

		const candidates = selectCandidateChannels(
			[channel],
			"manual-model",
			new Map(),
		);

		expect(candidates.map((item) => item.id)).toEqual(["channel-a"]);
	});

	it("手动排除模型优先于验证通过模型", () => {
		const channel = buildChannel({
			metadata_json: JSON.stringify({
				manual_exclude_models: ["verified-model"],
			}),
		});

		const candidates = selectCandidateChannels(
			[channel],
			"verified-model",
			new Map([["channel-a", new Set(["verified-model"])]]),
		);

		expect(candidates).toEqual([]);
	});

	it("手动排除模型优先于显式模型映射", () => {
		const channel = buildChannel({
			metadata_json: JSON.stringify({
				model_mapping: {
					"blocked-model": "upstream-model",
				},
				manual_exclude_models: ["blocked-model"],
			}),
		});

		const candidates = selectCandidateChannels(
			[channel],
			"blocked-model",
			new Map([["channel-a", new Set(["upstream-model"])]]),
		);

		expect(candidates).toEqual([]);
	});

	it("已有验证模型时不使用旧 models_json 扩大路由范围", () => {
		const channel = buildChannel({
			models_json: JSON.stringify([{ id: "listed-only" }]),
		});

		const candidates = selectCandidateChannels(
			[channel],
			"listed-only",
			new Map([["channel-a", new Set(["verified-model"])]]),
		);

		expect(candidates).toEqual([]);
	});

	it("尝试计划会先排当前渠道的原始精确别名，再排同渠道其他候选", () => {
		const ordered = [
			buildChannel({
				id: "channel-a",
				name: "Channel A",
				models_json: JSON.stringify([
					{ id: "gpt-5.2" },
					{ id: "gpt-5.2-chat-latest" },
					{ id: "gpt-5.2-2026-05-01" },
				]),
			}),
			buildChannel({
				id: "channel-b",
				name: "Channel B",
				models_json: JSON.stringify([
					{ id: "gpt-5.2" },
					{ id: "gpt-5.2-mini" },
				]),
			}),
		];

		const plan = buildChannelAttemptPlan({
			ordered,
			downstreamModel: "gpt-5.2",
			requestModelRaw: "gpt-5.2-chat-latest",
			canonicalAliases: [
				"gpt-5.2",
				"gpt-5.2-chat-latest",
				"gpt-5.2-2026-05-01",
				"gpt-5.2-mini",
			],
			maxAttempts: 6,
		});

		expect(plan.map((item) => `${item.channel.id}:${item.model}`)).toEqual([
			"channel-a:gpt-5.2-chat-latest",
			"channel-a:gpt-5.2",
			"channel-a:gpt-5.2-2026-05-01",
			"channel-b:gpt-5.2",
			"channel-b:gpt-5.2-mini",
		]);
	});
});
