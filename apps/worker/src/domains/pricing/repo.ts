import type { D1Database } from "@cloudflare/workers-types";
import { nowIso } from "../../utils/time";
import { convertPriceFieldsCurrency } from "./exchange-rate";
import type {
	ModelPriceRecord,
	ModelPriceSource,
	ModelPriceSyncStatus,
} from "./types";

function normalizeSource(value: unknown): ModelPriceSource {
	return value === "official_sync" || value === "manual" ? value : "manual";
}

function normalizeSyncStatus(
	value: unknown,
	source: ModelPriceSource,
): ModelPriceSyncStatus | null {
	if (value === "exact" || value === "estimated") {
		return value;
	}
	if (source === "official_sync") {
		return "estimated";
	}
	return null;
}

function normalizePriceRow(row: Record<string, unknown>): ModelPriceRecord {
	const source = normalizeSource(row.source);
	return {
		id: String(row.id ?? ""),
		provider: String(row.provider ?? ""),
		canonical_model: row.canonical_model ? String(row.canonical_model) : null,
		model_pattern: String(row.model_pattern ?? ""),
		model_name: String(row.model_name ?? row.model_pattern ?? ""),
		currency: String(row.currency ?? "USD"),
		input_price_per_1m: Number(row.input_price_per_1m ?? 0),
		cache_read_price_per_1m: Number(row.cache_read_price_per_1m ?? 0),
		cache_write_price_per_1m: Number(row.cache_write_price_per_1m ?? 0),
		output_price_per_1m: Number(row.output_price_per_1m ?? 0),
		source,
		source_url: row.source_url ? String(row.source_url) : null,
		sync_status: normalizeSyncStatus(row.sync_status, source),
		enabled: Number(row.enabled ?? 1),
		updated_at: String(row.updated_at ?? ""),
	};
}

export async function upsertModelPrice(
	db: D1Database,
	price: Omit<ModelPriceRecord, "id" | "updated_at"> & {
		id?: string;
		updated_at?: string;
	},
): Promise<ModelPriceRecord> {
	await ensureModelPriceColumns(db);
	const id = price.id ?? crypto.randomUUID();
	const updatedAt = price.updated_at ?? nowIso();
	const syncStatus =
		price.source === "official_sync"
			? (price.sync_status ?? "estimated")
			: null;
	await db
		.prepare(
			[
				"INSERT INTO model_prices",
				"(id, provider, canonical_model, model_pattern, model_name, currency, input_price_per_1m, cache_read_price_per_1m, cache_write_price_per_1m, output_price_per_1m, source, source_url, sync_status, enabled, updated_at)",
				"VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
				"ON CONFLICT(source, provider, model_pattern) DO UPDATE SET",
				"canonical_model = excluded.canonical_model,",
				"model_name = excluded.model_name,",
				"currency = excluded.currency,",
				"input_price_per_1m = excluded.input_price_per_1m,",
				"cache_read_price_per_1m = excluded.cache_read_price_per_1m,",
				"cache_write_price_per_1m = excluded.cache_write_price_per_1m,",
				"output_price_per_1m = excluded.output_price_per_1m,",
				"source_url = excluded.source_url,",
				"sync_status = excluded.sync_status,",
				"enabled = excluded.enabled,",
				"updated_at = excluded.updated_at",
			].join(" "),
		)
		.bind(
			id,
			price.provider,
			price.canonical_model ?? null,
			price.model_pattern,
			price.model_name,
			price.currency,
			price.input_price_per_1m,
			price.cache_read_price_per_1m,
			price.cache_write_price_per_1m,
			price.output_price_per_1m,
			price.source,
			price.source_url ?? null,
			syncStatus,
			price.enabled ? 1 : 0,
			updatedAt,
		)
		.run();
	return {
		id,
		provider: price.provider,
		canonical_model: price.canonical_model ?? null,
		model_pattern: price.model_pattern,
		model_name: price.model_name,
		currency: price.currency,
		input_price_per_1m: price.input_price_per_1m,
		cache_read_price_per_1m: price.cache_read_price_per_1m,
		cache_write_price_per_1m: price.cache_write_price_per_1m,
		output_price_per_1m: price.output_price_per_1m,
		source: price.source,
		source_url: price.source_url ?? null,
		sync_status: syncStatus,
		enabled: price.enabled ? 1 : 0,
		updated_at: updatedAt,
	};
}

async function ensureModelPriceColumns(db: D1Database): Promise<void> {
	const rows = await db
		.prepare("PRAGMA table_info(model_prices)")
		.all<{ name?: string }>();
	const names = new Set((rows.results ?? []).map((row) => String(row.name)));
	if (!names.has("sync_status")) {
		await db
			.prepare("ALTER TABLE model_prices ADD COLUMN sync_status TEXT")
			.run();
	}
	if (!names.has("canonical_model")) {
		await db
			.prepare("ALTER TABLE model_prices ADD COLUMN canonical_model TEXT")
			.run();
	}
}

export async function deleteBuiltinModelPrices(db: D1Database): Promise<void> {
	await db
		.prepare("DELETE FROM model_prices WHERE source = ?")
		.bind("builtin")
		.run();
}

export async function listModelPrices(
	db: D1Database,
	_options: { seedBuiltin?: boolean } = {},
): Promise<ModelPriceRecord[]> {
	await ensureModelPriceColumns(db);
	const result = await db
		.prepare(
			"SELECT * FROM model_prices WHERE source != 'builtin' ORDER BY provider ASC, model_pattern ASC, source DESC",
		)
		.all<Record<string, unknown>>();
	return (result.results ?? []).map(normalizePriceRow);
}

export async function deleteModelPrice(
	db: D1Database,
	id: string,
): Promise<void> {
	await db.prepare("DELETE FROM model_prices WHERE id = ?").bind(id).run();
}

export async function overrideSyncedModelPriceAsManual(
	db: D1Database,
	syncedId: string,
	price: Omit<ModelPriceRecord, "id" | "updated_at"> & {
		updated_at?: string;
	},
): Promise<ModelPriceRecord> {
	await ensureModelPriceColumns(db);
	const updatedAt = price.updated_at ?? nowIso();
	const manualRow = await db
		.prepare(
			"SELECT * FROM model_prices WHERE source = ? AND provider = ? AND model_pattern = ? LIMIT 1",
		)
		.bind("manual", price.provider, price.model_pattern)
		.first<Record<string, unknown>>();
	if (manualRow) {
		const manualPrice = normalizePriceRow(manualRow);
		await db
			.prepare(
				[
					"UPDATE model_prices SET",
					"provider = ?,",
					"canonical_model = ?,",
					"model_pattern = ?,",
					"model_name = ?,",
					"currency = ?,",
					"input_price_per_1m = ?,",
					"cache_read_price_per_1m = ?,",
					"cache_write_price_per_1m = ?,",
					"output_price_per_1m = ?,",
					"source = ?,",
					"source_url = ?,",
					"sync_status = ?,",
					"enabled = ?,",
					"updated_at = ?",
					"WHERE id = ?",
				].join(" "),
			)
			.bind(
				price.provider,
				price.canonical_model ?? null,
				price.model_pattern,
				price.model_name,
				price.currency,
				price.input_price_per_1m,
				price.cache_read_price_per_1m,
				price.cache_write_price_per_1m,
				price.output_price_per_1m,
				"manual",
				null,
				null,
				price.enabled ? 1 : 0,
				updatedAt,
				manualPrice.id,
			)
			.run();
		await deleteModelPrice(db, syncedId);
		return {
			...price,
			id: manualPrice.id,
			source: "manual",
			source_url: null,
			sync_status: null,
			enabled: price.enabled ? 1 : 0,
			updated_at: updatedAt,
		};
	}
	await deleteModelPrice(db, syncedId);
	return upsertModelPrice(db, {
		...price,
		id: syncedId,
		source: "manual",
		source_url: null,
		sync_status: null,
		updated_at: updatedAt,
	});
}

export async function deleteSyncedModelPricesByProvider(
	db: D1Database,
	provider: string,
): Promise<void> {
	await db
		.prepare("DELETE FROM model_prices WHERE source = ? AND provider = ?")
		.bind("official_sync", provider)
		.run();
}

export async function convertStoredModelPricesCurrency(
	db: D1Database,
	targetCurrency: "USD" | "CNY",
	usdCnyRate: number,
): Promise<void> {
	await ensureModelPriceColumns(db);
	await deleteBuiltinModelPrices(db);
	const rows = await db
		.prepare("SELECT * FROM model_prices WHERE source != 'builtin'")
		.all<Record<string, unknown>>();
	for (const row of rows.results ?? []) {
		const price = normalizePriceRow(row);
		if (price.currency.toUpperCase() === targetCurrency) {
			continue;
		}
		const converted = convertPriceFieldsCurrency(
			price,
			targetCurrency,
			usdCnyRate,
		);
		await db
			.prepare(
				[
					"UPDATE model_prices SET",
					"currency = ?,",
					"input_price_per_1m = ?,",
					"cache_read_price_per_1m = ?,",
					"cache_write_price_per_1m = ?,",
					"output_price_per_1m = ?,",
					"updated_at = ?",
					"WHERE id = ?",
				].join(" "),
			)
			.bind(
				converted.currency,
				converted.input_price_per_1m,
				converted.cache_read_price_per_1m,
				converted.cache_write_price_per_1m,
				converted.output_price_per_1m,
				nowIso(),
				price.id,
			)
			.run();
	}
}
