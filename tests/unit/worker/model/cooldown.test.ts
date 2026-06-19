import { describe, expect, it } from "vitest";
import { shouldCooldown } from "../../../../apps/worker/src/domains/model/cooldown";

describe("model cooldown", () => {
	it("不会把上游返回的 model_cooldown 再次累计为新的冷却失败", () => {
		expect(shouldCooldown(429, "model_cooldown")).toBe(false);
	});

	it("仍会把普通上游错误累计为冷却失败", () => {
		expect(shouldCooldown(502, "upstream_http_502")).toBe(true);
	});
});
