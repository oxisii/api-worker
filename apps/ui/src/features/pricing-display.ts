import type { ModelPriceSource, ModelPriceSyncStatus } from "../core/types";

type ChargeBucket = {
	currency: string | null | undefined;
	amount: number | null | undefined;
};

export const formatChargeAmount = (
	amount: number | null | undefined,
	currency: string | null | undefined,
) => {
	if (amount === null || amount === undefined || !Number.isFinite(amount)) {
		return "-";
	}
	return `${currency || "USD"} ${amount.toFixed(6)}`;
};

export const formatChargeByCurrency = (items: ChargeBucket[]) => {
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
		.map(([currency, amount]) => formatChargeAmount(amount, currency))
		.join(" / ");
};

export const getPriceSourceLabel = (
	source: ModelPriceSource,
	syncStatus?: ModelPriceSyncStatus | null,
) => {
	if (source === "manual") {
		return "手动销售价";
	}
	if (source === "official_sync") {
		return syncStatus === "exact" ? "同步精确价" : "同步估算价";
	}
	return "未知来源";
};
