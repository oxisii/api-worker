import { supportsSiteCheckin } from "../../../../shared-core/src";
import { Button, Chip, Tooltip } from "../../components/ui";
import {
	formatSiteRequestEntrySummary,
	getSiteCheckinLabel,
	getSiteCoolingModelCount,
	getSiteTypeLabel,
	getVerificationVerdictLabel,
	type SiteSortKey,
} from "../../core/sites";
import type { Site } from "../../core/types";
import { columnTooltips, sortableColumns } from "./constants";
import { getCoolingSummaryLabel, getCoolingToneClass } from "./display";

type SitesTableProps = {
	editingSite: Site | null;
	siteGridTemplate: string;
	today: string;
	visibleColumnSet: Set<string>;
	visibleSites: Site[];
	isActionPending: (key: string) => boolean;
	onCheckin: (site: Site) => void;
	onCreate: () => void;
	onDelete: (site: Site) => void;
	onEdit: (site: Site) => void;
	onOpenCooldownDetails: (site: Site) => void;
	onSort: (key: SiteSortKey) => void;
	onToggle: (id: string, status: string) => void;
	onVerify: (id: string) => void;
	sortIndicator: (key: SiteSortKey) => string;
};

export const SitesTable = ({
	editingSite,
	siteGridTemplate,
	today,
	visibleColumnSet,
	visibleSites,
	isActionPending,
	onCheckin,
	onCreate,
	onDelete,
	onEdit,
	onOpenCooldownDetails,
	onSort,
	onToggle,
	onVerify,
	sortIndicator,
}: SitesTableProps) => (
	<div class="app-surface app-list-shell hidden overflow-hidden md:block">
		<div
			class="app-list-header grid gap-3 px-4 py-3 text-xs uppercase tracking-widest text-[color:var(--app-ink-muted)]"
			style={`grid-template-columns: ${siteGridTemplate};`}
		>
			{sortableColumns
				.filter((column) => visibleColumnSet.has(column.key))
				.map((column) => {
					const tooltip = columnTooltips[column.key];
					return (
						<div key={column.key}>
							<button
								class="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-widest text-[color:var(--app-ink-muted)] hover:text-[color:var(--app-ink)]"
								type="button"
								onClick={() => onSort(column.key)}
							>
								{tooltip ? (
									<Tooltip content={tooltip} class="inline-flex">
										<span>{column.label}</span>
									</Tooltip>
								) : (
									<span>{column.label}</span>
								)}
								<span class="text-[10px]">{sortIndicator(column.key)}</span>
							</button>
						</div>
					);
				})}
			{visibleColumnSet.has("actions") && <div>操作</div>}
		</div>
		{visibleSites.length === 0 ? (
			<div class="app-list-empty px-4 py-10 text-center text-sm text-[color:var(--app-ink-muted)]">
				<p>暂无站点，请先创建。</p>
				<Button
					class="mt-4 h-9 px-4 text-xs"
					size="sm"
					variant="primary"
					type="button"
					onClick={onCreate}
				>
					新增站点
				</Button>
			</div>
		) : (
			<div class="app-list-body divide-y divide-white/60">
				{visibleSites.map((site) => {
					const isActive = site.status === "active";
					const canCheckin = supportsSiteCheckin(site.site_type);
					const checkinDisabled = !canCheckin;
					const callTokenCount = site.call_tokens?.length ?? 0;
					const coolingCount = getSiteCoolingModelCount(site);
					const verifyPending = isActionPending(`site:verify:${site.id}`);
					const checkinPending = isActionPending(`site:checkin:${site.id}`);
					const togglePending = isActionPending(`site:toggle:${site.id}`);
					const deletePending = isActionPending(`site:delete:${site.id}`);
					const requestEntrySummary = formatSiteRequestEntrySummary(site);
					return (
						<div
							class={`app-list-row grid items-center gap-3 px-4 py-4 text-sm ${
								editingSite?.id === site.id ? "bg-[rgba(10,132,255,0.08)]" : ""
							}`}
							key={site.id}
							style={`grid-template-columns: ${siteGridTemplate};`}
						>
							{visibleColumnSet.has("name") && (
								<div class="flex min-w-0 flex-col">
									<span class="truncate font-semibold text-[color:var(--app-ink)]">
										{site.name}
									</span>
									<span
										class="truncate text-xs text-[color:var(--app-ink-muted)]"
										title={site.base_url}
									>
										{site.base_url}
									</span>
									{requestEntrySummary && (
										<span class="truncate text-[11px] text-[color:var(--app-ink-muted)]">
											请求入口：{requestEntrySummary}
										</span>
									)}
									{site.verification && (
										<span class="truncate text-[11px] text-[color:var(--app-ink-muted)]">
											最近验证：
											{getVerificationVerdictLabel(site.verification.verdict)}
										</span>
									)}
								</div>
							)}
							{visibleColumnSet.has("type") && (
								<div class="text-xs font-semibold text-[color:var(--app-ink)]">
									{getSiteTypeLabel(site.site_type)}
								</div>
							)}
							{visibleColumnSet.has("status") && (
								<div>
									<Chip
										variant={isActive ? "success" : "muted"}
										class="text-xs"
									>
										{isActive ? "启用" : "禁用"}
									</Chip>
								</div>
							)}
							{visibleColumnSet.has("weight") && (
								<div class="text-xs font-semibold text-[color:var(--app-ink)]">
									{site.weight}
								</div>
							)}
							{visibleColumnSet.has("tokens") && (
								<div class="text-xs text-[color:var(--app-ink-muted)]">
									{callTokenCount > 0 ? `${callTokenCount} 个` : "-"}
								</div>
							)}
							{visibleColumnSet.has("cooldowns") && (
								<div>
									<button
										class={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${getCoolingToneClass(site)}`}
										type="button"
										disabled={coolingCount <= 0}
										onClick={() => onOpenCooldownDetails(site)}
									>
										{getCoolingSummaryLabel(site)}
									</button>
								</div>
							)}
							{visibleColumnSet.has("checkin_enabled") && (
								<div class="text-xs text-[color:var(--app-ink-muted)]">
									{site.site_type === "new-api"
										? site.checkin_enabled
											? "已开启"
											: "已关闭"
										: "-"}
								</div>
							)}
							{visibleColumnSet.has("checkin") && (
								<div class="text-xs text-[color:var(--app-ink-muted)]">
									{getSiteCheckinLabel(site, today)}
								</div>
							)}
							{visibleColumnSet.has("actions") && (
								<div class="flex flex-wrap gap-2">
									<Button
										class="h-9 px-3 text-xs"
										size="sm"
										type="button"
										disabled={verifyPending}
										onClick={() => onVerify(site.id)}
									>
										{verifyPending ? "验证中..." : "验证"}
									</Button>
									<Button
										class="h-9 px-3 text-xs"
										size="sm"
										type="button"
										disabled={checkinPending || checkinDisabled}
										title={checkinDisabled ? "当前上游不支持签到" : undefined}
										onClick={() => {
											if (!canCheckin) {
												return;
											}
											onCheckin(site);
										}}
									>
										{checkinPending ? "签到中..." : "签到"}
									</Button>
									<Button
										class="h-9 px-3 text-xs"
										size="sm"
										type="button"
										disabled={togglePending}
										onClick={() => onToggle(site.id, site.status)}
									>
										{togglePending ? "处理中..." : isActive ? "禁用" : "启用"}
									</Button>
									<Button
										class="h-9 px-3 text-xs"
										size="sm"
										type="button"
										onClick={() => onEdit(site)}
									>
										编辑
									</Button>
									<Button
										class="h-9 px-3 text-xs"
										size="sm"
										variant="ghost"
										type="button"
										disabled={deletePending}
										onClick={() => onDelete(site)}
									>
										{deletePending ? "删除中..." : "删除"}
									</Button>
								</div>
							)}
						</div>
					);
				})}
			</div>
		)}
	</div>
);
