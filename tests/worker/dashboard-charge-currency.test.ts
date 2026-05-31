import { describe, expect, it } from "vitest";
import { summarizeChargeByCurrencySql } from "../../apps/worker/src/routes/dashboard";

describe("dashboard charge currency aggregation", () => {
	it("按当前统一币种汇总销售额", () => {
		expect(summarizeChargeByCurrencySql(" WHERE 1=1")).toContain(
			"GROUP BY charge_currency",
		);
	});
});
