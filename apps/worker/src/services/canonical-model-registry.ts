import type { D1Database } from "@cloudflare/workers-types";
import { nowIso } from "../utils/time";

export type CanonicalModelRegistryRow = {
	canonical_model: string;
	import_regex: string | null;
};

export type CanonicalModelAliasBindingInfo = {
	globalCanonicalModel: string | null;
	canonicalModels: Set<string>;
};

export type CanonicalModelSyncSource =
	| "usage_request"
	| "usage_upstream"
	| "attempt_request"
	| "attempt_upstream"
	| "pricing"
	| "channel_capability";

export type CanonicalModelSyncCandidate = {
	alias: string;
	hits: number;
	last_seen_at: string | null;
	sources: CanonicalModelSyncSource[];
};

export type CanonicalModelSyncImportedItem = {
	alias: string;
	canonical_model: string;
	hits: number;
	last_seen_at: string | null;
	sources: CanonicalModelSyncSource[];
};

export type CanonicalModelSyncConflictItem = {
	alias: string;
	matched_canonical_models: string[];
	existing_canonical_models: string[];
	hits: number;
	last_seen_at: string | null;
	sources: CanonicalModelSyncSource[];
	reason: "multi_match" | "existing_binding";
};

export type CanonicalModelSyncInvalidRule = {
	canonical_model: string;
	import_regex: string;
	error: string;
};

export type CanonicalModelSyncResult = {
	ok: boolean;
	runs_at: string;
	scanned: number;
	imported: number;
	already_bound: number;
	unmatched: number;
	conflicts: CanonicalModelSyncConflictItem[];
	invalid_rules: CanonicalModelSyncInvalidRule[];
	imported_items: CanonicalModelSyncImportedItem[];
};

type CompiledRule = {
	canonical_model: string;
	import_regex: string;
	regex: RegExp | null;
	error: string | null;
};

type CandidatePlan = {
	imported: CanonicalModelSyncImportedItem[];
	conflicts: CanonicalModelSyncConflictItem[];
	unmatched: number;
	already_bound: number;
	invalid_rules: CanonicalModelSyncInvalidRule[];
};

function normalizeText(value: unknown): string {
	return String(value ?? "")
		.trim()
		.toLowerCase();
}

function normalizePattern(value: unknown): string {
	return String(value ?? "").trim();
}

function normalizeSources(
	value: Iterable<CanonicalModelSyncSource>,
): CanonicalModelSyncSource[] {
	const seen = new Set<CanonicalModelSyncSource>();
	for (const item of value) {
		if (
			item === "usage_request" ||
			item === "usage_upstream" ||
			item === "attempt_request" ||
			item === "attempt_upstream" ||
			item === "pricing" ||
			item === "channel_capability"
		) {
			seen.add(item);
		}
	}
	return Array.from(seen).sort((left, right) => left.localeCompare(right));
}

async function collectPreviewRows(
	db: D1Database,
	source: CanonicalModelSyncSource,
): Promise<
	Array<{
		alias: string | null;
		hits?: number | null;
		last_seen_at?: string | null;
	}>
> {
	if (source === "usage_request") {
		const result = await db
			.prepare(
				"SELECT request_model_raw as alias, COUNT(*) as hits, MAX(created_at) as last_seen_at FROM usage_logs WHERE request_model_raw IS NOT NULL AND TRIM(request_model_raw) != '' GROUP BY request_model_raw",
			)
			.all<{
				alias: string | null;
				hits?: number | null;
				last_seen_at?: string | null;
			}>();
		return result.results ?? [];
	}
	if (source === "usage_upstream") {
		const result = await db
			.prepare(
				"SELECT upstream_model_raw as alias, COUNT(*) as hits, MAX(created_at) as last_seen_at FROM usage_logs WHERE upstream_model_raw IS NOT NULL AND TRIM(upstream_model_raw) != '' GROUP BY upstream_model_raw",
			)
			.all<{
				alias: string | null;
				hits?: number | null;
				last_seen_at?: string | null;
			}>();
		return result.results ?? [];
	}
	if (source === "attempt_request") {
		const result = await db
			.prepare(
				"SELECT request_model_raw as alias, COUNT(*) as hits, MAX(created_at) as last_seen_at FROM attempt_events WHERE request_model_raw IS NOT NULL AND TRIM(request_model_raw) != '' GROUP BY request_model_raw",
			)
			.all<{
				alias: string | null;
				hits?: number | null;
				last_seen_at?: string | null;
			}>();
		return result.results ?? [];
	}
	if (source === "attempt_upstream") {
		const result = await db
			.prepare(
				"SELECT upstream_model_raw as alias, COUNT(*) as hits, MAX(created_at) as last_seen_at FROM attempt_events WHERE upstream_model_raw IS NOT NULL AND TRIM(upstream_model_raw) != '' GROUP BY upstream_model_raw",
			)
			.all<{
				alias: string | null;
				hits?: number | null;
				last_seen_at?: string | null;
			}>();
		return result.results ?? [];
	}
	if (source === "pricing") {
		const result = await db
			.prepare(
				"SELECT model_pattern as alias, 1 as hits, updated_at as last_seen_at FROM model_prices WHERE model_pattern IS NOT NULL AND TRIM(model_pattern) != ''",
			)
			.all<{
				alias: string | null;
				hits?: number | null;
				last_seen_at?: string | null;
			}>();
		return result.results ?? [];
	}
	const result = await db
		.prepare(
			"SELECT model as alias, COUNT(*) as hits, MAX(updated_at) as last_seen_at FROM channel_model_capabilities WHERE model IS NOT NULL AND TRIM(model) != '' GROUP BY model",
		)
		.all<{
			alias: string | null;
			hits?: number | null;
			last_seen_at?: string | null;
		}>();
	return result.results ?? [];
}

async function loadAliasBindingInfo(
	db: D1Database,
): Promise<Map<string, CanonicalModelAliasBindingInfo>> {
	const result = await db
		.prepare("SELECT alias, provider_hint, canonical_model FROM model_aliases")
		.all<{
			alias: string;
			provider_hint: string;
			canonical_model: string;
		}>();
	const map = new Map<string, CanonicalModelAliasBindingInfo>();
	for (const row of result.results ?? []) {
		const alias = normalizeText(row.alias);
		if (!alias) {
			continue;
		}
		const canonicalModel = normalizeText(row.canonical_model);
		if (!canonicalModel) {
			continue;
		}
		const entry = map.get(alias) ?? {
			globalCanonicalModel: null,
			canonicalModels: new Set<string>(),
		};
		entry.canonicalModels.add(canonicalModel);
		if (normalizeText(row.provider_hint) === "") {
			entry.globalCanonicalModel = canonicalModel;
		}
		map.set(alias, entry);
	}
	return map;
}

function compileRules(rows: CanonicalModelRegistryRow[]): {
	compiledRules: CompiledRule[];
	invalidRules: CanonicalModelSyncInvalidRule[];
} {
	const compiledRules: CompiledRule[] = [];
	const invalidRules: CanonicalModelSyncInvalidRule[] = [];
	for (const row of rows) {
		const importRegex = normalizePattern(row.import_regex);
		if (!importRegex) {
			continue;
		}
		try {
			compiledRules.push({
				canonical_model: normalizeText(row.canonical_model),
				import_regex: importRegex,
				regex: new RegExp(importRegex, "i"),
				error: null,
			});
		} catch (error) {
			const message = error instanceof Error ? error.message : "invalid_regex";
			invalidRules.push({
				canonical_model: normalizeText(row.canonical_model),
				import_regex: importRegex,
				error: message,
			});
		}
	}
	return { compiledRules, invalidRules };
}

function dedupeCandidates(
	rows: Array<{
		alias: string | null;
		hits?: number | null;
		last_seen_at?: string | null;
	}>,
	source: CanonicalModelSyncSource,
	map: Map<
		string,
		{
			alias: string;
			hits: number;
			last_seen_at: string | null;
			sources: Set<CanonicalModelSyncSource>;
		}
	>,
) {
	for (const row of rows) {
		const alias = normalizeText(row.alias);
		if (!alias) {
			continue;
		}
		const entry = map.get(alias) ?? {
			alias,
			hits: 0,
			last_seen_at: null,
			sources: new Set<CanonicalModelSyncSource>(),
		};
		entry.hits += Number(row.hits ?? 0) || 1;
		const nextSeen = row.last_seen_at ?? null;
		if (
			nextSeen &&
			(!entry.last_seen_at ||
				Date.parse(nextSeen) > Date.parse(entry.last_seen_at))
		) {
			entry.last_seen_at = nextSeen;
		}
		entry.sources.add(source);
		map.set(alias, entry);
	}
}

export function planCanonicalModelSync(options: {
	rules: CanonicalModelRegistryRow[];
	candidates: Array<{
		alias: string;
		hits: number;
		last_seen_at: string | null;
		sources: CanonicalModelSyncSource[];
	}>;
	bindings: Map<string, CanonicalModelAliasBindingInfo>;
}): CandidatePlan {
	const { compiledRules, invalidRules } = compileRules(options.rules);
	const imported: CanonicalModelSyncImportedItem[] = [];
	const conflicts: CanonicalModelSyncConflictItem[] = [];
	let unmatched = 0;
	let alreadyBound = 0;

	for (const candidate of options.candidates) {
		const matchedCanonicalModels = Array.from(
			new Set(
				compiledRules
					.filter((rule) => rule.regex && rule.regex.test(candidate.alias))
					.map((rule) => rule.canonical_model),
			),
		);
		const binding = options.bindings.get(candidate.alias);
		const existingCanonicalModels = Array.from(
			binding?.canonicalModels ?? new Set<string>(),
		).sort((left, right) => left.localeCompare(right));
		if (matchedCanonicalModels.length === 0) {
			unmatched += 1;
			continue;
		}
		if (matchedCanonicalModels.length > 1) {
			conflicts.push({
				alias: candidate.alias,
				matched_canonical_models: matchedCanonicalModels,
				existing_canonical_models: existingCanonicalModels,
				hits: candidate.hits,
				last_seen_at: candidate.last_seen_at,
				sources: candidate.sources,
				reason: "multi_match",
			});
			continue;
		}
		const matchedCanonicalModel = matchedCanonicalModels[0];
		if (
			existingCanonicalModels.length > 1 ||
			(existingCanonicalModels.length === 1 &&
				existingCanonicalModels[0] !== matchedCanonicalModel)
		) {
			conflicts.push({
				alias: candidate.alias,
				matched_canonical_models: matchedCanonicalModels,
				existing_canonical_models: existingCanonicalModels,
				hits: candidate.hits,
				last_seen_at: candidate.last_seen_at,
				sources: candidate.sources,
				reason: "existing_binding",
			});
			continue;
		}
		if (binding?.globalCanonicalModel === matchedCanonicalModel) {
			alreadyBound += 1;
			continue;
		}
		imported.push({
			alias: candidate.alias,
			canonical_model: matchedCanonicalModel,
			hits: candidate.hits,
			last_seen_at: candidate.last_seen_at,
			sources: candidate.sources,
		});
	}

	return {
		imported,
		conflicts,
		unmatched,
		already_bound: alreadyBound,
		invalid_rules: invalidRules,
	};
}

export async function syncCanonicalModelAliases(db: D1Database) {
	const [registryRows, aliasMap] = await Promise.all([
		db
			.prepare(
				"SELECT canonical_model, import_regex FROM model_registry ORDER BY updated_at DESC, canonical_model ASC",
			)
			.all<CanonicalModelRegistryRow>(),
		loadAliasBindingInfo(db),
	]);
	const candidateMap = new Map<
		string,
		{
			alias: string;
			hits: number;
			last_seen_at: string | null;
			sources: Set<CanonicalModelSyncSource>;
		}
	>();
	for (const source of [
		"usage_request",
		"usage_upstream",
		"attempt_request",
		"attempt_upstream",
		"pricing",
		"channel_capability",
	] as const) {
		const rows = await collectPreviewRows(db, source);
		dedupeCandidates(rows, source, candidateMap);
	}
	const candidates = Array.from(candidateMap.values())
		.map((item) => ({
			alias: item.alias,
			hits: item.hits,
			last_seen_at: item.last_seen_at,
			sources: normalizeSources(item.sources),
		}))
		.sort((left, right) => {
			if (right.hits !== left.hits) {
				return right.hits - left.hits;
			}
			const leftTime = left.last_seen_at ? Date.parse(left.last_seen_at) : 0;
			const rightTime = right.last_seen_at ? Date.parse(right.last_seen_at) : 0;
			if (rightTime !== leftTime) {
				return rightTime - leftTime;
			}
			return left.alias.localeCompare(right.alias);
		});
	const plan = planCanonicalModelSync({
		rules: registryRows.results ?? [],
		candidates,
		bindings: aliasMap,
	});
	const timestamp = nowIso();
	for (const item of plan.imported) {
		await db
			.prepare(
				[
					"INSERT INTO model_aliases",
					"(alias, provider_hint, canonical_model, created_at, updated_at)",
					"VALUES (?, ?, ?, ?, ?)",
					"ON CONFLICT(alias, provider_hint) DO UPDATE SET",
					"canonical_model = excluded.canonical_model,",
					"updated_at = excluded.updated_at",
				].join(" "),
			)
			.bind(item.alias, "", item.canonical_model, timestamp, timestamp)
			.run();
	}
	return {
		ok: plan.conflicts.length === 0 && plan.invalid_rules.length === 0,
		runs_at: timestamp,
		scanned: candidates.length,
		imported: plan.imported.length,
		already_bound: plan.already_bound,
		unmatched: plan.unmatched,
		conflicts: plan.conflicts,
		invalid_rules: plan.invalid_rules,
		imported_items: plan.imported,
	};
}
