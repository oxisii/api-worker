import type { CanonicalModelSyncConflict } from "./types";

export function resolveAutomaticConflictTarget(
	conflict: CanonicalModelSyncConflict,
): string | null {
	if (conflict.matched_canonical_models.length === 1) {
		return conflict.matched_canonical_models[0] ?? null;
	}
	if (conflict.existing_canonical_models.length === 1) {
		return conflict.existing_canonical_models[0] ?? null;
	}
	return null;
}

export function resolveManualConflictTarget(
	conflict: CanonicalModelSyncConflict,
): string | null {
	if (conflict.existing_canonical_models.length === 1) {
		return conflict.existing_canonical_models[0] ?? null;
	}
	if (conflict.matched_canonical_models.length === 1) {
		return conflict.matched_canonical_models[0] ?? null;
	}
	return null;
}
