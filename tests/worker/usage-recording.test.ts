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
									latency_ms: params[9],
									status: params[13],
									created_at: params[23],
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
});
