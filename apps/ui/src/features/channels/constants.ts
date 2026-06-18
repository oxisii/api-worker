import type { SiteTaskKind } from "../../core/types";
import {
	getSiteStatusLabel,
	getSiteTypeLabel,
	type SiteSortKey,
} from "../../core/sites";

export const siteTypeOptions = [
	{ value: "new-api", label: getSiteTypeLabel("new-api") },
	{ value: "done-hub", label: getSiteTypeLabel("done-hub") },
	{ value: "subapi", label: getSiteTypeLabel("subapi") },
	{ value: "openai", label: getSiteTypeLabel("openai") },
	{ value: "anthropic", label: getSiteTypeLabel("anthropic") },
	{ value: "gemini", label: getSiteTypeLabel("gemini") },
];

export const siteStatusOptions = [
	{ value: "active", label: getSiteStatusLabel("active") },
	{ value: "disabled", label: getSiteStatusLabel("disabled") },
];

export const modelStatusOptions = [
	{ value: "manual", label: "手动" },
	{ value: "excluded", label: "排除" },
];

export const modelFilterOptions = [
	{ value: "all", label: "全部" },
	{ value: "auto", label: "自动" },
	{ value: "manual", label: "手动" },
	{ value: "excluded", label: "已排除" },
];

export const channelModelPageSize = 8;

export const sortableColumns: Array<{ key: SiteSortKey; label: string }> = [
	{ key: "name", label: "站点" },
	{ key: "type", label: "类型" },
	{ key: "status", label: "状态" },
	{ key: "weight", label: "权重" },
	{ key: "tokens", label: "令牌" },
	{ key: "cooldowns", label: "冷却模型" },
	{ key: "checkin_enabled", label: "自动签到" },
	{ key: "checkin", label: "今日签到" },
];

export const siteColumnOptions = [
	{ id: "name", label: "站点", width: "minmax(0,1.4fr)", locked: true },
	{ id: "type", label: "类型", width: "minmax(0,0.6fr)" },
	{ id: "status", label: "状态", width: "minmax(0,0.6fr)", locked: true },
	{ id: "weight", label: "权重", width: "minmax(0,0.5fr)", locked: true },
	{ id: "tokens", label: "令牌", width: "minmax(0,0.6fr)", locked: true },
	{
		id: "cooldowns",
		label: "冷却模型",
		width: "minmax(0,0.9fr)",
		locked: true,
	},
	{
		id: "checkin_enabled",
		label: "自动签到",
		width: "minmax(0,0.6fr)",
		locked: true,
	},
	{ id: "checkin", label: "今日签到", width: "minmax(0,0.8fr)", locked: true },
	{ id: "actions", label: "操作", width: "minmax(0,1.4fr)", locked: true },
];

export const siteColumnDefaults = siteColumnOptions.map((column) => column.id);

export const requiredSiteColumns = [
	"name",
	"status",
	"weight",
	"tokens",
	"cooldowns",
	"checkin_enabled",
	"checkin",
	"actions",
];

export const siteColumnVersion = "2026-04-20";

export const columnTooltips: Partial<Record<SiteSortKey, string>> = {
	cooldowns: "按冷却模型数量排序；数量相同则按最长剩余冷却时间排序。",
	checkin_enabled: "仅支持签到的上游才会显示并执行自动签到。",
	checkin: "展示今天的签到结果。",
};

export const siteTaskButtons: Array<{
	kind: SiteTaskKind;
	label: string;
	pendingLabel: string;
}> = [
	{
		kind: "checkin",
		label: "签到已启用站点",
		pendingLabel: "签到中...",
	},
	{
		kind: "verify-active",
		label: "检查启用渠道",
		pendingLabel: "检查中...",
	},
	{
		kind: "verify-disabled",
		label: "检查停用渠道",
		pendingLabel: "检查中...",
	},
	{
		kind: "refresh-active",
		label: "更新启用渠道",
		pendingLabel: "更新中...",
	},
];
