import { deriveCanonicalModel } from "../../../shared-core/src";
import type { ModelChannel, ModelItem } from "../core/types";

export type ChannelModelRow = {
	model: string;
	rawIds?: string[];
	status: ModelChannel["status"];
};

export type ChannelModelStatusFilter = ModelChannel["status"] | "all";

export type ChannelModelPageOptions = {
	page: number;
	pageSize: number;
	search: string;
	status: ChannelModelStatusFilter;
};

export type ChannelModelPage = {
	page: number;
	pageSize: number;
	total: number;
	totalPages: number;
	rows: ChannelModelRow[];
};

const statusOrder: Record<ModelChannel["status"], number> = {
	auto: 0,
	manual: 1,
	excluded: 2,
};

export function getChannelModelRows(
	models: ModelItem[],
	channelId: string | null | undefined,
	previewModels: string[] = [],
): ChannelModelRow[] {
	const normalizedChannelId = String(channelId ?? "").trim();
	if (!normalizedChannelId) {
		return [];
	}
	const rows = models
		.flatMap((model) => {
			const channel = model.channels.find(
				(item) => item.id === normalizedChannelId,
			);
			if (!channel) {
				return [];
			}
			const rawIds = Array.from(new Set(channel.raw_ids ?? [])).sort(
				(left, right) => left.localeCompare(right),
			);
			return [
				{
					model: model.id,
					...(rawIds.length > 0 ? { rawIds } : {}),
					status: channel.status,
				},
			];
		})
		.sort((left, right) => {
			const statusDelta = statusOrder[left.status] - statusOrder[right.status];
			if (statusDelta !== 0) {
				return statusDelta;
			}
			return left.model.localeCompare(right.model);
		});
	const rowByModel = new Map(rows.map((row) => [row.model, row] as const));
	for (const previewModel of previewModels) {
		const normalizedModel = String(previewModel ?? "").trim();
		const canonicalModel = deriveCanonicalModel(normalizedModel);
		if (!normalizedModel || !canonicalModel) {
			continue;
		}
		const existing = rowByModel.get(canonicalModel);
		const shouldKeepRawId = normalizedModel !== canonicalModel;
		if (existing) {
			if (shouldKeepRawId && !existing.rawIds?.includes(normalizedModel)) {
				existing.rawIds = [...(existing.rawIds ?? []), normalizedModel].sort(
					(left, right) => left.localeCompare(right),
				);
			}
			continue;
		}
		const row = {
			model: canonicalModel,
			...(shouldKeepRawId ? { rawIds: [normalizedModel] } : {}),
			status: "auto",
		} satisfies ChannelModelRow;
		rowByModel.set(canonicalModel, row);
		rows.push(row);
	}
	return rows.sort((left, right) => {
		const statusDelta = statusOrder[left.status] - statusOrder[right.status];
		if (statusDelta !== 0) {
			return statusDelta;
		}
		return left.model.localeCompare(right.model);
	});
}

export function getPagedChannelModelRows(
	rows: ChannelModelRow[],
	options: ChannelModelPageOptions,
): ChannelModelPage {
	const search = options.search.trim().toLowerCase();
	const filteredRows = rows.filter((row) => {
		const matchesSearch = search
			? row.model.toLowerCase().includes(search)
			: true;
		const matchesStatus =
			options.status === "all" ? true : row.status === options.status;
		return matchesSearch && matchesStatus;
	});
	const pageSize = Math.max(1, Math.floor(options.pageSize));
	const totalPages = Math.max(1, Math.ceil(filteredRows.length / pageSize));
	const page = Math.min(Math.max(1, Math.floor(options.page)), totalPages);
	const start = (page - 1) * pageSize;
	return {
		page,
		pageSize,
		total: filteredRows.length,
		totalPages,
		rows: filteredRows.slice(start, start + pageSize),
	};
}
