import { useEffect, useMemo, useState } from "hono/jsx/dom";
import {
	Button,
	Card,
	Chip,
	ColumnPicker,
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	Input,
	MultiSelect,
	Pagination,
	SingleSelect,
} from "../../components/ui";
import type { Site, Token, TokenForm } from "../../core/types";
import {
	buildPageItems,
	formatChinaDateTime,
	formatDateTime,
	loadColumnPrefs,
	persistColumnPrefs,
} from "../../core/utils";

const tokenStatusOptions = [
	{ value: "active", label: "启用" },
	{ value: "disabled", label: "禁用" },
];

type TokensViewProps = {
	pagedTokens: Token[];
	tokenPage: number;
	tokenPageSize: number;
	tokenTotal: number;
	tokenTotalPages: number;
	isTokenModalOpen: boolean;
	isActionPending: (key: string) => boolean;
	sites: Site[];
	tokenForm: TokenForm;
	editingToken: Token | null;
	onCreate: () => void;
	onCloseModal: () => void;
	onPageChange: (next: number) => void;
	onPageSizeChange: (next: number) => void;
	onSubmit: (event: Event) => void;
	onFormChange: (patch: Partial<TokenForm>) => void;
	onEdit: (token: Token) => void;
	onReveal: (id: string) => void;
	onToggle: (id: string, status: string) => void;
	onDelete: (token: Token) => void;
};

const pageSizeOptions = [10, 20, 50];
const tokenColumnOptions = [
	{ id: "name", label: "名称", width: "minmax(0,1.2fr)", locked: true },
	{ id: "status", label: "状态", width: "minmax(0,0.6fr)" },
	{ id: "quota", label: "已用/额度", width: "minmax(0,0.9fr)" },
	{ id: "prefix", label: "前缀", width: "minmax(0,0.6fr)" },
	{ id: "created", label: "创建时间", width: "minmax(0,1fr)" },
	{ id: "expires", label: "过期时间", width: "minmax(0,1fr)" },
	{ id: "channels", label: "渠道限制", width: "minmax(0,0.7fr)" },
	{ id: "actions", label: "操作", width: "minmax(0,1.3fr)", locked: true },
];
const tokenColumnDefaults = tokenColumnOptions.map((column) => column.id);
const tokenColumnVersion = "2026-03-17";

/**
 * Renders the tokens management view.
 *
 * Args:
 *   props: Tokens view props.
 *
 * Returns:
 *   Tokens JSX element.
 */
export const TokensView = ({
	pagedTokens,
	tokenPage,
	tokenPageSize,
	tokenTotal,
	tokenTotalPages,
	isTokenModalOpen,
	isActionPending,
	sites,
	tokenForm,
	editingToken,
	onCreate,
	onCloseModal,
	onPageChange,
	onPageSizeChange,
	onSubmit,
	onFormChange,
	onEdit,
	onReveal,
	onToggle,
	onDelete,
}: TokensViewProps) => {
	const pageItems = buildPageItems(tokenPage, tokenTotalPages);
	const isSubmitting = isActionPending("token:submit");
	const isEditing = Boolean(editingToken);
	const modalTitle = isEditing ? "编辑令牌" : "生成令牌";
	const modalDescription = isEditing
		? "更新令牌名称、额度、状态与过期时间。"
		: "创建后会自动复制令牌，请妥善保存。";
	const submitLabel = isEditing ? "保存修改" : "生成令牌";
	const [visibleColumns, setVisibleColumns] = useState(() => {
		if (typeof window === "undefined") {
			return tokenColumnDefaults;
		}
		const versionKey = "columns:tokens:version";
		const storedVersion = window.localStorage.getItem(versionKey);
		const stored = loadColumnPrefs("columns:tokens", tokenColumnDefaults);
		if (storedVersion !== tokenColumnVersion) {
			window.localStorage.setItem(versionKey, tokenColumnVersion);
			persistColumnPrefs("columns:tokens", tokenColumnDefaults);
			return tokenColumnDefaults;
		}
		return stored;
	});
	const visibleColumnSet = useMemo(
		() => new Set(visibleColumns),
		[visibleColumns],
	);
	const updateVisibleColumns = (next: string[]) => {
		setVisibleColumns(next);
		persistColumnPrefs("columns:tokens", next);
	};
	const tokenGridTemplate = useMemo(
		() =>
			tokenColumnOptions
				.filter((column) => visibleColumnSet.has(column.id))
				.map((column) => column.width)
				.join(" "),
		[visibleColumnSet],
	);
	const displayPages = tokenTotal === 0 ? 0 : tokenTotalPages;
	const clearChannels = () => onFormChange({ allowed_channels: [] });
	const channelOptions = useMemo(
		() =>
			sites.map((site) => ({
				value: site.id,
				label: site.name ?? site.id,
			})),
		[sites],
	);

	useEffect(() => {
		if (!isTokenModalOpen) {
			return;
		}
		const handleKeyDown = (event: KeyboardEvent) => {
			if (event.key === "Escape") {
				event.preventDefault();
				onCloseModal();
			}
		};
		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [isTokenModalOpen, onCloseModal]);
	return (
		<div class="space-y-5">
			<div class="app-panel animate-fade-up space-y-4">
				<div class="flex flex-wrap items-center justify-between gap-3">
					<div>
						<h3 class="app-title text-lg">令牌列表</h3>
						<p class="app-subtitle">统一管理令牌状态、额度与操作入口。</p>
					</div>
					<div class="flex flex-wrap items-center gap-2">
						<ColumnPicker
							columns={tokenColumnOptions}
							value={visibleColumns}
							onChange={updateVisibleColumns}
						/>
						<Button
							class="h-9 px-4 text-xs"
							size="sm"
							variant="primary"
							type="button"
							onClick={onCreate}
						>
							新增令牌
						</Button>
					</div>
				</div>
				<div>
					<div class="app-mobile-stack space-y-3 md:hidden">
						{pagedTokens.length === 0 ? (
							<Card class="text-center text-sm text-[color:var(--app-ink-muted)]">
								<p>暂无令牌，请先创建。</p>
								<Button
									class="mt-4 h-9 px-4 text-xs"
									size="sm"
									variant="primary"
									type="button"
									onClick={onCreate}
								>
									生成令牌
								</Button>
							</Card>
						) : (
							pagedTokens.map((tokenItem) => {
								const isActive = tokenItem.status === "active";
								const revealPending = isActionPending(
									`token:reveal:${tokenItem.id}`,
								);
								const togglePending = isActionPending(
									`token:toggle:${tokenItem.id}`,
								);
								const deletePending = isActionPending(
									`token:delete:${tokenItem.id}`,
								);
								return (
									<Card class="p-4" key={tokenItem.id}>
										<div class="flex items-start justify-between gap-3">
											<div class="min-w-0">
												<p class="truncate text-sm font-semibold text-[color:var(--app-ink)]">
													{tokenItem.name}
												</p>
												<p class="text-xs text-[color:var(--app-ink-muted)]">
													前缀 {tokenItem.key_prefix ?? "-"}
												</p>
											</div>
											<Chip
												class="text-[10px] uppercase tracking-widest"
												variant={isActive ? "success" : "muted"}
											>
												{isActive ? "启用" : "禁用"}
											</Chip>
										</div>
										<div class="mt-3 grid grid-cols-2 gap-2 text-xs text-[color:var(--app-ink-muted)]">
											<Card variant="compact">
												<p>已用/额度</p>
												<p class="mt-1 font-semibold text-[color:var(--app-ink)]">
													{tokenItem.quota_used} /{" "}
													{tokenItem.quota_total ?? "∞"}
												</p>
											</Card>
											<Card variant="compact">
												<p>创建时间</p>
												<p class="mt-1 font-semibold text-[color:var(--app-ink)]">
													{formatDateTime(tokenItem.created_at)}
												</p>
											</Card>
											<Card variant="compact">
												<p>过期时间</p>
												<p class="mt-1 font-semibold text-[color:var(--app-ink)]">
													{tokenItem.expires_at
														? formatChinaDateTime(tokenItem.expires_at)
														: "永不过期"}
												</p>
											</Card>
											<Card variant="compact">
												<p>渠道限制</p>
												<p class="mt-1 font-semibold text-[color:var(--app-ink)]">
													{tokenItem.allowed_channels &&
													tokenItem.allowed_channels.length > 0
														? `${tokenItem.allowed_channels.length} 个`
														: "全开"}
												</p>
											</Card>
										</div>
										<div class="mt-3 grid grid-cols-2 gap-2">
											<Button
												class="col-span-2 h-9 w-full px-3 text-xs"
												size="sm"
												type="button"
												onClick={() => onEdit(tokenItem)}
											>
												编辑
											</Button>
											<Button
												class="h-9 w-full px-3 text-xs"
												size="sm"
												type="button"
												disabled={revealPending}
												onClick={() => onReveal(tokenItem.id)}
											>
												{revealPending ? "查看中..." : "查看"}
											</Button>
											<Button
												class="h-9 w-full px-3 text-xs"
												size="sm"
												type="button"
												disabled={togglePending}
												onClick={() => onToggle(tokenItem.id, tokenItem.status)}
											>
												{togglePending ? "处理中..." : "切换"}
											</Button>
											<Button
												class="col-span-2 h-9 w-full px-3 text-xs"
												size="sm"
												variant="ghost"
												type="button"
												disabled={deletePending}
												onClick={() => onDelete(tokenItem)}
											>
												{deletePending ? "删除中..." : "删除"}
											</Button>
										</div>
									</Card>
								);
							})
						)}
					</div>
					<div class="app-surface app-list-shell hidden overflow-hidden md:block">
						<div
							class="app-list-header grid gap-3 px-4 py-3 text-xs uppercase tracking-widest text-[color:var(--app-ink-muted)]"
							style={`grid-template-columns: ${tokenGridTemplate};`}
						>
							{visibleColumnSet.has("name") && <div>名称</div>}
							{visibleColumnSet.has("status") && <div>状态</div>}
							{visibleColumnSet.has("quota") && <div>已用/额度</div>}
							{visibleColumnSet.has("prefix") && <div>前缀</div>}
							{visibleColumnSet.has("created") && <div>创建时间</div>}
							{visibleColumnSet.has("expires") && <div>过期时间</div>}
							{visibleColumnSet.has("channels") && <div>渠道限制</div>}
							{visibleColumnSet.has("actions") && <div>操作</div>}
						</div>
						{pagedTokens.length === 0 ? (
							<div class="app-list-empty px-4 py-10 text-center text-sm text-[color:var(--app-ink-muted)]">
								<p>暂无令牌，请先创建。</p>
								<Button
									class="mt-4 h-9 px-4 text-xs"
									size="sm"
									variant="primary"
									type="button"
									onClick={onCreate}
								>
									生成令牌
								</Button>
							</div>
						) : (
							<div class="app-list-body divide-y divide-white/60">
								{pagedTokens.map((tokenItem) => {
									const isActive = tokenItem.status === "active";
									const revealPending = isActionPending(
										`token:reveal:${tokenItem.id}`,
									);
									const togglePending = isActionPending(
										`token:toggle:${tokenItem.id}`,
									);
									const deletePending = isActionPending(
										`token:delete:${tokenItem.id}`,
									);
									return (
										<div
											class="app-list-row grid items-center gap-3 px-4 py-4 text-sm"
											key={tokenItem.id}
											style={`grid-template-columns: ${tokenGridTemplate};`}
										>
											{visibleColumnSet.has("name") && (
												<div class="flex min-w-0 flex-col">
													<span class="truncate font-semibold text-[color:var(--app-ink)]">
														{tokenItem.name}
													</span>
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
											{visibleColumnSet.has("quota") && (
												<div class="text-sm font-semibold text-[color:var(--app-ink)]">
													{tokenItem.quota_used} /{" "}
													{tokenItem.quota_total ?? "∞"}
												</div>
											)}
											{visibleColumnSet.has("prefix") && (
												<div class="text-sm text-[color:var(--app-ink)]">
													{tokenItem.key_prefix ?? "-"}
												</div>
											)}
											{visibleColumnSet.has("created") && (
												<div class="text-sm text-[color:var(--app-ink)]">
													{formatDateTime(tokenItem.created_at)}
												</div>
											)}
											{visibleColumnSet.has("expires") && (
												<div class="text-sm text-[color:var(--app-ink)]">
													{tokenItem.expires_at
														? formatChinaDateTime(tokenItem.expires_at)
														: "永不过期"}
												</div>
											)}
											{visibleColumnSet.has("channels") && (
												<div class="text-sm text-[color:var(--app-ink)]">
													{tokenItem.allowed_channels &&
													tokenItem.allowed_channels.length > 0
														? `${tokenItem.allowed_channels.length} 个`
														: "全开"}
												</div>
											)}
											{visibleColumnSet.has("actions") && (
												<div class="flex flex-wrap gap-2">
													<Button
														class="h-9 px-3 text-xs"
														size="sm"
														type="button"
														onClick={() => onEdit(tokenItem)}
													>
														编辑
													</Button>
													<Button
														class="h-9 px-3 text-xs"
														size="sm"
														type="button"
														disabled={revealPending}
														onClick={() => onReveal(tokenItem.id)}
													>
														{revealPending ? "查看中..." : "查看"}
													</Button>
													<Button
														class="h-9 px-3 text-xs"
														size="sm"
														type="button"
														disabled={togglePending}
														onClick={() =>
															onToggle(tokenItem.id, tokenItem.status)
														}
													>
														{togglePending ? "处理中..." : "切换"}
													</Button>
													<Button
														class="h-9 px-3 text-xs"
														size="sm"
														variant="ghost"
														type="button"
														disabled={deletePending}
														onClick={() => onDelete(tokenItem)}
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
				</div>
				<div class="app-pagination-bar flex flex-col gap-3 text-xs text-[color:var(--app-ink-muted)] sm:flex-row sm:items-center sm:justify-between">
					<div class="flex flex-wrap items-center gap-2">
						<span class="text-xs text-[color:var(--app-ink-muted)]">
							共 {tokenTotal} 条 · {displayPages} 页
						</span>
						<Pagination
							page={tokenPage}
							totalPages={tokenTotalPages}
							items={pageItems}
							onPageChange={onPageChange}
						/>
					</div>
					<div class="app-page-size-control">
						<span class="app-page-size-control__label">每页</span>
						<div class="app-page-size-control__chips">
							{pageSizeOptions.map((size) => (
								<button
									class={`app-page-size-chip ${
										tokenPageSize === size ? "app-page-size-chip--active" : ""
									}`}
									key={size}
									type="button"
									onClick={() => onPageSizeChange(size)}
								>
									{size}
								</button>
							))}
						</div>
					</div>
				</div>
			</div>
			{isTokenModalOpen && (
				<Dialog open={isTokenModalOpen} onClose={onCloseModal}>
					<DialogContent
						aria-labelledby="token-modal-title"
						aria-modal="true"
						class="max-w-xl"
					>
						<DialogHeader>
							<div>
								<DialogTitle id="token-modal-title">{modalTitle}</DialogTitle>
								<DialogDescription>{modalDescription}</DialogDescription>
							</div>
							<Button size="sm" type="button" onClick={onCloseModal}>
								关闭
							</Button>
						</DialogHeader>
						<form class="mt-4 grid gap-3.5" onSubmit={onSubmit}>
							<div>
								<label
									class="mb-1.5 block text-xs uppercase tracking-widest text-[color:var(--app-ink-muted)]"
									for="token-name"
								>
									名称
								</label>
								<Input
									id="token-name"
									name="name"
									required
									value={tokenForm.name}
									onInput={(event) =>
										onFormChange({
											name: (event.currentTarget as HTMLInputElement).value,
										})
									}
								/>
							</div>
							<div>
								<label
									class="mb-1.5 block text-xs uppercase tracking-widest text-[color:var(--app-ink-muted)]"
									for="token-quota"
								>
									额度（可选）
								</label>
								<Input
									id="token-quota"
									name="quota_total"
									type="number"
									min="0"
									placeholder="留空表示无限"
									value={tokenForm.quota_total}
									onInput={(event) =>
										onFormChange({
											quota_total: (event.currentTarget as HTMLInputElement)
												.value,
										})
									}
								/>
							</div>
							<div>
								<label class="mb-1.5 block text-xs uppercase tracking-widest text-[color:var(--app-ink-muted)]">
									状态
								</label>
								<SingleSelect
									class="w-full"
									value={tokenForm.status}
									options={tokenStatusOptions}
									onChange={(next) =>
										onFormChange({
											status: next,
										})
									}
								/>
							</div>
							<div>
								<label
									class="mb-1.5 block text-xs uppercase tracking-widest text-[color:var(--app-ink-muted)]"
									for="token-expires"
								>
									过期时间（北京时间）
								</label>
								<Input
									id="token-expires"
									name="expires_at"
									type="datetime-local"
									step="60"
									placeholder="留空表示不过期"
									value={tokenForm.expires_at}
									onInput={(event) =>
										onFormChange({
											expires_at: (event.currentTarget as HTMLInputElement)
												.value,
										})
									}
								/>
								<p class="mt-1 text-xs text-[color:var(--app-ink-muted)]">
									留空表示不过期。
								</p>
							</div>
							<div>
								<div class="flex items-center justify-between">
									<div class="mb-1.5 block text-xs uppercase tracking-widest text-[color:var(--app-ink-muted)]">
										允许渠道
									</div>
									<button
										class="text-xs font-semibold text-[color:var(--app-ink-muted)] transition-all duration-200 ease-in-out hover:text-[color:var(--app-ink)]"
										type="button"
										onClick={clearChannels}
									>
										全开
									</button>
								</div>
								<p class="text-xs text-[color:var(--app-ink-muted)]">
									未选择表示全开。
								</p>
								{sites.length === 0 ? (
									<Card
										variant="compact"
										class="mt-2 text-xs text-[color:var(--app-ink-muted)]"
									>
										暂无渠道，请先创建。
									</Card>
								) : (
									<div class="mt-2">
										<MultiSelect
											class="w-full"
											options={channelOptions}
											value={tokenForm.allowed_channels}
											placeholder="选择允许渠道"
											searchPlaceholder="搜索渠道"
											emptyLabel="暂无匹配渠道"
											onChange={(next) =>
												onFormChange({ allowed_channels: next })
											}
										/>
									</div>
								)}
							</div>
							<DialogFooter>
								<Button size="sm" type="button" onClick={onCloseModal}>
									取消
								</Button>
								<Button
									size="sm"
									variant="primary"
									type="submit"
									disabled={isSubmitting}
								>
									{isSubmitting
										? isEditing
											? "保存中..."
											: "生成中..."
										: submitLabel}
								</Button>
							</DialogFooter>
						</form>
					</DialogContent>
				</Dialog>
			)}
		</div>
	);
};
