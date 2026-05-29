import { sanitizeUpstreamRequestHeaders } from "../../../../shared-core/src";
import { normalizeBaseUrl } from "../../utils/url";
import type { EndpointOverrides } from "../site-metadata";
import type { ModelDiscoveryResult } from "./types";

const MODEL_DISCOVERY_DETAIL_MAX_LENGTH = 180;

function normalizeSummaryDetail(value: string | null): string | null {
	if (!value) {
		return null;
	}
	const normalized = value.replace(/\s+/gu, " ").trim();
	if (!normalized) {
		return null;
	}
	return normalized.slice(0, MODEL_DISCOVERY_DETAIL_MAX_LENGTH);
}

function isLikelyHtmlPayload(value: string): boolean {
	return (
		/<!doctype\s+html/i.test(value) ||
		/<html[\s>]/i.test(value) ||
		/<head[\s>]/i.test(value) ||
		/<body[\s>]/i.test(value)
	);
}

function summarizeHtmlFailureDetail(html: string): string | null {
	const title = normalizeSummaryDetail(
		html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1] ?? null,
	);
	const headline = normalizeSummaryDetail(
		html.match(/<h1[^>]*>([^<]+)<\/h1>/i)?.[1] ?? null,
	);
	const server = normalizeSummaryDetail(
		html.match(
			/<center>([^<]+)<\/center>\s*(?:<script|<\/body|<\/html)/i,
		)?.[1] ?? null,
	);
	const primary = headline ?? title;
	if (!primary && !server) {
		return "未找到失败原因";
	}
	if (primary && server && primary !== server) {
		return `${primary} | ${server}`;
	}
	return primary ?? server;
}

async function readFailureDetail(response: Response): Promise<string | null> {
	const contentType = response.headers.get("content-type") ?? "";
	if (contentType.includes("application/json")) {
		const payload = (await response
			.clone()
			.json()
			.catch(() => null)) as Record<string, unknown> | null;
		if (payload && typeof payload === "object") {
			const candidates = [payload.error, payload.message, payload.detail];
			for (const candidate of candidates) {
				if (typeof candidate === "string" && candidate.trim()) {
					return normalizeSummaryDetail(candidate);
				}
				if (
					candidate &&
					typeof candidate === "object" &&
					!Array.isArray(candidate)
				) {
					const record = candidate as Record<string, unknown>;
					for (const nested of [
						record.message,
						record.error,
						record.detail,
						record.code,
						record.type,
					]) {
						if (typeof nested === "string" && nested.trim()) {
							return normalizeSummaryDetail(nested);
						}
					}
				}
			}
		}
	}
	const text = await response.text().catch(() => "");
	if (isLikelyHtmlPayload(text)) {
		return summarizeHtmlFailureDetail(text);
	}
	return normalizeSummaryDetail(text);
}

async function readSuccessfulDiscoveryDetail(
	response: Response,
): Promise<string | null> {
	const detail = await readFailureDetail(response);
	return detail ? normalizeSummaryDetail(detail) : "未解析到可用模型";
}

export async function performModelDiscovery(options: {
	target: string;
	headers: Headers;
	parseModels: (payload: unknown) => string[];
	fetcher?: typeof fetch;
}): Promise<ModelDiscoveryResult> {
	const fetcher = options.fetcher ?? fetch;
	const start = Date.now();
	let response: Response;
	try {
		response = await fetcher(options.target, {
			method: "GET",
			headers: options.headers,
		});
	} catch (error) {
		return {
			ok: false,
			elapsed: Date.now() - start,
			models: [],
			httpStatus: null,
			detail:
				error instanceof Error && error.message
					? normalizeSummaryDetail(error.message)
					: "network_error",
		};
	}

	const elapsed = Date.now() - start;
	if (!response.ok) {
		return {
			ok: false,
			elapsed,
			models: [],
			httpStatus: response.status,
			detail: await readFailureDetail(response),
		};
	}

	const payload = (await response
		.clone()
		.json()
		.catch(() => ({}))) as unknown;
	const models = options.parseModels(payload);
	if (models.length === 0) {
		const detail = await readSuccessfulDiscoveryDetail(response);
		return {
			ok: false,
			elapsed,
			models: [],
			httpStatus: response.status,
			detail,
			payload,
		};
	}
	return {
		ok: true,
		elapsed,
		models,
		payload,
	};
}

export function buildBaseHeaders(baseHeaders: Headers): Headers {
	const headers = sanitizeUpstreamRequestHeaders(baseHeaders);
	headers.delete("x-admin-token");
	headers.delete("x-api-key");
	headers.delete("x-goog-api-key");
	return headers;
}

export function applyHeaderOverrides(
	headers: Headers,
	overrides: Record<string, string>,
): Headers {
	for (const [key, value] of Object.entries(overrides)) {
		headers.set(key, value);
	}
	return headers;
}

export function ensureJsonContentType(headers: Headers): Headers {
	headers.set("Content-Type", "application/json");
	return headers;
}

export function buildModelsEndpoint(baseUrl: string, path: string): string {
	return `${normalizeBaseUrl(baseUrl)}${path}`;
}

const TEXT_PART_TYPES = new Set([
	"text",
	"input_text",
	"output_text",
	"message",
	"chunk",
]);

export function toTextContent(value: unknown): string {
	if (value === null || value === undefined) {
		return "";
	}
	if (typeof value === "string") {
		return value;
	}
	if (typeof value === "number" || typeof value === "boolean") {
		return String(value);
	}
	if (Array.isArray(value)) {
		return value
			.map((entry) => {
				if (typeof entry === "string") {
					return entry;
				}
				if (entry && typeof entry === "object") {
					const part = entry as Record<string, unknown>;
					if (typeof part.text === "string") {
						return part.text;
					}
					if (
						typeof part.type === "string" &&
						TEXT_PART_TYPES.has(part.type) &&
						typeof part.text === "string"
					) {
						return part.text;
					}
				}
				return "";
			})
			.join("");
	}
	if (typeof value === "object") {
		const record = value as Record<string, unknown>;
		if (typeof record.text === "string") {
			return record.text;
		}
		if (Array.isArray(record.parts)) {
			return toTextContent(record.parts);
		}
		if (record.content !== undefined) {
			return toTextContent(record.content);
		}
	}
	return "";
}

export function toNumber(value: unknown): number | null {
	if (value === null || value === undefined) {
		return null;
	}
	const parsed = Number(value);
	return Number.isFinite(parsed) ? parsed : null;
}

export function resolveEndpointOverride(
	override: EndpointOverrides[keyof EndpointOverrides],
	model: string | null,
): { absolute?: string; path?: string } | null {
	if (!override) {
		return null;
	}
	const resolved = model ? override.replace("{model}", model) : override;
	if (resolved.startsWith("http://") || resolved.startsWith("https://")) {
		return { absolute: resolved };
	}
	return { path: resolved };
}
