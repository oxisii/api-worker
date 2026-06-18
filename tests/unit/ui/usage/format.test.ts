import { describe, expect, it } from "vitest";
import { formatUsageTokens } from "../../../../apps/ui/src/features/usage/format";

describe("usage token formatting", () => {
	it("usage 来源为空时把历史 0 token 显示为空", () => {
		expect(formatUsageTokens({ usage_source: "none" }, 0)).toBe("-");
	});

	it("真实 usage 为 0 时仍显示 0", () => {
		expect(formatUsageTokens({ usage_source: "json" }, 0)).toBe(0);
	});
});
