import type { D1Database } from "@cloudflare/workers-types";
import { nowIso } from "../utils/time";

const GLOBAL_PROVIDER_HINT = "";
const STRIP_PREFIXES = ["@hf/"];
const STRIP_SUFFIXES = [":free", ":beta", ":preview"];
const FAMILY_SUFFIXES = ["-it", "-instruct"];

export type CanonicalModelResolution = {
	canonicalModel: string | null;
	normalizedAlias: string | null;
	providerHint: string | null;
	matchedBy: "empty" | "db" | "heuristic";
};

function normalizeProviderKey(value: string | null | undefined): string {
	return String(value ?? "")
		.trim()
		.toLowerCase();
}

function normalizeText(value: string | null | undefined): string {
	return String(value ?? "")
		.trim()
		.toLowerCase()
		.replace(/\s+/g, "");
}

function stripKnownPrefix(value: string): string {
	let next = value;
	for (const prefix of STRIP_PREFIXES) {
		if (next.startsWith(prefix)) {
			next = next.slice(prefix.length);
		}
	}
	return next;
}

function stripKnownSuffix(value: string): string {
	let next = value;
	for (const suffix of STRIP_SUFFIXES) {
		if (next.endsWith(suffix)) {
			next = next.slice(0, -suffix.length);
		}
	}
	return next;
}

function toLastSegment(value: string): string {
	const parts = value.split("/").filter(Boolean);
	return parts[parts.length - 1] ?? value;
}

function buildFamilyCandidates(value: string): string[] {
	const candidates = new Set<string>();
	candidates.add(value);
	for (const suffix of FAMILY_SUFFIXES) {
		if (value.endsWith(suffix) && value.length > suffix.length) {
			candidates.add(value.slice(0, -suffix.length));
		}
	}
	return Array.from(candidates);
}

export function normalizeModelAlias(
	value: string | null | undefined,
): string | null {
	const normalized = normalizeText(value);
	if (!normalized) {
		return null;
	}
	return stripKnownSuffix(stripKnownPrefix(normalized)) || null;
}

export function deriveCanonicalModel(
	value: string | null | undefined,
): string | null {
	const normalized = normalizeModelAlias(value);
	if (!normalized) {
		return null;
	}
	const lastSegment = toLastSegment(normalized);
	for (const suffix of FAMILY_SUFFIXES) {
		if (lastSegment.endsWith(suffix) && lastSegment.length > suffix.length) {
			return lastSegment.slice(0, -suffix.length);
		}
	}
	return lastSegment;
}

export function canonicalModelEquals(
	left: string | null | undefined,
	right: string | null | undefined,
): boolean {
	const leftCanonical = deriveCanonicalModel(left);
	const rightCanonical = deriveCanonicalModel(right);
	return Boolean(
		leftCanonical && rightCanonical && leftCanonical === rightCanonical,
	);
}

export function toCanonicalModelSet(
	values: Iterable<string | null | undefined>,
): Set<string> {
	const set = new Set<string>();
	for (const value of values) {
		const canonical = deriveCanonicalModel(value);
		if (canonical) {
			set.add(canonical);
		}
	}
	return set;
}

async function lookupCanonicalAlias(
	db: D1Database,
	alias: string,
	providerKey: string,
): Promise<string | null> {
	const scoped = await db
		.prepare(
			[
				"SELECT canonical_model FROM model_aliases",
				"WHERE alias = ? AND provider_hint = ?",
				"LIMIT 1",
			].join(" "),
		)
		.bind(alias, providerKey)
		.first<{ canonical_model: string | null }>();
	if (scoped?.canonical_model) {
		return normalizeText(scoped.canonical_model) || null;
	}
	const global = await db
		.prepare(
			[
				"SELECT canonical_model FROM model_aliases",
				"WHERE alias = ? AND provider_hint = ?",
				"LIMIT 1",
			].join(" "),
		)
		.bind(alias, GLOBAL_PROVIDER_HINT)
		.first<{ canonical_model: string | null }>();
	return global?.canonical_model
		? normalizeText(global.canonical_model) || null
		: null;
}

async function registryHasCanonical(
	db: D1Database,
	canonicalModel: string,
): Promise<boolean> {
	const row = await db
		.prepare(
			"SELECT canonical_model FROM model_registry WHERE canonical_model = ? LIMIT 1",
		)
		.bind(canonicalModel)
		.first<{ canonical_model: string | null }>();
	return Boolean(row?.canonical_model);
}

async function ensureRegistryRecord(
	db: D1Database,
	canonicalModel: string,
	providerKey: string,
): Promise<void> {
	const timestamp = nowIso();
	await db
		.prepare(
			[
				"INSERT INTO model_registry",
				"(canonical_model, display_name, provider_hint, created_at, updated_at)",
				"VALUES (?, ?, ?, ?, ?)",
				"ON CONFLICT(canonical_model) DO UPDATE SET",
				"display_name = excluded.display_name,",
				"provider_hint = COALESCE(model_registry.provider_hint, excluded.provider_hint),",
				"updated_at = excluded.updated_at",
			].join(" "),
		)
		.bind(
			canonicalModel,
			canonicalModel,
			providerKey || null,
			timestamp,
			timestamp,
		)
		.run();
}

async function ensureAliasRecord(
	db: D1Database,
	alias: string,
	providerKey: string,
	canonicalModel: string,
): Promise<void> {
	const timestamp = nowIso();
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
		.bind(alias, providerKey, canonicalModel, timestamp, timestamp)
		.run();
}

async function resolveRegisteredFamilyCanonical(
	db: D1Database,
	canonicalModel: string,
	providerKey: string,
): Promise<string> {
	for (const candidate of buildFamilyCandidates(canonicalModel)) {
		const existingAlias = await lookupCanonicalAlias(
			db,
			candidate,
			providerKey,
		);
		if (existingAlias) {
			return existingAlias;
		}
		if (await registryHasCanonical(db, candidate)) {
			return candidate;
		}
	}
	return canonicalModel;
}

export async function resolveCanonicalModel(
	db: D1Database | null | undefined,
	rawModel: string | null | undefined,
	providerHint?: string | null,
): Promise<CanonicalModelResolution> {
	const normalizedAlias = normalizeModelAlias(rawModel);
	const providerKey = normalizeProviderKey(providerHint);
	if (!normalizedAlias) {
		return {
			canonicalModel: null,
			normalizedAlias: null,
			providerHint: providerKey || null,
			matchedBy: "empty",
		};
	}
	const candidates = new Set<string>([
		normalizedAlias,
		deriveCanonicalModel(normalizedAlias) ?? normalizedAlias,
		...buildFamilyCandidates(
			deriveCanonicalModel(normalizedAlias) ?? normalizedAlias,
		),
	]);
	if (db) {
		try {
			for (const candidate of candidates) {
				const resolved = await lookupCanonicalAlias(db, candidate, providerKey);
				if (resolved) {
					await ensureRegistryRecord(db, resolved, providerKey);
					await ensureAliasRecord(
						db,
						normalizedAlias,
						providerKey || GLOBAL_PROVIDER_HINT,
						resolved,
					);
					return {
						canonicalModel: resolved,
						normalizedAlias,
						providerHint: providerKey || null,
						matchedBy: "db",
					};
				}
			}
			let canonicalModel =
				deriveCanonicalModel(normalizedAlias) ?? normalizedAlias;
			canonicalModel = await resolveRegisteredFamilyCanonical(
				db,
				canonicalModel,
				providerKey,
			);
			await ensureRegistryRecord(db, canonicalModel, providerKey);
			await ensureAliasRecord(
				db,
				normalizedAlias,
				providerKey || GLOBAL_PROVIDER_HINT,
				canonicalModel,
			);
			if (canonicalModel !== normalizedAlias) {
				await ensureAliasRecord(
					db,
					canonicalModel,
					GLOBAL_PROVIDER_HINT,
					canonicalModel,
				);
			}
			return {
				canonicalModel,
				normalizedAlias,
				providerHint: providerKey || null,
				matchedBy: "heuristic",
			};
		} catch {
			// Fall through to heuristic-only mode so existing fake DB tests stay usable.
		}
	}
	return {
		canonicalModel: deriveCanonicalModel(normalizedAlias) ?? normalizedAlias,
		normalizedAlias,
		providerHint: providerKey || null,
		matchedBy: "heuristic",
	};
}
