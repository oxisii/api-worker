import { describe, expect, it } from "vitest";
import {
	formatChargeAmount,
	getPriceSourceLabel,
} from "../../apps/ui/src/features/pricing-display";

describe("pricing display helpers", () => {
	it("按同步可信度展示同步价标签", () => {
		expect(getPriceSourceLabel("manual")).toBe("手动销售价");
		expect(getPriceSourceLabel("official_sync")).toBe("同步估算价");
		expect(getPriceSourceLabel("official_sync", "estimated")).toBe(
			"同步估算价",
		);
		expect(getPriceSourceLabel("official_sync", "exact")).toBe("同步精确价");
	});

	it("单条金额保留自己的单位", () => {
		expect(formatChargeAmount(0.42, "CNY")).toBe("CNY 0.420000");
	});
});
