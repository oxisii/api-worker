import { describe, expect, it } from "vitest";
import { buildModelsPayload } from "../../../apps/worker/src/services/models-index";

type MockRow = Record<string, unknown>;

function createMockDb(data: {
	channels: MockRow[];
	capabilities?: MockRow[];
}) {
	const queryAll = async <T>(sql: string) => {
		if (sql.includes("FROM channels")) {
			return { results: data.channels as T[] };
		}
		if (sql.includes("FROM channel_model_capabilities")) {
			return { results: (data.capabilities ?? []) as T[] };
		}
		throw new Error(`Unexpected SQL: ${sql}`);
	};
	return {
		prepare(sql: string) {
			return {
				bind() {
					return {
						all: async <T>() => queryAll<T>(sql),
					};
				},
				all: async <T>() => queryAll<T>(sql),
			};
		},
	};
}

describe("models index", () => {
	it("按统一模型聚合展示，并保留实际保存的上游别名", async () => {
		const payload = await buildModelsPayload(
			createMockDb({
				channels: [
					{
						id: "channel-a",
						name: "渠道 A",
						status: "active",
						models_json: JSON.stringify([{ id: "google/gemma-7b-it" }]),
						metadata_json: JSON.stringify({
							manual_include_models: ["manual-only", "gemma-7b"],
							manual_pending_models: ["legacy-pending"],
						}),
					},
				],
			}) as never,
		);

		expect(payload.models).toEqual([
			expect.objectContaining({
				id: "gemma-7b",
				raw_ids: ["google/gemma-7b-it"],
				counts: {
					auto: 1,
					manual: 0,
					excluded: 0,
				},
				channels: [
					expect.objectContaining({
						id: "channel-a",
						raw_ids: ["google/gemma-7b-it"],
						status: "auto",
					}),
				],
			}),
			expect.objectContaining({
				id: "manual-only",
				counts: {
					auto: 0,
					manual: 1,
					excluded: 0,
				},
				channels: [
					expect.objectContaining({
						id: "channel-a",
						status: "manual",
					}),
				],
			}),
		]);
		expect(payload.models.map((model) => model.id)).not.toContain(
			"legacy-pending",
		);
	});
});
