import type { D1Database } from "@cloudflare/workers-types";
import type { RequestEntryFormat } from "../site/metadata";
import { nowIso } from "../../utils/time";

export type UsageInput = {
	tokenId?: string | null;
	channelId?: string | null;
	model?: string | null;
	canonicalModel?: string | null;
	requestModelRaw?: string | null;
	upstreamModelRaw?: string | null;
	requestPath?: string | null;
	requestEntryFormat?: RequestEntryFormat | null;
	totalTokens?: number | null;
	promptTokens?: number | null;
	completionTokens?: number | null;
	cost?: number | null;
	cacheReadInputTokens?: number | null;
	cacheWriteInputTokens?: number | null;
	uncachedInputTokens?: number | null;
	billableInputTokens?: number | null;
	chargeAmount?: number | null;
	chargeCurrency?: string | null;
	chargeStatus?: string | null;
	chargeSource?: string | null;
	chargeDetailJson?: string | null;
	latencyMs?: number | null;
	firstTokenLatencyMs?: number | null;
	stream?: boolean | number | null;
	reasoningEffort?: string | number | null;
	status?: string | null;
	upstreamStatus?: number | null;
	errorCode?: string | null;
	errorMessage?: string | null;
	failureStage?: string | null;
	failureReason?: string | null;
	usageSource?: string | null;
	errorMetaJson?: string | null;
	callTokenId?: string | null;
	callTokenName?: string | null;
};

const PRUNE_INTERVAL_MS = 60 * 60 * 1000;
let lastPruneAt = 0;
let lastPruneRetention: number | null = null;
let pruneInFlight: Promise<void> | null = null;

/**
 * Inserts a usage record and updates token quota.
 */
export async function recordUsage(
	db: D1Database,
	input: UsageInput,
): Promise<void> {
	const id = crypto.randomUUID();
	const createdAt = nowIso();
	const streamValue =
		input.stream === null || input.stream === undefined
			? null
			: typeof input.stream === "number"
				? input.stream
				: input.stream
					? 1
					: 0;
	const reasoningValue =
		input.reasoningEffort === null || input.reasoningEffort === undefined
			? null
			: String(input.reasoningEffort);
	await db
		.prepare(
			"INSERT INTO usage_logs (id, token_id, channel_id, model, canonical_model, request_model_raw, upstream_model_raw, request_path, request_entry_format, total_tokens, prompt_tokens, completion_tokens, cost, cache_read_input_tokens, cache_write_input_tokens, uncached_input_tokens, billable_input_tokens, charge_amount, charge_currency, charge_status, charge_source, charge_detail_json, latency_ms, first_token_latency_ms, stream, reasoning_effort, status, upstream_status, error_code, error_message, failure_stage, failure_reason, usage_source, error_meta_json, call_token_id, call_token_name, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
		)
		.bind(
			id,
			input.tokenId ?? null,
			input.channelId ?? null,
			input.model ?? null,
			input.canonicalModel ?? null,
			input.requestModelRaw ?? null,
			input.upstreamModelRaw ?? null,
			input.requestPath ?? null,
			input.requestEntryFormat ?? null,
			input.totalTokens ?? null,
			input.promptTokens ?? null,
			input.completionTokens ?? null,
			input.cost ?? 0,
			input.cacheReadInputTokens ?? null,
			input.cacheWriteInputTokens ?? null,
			input.uncachedInputTokens ?? null,
			input.billableInputTokens ?? null,
			input.chargeAmount ?? null,
			input.chargeCurrency ?? null,
			input.chargeStatus ?? null,
			input.chargeSource ?? null,
			input.chargeDetailJson ?? null,
			input.latencyMs ?? 0,
			input.firstTokenLatencyMs ?? null,
			streamValue,
			reasoningValue,
			input.status ?? "ok",
			input.upstreamStatus ?? null,
			input.errorCode ?? null,
			input.errorMessage ?? null,
			input.failureStage ?? null,
			input.failureReason ?? null,
			input.usageSource ?? null,
			input.errorMetaJson ?? null,
			input.callTokenId ?? null,
			input.callTokenName ?? null,
			createdAt,
		)
		.run();

	if (input.tokenId && input.totalTokens) {
		await db
			.prepare(
				"UPDATE tokens SET quota_used = quota_used + ?, updated_at = ? WHERE id = ?",
			)
			.bind(input.totalTokens, createdAt, input.tokenId)
			.run();
	}
}

/**
 * Deletes usage logs older than the retention window.
 */
export async function pruneUsageLogs(
	db: D1Database,
	retentionDays: number,
): Promise<void> {
	const now = Date.now();
	if (
		lastPruneRetention === retentionDays &&
		now - lastPruneAt < PRUNE_INTERVAL_MS
	) {
		return;
	}
	lastPruneRetention = retentionDays;
	lastPruneAt = now;
	const cutoff = new Date();
	cutoff.setDate(cutoff.getDate() - retentionDays);
	await db
		.prepare("DELETE FROM usage_logs WHERE created_at < ?")
		.bind(cutoff.toISOString())
		.run();
}

/**
 * Starts retention cleanup without making read endpoints wait on a D1 write lock.
 */
export function scheduleUsageLogPrune(
	db: D1Database,
	retentionDays: number,
): void {
	if (pruneInFlight) {
		return;
	}
	pruneInFlight = pruneUsageLogs(db, retentionDays)
		.catch((error) => {
			const message = error instanceof Error ? error.message : String(error);
			if (!/SQLITE_BUSY|database is locked/i.test(message)) {
				console.error("[usage:prune]", error);
			}
		})
		.finally(() => {
			pruneInFlight = null;
		});
}
