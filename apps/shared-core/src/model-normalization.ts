const STRIP_PREFIXES = ["@hf/"];
const STRIP_SUFFIXES = [":free", ":beta", ":preview"];
const FAMILY_SUFFIXES = ["-it", "-instruct"];

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
