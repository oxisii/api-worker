import { useEffect, useMemo, useState } from "hono/jsx/dom";
import {
	AreaChart,
	Button,
	Card,
	Chip,
	ColumnPicker,
	Input,
	MultiSelect,
	Popover,
	PopoverContent,
	Skeleton,
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
	Tabs,
	TabsContent,
	TabsList,
	TabsTrigger,
} from "../../components/ui";
import { cx } from "../../components/ui/utils";
import type {
	DashboardData,
	DashboardQuery,
	PricingCurrency,
	Site,
	Token,
} from "../../core/types";
import {
	getBeijingDateString,
	loadColumnPrefs,
	persistColumnPrefs,
} from "../../core/utils";
import { formatChargeByCurrency } from "../pricing/display";

const dashboardPresetOptions: Array<{
	value: Exclude<DashboardQuery["preset"], "custom">;
	label: string;
}> = [
	{ value: "all", label: "全部" },
	{ value: "7d", label: "近 7 天" },
	{ value: "30d", label: "近 30 天" },
	{ value: "90d", label: "近 90 天" },
	{ value: "1y", label: "近一年" },
];

const resolveDateRangeForQuery = (query: DashboardQuery) => {
	if (query.preset === "custom") {
		const today = getBeijingDateString();
		return {
			from: query.from || today,
			to: query.to || today,
		};
	}
	if (query.preset === "all") {
		return {
			from: "",
			to: "",
		};
	}
	const today = new Date();
	const days =
		query.preset === "7d"
			? 7
			: query.preset === "30d"
				? 30
				: query.preset === "90d"
					? 90
					: 365;
	const fromDate = new Date(today);
	fromDate.setDate(today.getDate() - (days - 1));
	return {
		from: getBeijingDateString(fromDate),
		to: getBeijingDateString(today),
	};
};

type DashboardViewProps = {
	dashboard: DashboardData | null;
	onRefresh: () => void;
	isRefreshing: boolean;
	query: DashboardQuery;
	channels: Site[];
	tokens: Token[];
	pricingCurrency: PricingCurrency;
	pricingUsdCnyRate: number;
	onQueryChange: (patch: Partial<DashboardQuery>) => void;
	onApply: (next?: DashboardQuery) => void;
};

/**
 * Renders the dashboard summary and charts.
 *
 * Args:
 *   props: Dashboard view props.
 *
 * Returns:
 *   Dashboard JSX element.
 */
export const DashboardView = ({
	dashboard,
	onRefresh,
	isRefreshing,
	query,
	channels,
	tokens,
	pricingCurrency,
	pricingUsdCnyRate,
	onQueryChange,
	onApply,
}: DashboardViewProps) => {
	const [activeRankTab, setActiveRankTab] = useState<
		"model" | "channel" | "token"
	>(() => {
		if (typeof window === "undefined") {
			return "model";
		}
		const stored = window.localStorage.getItem("dashboard:rankTab");
		if (stored === "model" || stored === "channel" || stored === "token") {
			return stored;
		}
		return "model";
	});
	const [filterOpen, setFilterOpen] = useState(false);
	const filterRootClass = "app-dashboard-filter";
	const [intervalOpen, setIntervalOpen] = useState(false);
	const intervalRootClass = "app-dashboard-interval";
	const popoverEvent = "app:popover-open";
	const filterPopoverId = "dashboard-filter";
	const intervalPopoverId = "dashboard-interval";
	const [draftFilters, setDraftFilters] = useState(() => ({
		channel_ids: query.channel_ids,
		token_ids: query.token_ids,
		model: query.model,
	}));
	const [draftRangeQuery, setDraftRangeQuery] = useState(() => ({
		preset: query.preset,
		from: query.from,
		to: query.to,
	}));
	const [draftInterval, setDraftInterval] = useState(query.interval);
	const trendColumnDefaults = ["bucket", "requests", "tokens"];
	const rankColumnDefaults = ["name", "requests", "tokens"];
	const [trendColumns, setTrendColumns] = useState(() =>
		loadColumnPrefs("columns:dashboard:trend:v2", trendColumnDefaults),
	);
	const [rankColumns, setRankColumns] = useState(() =>
		loadColumnPrefs("columns:dashboard:rank:v2", rankColumnDefaults),
	);
	const trendColumnSet = useMemo(() => new Set(trendColumns), [trendColumns]);
	const rankColumnSet = useMemo(() => new Set(rankColumns), [rankColumns]);
	const trendColumnsConfig = [
		{ id: "bucket", label: "日期", locked: true },
		{ id: "requests", label: "请求" },
		{ id: "tokens", label: "Tokens" },
	];
	const rankColumnsConfig = [
		{ id: "name", label: "名称", locked: true },
		{ id: "requests", label: "请求" },
		{ id: "tokens", label: "Tokens" },
	];
	const trendColumnCount = trendColumns.length;
	const rankColumnCount = rankColumns.length;
	const intervalLabel =
		draftInterval === "week" ? "周" : draftInterval === "month" ? "月" : "日";
	const dateRange = useMemo(
		() =>
			resolveDateRangeForQuery({
				...query,
				preset: draftRangeQuery.preset,
				from: draftRangeQuery.from,
				to: draftRangeQuery.to,
			}),
		[draftRangeQuery, query],
	);
	const hasAdvancedFilters = Boolean(
		draftFilters.channel_ids.length > 0 ||
			draftFilters.token_ids.length > 0 ||
			draftFilters.model.trim(),
	);
	const activeFilterCount =
		(draftFilters.channel_ids.length > 0 ? 1 : 0) +
		(draftFilters.token_ids.length > 0 ? 1 : 0) +
		(draftFilters.model.trim() ? 1 : 0);
	const channelOptions = useMemo(
		() =>
			channels.map((channel) => ({
				value: channel.id,
				label: channel.name || channel.id,
			})),
		[channels],
	);
	const tokenOptions = useMemo(
		() =>
			tokens.map((token) => ({
				value: token.id,
				label: token.name || token.id,
			})),
		[tokens],
	);
	const chartData = useMemo(
		() =>
			(dashboard?.trend ?? []).map((row) => ({
				label: row.bucket,
				value: row.requests,
				secondary: row.tokens,
			})),
		[dashboard?.trend],
	);
	const rankingData = useMemo(() => {
		if (!dashboard) {
			return [];
		}
		if (activeRankTab === "channel") {
			return dashboard.byChannel.map((row) => ({
				name: row.channel_name ?? "-",
				requests: row.requests,
				tokens: row.tokens,
				charge: row.charge,
			}));
		}
		if (activeRankTab === "token") {
			return dashboard.byToken.map((row) => ({
				name: row.token_name ?? "-",
				requests: row.requests,
				tokens: row.tokens,
				charge: row.charge,
			}));
		}
		return dashboard.byModel.map((row) => ({
			name: row.model ?? "-",
			requests: row.requests,
			tokens: row.tokens,
			charge: row.charge,
		}));
	}, [activeRankTab, dashboard]);
	const updateTrendColumns = (next: string[]) => {
		setTrendColumns(next);
		persistColumnPrefs("columns:dashboard:trend:v2", next);
	};
	const updateRankColumns = (next: string[]) => {
		setRankColumns(next);
		persistColumnPrefs("columns:dashboard:rank:v2", next);
	};
	const setPreset = (preset: DashboardQuery["preset"]) => {
		if (preset === "all") {
			setDraftRangeQuery({
				preset,
				from: "",
				to: "",
			});
			return;
		}
		setDraftRangeQuery((prev) => ({
			...prev,
			preset,
		}));
	};
	const handleDateChange = (field: "from" | "to", value: string) => {
		const nextFrom = field === "from" ? value : dateRange.from;
		const nextTo = field === "to" ? value : dateRange.to;
		setDraftRangeQuery({
			preset: "custom",
			from: nextFrom,
			to: nextTo,
		});
	};
	const handleResetFilters = () => {
		const nextQuery: DashboardQuery = {
			...query,
			preset: "all",
			from: "",
			to: "",
			channel_ids: [],
			token_ids: [],
			model: "",
		};
		setDraftFilters({
			channel_ids: [],
			token_ids: [],
			model: "",
		});
		setDraftRangeQuery({
			preset: "all",
			from: "",
			to: "",
		});
		setFilterOpen(false);
		onQueryChange(nextQuery);
		onApply(nextQuery);
	};
	const handleApply = () => {
		const nextQuery = {
			...query,
			interval: draftInterval,
			preset: draftRangeQuery.preset,
			from: draftRangeQuery.from,
			to: draftRangeQuery.to,
			channel_ids: draftFilters.channel_ids,
			token_ids: draftFilters.token_ids,
			model: draftFilters.model,
		};
		onQueryChange(nextQuery);
		setFilterOpen(false);
		onApply(nextQuery);
	};
	const handleIntervalApply = (nextInterval: DashboardQuery["interval"]) => {
		setDraftInterval(nextInterval);
	};
	useEffect(() => {
		if (typeof window === "undefined") {
			return;
		}
		window.localStorage.setItem("dashboard:rankTab", activeRankTab);
	}, [activeRankTab]);
	useEffect(() => {
		setDraftFilters({
			channel_ids: query.channel_ids,
			token_ids: query.token_ids,
			model: query.model,
		});
	}, [query.channel_ids, query.model, query.token_ids]);
	useEffect(() => {
		setDraftRangeQuery({
			preset: query.preset,
			from: query.from,
			to: query.to,
		});
	}, [query.from, query.preset, query.to]);
	useEffect(() => {
		setDraftInterval(query.interval);
	}, [query.interval]);
	useEffect(() => {
		if (!filterOpen) {
			return;
		}
		const handlePointerDown = (event: PointerEvent) => {
			const target = event.target as HTMLElement | null;
			if (!target) {
				return;
			}
			if (target.closest(`.${filterRootClass}`)) {
				return;
			}
			setFilterOpen(false);
		};
		const handleKeyDown = (event: KeyboardEvent) => {
			if (event.key === "Escape") {
				event.preventDefault();
				setFilterOpen(false);
			}
		};
		window.addEventListener("pointerdown", handlePointerDown);
		window.addEventListener("keydown", handleKeyDown);
		return () => {
			window.removeEventListener("pointerdown", handlePointerDown);
			window.removeEventListener("keydown", handleKeyDown);
		};
	}, [filterOpen, filterRootClass]);
	useEffect(() => {
		const handlePopoverOpen = (event: Event) => {
			const detail = (event as CustomEvent<string>).detail;
			if (detail === intervalPopoverId) {
				setFilterOpen(false);
			}
		};
		window.addEventListener(popoverEvent, handlePopoverOpen);
		return () => {
			window.removeEventListener(popoverEvent, handlePopoverOpen);
		};
	}, [intervalPopoverId, popoverEvent]);
	useEffect(() => {
		if (filterOpen && intervalOpen) {
			setIntervalOpen(false);
		}
	}, [filterOpen, intervalOpen]);
	useEffect(() => {
		if (!intervalOpen) {
			return;
		}
		const handlePointerDown = (event: PointerEvent) => {
			const target = event.target as HTMLElement | null;
			if (!target) {
				return;
			}
			if (target.closest(`.${intervalRootClass}`)) {
				return;
			}
			setIntervalOpen(false);
		};
		const handleKeyDown = (event: KeyboardEvent) => {
			if (event.key === "Escape") {
				event.preventDefault();
				setIntervalOpen(false);
			}
		};
		window.addEventListener("pointerdown", handlePointerDown);
		window.addEventListener("keydown", handleKeyDown);
		return () => {
			window.removeEventListener("pointerdown", handlePointerDown);
			window.removeEventListener("keydown", handleKeyDown);
		};
	}, [intervalOpen, intervalRootClass]);
	useEffect(() => {
		const handlePopoverOpen = (event: Event) => {
			const detail = (event as CustomEvent<string>).detail;
			if (detail === filterPopoverId) {
				setIntervalOpen(false);
			}
		};
		window.addEventListener(popoverEvent, handlePopoverOpen);
		return () => {
			window.removeEventListener(popoverEvent, handlePopoverOpen);
		};
	}, [filterPopoverId, popoverEvent]);
	useEffect(() => {
		if (intervalOpen && filterOpen) {
			setFilterOpen(false);
		}
	}, [filterOpen, intervalOpen]);

	const renderToolbar = () => (
		<Card
			variant="compact"
			class="app-layer-raised app-toolbar-card flex flex-wrap items-center gap-3 p-3"
		>
			<div class="flex flex-wrap items-center gap-2">
				{dashboardPresetOptions.map((preset) => (
					<Button
						class="h-8 px-3 text-[11px]"
						key={preset.value}
						size="sm"
						type="button"
						variant={
							draftRangeQuery.preset === preset.value ? "primary" : "ghost"
						}
						onClick={() => setPreset(preset.value)}
					>
						{preset.label}
					</Button>
				))}
			</div>
			<div class="flex flex-wrap items-center gap-2">
				<Input
					class="h-8 w-36 text-xs"
					type="date"
					value={dateRange.from}
					placeholder="开始日期"
					onInput={(event) =>
						handleDateChange(
							"from",
							(event.currentTarget as HTMLInputElement).value,
						)
					}
				/>
				<span class="text-xs text-[color:var(--app-ink-muted)]">-</span>
				<Input
					class="h-8 w-36 text-xs"
					type="date"
					value={dateRange.to}
					placeholder="结束日期"
					onInput={(event) =>
						handleDateChange(
							"to",
							(event.currentTarget as HTMLInputElement).value,
						)
					}
				/>
			</div>
			<div class="flex flex-wrap items-center gap-2">
				<div class={cx("relative", filterRootClass)}>
					<Button
						class="h-8 px-3 text-[11px]"
						size="sm"
						variant="ghost"
						type="button"
						onClick={(event) => {
							event.stopPropagation();
							setIntervalOpen(false);
							if (!filterOpen) {
								window.dispatchEvent(
									new CustomEvent<string>(popoverEvent, {
										detail: filterPopoverId,
									}),
								);
							}
							setFilterOpen((prev) => !prev);
						}}
					>
						筛选条件
					</Button>
					<Popover open={filterOpen}>
						<PopoverContent
							class="right-0 p-3 app-popover-content--spaced app-dashboard-filter-popover"
							style="width:216px;min-width:216px;max-width:216px;"
						>
							<div class="grid gap-2">
								<MultiSelect
									class="w-full"
									options={channelOptions}
									value={draftFilters.channel_ids}
									placeholder="选择渠道"
									searchPlaceholder="搜索渠道"
									emptyLabel="暂无匹配渠道"
									onChange={(next) =>
										setDraftFilters((prev) => ({
											...prev,
											channel_ids: next,
										}))
									}
								/>
								<MultiSelect
									class="w-full"
									options={tokenOptions}
									value={draftFilters.token_ids}
									placeholder="选择令牌"
									searchPlaceholder="搜索令牌"
									emptyLabel="暂无匹配令牌"
									onChange={(next) =>
										setDraftFilters((prev) => ({
											...prev,
											token_ids: next,
										}))
									}
								/>
								<Input
									class="h-8 text-xs"
									placeholder="模型关键词"
									value={draftFilters.model}
									onInput={(event) =>
										setDraftFilters((prev) => ({
											...prev,
											model: (event.currentTarget as HTMLInputElement).value,
										}))
									}
								/>
							</div>
						</PopoverContent>
					</Popover>
				</div>
				{hasAdvancedFilters ? (
					<Chip variant="accent">已筛选 {activeFilterCount}</Chip>
				) : null}
				<Button
					class="h-8 px-3 text-[11px]"
					size="sm"
					type="button"
					variant="ghost"
					disabled={isRefreshing}
					onClick={handleResetFilters}
				>
					重置
				</Button>
				<Button
					class="h-8 px-4 text-[11px]"
					size="sm"
					variant="primary"
					type="button"
					disabled={isRefreshing}
					onClick={handleApply}
				>
					应用筛选
				</Button>
			</div>
		</Card>
	);

	if (!dashboard) {
		return (
			<div class="app-panel animate-fade-up space-y-5">
				<div class="flex flex-wrap items-center justify-between gap-4">
					<div>
						<h3 class="app-title">数据面板</h3>
						<p class="app-subtitle">查看请求量、消耗与性能趋势。</p>
					</div>
					<Button type="button" disabled={isRefreshing} onClick={onRefresh}>
						{isRefreshing ? "刷新中..." : "刷新"}
					</Button>
				</div>
				{renderToolbar()}
				{isRefreshing ? (
					<div class="app-grid app-grid--kpi">
						{Array.from({ length: 6 }).map((_, index) => (
							<Card variant="compact" key={`kpi-skeleton-${index}`}>
								<Skeleton class="h-4 w-20" />
								<Skeleton class="mt-3 h-7 w-24" />
								<Skeleton class="mt-2 h-3 w-16" />
							</Card>
						))}
					</div>
				) : (
					<Card class="mt-6 text-center">
						<Chip variant="accent">空状态</Chip>
						<p class="mt-3 text-sm text-[color:var(--app-ink-muted)]">
							暂无数据，请先产生调用或刷新面板。
						</p>
						<div class="mt-4 flex justify-center">
							<Button
								variant="primary"
								type="button"
								onClick={onRefresh}
								disabled={isRefreshing}
							>
								立即刷新
							</Button>
						</div>
					</Card>
				)}
			</div>
		);
	}

	const totalRequests = dashboard.summary.total_requests;
	const totalErrors = dashboard.summary.total_errors;
	const errorRate = dashboard.summary.total_requests
		? Math.round(
				(dashboard.summary.total_errors / dashboard.summary.total_requests) *
					100,
			)
		: 0;
	const successRate = totalRequests
		? Math.max(
				0,
				Math.round(((totalRequests - totalErrors) / totalRequests) * 100),
			)
		: 0;
	const avgTokensPerRequest = totalRequests
		? Math.round(dashboard.summary.total_tokens / totalRequests)
		: 0;
	const cacheReadTokens = dashboard.summary.cache_read_input_tokens ?? 0;
	const cacheWriteTokens = dashboard.summary.cache_write_input_tokens ?? 0;
	return (
		<div class="app-panel animate-fade-up space-y-5">
			<div class="flex flex-wrap items-center justify-between gap-4">
				<div>
					<h3 class="app-title">数据面板</h3>
					<p class="app-subtitle">快速掌握请求表现、性能与消耗概况。</p>
				</div>
				<Button type="button" disabled={isRefreshing} onClick={onRefresh}>
					{isRefreshing ? "刷新中..." : "刷新"}
				</Button>
			</div>
			{renderToolbar()}
			<div class="app-grid app-grid--kpi">
				<Card variant="compact">
					<Chip>总请求</Chip>
					<div class="app-kpi-value">{dashboard.summary.total_requests}</div>
					<span class="app-kpi-meta">最近窗口</span>
				</Card>
				<Card variant="compact">
					<Chip>总 Tokens</Chip>
					<div class="app-kpi-value">{dashboard.summary.total_tokens}</div>
					<span class="app-kpi-meta">
						缓存读 {cacheReadTokens} | 缓存写 {cacheWriteTokens}
					</span>
				</Card>
				<Card variant="compact">
					<Chip>费用</Chip>
					<div class="app-kpi-value app-kpi-value--compact">
						{formatChargeByCurrency(
							dashboard.chargeByCurrency ?? [],
							pricingCurrency,
							pricingUsdCnyRate,
						)}
					</div>
					<span class="app-kpi-meta">按当前计价币种统一展示</span>
				</Card>
				<Card variant="compact">
					<Chip>成功率</Chip>
					<div class="app-kpi-value">{successRate}%</div>
					<span class="app-kpi-meta">错误率 {errorRate}%</span>
				</Card>
				<Card variant="compact">
					<Chip>单次消耗</Chip>
					<div class="app-kpi-value">{avgTokensPerRequest}</div>
					<span class="app-kpi-meta">
						平均 {Math.round(dashboard.summary.avg_latency)}ms 延迟
					</span>
				</Card>
			</div>
			<div class="app-grid app-grid--split">
				<Card class="flex h-[420px] flex-col sm:h-[520px]">
					<div class="mb-4 flex items-center justify-between">
						<div>
							<h3 class="app-title">请求趋势</h3>
							<p class="app-subtitle">按统计颗粒观察请求量与 Tokens 变化。</p>
						</div>
						<div class="flex flex-wrap items-center gap-2">
							<div class={cx("relative", intervalRootClass)}>
								<Button
									class="h-8 px-3 text-[11px]"
									size="sm"
									type="button"
									onClick={(event) => {
										event.stopPropagation();
										setFilterOpen(false);
										if (!intervalOpen) {
											window.dispatchEvent(
												new CustomEvent<string>(popoverEvent, {
													detail: intervalPopoverId,
												}),
											);
										}
										setIntervalOpen((prev) => !prev);
									}}
								>
									统计颗粒-{intervalLabel}
								</Button>
								<Popover open={intervalOpen}>
									<PopoverContent class="right-0 p-2 app-popover-content--spaced app-interval-popover">
										{[
											{ value: "day", label: "按日" },
											{ value: "week", label: "按周" },
											{ value: "month", label: "按月" },
										].map((option) => (
											<button
												class={cx(
													"app-dropdown-item app-dropdown-item--right",
													draftInterval === option.value &&
														"app-dropdown-item--active",
												)}
												key={option.value}
												type="button"
												onClick={() => {
													setIntervalOpen(false);
													handleIntervalApply(
														option.value as DashboardQuery["interval"],
													);
												}}
											>
												<span class="text-xs font-semibold">
													{option.label}
												</span>
											</button>
										))}
									</PopoverContent>
								</Popover>
							</div>
							<ColumnPicker
								class="app-dashboard-column-picker"
								columns={trendColumnsConfig.map((column) =>
									column.id === "bucket"
										? { ...column, label: intervalLabel }
										: column,
								)}
								value={trendColumns}
								onChange={updateTrendColumns}
							/>
						</div>
					</div>
					<div class="mt-2 flex min-h-0 flex-1 flex-col gap-4">
						<div>
							<AreaChart
								data={chartData}
								valueLabel="请求"
								secondaryLabel="Tokens"
							/>
						</div>
						<div class="min-h-0 flex-1 overflow-auto">
							<Table>
								<TableHeader>
									<TableRow>
										{trendColumnSet.has("bucket") && (
											<TableHead>{intervalLabel}</TableHead>
										)}
										{trendColumnSet.has("requests") && (
											<TableHead>请求</TableHead>
										)}
										{trendColumnSet.has("tokens") && (
											<TableHead>Tokens</TableHead>
										)}
									</TableRow>
								</TableHeader>
								<TableBody>
									{(dashboard.trend ?? []).length === 0 ? (
										<TableRow>
											<TableCell
												class="px-3 py-6 text-center text-sm text-[color:var(--app-ink-muted)]"
												colSpan={trendColumnCount}
											>
												暂无趋势数据
											</TableCell>
										</TableRow>
									) : (
										dashboard.trend.map((row) => (
											<TableRow key={row.bucket}>
												{trendColumnSet.has("bucket") && (
													<TableCell>{row.bucket}</TableCell>
												)}
												{trendColumnSet.has("requests") && (
													<TableCell>{row.requests}</TableCell>
												)}
												{trendColumnSet.has("tokens") && (
													<TableCell>{row.tokens}</TableCell>
												)}
											</TableRow>
										))
									)}
								</TableBody>
							</Table>
						</div>
					</div>
				</Card>
				<Card class="flex h-[420px] flex-col sm:h-[520px]">
					<div class="mb-4 flex items-center justify-between">
						<div>
							<h3 class="app-title">排行</h3>
							<p class="app-subtitle">模型、渠道与令牌的 Top 表现。</p>
						</div>
						<ColumnPicker
							class="app-dashboard-column-picker"
							columns={rankColumnsConfig}
							value={rankColumns}
							onChange={updateRankColumns}
						/>
					</div>
					<Tabs class="min-h-0 flex-1">
						<TabsList class="grid grid-cols-3 gap-2">
							<TabsTrigger
								active={activeRankTab === "model"}
								class="w-full"
								type="button"
								onClick={() => setActiveRankTab("model")}
							>
								模型排行
							</TabsTrigger>
							<TabsTrigger
								active={activeRankTab === "channel"}
								class="w-full"
								type="button"
								onClick={() => setActiveRankTab("channel")}
							>
								渠道排行
							</TabsTrigger>
							<TabsTrigger
								active={activeRankTab === "token"}
								class="w-full"
								type="button"
								onClick={() => setActiveRankTab("token")}
							>
								令牌排行
							</TabsTrigger>
						</TabsList>
						<TabsContent class="min-h-0 flex-1">
							<div class="h-full overflow-auto">
								<Table>
									<TableHeader>
										<TableRow>
											{rankColumnSet.has("name") && (
												<TableHead>
													{activeRankTab === "model"
														? "模型"
														: activeRankTab === "channel"
															? "渠道"
															: "令牌"}
												</TableHead>
											)}
											{rankColumnSet.has("requests") && (
												<TableHead>请求</TableHead>
											)}
											{rankColumnSet.has("tokens") && (
												<TableHead>Tokens</TableHead>
											)}
										</TableRow>
									</TableHeader>
									<TableBody>
										{rankingData.length === 0 ? (
											<TableRow>
												<TableCell
													class="px-3 py-6 text-center text-sm text-[color:var(--app-ink-muted)]"
													colSpan={rankColumnCount}
												>
													暂无排行数据
												</TableCell>
											</TableRow>
										) : (
											rankingData.map((row) => (
												<TableRow key={`${activeRankTab}-${row.name}`}>
													{rankColumnSet.has("name") && (
														<TableCell>{row.name}</TableCell>
													)}
													{rankColumnSet.has("requests") && (
														<TableCell>{row.requests}</TableCell>
													)}
													{rankColumnSet.has("tokens") && (
														<TableCell>{row.tokens}</TableCell>
													)}
												</TableRow>
											))
										)}
									</TableBody>
								</Table>
							</div>
						</TabsContent>
					</Tabs>
				</Card>
			</div>
		</div>
	);
};
