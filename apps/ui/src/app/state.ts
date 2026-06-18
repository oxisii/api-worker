import { initialSettingsForm } from "../core/constants";
import type {
	BackupSettings,
	CanonicalModelSyncResult,
	DashboardQuery,
	NoticeTone,
	Settings,
	SettingsForm,
	SiteVerificationResult,
	UsageQuery,
} from "../core/types";

const canonicalModelSyncResultStorageKey = "canonical-models:sync-result";

export const loadCanonicalModelSyncResult =
	(): CanonicalModelSyncResult | null => {
		if (typeof window === "undefined") {
			return null;
		}
		try {
			const raw = window.localStorage.getItem(
				canonicalModelSyncResultStorageKey,
			);
			if (!raw) {
				return null;
			}
			const parsed = JSON.parse(raw);
			if (!parsed || typeof parsed !== "object") {
				return null;
			}
			if (
				!("runs_at" in parsed) ||
				!("conflicts" in parsed) ||
				!("invalid_rules" in parsed) ||
				!("imported_items" in parsed)
			) {
				return null;
			}
			return parsed as CanonicalModelSyncResult;
		} catch (_error) {
			return null;
		}
	};

export const persistCanonicalModelSyncResult = (
	result: CanonicalModelSyncResult | null,
) => {
	if (typeof window === "undefined") {
		return;
	}
	if (!result) {
		window.localStorage.removeItem(canonicalModelSyncResultStorageKey);
		return;
	}
	window.localStorage.setItem(
		canonicalModelSyncResultStorageKey,
		JSON.stringify(result),
	);
};

export type ConfirmState = {
	title: string;
	message: string;
	previewItems?: Array<{
		id: string;
		title: string;
		detail?: string;
		actionLabel?: string;
		actionKey?: string;
		onAction?: () => Promise<void> | void;
	}>;
	previewSummary?: string;
	previewQuestion?: string;
	confirmLabel?: string;
	tone?: NoticeTone;
	onConfirm: () => Promise<void> | void;
};

export type SiteVerificationDialogState = {
	title: string;
	result: SiteVerificationResult;
};

export type EditableBackupSettings = Pick<
	BackupSettings,
	| "enabled"
	| "schedule_time"
	| "sync_mode"
	| "conflict_policy"
	| "import_mode"
	| "webdav_url"
	| "webdav_username"
	| "webdav_password"
	| "webdav_path"
	| "keep_versions"
>;

export const pickEditableBackupSettings = (
	settings: BackupSettings,
): EditableBackupSettings => ({
	enabled: settings.enabled,
	schedule_time: settings.schedule_time,
	sync_mode: settings.sync_mode,
	conflict_policy: settings.conflict_policy,
	import_mode: settings.import_mode,
	webdav_url: settings.webdav_url,
	webdav_username: settings.webdav_username,
	webdav_password: settings.webdav_password,
	webdav_path: settings.webdav_path,
	keep_versions: settings.keep_versions,
});

export const initialUsageQuery: UsageQuery = {
	channel_ids: [],
	token_ids: [],
	models: [],
	statuses: [],
	from: "",
	to: "",
};

export const buildRecommendedSettingsForm = (
	currentAdminPassword: string,
): SettingsForm => ({
	...initialSettingsForm,
	admin_password: currentAdminPassword,
	channel_disable_error_codes: [
		...initialSettingsForm.channel_disable_error_codes,
	],
	proxy_retry_sleep_error_codes: [
		...initialSettingsForm.proxy_retry_sleep_error_codes,
	],
	proxy_retry_return_error_codes: [
		...initialSettingsForm.proxy_retry_return_error_codes,
	],
	proxy_retry_max_retries: "3",
	channel_recovery_probe_enabled: true,
});

export const buildSettingsFormFromSettings = (
	settings: Settings,
): SettingsForm => {
	const runtimeSettings = settings.runtime_settings ?? settings.runtime_config;
	return {
		log_retention_days: String(settings.log_retention_days ?? 30),
		session_ttl_hours: String(settings.session_ttl_hours ?? 12),
		admin_password: "",
		checkin_schedule_time: settings.checkin_schedule_time ?? "00:10",
		channel_refresh_enabled: settings.channel_refresh_enabled ?? false,
		channel_refresh_schedule_time:
			settings.channel_refresh_schedule_time ?? "02:40",
		channel_recovery_probe_enabled:
			settings.channel_recovery_probe_enabled ?? false,
		channel_recovery_probe_schedule_time:
			settings.channel_recovery_probe_schedule_time ?? "03:10",
		proxy_model_failure_cooldown_minutes: String(
			runtimeSettings?.model_failure_cooldown_minutes ?? 720,
		),
		proxy_model_failure_cooldown_threshold: String(
			runtimeSettings?.model_failure_cooldown_threshold ?? 3,
		),
		channel_disable_error_codes:
			runtimeSettings?.channel_disable_error_codes ?? [
				"account_deactivated",
				"insufficient_balance",
				"insufficient_user_quota",
				"permission_error",
			],
		channel_disable_error_threshold: String(
			runtimeSettings?.channel_disable_error_threshold ?? 3,
		),
		channel_disable_error_code_minutes: String(
			runtimeSettings?.channel_disable_error_code_minutes ?? 1440,
		),
		proxy_upstream_timeout_ms: String(
			runtimeSettings?.upstream_timeout_ms ?? 180000,
		),
		proxy_retry_max_retries: String(runtimeSettings?.retry_max_retries ?? 5),
		proxy_retry_sleep_ms: String(runtimeSettings?.retry_sleep_ms ?? 500),
		proxy_retry_sleep_error_codes: runtimeSettings?.retry_sleep_error_codes ?? [
			"system_cpu_overloaded",
			"system_disk_overloaded",
		],
		proxy_retry_return_error_codes:
			runtimeSettings?.retry_return_error_codes ?? [
				"no_available_channels",
				"upstream_cooldown",
				"responses_previous_response_id_required",
				"responses_affinity_missing",
				"responses_affinity_channel_disabled",
				"responses_affinity_channel_not_allowed",
				"responses_affinity_channel_model_unavailable",
				"responses_affinity_channel_cooldown",
				"responses_tool_call_chain_mismatch",
				"invalid_encrypted_content",
				"invalid_function_parameters",
			],
		proxy_zero_completion_as_error_enabled:
			runtimeSettings?.zero_completion_as_error_enabled ?? true,
		proxy_stream_usage_mode: runtimeSettings?.stream_usage_mode ?? "lite",
		proxy_stream_usage_max_parsers: String(
			runtimeSettings?.stream_usage_max_parsers ?? 0,
		),
		proxy_stream_usage_parse_timeout_ms: String(
			runtimeSettings?.stream_usage_parse_timeout_ms ?? 0,
		),
		proxy_responses_affinity_ttl_seconds: String(
			runtimeSettings?.responses_affinity_ttl_seconds ?? 86400,
		),
		proxy_stream_options_capability_ttl_seconds: String(
			runtimeSettings?.stream_options_capability_ttl_seconds ?? 604800,
		),
		proxy_attempt_worker_fallback_enabled:
			runtimeSettings?.attempt_worker_fallback_enabled ?? true,
		proxy_attempt_worker_fallback_threshold: String(
			runtimeSettings?.attempt_worker_fallback_threshold ?? 3,
		),
		proxy_large_request_offload_threshold_bytes: String(
			runtimeSettings?.large_request_offload_threshold_bytes ?? 32768,
		),
		site_task_concurrency: String(runtimeSettings?.site_task_concurrency ?? 4),
		site_task_timeout_ms: String(
			runtimeSettings?.site_task_timeout_ms ?? 12000,
		),
		site_task_fallback_enabled:
			runtimeSettings?.site_task_fallback_enabled ?? true,
		site_verification_model_limit: String(
			runtimeSettings?.verification_model_limit ??
				settings.site_verification_model_limit ??
				3,
		),
		pricing_sync_enabled: settings.pricing_settings?.sync_enabled ?? false,
		pricing_sync_schedule_time:
			settings.pricing_settings?.sync_schedule_time ?? "04:40",
		pricing_sync_sources: settings.pricing_settings?.sync_sources ?? [
			"openai",
			"anthropic",
			"gemini",
			"deepseek",
			"qwen",
			"moonshot",
			"zhipu",
			"openrouter",
		],
		pricing_default_markup: String(
			settings.pricing_settings?.default_markup ?? 1,
		),
		pricing_currency: settings.pricing_settings?.currency ?? "CNY",
		pricing_usd_cny_rate: String(
			settings.pricing_settings?.usd_cny_rate ?? 7.2,
		),
	};
};

const isSettingsFormValueEqual = (
	left: SettingsForm[keyof SettingsForm],
	right: SettingsForm[keyof SettingsForm],
) => {
	if (Array.isArray(left) || Array.isArray(right)) {
		return JSON.stringify(left) === JSON.stringify(right);
	}
	return left === right;
};

export const mergeSettingsFormWithSnapshot = (
	currentForm: SettingsForm,
	previousSnapshot: SettingsForm,
	nextSnapshot: SettingsForm,
): SettingsForm => {
	const nextForm = { ...currentForm } as SettingsForm;
	for (const key of Object.keys(nextSnapshot) as Array<keyof SettingsForm>) {
		if (isSettingsFormValueEqual(currentForm[key], previousSnapshot[key])) {
			(
				nextForm as Record<keyof SettingsForm, SettingsForm[keyof SettingsForm]>
			)[key] = nextSnapshot[key];
		}
	}
	return nextForm;
};

export const initialDashboardQueryForState = (
	query: DashboardQuery,
): DashboardQuery => query;
