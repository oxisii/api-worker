import type { DashboardQuery, SiteTaskResultState } from "../core/types";
import { getBeijingDateString } from "../core/utils";

export const buildActionKey = (scope: string, id?: string) =>
	id ? `${scope}:${id}` : scope;

export const siteTaskKinds = [
	"checkin",
	"verify-active",
	"verify-disabled",
	"refresh-active",
] as const;

export const buildRunningSiteTaskReport = (
	kind: SiteTaskResultState["kind"],
	total: number,
	startedAt: string,
): SiteTaskResultState => {
	const progress = {
		total,
		completed: 0,
		success: 0,
		warning: 0,
		failed: 0,
		skipped: 0,
		current_site_id: null,
		current_site_name: null,
		updated_at: startedAt,
	};
	if (kind === "checkin") {
		return {
			kind,
			status: "running",
			runs_at: startedAt,
			started_at: startedAt,
			finished_at: null,
			progress,
			error_message: null,
			summary: {
				total,
				success: 0,
				failed: 0,
				skipped: 0,
			},
			items: [],
		};
	}
	if (kind === "refresh-active") {
		return {
			kind,
			status: "running",
			runs_at: startedAt,
			started_at: startedAt,
			finished_at: null,
			progress,
			error_message: null,
			report: {
				summary: {
					total,
					success: 0,
					warning: 0,
					failed: 0,
				},
				items: [],
				runs_at: startedAt,
			},
		};
	}
	return {
		kind,
		status: "running",
		runs_at: startedAt,
		started_at: startedAt,
		finished_at: null,
		progress,
		error_message: null,
		report: {
			summary: {
				total,
				serving: 0,
				degraded: 0,
				failed: 0,
				recoverable: 0,
				not_recoverable: 0,
				skipped: 0,
			},
			items: [],
			runs_at: startedAt,
		},
	};
};

const dashboardPresetDays: Record<DashboardQuery["preset"], number> = {
	all: 0,
	"7d": 7,
	"30d": 30,
	"90d": 90,
	"1y": 365,
	custom: 30,
};

export const resolveDashboardRange = (query: DashboardQuery) => {
	const today = new Date();
	if (query.preset === "all") {
		return { from: "", to: "", days: 0 };
	}
	if (query.preset !== "custom") {
		const days = dashboardPresetDays[query.preset];
		const fromDate = new Date(today);
		fromDate.setDate(today.getDate() - (days - 1));
		return {
			from: getBeijingDateString(fromDate),
			to: getBeijingDateString(today),
			days,
		};
	}
	const fromValue = query.from || getBeijingDateString(today);
	const toValue = query.to || getBeijingDateString(today);
	const fromDate = new Date(fromValue);
	const toDate = new Date(toValue);
	const diffDays =
		Number.isNaN(fromDate.getTime()) || Number.isNaN(toDate.getTime())
			? 1
			: Math.max(
					1,
					Math.ceil((toDate.getTime() - fromDate.getTime()) / 86400000) + 1,
				);
	return { from: fromValue, to: toValue, days: diffDays };
};

export const buildDashboardParams = (query: DashboardQuery) => {
	const interval = query.interval;
	if (query.preset === "all") {
		const params = new URLSearchParams();
		params.set("interval", interval);
		params.set("limit", "366");
		const channelIds = query.channel_ids.filter(Boolean);
		const tokenIds = query.token_ids.filter(Boolean);
		if (channelIds.length > 0) {
			params.set("channel_ids", channelIds.join(","));
		}
		if (tokenIds.length > 0) {
			params.set("token_ids", tokenIds.join(","));
		}
		if (query.model) {
			params.set("model", query.model);
		}
		return { params, range: { from: "", to: "" } };
	}
	const { from, to, days } = resolveDashboardRange(query);
	const limit =
		interval === "day"
			? days
			: interval === "week"
				? Math.ceil(days / 7)
				: Math.ceil(days / 30);
	const params = new URLSearchParams();
	params.set("interval", interval);
	params.set("limit", String(limit));
	if (from) {
		params.set("from", `${from} 00:00:00`);
	}
	if (to) {
		params.set("to", `${to} 23:59:59`);
	}
	const channelIds = query.channel_ids.filter(Boolean);
	const tokenIds = query.token_ids.filter(Boolean);
	if (channelIds.length > 0) {
		params.set("channel_ids", channelIds.join(","));
	}
	if (tokenIds.length > 0) {
		params.set("token_ids", tokenIds.join(","));
	}
	if (query.model) {
		params.set("model", query.model);
	}
	return { params, range: { from, to } };
};
