import { describe, expect, it } from "vitest";
import { reconcileCanonicalModelSyncResult } from "../../../apps/ui/src/core/canonical-model-sync";
import type {
	CanonicalModelItem,
	CanonicalModelSyncResult,
} from "../../../apps/ui/src/core/types";

describe("canonical model sync result reconciliation", () => {
	it("别名已经并入目标统一模型后，会从冲突列表里移除", () => {
		const result: CanonicalModelSyncResult = {
			ok: false,
			runs_at: "2026-06-03T01:00:00.000Z",
			scanned: 10,
			imported: 0,
			already_bound: 1,
			unmatched: 2,
			conflicts: [
				{
					alias: "gpt-5.2-chat-latest",
					matched_canonical_models: ["openai/gpt-5.2"],
					existing_canonical_models: [],
					hits: 3,
					last_seen_at: "2026-06-03T00:59:00.000Z",
					sources: ["attempt_request"],
					reason: "multi_match",
				},
			],
			invalid_rules: [],
			imported_items: [],
		};
		const items: CanonicalModelItem[] = [
			{
				canonical_model: "openai/gpt-5.2",
				import_regex: "^gpt-5\\.2",
				aliases: [
					{
						alias: "openai/gpt-5.2",
						provider_hint: "",
						canonical_model: "openai/gpt-5.2",
					},
					{
						alias: "gpt-5.2-chat-latest",
						provider_hint: "",
						canonical_model: "openai/gpt-5.2",
					},
				],
				created_at: "2026-06-03T00:00:00.000Z",
				updated_at: "2026-06-03T01:01:00.000Z",
			},
		];

		const reconciled = reconcileCanonicalModelSyncResult(result, items);

		expect(reconciled?.conflicts).toEqual([]);
		expect(reconciled?.already_bound).toBe(2);
	});
});
