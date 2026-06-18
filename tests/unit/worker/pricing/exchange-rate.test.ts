import { describe, expect, it } from "vitest";
import {
	convertAmountCurrency,
	convertPriceFieldsCurrency,
	fetchUsdCnyRate,
} from "../../../../apps/worker/src/domains/pricing/exchange-rate";

describe("pricing exchange rate", () => {
	it("从在线汇率 API 响应解析 USD/CNY 当前汇率", async () => {
		const rate = await fetchUsdCnyRate(async () =>
			new Response(
				JSON.stringify({
					amount: 1,
					base: "USD",
					rates: {
						CNY: 7.12,
					},
				}),
			),
		);

		expect(rate).toBe(7.12);
	});

	it("按目标币种转换单价", () => {
		expect(convertAmountCurrency(2, "USD", "CNY", 7)).toBe(14);
		expect(convertAmountCurrency(14, "CNY", "USD", 7)).toBe(2);
		expect(convertAmountCurrency(3, "CNY", "CNY", 7)).toBe(3);
	});

	it("切换全局币种时转换完整价格字段", () => {
		expect(
			convertPriceFieldsCurrency(
				{
					currency: "USD",
					input_price_per_1m: 1,
					cache_read_price_per_1m: 0.25,
					cache_write_price_per_1m: 1.25,
					output_price_per_1m: 2,
				},
				"CNY",
				7,
			),
		).toMatchObject({
			currency: "CNY",
			input_price_per_1m: 7,
			cache_read_price_per_1m: 1.75,
			cache_write_price_per_1m: 8.75,
			output_price_per_1m: 14,
		});
	});
});
