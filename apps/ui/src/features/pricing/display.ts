import type {
	ModelPriceSource,
	ModelPriceSyncStatus,
	PricingCurrency,
	PricingSyncItem,
} from "../../core/types";

type ChargeBucket = {
	currency: string | null | undefined;
	amount: number | null | undefined;
};

const DEFAULT_USD_CNY_RATE = 7.2;

export const normalizePricingCurrency = (
	currency: string | null | undefined,
): PricingCurrency =>
	String(currency || "USD").toUpperCase() === "CNY" ? "CNY" : "USD";

export const getCurrencySymbol = (currency: string | null | undefined) =>
	normalizePricingCurrency(currency) === "CNY" ? "¥" : "$";

export const getCurrencyName = (currency: string | null | undefined) =>
	normalizePricingCurrency(currency) === "CNY" ? "人民币" : "美元";

export const getCurrencyDisplayLabel = (currency: string | null | undefined) =>
	`${getCurrencyName(currency)} (${getCurrencySymbol(currency)})`;

const convertCurrencyAmount = (
	amount: number,
	fromCurrency: string | null | undefined,
	toCurrency: string | null | undefined,
	usdCnyRate = DEFAULT_USD_CNY_RATE,
) => {
	const from = normalizePricingCurrency(fromCurrency);
	const to = normalizePricingCurrency(toCurrency);
	if (!Number.isFinite(amount) || from === to) {
		return amount;
	}
	if (from === "USD" && to === "CNY") {
		return amount * usdCnyRate;
	}
	if (from === "CNY" && to === "USD") {
		return amount / usdCnyRate;
	}
	return amount;
};

export const formatCurrencyAmount = (
	amount: number | null | undefined,
	currency: string | null | undefined,
) => {
	if (amount === null || amount === undefined || !Number.isFinite(amount)) {
		return "-";
	}
	return `${getCurrencySymbol(currency)}${amount.toFixed(6)}`;
};

export const formatChargeAmount = (
	amount: number | null | undefined,
	currency: string | null | undefined,
	displayCurrency?: string | null,
	usdCnyRate = DEFAULT_USD_CNY_RATE,
) => {
	if (amount === null || amount === undefined || !Number.isFinite(amount)) {
		return "-";
	}
	const targetCurrency = displayCurrency
		? normalizePricingCurrency(displayCurrency)
		: normalizePricingCurrency(currency);
	return formatCurrencyAmount(
		convertCurrencyAmount(amount, currency, targetCurrency, usdCnyRate),
		targetCurrency,
	);
};

export const formatChargeByCurrency = (
	items: ChargeBucket[],
	displayCurrency?: string | null,
	usdCnyRate = DEFAULT_USD_CNY_RATE,
) => {
	if (displayCurrency) {
		const targetCurrency = normalizePricingCurrency(displayCurrency);
		const total = items.reduce((sum, item) => {
			const amount = Number(item.amount ?? 0);
			if (!Number.isFinite(amount)) {
				return sum;
			}
			return (
				sum +
				convertCurrencyAmount(amount, item.currency, targetCurrency, usdCnyRate)
			);
		}, 0);
		return formatCurrencyAmount(total, targetCurrency);
	}
	const buckets = new Map<string, number>();
	for (const item of items) {
		const amount = Number(item.amount ?? 0);
		if (!Number.isFinite(amount)) {
			continue;
		}
		const currency = String(item.currency || "USD").toUpperCase();
		buckets.set(currency, (buckets.get(currency) ?? 0) + amount);
	}
	if (buckets.size === 0) {
		return "-";
	}
	return Array.from(buckets.entries())
		.sort(([left], [right]) => left.localeCompare(right))
		.map(([currency, amount]) => formatCurrencyAmount(amount, currency))
		.join(" / ");
};

export const getPriceSourceLabel = (
	source: ModelPriceSource,
	syncStatus?: ModelPriceSyncStatus | null,
	sourceUrl?: string | null,
) => {
	if (source === "manual") {
		return "手动销售价";
	}
	if (source === "official_sync") {
		if (String(sourceUrl ?? "").includes("openrouter.ai")) {
			return "渠道补充价";
		}
		return syncStatus === "exact" ? "同步精确价" : "同步估算价";
	}
	return "未知来源";
};

export const getPricingSyncMessageLabel = (
	message: string | null | undefined,
) => {
	switch (message) {
		case "synced":
			return "官方同步";
		case "synced_from_openrouter":
			return "OpenRouter 补充";
		case "no_prices_found":
			return "未找到价格";
		case "unknown_source":
			return "未知来源";
		case "openrouter_fallback_empty":
			return "OpenRouter 无匹配价格";
		default:
			return message || "同步失败";
	}
};

export const formatPricingSyncItemLabel = (item: PricingSyncItem) => {
	if (!item.ok || item.count <= 0) {
		return `${item.source}：失败 · ${getPricingSyncMessageLabel(item.message)}`;
	}
	return `${item.source}：成功 ${item.count} 条（精确 ${
		item.exact_count ?? 0
	} / 估算 ${item.estimated_count ?? 0}）· ${getPricingSyncMessageLabel(
		item.message,
	)}`;
};

export const getPricingSyncItemTone = (
	item: PricingSyncItem,
): "success" | "warning" => {
	if (item.ok && item.count > 0) {
		return "success";
	}
	return "warning";
};
