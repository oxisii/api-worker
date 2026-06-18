import type { PricingCurrency } from "./types";

const FRANKFURTER_USD_CNY_URL =
	"https://api.frankfurter.dev/v1/latest?base=USD&symbols=CNY";

export async function fetchUsdCnyRate(
	fetcher: typeof fetch = fetch,
): Promise<number> {
	const response = await fetcher(FRANKFURTER_USD_CNY_URL, {
		headers: {
			"user-agent": "api-worker-pricing-sync/1.0",
		},
	});
	if (!response.ok) {
		throw new Error(`exchange_rate_http_${response.status}`);
	}
	const payload = (await response.json().catch(() => null)) as {
		rates?: { CNY?: unknown };
	} | null;
	const rate = Number(payload?.rates?.CNY);
	if (!Number.isFinite(rate) || rate <= 0) {
		throw new Error("exchange_rate_invalid");
	}
	return rate;
}

export function convertAmountCurrency(
	amount: number,
	fromCurrency: string,
	toCurrency: PricingCurrency,
	usdCnyRate: number,
): number {
	if (!Number.isFinite(amount)) {
		return 0;
	}
	const from = String(fromCurrency || toCurrency).toUpperCase();
	const to = toCurrency.toUpperCase();
	if (from === to) {
		return amount;
	}
	const rate = Number.isFinite(usdCnyRate) && usdCnyRate > 0 ? usdCnyRate : 1;
	if (from === "USD" && to === "CNY") {
		return amount * rate;
	}
	if (from === "CNY" && to === "USD") {
		return amount / rate;
	}
	return amount;
}

export type ConvertiblePriceFields = {
	currency: string;
	input_price_per_1m: number;
	cache_read_price_per_1m: number;
	cache_write_price_per_1m: number;
	output_price_per_1m: number;
};

export function convertPriceFieldsCurrency<T extends ConvertiblePriceFields>(
	price: T,
	toCurrency: PricingCurrency,
	usdCnyRate: number,
): T {
	return {
		...price,
		currency: toCurrency,
		input_price_per_1m: convertAmountCurrency(
			price.input_price_per_1m,
			price.currency,
			toCurrency,
			usdCnyRate,
		),
		cache_read_price_per_1m: convertAmountCurrency(
			price.cache_read_price_per_1m,
			price.currency,
			toCurrency,
			usdCnyRate,
		),
		cache_write_price_per_1m: convertAmountCurrency(
			price.cache_write_price_per_1m,
			price.currency,
			toCurrency,
			usdCnyRate,
		),
		output_price_per_1m: convertAmountCurrency(
			price.output_price_per_1m,
			price.currency,
			toCurrency,
			usdCnyRate,
		),
	};
}
