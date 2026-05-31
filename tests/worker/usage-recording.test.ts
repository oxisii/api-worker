import { describe, expect, it } from "vitest";
import { recordUsage } from "../../apps/worker/src/services/usage";

function createUsageDb() {
	const rows: Record<string, unknown>[] = [];
	let quotaUpdate: { totalTokens: number; tokenId: string } | null = null;
	const db = {
		prepare(sql: string) {
			return {
				bind(...params: unknown[]) {
					return {
						async run() {
							if (sql.startsWith("INSERT INTO usage_logs")) {
								rows.push({
									id: params[0],
									token_id: params[1],
									channel_id: params[2],
									model: params[3],
									request_path: params[4],
									total_tokens: params[5],
									prompt_tokens: params[6],
									completion_tokens: params[7],
									cost: params[8],
									cache_read_input_tokens: params[9],
									cache_write_input_tokens: params[10],
									uncached_input_tokens: params[11],
									billable_input_tokens: params[12],
									charge_amount: params[13],
									charge_currency: params[14],
									charge_status: params[15],
									charge_source: params[16],
									latency_ms: params[18],
									status: params[22],
									created_at: params[32],
								});
							}
							if (sql.startsWith("UPDATE tokens SET quota_used")) {
								quotaUpdate = {
									totalTokens: Number(params[0]),
									tokenId: String(params[2]),
								};
							}
							return { success: true };
						},
					};
				},
			};
		},
	};
	return { db, rows, getQuotaUpdate: () => quotaUpdate };
}

describe("usage recording", () => {
	it("保留未知 usage token 为空，不写成 0 token", async () => {
		const { db, rows, getQuotaUpdate } = createUsageDb();

		await recordUsage(db as never, {
			tokenId: "tok_1",
			channelId: "ch_1",
			model: "model-a",
			requestPath: "/v1/chat/completions",
			status: "warn",
			upstreamStatus: 200,
			usageSource: "none",
		});

		expect(rows[0]).toMatchObject({
			total_tokens: null,
			prompt_tokens: null,
			completion_tokens: null,
			status: "warn",
		});
		expect(getQuotaUpdate()).toBeNull();
	});

	it("记录缓存 token 与下游计费字段", async () => {
		const { db, rows, getQuotaUpdate } = createUsageDb();

		await recordUsage(db as never, {
			tokenId: "tok_1",
			channelId: "ch_1",
			model: "gpt-4o-mini",
			requestPath: "/v1/chat/completions",
			totalTokens: 4000,
			promptTokens: 3000,
			completionTokens: 1000,
			cacheReadInputTokens: 500,
			cacheWriteInputTokens: 100,
			uncachedInputTokens: 2400,
			billableInputTokens: 2500,
			chargeAmount: 0.0843,
			chargeCurrency: "USD",
			chargeStatus: "ok",
			chargeSource: "manual",
			chargeDetailJson: '{"price_id":"manual-exact"}',
			status: "ok",
		});

		expect(rows[0]).toMatchObject({
			total_tokens: 4000,
			prompt_tokens: 3000,
			completion_tokens: 1000,
			cache_read_input_tokens: 500,
			cache_write_input_tokens: 100,
			uncached_input_tokens: 2400,
			billable_input_tokens: 2500,
			charge_amount: 0.0843,
			charge_currency: "USD",
			charge_status: "ok",
			charge_source: "manual",
		});
		expect(getQuotaUpdate()).toEqual({
			totalTokens: 4000,
			tokenId: "tok_1",
		});
	});
});
