import {
	Button,
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "../components/ui";
import {
	getRequestEntryFormatLabel,
	getSuggestedActionLabel,
	getVerificationAttemptStatusLabel,
	getVerificationAttemptSummary,
	getVerificationAttempts,
	getVerificationFailedTokenIssues,
	getVerificationStageTone,
	getVerificationVerdictLabel,
} from "../core/sites";
import { formatChinaDateTimeMinute } from "../core/utils";
import type { SiteVerificationDialogState } from "./state";

type SiteVerificationDialogProps = {
	dialog: SiteVerificationDialogState | null;
	onClose: () => void;
};

const getVerificationStageClass = (tone: string) => {
	if (tone === "success") {
		return "border-emerald-200 bg-emerald-50/80 text-emerald-700";
	}
	if (tone === "warning") {
		return "border-amber-200 bg-amber-50/80 text-amber-700";
	}
	if (tone === "danger") {
		return "border-rose-200 bg-rose-50/80 text-rose-700";
	}
	return "border-white/60 bg-white/70 text-[color:var(--app-ink-muted)]";
};

export const SiteVerificationDialog = ({
	dialog,
	onClose,
}: SiteVerificationDialogProps) => {
	if (!dialog) {
		return null;
	}
	const result = dialog.result;
	const attemptSummary = getVerificationAttemptSummary(result);
	const attempts = getVerificationAttempts(result);
	const tokenIssues = getVerificationFailedTokenIssues(result);
	return (
		<Dialog open={Boolean(dialog)} onClose={onClose}>
			<DialogContent
				aria-labelledby="site-verification-title"
				aria-modal="true"
				class="max-w-4xl"
			>
				<DialogHeader>
					<div>
						<DialogTitle id="site-verification-title">
							{dialog.title}
						</DialogTitle>
						<DialogDescription>
							{result.site_name} · {getVerificationVerdictLabel(result.verdict)}
							。{result.message}
						</DialogDescription>
					</div>
					<Button size="sm" type="button" onClick={onClose}>
						关闭
					</Button>
				</DialogHeader>
				<div class="mt-3 grid gap-3 md:grid-cols-2">
					{(
						[
							["连接验证", result.stages.connectivity],
							["能力验证", result.stages.capability],
							["服务验证", result.stages.service],
							["恢复评估", result.stages.recovery],
						] as const
					).map(([label, stage]) => {
						const tone = getVerificationStageTone(stage.status);
						return (
							<div
								class={`rounded-2xl border px-4 py-4 ${getVerificationStageClass(
									tone,
								)}`}
								key={label}
							>
								<div class="flex items-center justify-between gap-3">
									<p class="text-sm font-semibold">{label}</p>
									<span class="text-xs font-semibold uppercase tracking-widest">
										{stage.status}
									</span>
								</div>
								<p class="mt-2 text-xs">{stage.message}</p>
								<p class="mt-2 text-[11px] opacity-80">code: {stage.code}</p>
							</div>
						);
					})}
				</div>
				<div class="mt-4 grid gap-3 rounded-2xl border border-white/60 bg-white/75 px-4 py-4 md:grid-cols-2">
					<div>
						<p class="text-xs uppercase tracking-widest text-[color:var(--app-ink-muted)]">
							验证模型
						</p>
						<p class="mt-1 text-sm font-semibold text-[color:var(--app-ink)]">
							{result.selected_model ?? "未选择"}
						</p>
					</div>
					<div>
						<p class="text-xs uppercase tracking-widest text-[color:var(--app-ink-muted)]">
							检查时间
						</p>
						<p class="mt-1 text-sm font-semibold text-[color:var(--app-ink)]">
							{formatChinaDateTimeMinute(result.checked_at)}
						</p>
					</div>
					<div>
						<p class="text-xs uppercase tracking-widest text-[color:var(--app-ink-muted)]">
							建议动作
						</p>
						<p class="mt-1 text-sm font-semibold text-[color:var(--app-ink)]">
							{getSuggestedActionLabel(result.suggested_action)}
						</p>
					</div>
					<div>
						<p class="text-xs uppercase tracking-widest text-[color:var(--app-ink-muted)]">
							请求格式
						</p>
						<p class="mt-1 text-sm font-semibold text-[color:var(--app-ink)]">
							{result.request_entry_format
								? getRequestEntryFormatLabel(result.request_entry_format)
								: "-"}
						</p>
					</div>
					<div>
						<p class="text-xs uppercase tracking-widest text-[color:var(--app-ink-muted)]">
							调用令牌
						</p>
						<p class="mt-1 text-sm font-semibold text-[color:var(--app-ink)]">
							{result.selected_token?.name ?? "未命中"}
						</p>
					</div>
					<div>
						<p class="text-xs uppercase tracking-widest text-[color:var(--app-ink-muted)]">
							上游状态
						</p>
						<p class="mt-1 text-sm font-semibold text-[color:var(--app-ink)]">
							{result.trace.upstream_status ?? "-"}
						</p>
					</div>
				</div>
				<div class="mt-4 rounded-2xl border border-white/60 bg-white/75 px-4 py-4">
					<p class="text-xs uppercase tracking-widest text-[color:var(--app-ink-muted)]">
						尝试记录
					</p>
					<div class="mt-3 grid gap-3 md:grid-cols-2">
						<div>
							<p class="text-[11px] font-semibold text-[color:var(--app-ink-muted)]">
								尝试模型
							</p>
							<p class="mt-1 break-words text-xs text-[color:var(--app-ink)]">
								{attemptSummary.models.length > 0
									? attemptSummary.models.join("、")
									: "-"}
							</p>
						</div>
						<div>
							<p class="text-[11px] font-semibold text-[color:var(--app-ink-muted)]">
								尝试格式
							</p>
							<p class="mt-1 break-words text-xs text-[color:var(--app-ink)]">
								{attemptSummary.formats.length > 0
									? attemptSummary.formats.join("、")
									: "-"}
							</p>
						</div>
					</div>
					<div class="mt-3 max-h-72 space-y-2 overflow-y-auto pr-1">
						{attempts.length === 0 ? (
							<p class="text-xs text-[color:var(--app-ink-muted)]">
								当前没有可展示的逐次尝试日志。
							</p>
						) : (
							attempts.map((attempt, index) => (
								<div
									class="rounded-xl border border-white/60 bg-slate-50/70 px-3 py-3"
									key={`verification-attempt:${index}`}
								>
									<div class="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
										<span class="font-semibold text-[color:var(--app-ink)]">
											第 {index + 1} 次
										</span>
										<span class="text-[color:var(--app-ink-muted)]">
											{getVerificationAttemptStatusLabel(attempt.status)}
										</span>
										<span class="text-[color:var(--app-ink-muted)]">
											{attempt.request_entry_format
												? getRequestEntryFormatLabel(
														attempt.request_entry_format,
													)
												: attempt.endpoint_type}
										</span>
										<span class="text-[color:var(--app-ink-muted)]">
											HTTP {attempt.http_status ?? "-"}
										</span>
										<span class="text-[color:var(--app-ink-muted)]">
											{attempt.latency_ms} ms
										</span>
									</div>
									<p class="mt-2 break-words text-xs text-[color:var(--app-ink)]">
										模型：
										{attempt.model ?? "-"}
										{attempt.request_model &&
										attempt.request_model !== attempt.model
											? ` · 上游请求：${attempt.request_model}`
											: ""}
									</p>
									<p class="mt-1 break-words text-[11px] text-[color:var(--app-ink-muted)]">
										{attempt.detail_code ?? "-"}
										{attempt.detail_message
											? ` · ${attempt.detail_message}`
											: ""}
									</p>
								</div>
							))
						)}
					</div>
				</div>
				{tokenIssues.length > 0 ? (
					<div class="mt-4 rounded-2xl border border-white/60 bg-white/75 px-4 py-4">
						<p class="text-xs uppercase tracking-widest text-[color:var(--app-ink-muted)]">
							失败令牌
						</p>
						<div class="mt-2 space-y-2">
							{tokenIssues.map((detail, index) => (
								<p
									class="break-words text-xs leading-5 text-[color:var(--app-ink)]"
									key={`verification-token-failure:${index}`}
								>
									{detail}
								</p>
							))}
						</div>
					</div>
				) : null}
				<DialogFooter>
					<Button size="sm" type="button" onClick={onClose}>
						关闭
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
};
