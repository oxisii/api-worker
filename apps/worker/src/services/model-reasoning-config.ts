import type { D1Database } from "@cloudflare/workers-types";
import { deriveCanonicalModel } from "./model-normalization";

export type ModelReasoningMode = "off" | "manual";

export type ModelReasoningDialect =
	| "openai_effort"
	| "anthropic_adaptive"
	| "gemini_level"
	| "budget"
	| "passthrough";

export type ModelReasoningEffort =
	| "none"
	| "minimal"
	| "low"
	| "medium"
	| "high"
	| "xhigh"
	| "max";

export type ModelReasoningConfig =
	| {
			mode: "off";
	  }
	| {
			mode: "manual";
			dialect: ModelReasoningDialect;
			max_effort: ModelReasoningEffort | null;
	  };

const DIALECTS = new Set<ModelReasoningDialect>([
	"openai_effort",
	"anthropic_adaptive",
	"gemini_level",
	"budget",
	"passthrough",
]);

const EFFORTS = new Set<ModelReasoningEffort>([
	"none",
	"minimal",
	"low",
	"medium",
	"high",
	"xhigh",
	"max",
]);

function normalizeText(value: unknown): string {
	return String(value ?? "")
		.trim()
		.toLowerCase();
}

function normalizeDialect(value: unknown): ModelReasoningDialect | null {
	const dialect = normalizeText(value).replace(/-/g, "_");
	return DIALECTS.has(dialect as ModelReasoningDialect)
		? (dialect as ModelReasoningDialect)
		: null;
}

function normalizeEffort(value: unknown): ModelReasoningEffort | null {
	const effort = normalizeText(value).replace(/-/g, "");
	const normalized =
		effort === "extrahigh" || effort === "veryhigh" ? "xhigh" : effort;
	return EFFORTS.has(normalized as ModelReasoningEffort)
		? (normalized as ModelReasoningEffort)
		: null;
}

export function normalizeModelReasoningConfig(
	input: unknown,
): ModelReasoningConfig | null {
	if (!input || typeof input !== "object" || Array.isArray(input)) {
		return null;
	}
	const raw = input as Record<string, unknown>;
	const mode = normalizeText(raw.mode);
	if (mode === "" || mode === "auto") {
		return null;
	}
	if (mode === "off" || mode === "disabled") {
		return { mode: "off" };
	}
	if (mode !== "manual") {
		return null;
	}
	const dialect = normalizeDialect(raw.dialect);
	if (!dialect) {
		return null;
	}
	return {
		mode: "manual",
		dialect,
		max_effort: normalizeEffort(raw.max_effort),
	};
}

export function serializeModelReasoningConfig(input: unknown): string | null {
	const normalized = normalizeModelReasoningConfig(input);
	return normalized ? JSON.stringify(normalized) : null;
}

export function parseModelReasoningConfig(
	raw: string | null | undefined,
): ModelReasoningConfig | null {
	if (!raw) {
		return null;
	}
	try {
		return normalizeModelReasoningConfig(JSON.parse(raw));
	} catch {
		return null;
	}
}

function buildCandidateKeys(
	values: Iterable<string | null | undefined>,
): string[] {
	const keys = new Set<string>();
	for (const value of values) {
		const normalized = normalizeText(value);
		if (!normalized) {
			continue;
		}
		keys.add(normalized);
		const derived = deriveCanonicalModel(normalized);
		if (derived) {
			keys.add(derived);
		}
	}
	return Array.from(keys);
}

async function loadConfigByCanonicalModel(
	db: D1Database,
	canonicalModel: string,
): Promise<ModelReasoningConfig | null> {
	const row = await db
		.prepare(
			"SELECT reasoning_config_json FROM model_registry WHERE canonical_model = ? LIMIT 1",
		)
		.bind(canonicalModel)
		.first<{ reasoning_config_json: string | null }>();
	return parseModelReasoningConfig(row?.reasoning_config_json);
}

async function loadConfigByAlias(
	db: D1Database,
	alias: string,
): Promise<ModelReasoningConfig | null> {
	const row = await db
		.prepare(
			[
				"SELECT mr.reasoning_config_json FROM model_aliases ma",
				"JOIN model_registry mr ON mr.canonical_model = ma.canonical_model",
				"WHERE ma.alias = ? AND ma.provider_hint = ''",
				"LIMIT 1",
			].join(" "),
		)
		.bind(alias)
		.first<{ reasoning_config_json: string | null }>();
	return parseModelReasoningConfig(row?.reasoning_config_json);
}

export async function resolveModelReasoningConfig(
	db: D1Database,
	candidates: Iterable<string | null | undefined>,
): Promise<ModelReasoningConfig | null> {
	const keys = buildCandidateKeys(candidates);
	for (const key of keys) {
		const config = await loadConfigByCanonicalModel(db, key);
		if (config) {
			return config;
		}
	}
	for (const key of keys) {
		const config = await loadConfigByAlias(db, key);
		if (config) {
			return config;
		}
	}
	return null;
}
