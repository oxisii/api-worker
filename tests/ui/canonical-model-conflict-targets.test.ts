import { describe, expect, it } from "vitest";
import {
	resolveAutomaticConflictTarget,
	resolveManualConflictTarget,
} from "../../apps/ui/src/core/canonical-model-conflict-targets";
import type { CanonicalModelSyncConflict } from "../../apps/ui/src/core/types";

describe("canonical model conflict targets", () => {
	it("自动合并会优先选择唯一的规则命中目标，而不是已有归属", () => {
		const conflict: CanonicalModelSyncConflict = {
			alias: "gpt-5.4",
			matched_canonical_models: ["openai/gpt-5.4"],
			existing_canonical_models: ["openai/gpt-5"],
			hits: 12,
			last_seen_at: "2026-06-03T04:00:00.000Z",
			sources: ["attempt_request"],
			reason: "existing_binding",
		};

		expect(resolveAutomaticConflictTarget(conflict)).toBe("openai/gpt-5.4");
	});

	it("手动合并默认值仍然优先选择已有归属", () => {
		const conflict: CanonicalModelSyncConflict = {
			alias: "gpt-5.4",
			matched_canonical_models: ["openai/gpt-5.4"],
			existing_canonical_models: ["openai/gpt-5"],
			hits: 12,
			last_seen_at: "2026-06-03T04:00:00.000Z",
			sources: ["attempt_request"],
			reason: "existing_binding",
		};

		expect(resolveManualConflictTarget(conflict)).toBe("openai/gpt-5");
	});
});
