import { Button, Card, Input } from "../../components/ui";
import type { NoticeMessage } from "../../core/types";

type LoginViewProps = {
	notice: NoticeMessage | null;
	isSubmitting: boolean;
	onSubmit: (event: Event) => void;
};

/**
 * Renders the admin login view.
 *
 * Args:
 *   props: Login view props.
 *
 * Returns:
 *   Login JSX element.
 */
export const LoginView = ({
	notice,
	isSubmitting,
	onSubmit,
}: LoginViewProps) => {
	const toneStyles: Record<NoticeMessage["tone"], string> = {
		success: "app-notice app-notice--success",
		warning: "app-notice app-notice--warning",
		error: "app-notice app-notice--error",
		info: "app-notice app-notice--info",
	};
	return (
		<div class="flex min-h-screen items-center justify-center px-4 py-10">
			<Card class="app-login-card animate-fade-up p-8 sm:p-10">
				<div class="app-login-badge mb-4 w-max">
					<span aria-hidden="true" class="app-login-badge__dot" />
					SwiftUI Style
				</div>
				<h1 class="app-title mb-2 text-3xl">api-workers</h1>
				<p class="text-sm text-[color:var(--app-ink-muted)]">
					欢迎回来，输入管理员密码进入控制台。
				</p>
				<form class="mt-7 grid gap-4" onSubmit={onSubmit}>
					<div>
						<label
							class="mb-1.5 block text-xs uppercase tracking-widest text-[color:var(--app-ink-muted)]"
							for="password"
						>
							管理员密码
						</label>
						<Input id="password" name="password" type="password" required />
					</div>
					<Button
						variant="primary"
						size="lg"
						type="submit"
						disabled={isSubmitting}
					>
						{isSubmitting ? "登录中..." : "登录"}
					</Button>
				</form>
				<p class="mt-4 text-xs text-[color:var(--app-ink-muted)]">
					支持回车快捷提交。
				</p>
				{notice && (
					<div class={`mt-4 ${toneStyles[notice.tone]}`}>{notice.message}</div>
				)}
			</Card>
		</div>
	);
};
