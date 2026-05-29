import type { UsageLog } from "../core/types";

export const formatUsageTokens = (
	log: Pick<UsageLog, "usage_source">,
	value: number | null | undefined,
) => {
	if (value === null || value === undefined) {
		return "-";
	}
	if (value === 0 && log.usage_source === "none") {
		return "-";
	}
	return value;
};
