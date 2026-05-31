import { describe, expect, it } from "vitest";
import { overrideSyncedModelPriceAsManual } from "../../apps/worker/src/services/pricing/repo";

type Row = Record<string, unknown>;

function createPricingDb(initialRows: Row[]) {
	const rows = initialRows.map((row) => ({ ...row }));
	const db = {
		prepare(sql: string) {
			const statement = {
				bind(...params: unknown[]) {
					return execute(params);
				},
				all: () => execute([]).all(),
				first: () => execute([]).first(),
				run: () => execute([]).run(),
			};
			const execute = (params: unknown[]) => ({
				async all() {
					if (sql.startsWith("PRAGMA table_info")) {
						return { results: [{ name: "sync_status" }] };
					}
					if (
						sql.includes(
							"SELECT * FROM model_prices WHERE source = ? AND provider = ? AND model_pattern = ?",
						)
					) {
						return {
							results: rows.filter(
								(row) =>
									row.source === params[0] &&
									row.provider === params[1] &&
									row.model_pattern === params[2],
							),
						};
					}
					return { results: [] };
				},
				async first() {
					const result = await this.all();
					return result.results[0] ?? null;
				},
				async run() {
					if (sql.startsWith("DELETE FROM model_prices WHERE id = ?")) {
						const index = rows.findIndex((row) => row.id === params[0]);
						if (index >= 0) {
							rows.splice(index, 1);
						}
					}
					if (sql.startsWith("UPDATE model_prices SET")) {
						const index = rows.findIndex((row) => row.id === params[13]);
						if (index >= 0) {
							rows[index] = {
								...rows[index],
								provider: params[0],
								model_pattern: params[1],
								model_name: params[2],
								currency: params[3],
								input_price_per_1m: params[4],
								cache_read_price_per_1m: params[5],
								cache_write_price_per_1m: params[6],
								output_price_per_1m: params[7],
								source: params[8],
								source_url: params[9],
								sync_status: params[10],
								enabled: params[11],
								updated_at: params[12],
							};
						}
					}
					if (sql.startsWith("INSERT INTO model_prices")) {
						const next = {
							id: params[0],
							provider: params[1],
							model_pattern: params[2],
							model_name: params[3],
							currency: params[4],
							input_price_per_1m: params[5],
							cache_read_price_per_1m: params[6],
							cache_write_price_per_1m: params[7],
							output_price_per_1m: params[8],
							source: params[9],
							source_url: params[10],
							sync_status: params[11],
							enabled: params[12],
							updated_at: params[13],
						};
						const index = rows.findIndex(
							(row) =>
								row.source === next.source &&
								row.provider === next.provider &&
								row.model_pattern === next.model_pattern,
						);
						if (index >= 0) {
							rows[index] = {
								...rows[index],
								...next,
								id: rows[index].id,
							};
						} else {
							rows.push(next);
						}
					}
					return { success: true };
				},
			});
			return statement;
		},
	};
	return { db, rows };
}

describe("pricing repository", () => {
	it("同步价手动覆盖后转为手动价，且已有手动价时更新已有手动价", async () => {
		const { db, rows } = createPricingDb([
			{
				id: "sync-1",
				provider: "openai",
				model_pattern: "gpt-4o-mini",
				model_name: "gpt-4o-mini",
				currency: "CNY",
				input_price_per_1m: 1,
				cache_read_price_per_1m: 0.1,
				cache_write_price_per_1m: 1,
				output_price_per_1m: 2,
				source: "official_sync",
				source_url: "https://example.test/pricing",
				sync_status: "exact",
				enabled: 1,
				updated_at: "2026-05-31T00:00:00.000Z",
			},
			{
				id: "manual-1",
				provider: "openai",
				model_pattern: "gpt-4o-mini",
				model_name: "gpt-4o-mini",
				currency: "CNY",
				input_price_per_1m: 3,
				cache_read_price_per_1m: 0.3,
				cache_write_price_per_1m: 3,
				output_price_per_1m: 6,
				source: "manual",
				source_url: null,
				sync_status: null,
				enabled: 1,
				updated_at: "2026-05-31T00:00:00.000Z",
			},
		]);

		const result = await overrideSyncedModelPriceAsManual(db as never, "sync-1", {
			provider: "openai",
			model_pattern: "gpt-4o-mini",
			model_name: "gpt-4o-mini",
			currency: "CNY",
			input_price_per_1m: 5,
			cache_read_price_per_1m: 0.5,
			cache_write_price_per_1m: 5,
			output_price_per_1m: 10,
			source: "manual",
			source_url: null,
			sync_status: null,
			enabled: 1,
		});

		expect(rows.find((row) => row.id === "sync-1")).toBeUndefined();
		expect(rows.find((row) => row.id === "manual-1")).toMatchObject({
			source: "manual",
			input_price_per_1m: 5,
			output_price_per_1m: 10,
		});
		expect(result).toMatchObject({
			id: "manual-1",
			source: "manual",
			sync_status: null,
			input_price_per_1m: 5,
			output_price_per_1m: 10,
		});
	});

	it("同步价手动覆盖且没有已有手动价时复用原行 id 转为手动价", async () => {
		const { db, rows } = createPricingDb([
			{
				id: "sync-2",
				provider: "deepseek",
				model_pattern: "deepseek-chat",
				model_name: "deepseek-chat",
				currency: "CNY",
				input_price_per_1m: 1,
				cache_read_price_per_1m: 0.1,
				cache_write_price_per_1m: 1,
				output_price_per_1m: 2,
				source: "official_sync",
				source_url: "https://example.test/pricing",
				sync_status: "exact",
				enabled: 1,
				updated_at: "2026-05-31T00:00:00.000Z",
			},
		]);

		const result = await overrideSyncedModelPriceAsManual(db as never, "sync-2", {
			provider: "deepseek",
			model_pattern: "deepseek-chat",
			model_name: "deepseek-chat",
			currency: "CNY",
			input_price_per_1m: 7,
			cache_read_price_per_1m: 0.7,
			cache_write_price_per_1m: 7,
			output_price_per_1m: 14,
			source: "manual",
			source_url: null,
			sync_status: null,
			enabled: 1,
		});

		expect(rows).toHaveLength(1);
		expect(rows[0]).toMatchObject({
			id: "sync-2",
			source: "manual",
			sync_status: null,
			input_price_per_1m: 7,
			output_price_per_1m: 14,
		});
		expect(result).toMatchObject({
			id: "sync-2",
			source: "manual",
			sync_status: null,
			input_price_per_1m: 7,
			output_price_per_1m: 14,
		});
	});
});
