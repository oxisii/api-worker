import type {
	CanonicalModelItem,
	CanonicalModelSyncConflict,
	CanonicalModelSyncResult,
} from "./types";

function buildAliasBindingMap(
	items: CanonicalModelItem[],
): Map<string, Set<string>> {
	const map = new Map<string, Set<string>>();
	for (const item of items) {
		for (const aliasItem of item.aliases) {
			const alias = aliasItem.alias.trim().toLowerCase();
			if (!alias) {
				continue;
			}
			const canonicalModels = map.get(alias) ?? new Set<string>();
			canonicalModels.add(item.canonical_model);
			map.set(alias, canonicalModels);
		}
	}
	return map;
}

function shouldKeepConflict(
	conflict: CanonicalModelSyncConflict,
	boundCanonicalModels: Set<string> | undefined,
): boolean {
	if (!boundCanonicalModels || boundCanonicalModels.size === 0) {
		return true;
	}
	const matchedCanonicalModels = new Set(conflict.matched_canonical_models);
	const boundMatchedCanonicalModels = Array.from(boundCanonicalModels).filter(
		(item) => matchedCanonicalModels.has(item),
	);
	if (
		boundMatchedCanonicalModels.length === 1 &&
		boundCanonicalModels.size === 1
	) {
		return false;
	}
	return true;
}

export function reconcileCanonicalModelSyncResult(
	result: CanonicalModelSyncResult | null,
	items: CanonicalModelItem[],
): CanonicalModelSyncResult | null {
	if (!result) {
		return null;
	}
	const aliasBindingMap = buildAliasBindingMap(items);
	let resolvedConflictCount = 0;
	const conflicts = result.conflicts.filter((conflict) => {
		const keep = shouldKeepConflict(
			conflict,
			aliasBindingMap.get(conflict.alias.trim().toLowerCase()),
		);
		if (!keep) {
			resolvedConflictCount += 1;
		}
		return keep;
	});
	if (resolvedConflictCount === 0) {
		return result;
	}
	return {
		...result,
		ok: conflicts.length === 0 && result.invalid_rules.length === 0,
		conflicts,
		already_bound: result.already_bound + resolvedConflictCount,
	};
}
