export type PricingCurrency = "USD" | "CNY";
export type ModelPriceSource = "official_sync" | "manual";
export type ModelPriceSyncStatus = "exact" | "estimated";

export type ModelPriceRecord = {
	id: string;
	provider: string;
	model_pattern: string;
	model_name: string;
	currency: string;
	input_price_per_1m: number;
	cache_read_price_per_1m: number;
	cache_write_price_per_1m: number;
	output_price_per_1m: number;
	source: ModelPriceSource;
	source_url: string | null;
	sync_status?: ModelPriceSyncStatus | null;
	enabled: number;
	updated_at: string;
};

export type ChargeableUsage = {
	totalTokens: number | null;
	promptTokens: number | null;
	completionTokens: number | null;
	cacheReadInputTokens?: number | null;
	cacheWriteInputTokens?: number | null;
	uncachedInputTokens?: number | null;
};

export type ChargeStatus = "ok" | "missing_price";

export type ChargeResult = {
	status: ChargeStatus;
	amount: number;
	currency: string;
	source: ModelPriceSource | "none";
	detail: Record<string, unknown>;
	price: ModelPriceRecord | null;
};
