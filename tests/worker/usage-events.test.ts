import { describe, expect, it } from "vitest";
import { processUsageEvent } from "../../apps/worker/src/services/usage-events";

function createUsageEventDb() {
	const usageRows: Record<string, unknown>[] = [];
	const db = {
		prepare(sql: string) {
			const execute = (params: unknown[]) => ({
				async first() {
					if (sql.includes("COUNT(*) AS count FROM model_prices")) {
						return { count: 1 };
					}
					return null;
				},
				async all() {
					if (sql.includes("SELECT * FROM model_prices")) {
						return {
							results: [
								{
									id: "manual-exact",
									provider: "openai",
									model_pattern: "gpt-4o-mini",
									model_name: "gpt-4o-mini",
									currency: "USD",
									input_price_per_1m: 10,
									cache_read_price_per_1m: 2,
									cache_write_price_per_1m: 12,
									output_price_per_1m: 30,
									source: "manual",
									source_url: null,
									enabled: 1,
									updated_at: "2026-05-30T00:00:00.000Z",
								},
							],
						};
					}
					if (sql.includes("SELECT key, value FROM settings")) {
						return { results: [] };
					}
					return { results: [] };
				},
							async run() {
								if (sql.startsWith("INSERT INTO usage_logs")) {
									usageRows.push({
										billable_input_tokens: params[15],
										charge_amount: params[16],
										charge_status: params[18],
										charge_source: params[19],
									});
								}
					return { success: true };
				},
			});
			return {
				bind(...params: unknown[]) {
					return execute(params);
				},
				first: () => execute([]).first(),
				all: () => execute([]).all(),
				run: () => execute([]).run(),
			};
		},
	};
	return { db, usageRows };
}

describe("usage events", () => {
	it("自动计费时把普通输入、缓存读取、缓存写入都计入输入合计", async () => {
		const { db, usageRows } = createUsageEventDb();

		await processUsageEvent(db as never, {
			type: "usage",
			payload: {
				tokenId: "tok_1",
				channelId: "ch_1",
				model: "gpt-4o-mini",
				totalTokens: 4000,
				promptTokens: 3000,
				completionTokens: 1000,
				cacheReadInputTokens: 500,
				cacheWriteInputTokens: 100,
				uncachedInputTokens: 2400,
				status: "ok",
			},
		});

		expect(usageRows[0]).toMatchObject({
			billable_input_tokens: 3000,
			charge_amount: 0.0562,
			charge_status: "ok",
			charge_source: "manual",
		});
	});
});
