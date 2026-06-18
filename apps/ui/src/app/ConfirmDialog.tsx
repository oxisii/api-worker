import {
	Button,
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "../components/ui";
import type { ConfirmState } from "./state";

type ConfirmDialogProps = {
	confirmState: ConfirmState | null;
	confirmPending: boolean;
	isActionPending: (key: string) => boolean;
	onClose: () => void;
	onConfirm: () => void;
};

export const ConfirmDialog = ({
	confirmState,
	confirmPending,
	isActionPending,
	onClose,
	onConfirm,
}: ConfirmDialogProps) => {
	if (!confirmState) {
		return null;
	}
	return (
		<Dialog open={Boolean(confirmState)} onClose={onClose}>
			<DialogContent
				aria-labelledby="confirm-title"
				aria-modal="true"
				class={confirmState.previewItems ? "max-w-2xl" : "max-w-md"}
			>
				<DialogHeader>
					<div class="min-w-0 flex-1">
						<DialogTitle id="confirm-title">{confirmState.title}</DialogTitle>
						<DialogDescription class="break-words leading-5">
							{confirmState.message}
						</DialogDescription>
					</div>
					<Button size="sm" type="button" onClick={onClose}>
						关闭
					</Button>
				</DialogHeader>
				{confirmState.previewItems ? (
					<div class="mt-4 w-full rounded-2xl border border-white/60 bg-white/75 px-4 py-4">
						{confirmState.previewSummary ? (
							<p class="text-sm font-semibold text-[color:var(--app-ink)]">
								{confirmState.previewSummary}
							</p>
						) : null}
						<ul class="mt-3 max-h-[50vh] w-full space-y-2 overflow-y-auto pr-1">
							{confirmState.previewItems.map((item) => {
								const isItemActionPending = item.actionKey
									? isActionPending(item.actionKey)
									: false;
								return (
									<li
										class="flex flex-col gap-3 rounded-xl border border-white/60 bg-white/85 px-3 py-3 sm:flex-row sm:items-start sm:justify-between"
										key={item.id}
									>
										<div class="min-w-0 flex-1">
											<p class="break-words text-sm font-semibold text-[color:var(--app-ink)]">
												{item.title}
											</p>
											{item.detail ? (
												<p class="mt-1 break-words text-xs text-[color:var(--app-ink-muted)]">
													{item.detail}
												</p>
											) : null}
										</div>
										{item.onAction ? (
											<Button
												size="sm"
												type="button"
												variant="ghost"
												class="h-8 shrink-0 px-3 text-[11px]"
												disabled={isItemActionPending}
												onClick={() => void item.onAction?.()}
											>
												{isItemActionPending
													? "清理中..."
													: (item.actionLabel ?? "处理")}
											</Button>
										) : null}
									</li>
								);
							})}
						</ul>
						{confirmState.previewQuestion ? (
							<p class="mt-2 text-sm font-medium text-[color:var(--app-ink)]">
								{confirmState.previewQuestion}
							</p>
						) : null}
					</div>
				) : null}
				<DialogFooter>
					<Button size="sm" type="button" onClick={onClose}>
						取消
					</Button>
					<Button
						size="sm"
						variant={confirmState.tone === "error" ? "danger" : "primary"}
						type="button"
						disabled={confirmPending}
						onClick={onConfirm}
					>
						{confirmPending
							? "处理中..."
							: (confirmState.confirmLabel ?? "确认")}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
};
