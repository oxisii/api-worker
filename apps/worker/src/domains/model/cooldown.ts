function normalizeCooldownCode(value: string | null): string {
	if (!value) {
		return "";
	}
	return value.trim().toLowerCase();
}

export function shouldCooldown(
	upstreamStatus: number | null,
	errorCode: string | null,
): boolean {
	const normalizedCode = normalizeCooldownCode(errorCode);
	if (
		normalizedCode === "model_cooldown" ||
		normalizedCode === "upstream_cooldown"
	) {
		return false;
	}
	if (upstreamStatus !== null && upstreamStatus !== 200) {
		return true;
	}
	if (normalizedCode.length > 0) {
		return true;
	}
	return false;
}
