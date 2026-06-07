#!/usr/bin/env node
import { existsSync } from "node:fs";
import path from "node:path";
import { Database } from "bun:sqlite";

const workerConfigPath = process.argv[2];

if (!workerConfigPath) {
	console.error("缺少 worker config 路径参数。");
	process.exit(1);
}

const configDir = path.dirname(path.resolve(workerConfigPath));
const dbPath = path.join(
	configDir,
	".wrangler",
	"state",
	"v3",
	"d1",
	"miniflare-D1DatabaseObject",
	"9ba2b04bf514d9facfd57ed57d849e77241a7adc99d1c1545d06688b43d84248.sqlite",
);

if (!existsSync(dbPath)) {
	process.exit(0);
}

const db = new Database(dbPath);

const hasTable = (tableName) =>
	Boolean(
		db
			.query(
				"SELECT name FROM sqlite_master WHERE type = 'table' AND name = ? LIMIT 1",
			)
			.get(tableName),
	);

const getColumns = (tableName) => {
	if (!hasTable(tableName)) {
		return new Set();
	}
	const rows = db.query(`PRAGMA table_info(${tableName})`).all();
	return new Set(rows.map((row) => String(row.name)));
};

const hasMigration = (name) =>
	Boolean(
		db.query("SELECT 1 FROM d1_migrations WHERE name = ? LIMIT 1").get(name),
	);

const addColumnIfMissing = (tableName, columnName, definition) => {
	if (!hasTable(tableName)) {
		return false;
	}
	const columns = getColumns(tableName);
	if (columns.has(columnName)) {
		return false;
	}
	db.exec(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${definition}`);
	return true;
};

const ensureIndex = (name, sql) => {
	db.exec(`CREATE INDEX IF NOT EXISTS ${name} ${sql}`);
};

const ensureIndexIfTableExists = (tableName, name, sql) => {
	if (!hasTable(tableName)) {
		return;
	}
	ensureIndex(name, sql);
};

const quoteSql = (value) => `'${String(value).replaceAll("'", "''")}'`;

const canonicalModelDefaults = [
	{
		canonicalModel: "openai/gpt-5",
		importRegex:
			"^(?:(?:cc|claude)-)?(?:openai[:/])?gpt-5(?:(?:-chat(?:-latest)?|-instant|-(?:high|low|medium)|-\\d{4}-\\d{2}-\\d{2}))?$",
	},
	{
		canonicalModel: "openai/gpt-5-mini",
		importRegex:
			"^(?:(?:cc|claude)-)?(?:openai[:/])?gpt-5-mini(?:-\\d{4}-\\d{2}-\\d{2})?$",
	},
	{
		canonicalModel: "openai/gpt-5-nano",
		importRegex:
			"^(?:(?:cc|claude)-)?(?:openai[:/])?gpt-5-nano(?:-\\d{4}-\\d{2}-\\d{2})?$",
	},
	{
		canonicalModel: "openai/gpt-5-codex",
		importRegex:
			"^(?:(?:cc|claude)-)?(?:openai[:/])?gpt-5-codex(?:(?:-(?:high|low|medium|spark))?(?:-openai-compact)?)?$",
	},
	{
		canonicalModel: "openai/gpt-5.3",
		importRegex:
			"^(?:(?:cc|claude)-)?(?:openai[:/])?gpt-5\\.3(?:(?:-chat(?:-latest)?|-instant|-(?:high|low|medium|xhigh|openai-compact)|\\((?:auto|high|low|medium|xhigh)\\)|-\\d{4}-\\d{2}-\\d{2}))*$",
	},
	{
		canonicalModel: "openai/gpt-oss-120b",
		importRegex: "^(?:openai/)?gpt-oss-120b$",
	},
	{
		canonicalModel: "openai/gpt-oss-20b",
		importRegex: "^(?:openai/)?gpt-oss-20b$",
	},
	{
		canonicalModel: "openai/gpt-4.1",
		importRegex: "^(?:openai/)?gpt-4\\.1(?:-\\d{4}-\\d{2}-\\d{2})?$",
	},
	{
		canonicalModel: "openai/gpt-4.1-mini",
		importRegex: "^(?:openai/)?gpt-4\\.1-mini(?:-\\d{4}-\\d{2}-\\d{2})?$",
	},
	{
		canonicalModel: "openai/gpt-4.1-nano",
		importRegex: "^(?:openai/)?gpt-4\\.1-nano(?:-\\d{4}-\\d{2}-\\d{2})?$",
	},
	{
		canonicalModel: "openai/gpt-4o",
		importRegex: "^(?:openai/)?gpt-4o(?:-\\d{4}-\\d{2}-\\d{2})?$",
	},
	{
		canonicalModel: "openai/gpt-4o-mini",
		importRegex: "^(?:openai/)?gpt-4o-mini(?:-\\d{4}-\\d{2}-\\d{2})?$",
	},
	{
		canonicalModel: "openai/chatgpt-4o-latest",
		importRegex: "^(?:openai/)?chatgpt-4o-latest$",
	},
	{
		canonicalModel: "openai/o1",
		importRegex: "^(?:openai/)?o1(?:-(?:mini|preview|pro))?$",
	},
	{
		canonicalModel: "openai/o3",
		importRegex: "^(?:openai/)?o3(?:-(?:mini|pro))?$",
	},
	{
		canonicalModel: "openai/o4-mini",
		importRegex: "^(?:openai/)?o4-mini$",
	},
	{
		canonicalModel: "anthropic/claude-sonnet-4",
		importRegex: "^(?:anthropic/)?claude-sonnet-4(?:-\\d{8})?(?:-thinking)?$",
	},
	{
		canonicalModel: "anthropic/claude-sonnet-4.5",
		importRegex:
			"^(?:anthropic/)?claude-sonnet-4(?:[.-]5)(?:-\\d{8})?(?:-thinking)?$",
	},
	{
		canonicalModel: "anthropic/claude-sonnet-4.6",
		importRegex:
			"^(?:anthropic/)?claude-sonnet-4(?:[.-]6)(?:-\\d{8})?(?:-thinking)?$",
	},
	{
		canonicalModel: "anthropic/claude-opus-4.1",
		importRegex:
			"^(?:anthropic/)?claude-opus-4(?:[.-]1)(?:-\\d{8})?(?:-thinking)?$",
	},
	{
		canonicalModel: "anthropic/claude-opus-4.5",
		importRegex:
			"^(?:anthropic/)?claude-opus-4(?:[.-]5)(?:-\\d{8})?(?:-(?:thinking|fast))?$",
	},
	{
		canonicalModel: "anthropic/claude-opus-4.6",
		importRegex:
			"^(?:anthropic/)?claude-opus-4(?:[.-]6)(?:-\\d{8})?(?:-(?:thinking|fast))?$",
	},
	{
		canonicalModel: "anthropic/claude-haiku-4.5",
		importRegex:
			"^(?:anthropic/)?claude-haiku-4(?:[.-]5)(?:-\\d{8})?(?:-thinking)?$",
	},
	{
		canonicalModel: "google/gemini-2.5-pro",
		importRegex: "^(?:google/)?gemini-2\\.5-pro(?:-preview(?:-[\\d-]+)?)?$",
	},
	{
		canonicalModel: "google/gemini-2.5-flash",
		importRegex: "^(?:google/)?gemini-2\\.5-flash(?:-preview(?:-[\\d-]+)?)?$",
	},
	{
		canonicalModel: "google/gemini-2.5-flash-lite",
		importRegex:
			"^(?:google/)?gemini-2\\.5-flash-lite(?:-preview(?:-[\\d-]+)?)?$",
	},
	{
		canonicalModel: "google/gemini-3-pro-preview",
		importRegex: "^(?:google/)?gemini-3-pro-preview(?:[-:][\\w.-]+)?$",
	},
	{
		canonicalModel: "google/gemini-3-flash-preview",
		importRegex: "^(?:google/)?gemini-3-flash-preview(?:[-:][\\w.-]+)?$",
	},
	{
		canonicalModel: "google/gemini-3.1-pro",
		importRegex: "^(?:google/)?gemini-3\\.1-pro$",
	},
	{
		canonicalModel: "google/gemini-3.1-pro-preview",
		importRegex: "^(?:google/)?gemini-3\\.1-pro-preview(?:[-:][\\w.-]+)?$",
	},
	{
		canonicalModel: "google/gemini-3.1-flash-lite",
		importRegex: "^(?:google/)?gemini-3\\.1-flash-lite(?:-[\\w.-]+)?$",
	},
	{
		canonicalModel: "google/gemini-3.5-flash",
		importRegex: "^(?:google/)?gemini-3\\.5-flash$",
	},
	{
		canonicalModel: "google/gemma-7b",
		importRegex:
			"^(?:@hf/google/|@cf/google/|google/)?gemma-7b(?:-it(?:-lora)?)?$",
	},
	{
		canonicalModel: "google/gemma-2-27b",
		importRegex:
			"^(?:@hf/google/|@cf/google/|google/)?gemma-2-27b(?:-it(?:-lora)?)?$",
	},
	{
		canonicalModel: "google/gemma-4-31b",
		importRegex:
			"^(?:@hf/google/|@cf/google/|google/)?gemma-4-31b(?:-[\\w.-]+)?$",
	},
	{
		canonicalModel: "deepseek/deepseek-chat",
		importRegex:
			"^(?:deepseek/)?deepseek-chat(?:-v3(?:[-.]\\d+)?(?:-\\d{4})?)?$",
	},
	{
		canonicalModel: "deepseek/deepseek-reasoner",
		importRegex: "^(?:deepseek/)?deepseek-reasoner$",
	},
	{
		canonicalModel: "deepseek/deepseek-r1",
		importRegex:
			"^(?:deepseek/)?deepseek-r1(?:-\\d{4})?(?:-distill-(?:llama|qwen)-\\d+b)?$",
	},
	{
		canonicalModel: "deepseek/deepseek-v3",
		importRegex: "^(?:deepseek/)?deepseek-v3(?:-\\d{4})?$",
	},
	{
		canonicalModel: "deepseek/deepseek-v3.1",
		importRegex: "^(?:deepseek/)?deepseek-v3\\.1(?:-terminus)?$",
	},
	{
		canonicalModel: "deepseek/deepseek-v3.2",
		importRegex: "^(?:deepseek/)?deepseek-v3\\.2(?:-(?:exp|think|reasoner))?$",
	},
	{
		canonicalModel: "deepseek/deepseek-v4-flash",
		importRegex: "^(?:deepseek/)?deepseek-v4-flash$",
	},
	{
		canonicalModel: "deepseek/deepseek-v4-pro",
		importRegex: "^(?:deepseek/)?deepseek-v4-pro$",
	},
	{
		canonicalModel: "alibaba/qwen-max",
		importRegex: "^(?:alibaba/)?qwen-max(?:-\\d{4}-\\d{2}-\\d{2})?$",
	},
	{
		canonicalModel: "alibaba/qwen-plus",
		importRegex: "^(?:alibaba/)?qwen-plus(?:-\\d{4}-\\d{2}-\\d{2})?$",
	},
	{
		canonicalModel: "alibaba/qwen3-coder-plus",
		importRegex: "^(?:alibaba/)?qwen3-coder-plus(?:-[\\w.-]+)?$",
	},
	{
		canonicalModel: "alibaba/qwen3-coder",
		importRegex: "^(?:alibaba/)?qwen3-coder(?:-(?!plus\\b)[\\w.-]+)?$",
	},
	{
		canonicalModel: "alibaba/qwen3.5-397b-a17b",
		importRegex: "^(?:alibaba/)?qwen3\\.5-397b-a17b$",
	},
	{
		canonicalModel: "alibaba/qwen3-next-80b-a3b",
		importRegex: "^(?:alibaba/)?qwen3-next-80b-a3b$",
	},
	{
		canonicalModel: "moonshot/kimi-k2",
		importRegex:
			"^(?:moonshot/)?kimi-k2(?:-(?:thinking|instruct(?:-[\\w.-]+)?))?$",
	},
	{
		canonicalModel: "moonshot/kimi-k2.5",
		importRegex: "^(?:moonshot/)?kimi-k2\\.5$",
	},
	{
		canonicalModel: "moonshot/kimi-k2.6",
		importRegex: "^(?:moonshot/)?kimi-k2\\.6$",
	},
	{
		canonicalModel: "moonshot/moonshot-v1-8k",
		importRegex: "^(?:moonshot/)?moonshot-v1-8k$",
	},
	{
		canonicalModel: "zhipu/glm-4.5",
		importRegex: "^(?:(?:zhipu|z-ai)/)?glm-4\\.5$",
	},
	{
		canonicalModel: "zhipu/glm-4.5-air",
		importRegex: "^(?:(?:zhipu|z-ai)/)?glm-4\\.5-air$",
	},
	{
		canonicalModel: "zhipu/glm-4.6",
		importRegex: "^(?:(?:zhipu|z-ai)/)?glm-4\\.6$",
	},
	{
		canonicalModel: "zhipu/glm-4.6v",
		importRegex: "^(?:(?:zhipu|z-ai)/)?glm-4\\.6v$",
	},
	{
		canonicalModel: "zhipu/glm-4.7",
		importRegex: "^(?:(?:zhipu|z-ai)/)?glm-4\\.7(?:-flash)?$",
	},
	{
		canonicalModel: "zhipu/glm-5",
		importRegex: "^(?:(?:zhipu|z-ai)/)?glm-5(?:-turbo)?$",
	},
	{
		canonicalModel: "zhipu/glm-5.1",
		importRegex: "^(?:(?:zhipu|z-ai)/)?glm-5\\.1$",
	},
	{
		canonicalModel: "zhipu/glm-5v-turbo",
		importRegex: "^(?:(?:zhipu|z-ai)/)?glm-5v-turbo$",
	},
	{
		canonicalModel: "x-ai/grok-3",
		importRegex: "^(?:x-ai/)?grok-3(?:-(?:thinking|mini|fast|expert))?$",
	},
	{
		canonicalModel: "x-ai/grok-4",
		importRegex: "^(?:x-ai/)?grok-4(?:-(?:thinking|mini|fast|expert|heavy))?$",
	},
	{
		canonicalModel: "x-ai/grok-4.1",
		importRegex: "^(?:x-ai/)?grok-4\\.1(?:-(?:thinking|expert|fast|mini))?$",
	},
	{
		canonicalModel: "x-ai/grok-4.2",
		importRegex: "^(?:x-ai/)?grok-4\\.2(?:-[\\w.-]+)?$",
	},
	{
		canonicalModel: "x-ai/grok-4.20",
		importRegex: "^(?:x-ai/)?grok-4\\.20(?:-[\\w.-]+)?$",
	},
	{
		canonicalModel: "x-ai/grok-4.3",
		importRegex: "^(?:x-ai/)?grok-4\\.3$",
	},
	{
		canonicalModel: "minimax/minimax-m2.5",
		importRegex: "^(?:minimax/)?minimax-m2\\.5(?:-highspeed)?$",
	},
	{
		canonicalModel: "minimax/minimax-m2.7",
		importRegex: "^(?:minimax/)?minimax-m2\\.7(?:-highspeed)?$",
	},
];

const legacyCanonicalRegexResets = [
	{
		canonicalModel: "anthropic/claude-opus-4-20250514",
		importRegex: "^(?:anthropic/)?claude-opus-4-20250514$",
	},
	{
		canonicalModel: "anthropic/claude-sonnet-4-20250514",
		importRegex: "^(?:anthropic/)?claude-sonnet-4-20250514$",
	},
];

const legacyDefaultRegexUpgrades = new Map([
	[
		"openai/gpt-5",
		"^(?:openai/)?gpt-5(?:\\.\\d+)?(?:-chat(?:-latest)?)?(?:-\\d{4}-\\d{2}-\\d{2})?$",
	],
	[
		"openai/gpt-5-mini",
		"^(?:openai/)?gpt-5(?:\\.\\d+)?-mini(?:-\\d{4}-\\d{2}-\\d{2})?$",
	],
	[
		"openai/gpt-5-nano",
		"^(?:openai/)?gpt-5(?:\\.\\d+)?-nano(?:-\\d{4}-\\d{2}-\\d{2})?$",
	],
	[
		"openai/gpt-5-codex",
		"^(?:openai/)?gpt-5(?:\\.\\d+)?-codex(?:-(?:mini|max|spark))?$",
	],
	[
		"google/gemini-2.5-pro",
		"^(?:google/)?gemini-2\\.5-pro(?:-preview(?:-\\d{2}-\\d{2})?)?$",
	],
	[
		"google/gemini-3-pro-preview",
		"^(?:google/)?gemini-3-pro-preview(?:-[\\w.-]+)?$",
	],
	[
		"google/gemini-3-flash-preview",
		"^(?:google/)?gemini-3-flash-preview(?:-[\\w.-]+)?$",
	],
	[
		"google/gemini-3.1-pro-preview",
		"^(?:google/)?gemini-3\\.1-pro-preview(?:-[\\w.-]+)?$",
	],
	[
		"google/gemini-2.5-flash",
		"^(?:google/)?gemini-2\\.5-flash(?:-preview(?:-\\d{2}-\\d{2})?)?$",
	],
	["google/gemma-7b", "^(?:@hf/google/|google/)?gemma-7b(?:-it)?$"],
	["moonshot/kimi-k2", "^(?:moonshot/)?kimi-k2$"],
	["alibaba/qwen3-coder", "^(?:alibaba/)?qwen3-coder(?:-[\\w.-]+)?$"],
]);

const buildRegistrySeedValues = () =>
	canonicalModelDefaults
		.map(
			({ canonicalModel, importRegex }) =>
				`(${quoteSql(canonicalModel)}, ${quoteSql(canonicalModel)}, NULL, ${quoteSql(importRegex)}, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
		)
		.join(",\n\t\t\t");

const buildAliasSeedValues = () =>
	canonicalModelDefaults
		.map(
			({ canonicalModel }) =>
				`(${quoteSql(canonicalModel)}, '', ${quoteSql(canonicalModel)}, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
		)
		.join(",\n\t\t\t");

const buildImportRegexUpdateCase = () =>
	[
		"WHEN model_registry.import_regex IS NULL OR TRIM(model_registry.import_regex) = '' THEN excluded.import_regex",
		...Array.from(legacyDefaultRegexUpgrades.entries()).map(
			([canonicalModel, importRegex]) =>
				`WHEN model_registry.canonical_model = ${quoteSql(canonicalModel)} AND model_registry.import_regex = ${quoteSql(importRegex)} THEN excluded.import_regex`,
		),
	].join("\n\t\t\t\t");

const buildUpdatedAtCase = () =>
	[
		"WHEN model_registry.import_regex IS NULL OR TRIM(model_registry.import_regex) = '' THEN excluded.updated_at",
		...Array.from(legacyDefaultRegexUpgrades.entries()).map(
			([canonicalModel, importRegex]) =>
				`WHEN model_registry.canonical_model = ${quoteSql(canonicalModel)} AND model_registry.import_regex = ${quoteSql(importRegex)} THEN excluded.updated_at`,
		),
	].join("\n\t\t\t\t");

const insertRegistryRowsFromTable = (tableName) => {
	if (!hasTable(tableName)) {
		return;
	}
	db.exec(`
		INSERT OR IGNORE INTO model_registry (canonical_model, display_name, provider_hint, created_at, updated_at)
		SELECT DISTINCT
			canonical_model,
			canonical_model,
			NULL,
			CURRENT_TIMESTAMP,
			CURRENT_TIMESTAMP
		FROM ${tableName}
		WHERE canonical_model IS NOT NULL AND TRIM(canonical_model) != '';
	`);
};

const insertAliasRowsFromTableColumn = (tableName, columnName) => {
	if (!hasTable(tableName)) {
		return;
	}
	db.exec(`
		INSERT OR IGNORE INTO model_aliases (alias, provider_hint, canonical_model, created_at, updated_at)
		SELECT DISTINCT
			LOWER(TRIM(${columnName})) AS alias,
			'' AS provider_hint,
			canonical_model,
			CURRENT_TIMESTAMP,
			CURRENT_TIMESTAMP
		FROM ${tableName}
		WHERE ${columnName} IS NOT NULL
			AND TRIM(${columnName}) != ''
			AND canonical_model IS NOT NULL
			AND TRIM(canonical_model) != '';
	`);
};

const seedCanonicalModelDefaults = () => {
	db.exec(`
		UPDATE usage_logs
		SET canonical_model = 'anthropic/claude-sonnet-4'
		WHERE canonical_model = 'anthropic/claude-sonnet-4-20250514';
	`);

	db.exec(`
		UPDATE attempt_events
		SET canonical_model = 'anthropic/claude-sonnet-4'
		WHERE canonical_model = 'anthropic/claude-sonnet-4-20250514';
	`);

	if (hasTable("model_prices")) {
		db.exec(`
			UPDATE model_prices
			SET canonical_model = 'anthropic/claude-sonnet-4'
			WHERE canonical_model = 'anthropic/claude-sonnet-4-20250514';
		`);
	}

	if (hasTable("channel_model_capabilities")) {
		db.exec(`
			UPDATE channel_model_capabilities
			SET canonical_model = 'anthropic/claude-sonnet-4'
			WHERE canonical_model = 'anthropic/claude-sonnet-4-20250514';
		`);
	}

	if (hasTable("model_aliases")) {
		db.exec(`
			UPDATE model_aliases
			SET canonical_model = 'anthropic/claude-sonnet-4', updated_at = CURRENT_TIMESTAMP
			WHERE canonical_model = 'anthropic/claude-sonnet-4-20250514';
		`);
	}

	for (const item of legacyCanonicalRegexResets) {
		db.exec(`
			UPDATE model_registry
			SET import_regex = NULL, updated_at = CURRENT_TIMESTAMP
			WHERE
				canonical_model = ${quoteSql(item.canonicalModel)}
				AND import_regex = ${quoteSql(item.importRegex)};
		`);
	}

	db.exec(`
		DELETE FROM model_registry
		WHERE
			canonical_model = 'anthropic/claude-sonnet-4-20250514'
			AND (
				import_regex IS NULL
				OR TRIM(import_regex) = ''
				OR import_regex = '^(?:anthropic/)?claude-sonnet-4-20250514$'
			);
	`);

	db.exec(`
		INSERT INTO model_registry (canonical_model, display_name, provider_hint, import_regex, created_at, updated_at)
		VALUES
			${buildRegistrySeedValues()}
		ON CONFLICT(canonical_model) DO UPDATE SET
			import_regex = CASE
				${buildImportRegexUpdateCase()}
				ELSE model_registry.import_regex
			END,
			updated_at = CASE
				${buildUpdatedAtCase()}
				ELSE model_registry.updated_at
			END;
	`);

	db.exec(`
		INSERT OR IGNORE INTO model_aliases (alias, provider_hint, canonical_model, created_at, updated_at)
		VALUES
			${buildAliasSeedValues()};
	`);
};

const migration0021 = "0021_add_model_registry.sql";
const migration0022 = "0022_add_model_registry_import_regex.sql";
const migration0023 = "0023_seed_canonical_model_defaults.sql";
const migration0024 = "0024_refresh_canonical_model_defaults.sql";

if (
	hasMigration(migration0021) &&
	hasMigration(migration0022) &&
	hasMigration(migration0023) &&
	hasMigration(migration0024)
) {
	process.exit(0);
}

let changed = false;

db.exec("BEGIN");
try {
	db.exec(`
		CREATE TABLE IF NOT EXISTS model_registry (
			canonical_model TEXT PRIMARY KEY,
			display_name TEXT NOT NULL,
			provider_hint TEXT,
			import_regex TEXT,
			created_at TEXT NOT NULL,
			updated_at TEXT NOT NULL
		);
	`);

	db.exec(`
		CREATE TABLE IF NOT EXISTS model_aliases (
			alias TEXT NOT NULL,
			provider_hint TEXT NOT NULL DEFAULT '',
			canonical_model TEXT NOT NULL,
			created_at TEXT NOT NULL,
			updated_at TEXT NOT NULL,
			PRIMARY KEY (alias, provider_hint)
		);
	`);

	ensureIndex(
		"idx_model_aliases_canonical_model",
		"ON model_aliases (canonical_model)",
	);

	changed =
		addColumnIfMissing("usage_logs", "canonical_model", "TEXT") || changed;
	changed =
		addColumnIfMissing("usage_logs", "request_model_raw", "TEXT") || changed;
	changed =
		addColumnIfMissing("usage_logs", "upstream_model_raw", "TEXT") || changed;

	changed =
		addColumnIfMissing("attempt_events", "canonical_model", "TEXT") || changed;
	changed =
		addColumnIfMissing("attempt_events", "request_model_raw", "TEXT") ||
		changed;
	changed =
		addColumnIfMissing("attempt_events", "upstream_model_raw", "TEXT") ||
		changed;

	changed =
		addColumnIfMissing("model_prices", "canonical_model", "TEXT") || changed;
	changed =
		addColumnIfMissing(
			"channel_model_capabilities",
			"canonical_model",
			"TEXT",
		) || changed;
	changed =
		addColumnIfMissing("model_registry", "import_regex", "TEXT") || changed;

	db.exec(`
		UPDATE usage_logs
		SET
			canonical_model = COALESCE(NULLIF(TRIM(canonical_model), ''), LOWER(TRIM(model))),
			request_model_raw = COALESCE(NULLIF(TRIM(request_model_raw), ''), model),
			upstream_model_raw = COALESCE(NULLIF(TRIM(upstream_model_raw), ''), model)
		WHERE
			canonical_model IS NULL
			OR request_model_raw IS NULL
			OR upstream_model_raw IS NULL;
	`);

	db.exec(`
		UPDATE attempt_events
		SET
			canonical_model = COALESCE(NULLIF(TRIM(canonical_model), ''), LOWER(TRIM(model))),
			request_model_raw = COALESCE(NULLIF(TRIM(request_model_raw), ''), model),
			upstream_model_raw = COALESCE(NULLIF(TRIM(upstream_model_raw), ''), model)
		WHERE
			canonical_model IS NULL
			OR request_model_raw IS NULL
			OR upstream_model_raw IS NULL;
	`);

	if (hasTable("model_prices")) {
		db.exec(`
			UPDATE model_prices
			SET canonical_model = COALESCE(
				NULLIF(TRIM(canonical_model), ''),
				LOWER(TRIM(COALESCE(model_name, model_pattern)))
			)
			WHERE canonical_model IS NULL;
		`);
	}

	if (hasTable("channel_model_capabilities")) {
		db.exec(`
			UPDATE channel_model_capabilities
			SET canonical_model = COALESCE(NULLIF(TRIM(canonical_model), ''), LOWER(TRIM(model)))
			WHERE canonical_model IS NULL;
		`);
	}

	insertRegistryRowsFromTable("usage_logs");
	insertRegistryRowsFromTable("attempt_events");
	insertRegistryRowsFromTable("model_prices");
	insertRegistryRowsFromTable("channel_model_capabilities");

	insertAliasRowsFromTableColumn("usage_logs", "model");
	insertAliasRowsFromTableColumn("usage_logs", "request_model_raw");
	insertAliasRowsFromTableColumn("usage_logs", "upstream_model_raw");
	insertAliasRowsFromTableColumn("attempt_events", "model");
	insertAliasRowsFromTableColumn("attempt_events", "request_model_raw");
	insertAliasRowsFromTableColumn("attempt_events", "upstream_model_raw");
	insertAliasRowsFromTableColumn("model_prices", "model_pattern");
	insertAliasRowsFromTableColumn("model_prices", "model_name");
	insertAliasRowsFromTableColumn("channel_model_capabilities", "model");

	ensureIndexIfTableExists(
		"usage_logs",
		"idx_usage_logs_canonical_model",
		"ON usage_logs (canonical_model)",
	);
	ensureIndexIfTableExists(
		"usage_logs",
		"idx_usage_logs_canonical_model_created_at",
		"ON usage_logs (canonical_model, created_at)",
	);
	ensureIndexIfTableExists(
		"attempt_events",
		"idx_attempt_events_canonical_model",
		"ON attempt_events (canonical_model)",
	);
	ensureIndexIfTableExists(
		"model_prices",
		"idx_model_prices_canonical_model",
		"ON model_prices (canonical_model)",
	);
	ensureIndexIfTableExists(
		"channel_model_capabilities",
		"idx_channel_model_capabilities_canonical_model",
		"ON channel_model_capabilities (canonical_model)",
	);
	seedCanonicalModelDefaults();

	db.query("INSERT OR IGNORE INTO d1_migrations (name) VALUES (?)").run(
		migration0021,
	);
	db.query("INSERT OR IGNORE INTO d1_migrations (name) VALUES (?)").run(
		migration0022,
	);
	db.query("INSERT OR IGNORE INTO d1_migrations (name) VALUES (?)").run(
		migration0023,
	);
	db.query("INSERT OR IGNORE INTO d1_migrations (name) VALUES (?)").run(
		migration0024,
	);
	db.exec("COMMIT");
	if (changed) {
		console.log(
			`已修复本地 D1 半成功迁移状态: ${migration0021}, ${migration0022}, ${migration0023}, ${migration0024}`,
		);
	}
} catch (error) {
	db.exec("ROLLBACK");
	throw error;
} finally {
	db.close();
}
