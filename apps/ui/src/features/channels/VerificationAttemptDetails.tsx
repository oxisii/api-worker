import {
	getRequestEntryFormatLabel,
	getVerificationAttemptStatusLabel,
	getVerificationAttemptSummary,
	getVerificationAttempts,
} from "../../core/sites";
import type { SiteVerificationResult } from "../../core/types";

export const VerificationAttemptDetails = ({
	item,
}: {
	item: SiteVerificationResult;
}) => {
	const summary = getVerificationAttemptSummary(item);
	const attempts = getVerificationAttempts(item);
	return (
		<div class="space-y-2 rounded-lg bg-slate-50/80 px-2.5 py-2">
			<p class="text-[11px] font-semibold leading-5 text-[color:var(--app-ink-muted)]">
				尝试记录
			</p>
			<p class="break-words text-[11px] leading-5 text-[color:var(--app-ink-muted)]">
				模型：{summary.models.length > 0 ? summary.models.join("、") : "-"}
			</p>
			<p class="break-words text-[11px] leading-5 text-[color:var(--app-ink-muted)]">
				格式：{summary.formats.length > 0 ? summary.formats.join("、") : "-"}
			</p>
			{attempts.length > 0 ? (
				<div class="max-h-36 space-y-1 overflow-y-auto pr-1">
					{attempts.map((attempt, index) => (
						<p
							class="break-words text-[11px] leading-5 text-[color:var(--app-ink-muted)]"
							key={`${item.site_id}:attempt:${index}`}
						>
							第 {index + 1} 次 ·
							{getVerificationAttemptStatusLabel(attempt.status)} ·
							{attempt.request_entry_format
								? getRequestEntryFormatLabel(attempt.request_entry_format)
								: attempt.endpoint_type}{" "}
							· HTTP {attempt.http_status ?? "-"} ·{attempt.model ?? "-"}
							{attempt.request_model && attempt.request_model !== attempt.model
								? ` -> ${attempt.request_model}`
								: ""}
							{attempt.detail_code ? ` · ${attempt.detail_code}` : ""}
							{attempt.detail_message ? ` · ${attempt.detail_message}` : ""}
						</p>
					))}
				</div>
			) : null}
		</div>
	);
};
