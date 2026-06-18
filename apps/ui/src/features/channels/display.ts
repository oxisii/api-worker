import { getSiteCoolingModelCount } from "../../core/sites";
import type {
	Site,
	SiteChannelRefreshItem,
	SiteCoolingModel,
} from "../../core/types";
import { formatChinaDateTimeMinute } from "../../core/utils";

export const formatTaskTime = (value: string) =>
	new Date(value).toLocaleTimeString("zh-CN", {
		hour: "2-digit",
		minute: "2-digit",
		hour12: false,
	});

export const formatTaskDateTime = (value: string) =>
	formatChinaDateTimeMinute(value);

export const formatCooldownDuration = (seconds: number) => {
	const safeSeconds = Math.max(0, Math.floor(seconds));
	if (safeSeconds <= 0) {
		return "即将恢复";
	}
	const days = Math.floor(safeSeconds / 86400);
	const hours = Math.floor((safeSeconds % 86400) / 3600);
	const minutes = Math.floor((safeSeconds % 3600) / 60);
	if (days > 0) {
		return `${days}天 ${hours}小时`;
	}
	if (hours > 0) {
		return `${hours}小时 ${minutes}分钟`;
	}
	return `${Math.max(1, minutes)}分钟`;
};

export const getCoolingModels = (site: Site): SiteCoolingModel[] =>
	site.cooling_models ?? [];

export const getCoolingSummaryLabel = (site: Site) => {
	const count = getSiteCoolingModelCount(site);
	if (count <= 0) {
		return "无";
	}
	return `${count} 个`;
};

export const splitRefreshFailureMessage = (message: string) => {
	const normalized = String(message ?? "").trim();
	if (!normalized) {
		return {
			summary: "更新失败",
			detail: null,
		};
	}
	const prefix = "更新失败：";
	if (normalized.startsWith(prefix)) {
		return {
			summary: "更新失败",
			detail: normalized.slice(prefix.length).trim() || null,
		};
	}
	return {
		summary: normalized,
		detail: null,
	};
};

export const getRefreshStatusLabel = (
	status: SiteChannelRefreshItem["status"],
) => {
	if (status === "failed") {
		return "失败";
	}
	if (status === "warning") {
		return "部分成功";
	}
	return "完成";
};

export const getCoolingToneClass = (site: Site) => {
	const count = getSiteCoolingModelCount(site);
	if (count <= 0) {
		return "border-white/70 bg-white/70 text-[color:var(--app-ink-muted)]";
	}
	if (count >= 3) {
		return "border-amber-300/70 bg-amber-50 text-amber-700";
	}
	return "border-sky-300/70 bg-sky-50 text-sky-700";
};
