import {
	Badge,
	Button,
	Chip,
	Toast,
	ToastProgress,
	ToastTitle,
	ToastViewport,
} from "../../components/ui";
import type { NoticeMessage, TabId, TabItem } from "../../core/types";

type AppLayoutProps = {
	tabs: TabItem[];
	activeTab: TabId;
	activeLabel: string;
	token: string | null;
	notices: NoticeMessage[];
	onDismissNotice: (id: number) => void;
	onTabChange: (tabId: TabId) => void;
	onLogout: () => void;
	children?: unknown;
};

/**
 * Renders the admin app layout.
 *
 * Args:
 *   props: App layout props.
 *
 * Returns:
 *   App shell JSX element.
 */
export const AppLayout = ({
	tabs,
	activeTab,
	activeLabel,
	token,
	notices,
	onDismissNotice,
	onTabChange,
	onLogout,
	children,
}: AppLayoutProps) => {
	const noticeToneStyles: Record<NoticeMessage["tone"], string> = {
		success: "app-notice app-notice--success",
		warning: "app-notice app-notice--warning",
		error: "app-notice app-notice--error",
		info: "app-notice app-notice--info",
	};
	const noticeToneLabel: Record<NoticeMessage["tone"], string> = {
		success: "成功",
		warning: "提示",
		error: "错误",
		info: "信息",
	};
	const closeMobileNav = () => {
		const toggle = document.querySelector<HTMLInputElement>("#app-nav-toggle");
		if (toggle) {
			toggle.checked = false;
		}
	};
	const toggleMobileNav = () => {
		const toggle = document.querySelector<HTMLInputElement>("#app-nav-toggle");
		if (toggle) {
			toggle.checked = !toggle.checked;
		}
	};

	return (
		<div class="relative flex min-h-screen flex-col lg:grid lg:grid-cols-[300px_1fr]">
			<input class="peer hidden" id="app-nav-toggle" type="checkbox" />
			<header class="app-bar flex items-center justify-between px-4 py-4 lg:hidden">
				<div class="flex items-center gap-3">
					<Button
						aria-controls="app-nav-toggle"
						aria-label="打开导航"
						class="inline-flex h-10 items-center gap-2 px-3 text-xs"
						size="sm"
						type="button"
						onClick={toggleMobileNav}
					>
						<svg
							aria-hidden="true"
							class="h-4 w-4 text-[color:var(--app-ink-muted)]"
							fill="none"
							viewBox="0 0 24 24"
							stroke="currentColor"
							stroke-width="1.8"
						>
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								d="M4 6h16"
							/>
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								d="M4 12h16"
							/>
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								d="M4 18h16"
							/>
						</svg>
						菜单
					</Button>
					<div class="flex flex-col">
						<span class="text-sm font-semibold text-[color:var(--app-ink)]">
							api-workers
						</span>
						<span class="text-xs text-[color:var(--app-ink-muted)]">
							{activeLabel}
						</span>
					</div>
				</div>
				<div class="flex items-center gap-2">
					<Badge class="text-[10px] uppercase tracking-widest" variant="muted">
						{token ? "已登录" : "未登录"}
					</Badge>
					<Button
						class="h-9 px-3 text-xs"
						size="sm"
						variant="ghost"
						type="button"
						onClick={onLogout}
					>
						退出
					</Button>
				</div>
			</header>
			<aside class="app-sidebar fixed inset-y-0 left-0 z-40 flex w-[18.5rem] max-w-[86vw] -translate-x-full flex-col overflow-y-auto rounded-r-[28px] px-5 py-6 shadow-xl transition-transform duration-300 ease-in-out peer-checked:translate-x-0 lg:sticky lg:top-5 lg:z-10 lg:mx-5 lg:my-5 lg:h-[calc(100vh-40px)] lg:w-auto lg:translate-x-0 lg:rounded-[30px] lg:shadow-none">
				<div class="mb-8 flex flex-col gap-3">
					<div class="flex flex-col gap-1.5">
						<h2 class="app-title text-[21px]">api-workers</h2>
						<span class="text-xs uppercase tracking-widest text-[color:var(--app-ink-muted)]">
							control center
						</span>
					</div>
				</div>
				<nav class="flex flex-col gap-2.5">
					{tabs.map((tab) => (
						<button
							class={`app-nav-button app-focus h-11 w-full text-left text-sm ${
								activeTab === tab.id ? "app-nav-button--active" : ""
							}`}
							type="button"
							onClick={() => {
								onTabChange(tab.id);
								closeMobileNav();
							}}
						>
							{tab.label}
						</button>
					))}
				</nav>
				<div class="mt-auto hidden w-full items-center justify-between gap-2 rounded-[18px] border border-[color:var(--app-border)] bg-[color:var(--app-surface-muted)] px-3 py-2 text-xs text-[color:var(--app-ink-muted)] lg:flex">
					<span>{token ? "已登录" : "未登录"}</span>
					<Button
						class="h-8 px-3 text-[11px]"
						size="sm"
						variant="ghost"
						type="button"
						onClick={onLogout}
					>
						退出
					</Button>
				</div>
			</aside>
			<main class="px-4 pt-5 pb-16 sm:px-10 sm:pt-8 lg:pt-5 lg:pl-0 lg:pr-8">
				<div class="animate-fade-up">{children}</div>
			</main>
			{notices.length > 0 && (
				<ToastViewport aria-live="polite">
					{notices.map((notice) => (
						<Toast
							class={noticeToneStyles[notice.tone]}
							key={notice.id}
							style={`--toast-duration: ${notice.durationMs ?? 4500}ms`}
						>
							<div class="flex items-start justify-between gap-3">
								<div>
									<Chip class="text-[10px]">
										{noticeToneLabel[notice.tone]}
									</Chip>
									<ToastTitle>{notice.message}</ToastTitle>
								</div>
								<Button
									class="h-8 px-3 text-[11px]"
									size="sm"
									type="button"
									onClick={() => onDismissNotice(notice.id)}
								>
									关闭
								</Button>
							</div>
							<ToastProgress aria-hidden="true" />
						</Toast>
					))}
				</ToastViewport>
			)}
			<button
				aria-label="关闭导航"
				class="fixed inset-0 z-30 bg-slate-950/40 opacity-0 transition-opacity duration-300 ease-in-out peer-checked:pointer-events-auto peer-checked:opacity-100 lg:hidden pointer-events-none"
				type="button"
				onClick={closeMobileNav}
			/>
		</div>
	);
};
