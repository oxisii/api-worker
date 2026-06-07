UPDATE model_registry
SET import_regex = '^(?:(?:cc|claude)-)?(?:openai[:/])?gpt-5(?:(?:-chat(?:-latest)?|-instant|-(?:high|low|medium)|-\d{4}-\d{2}-\d{2}))?$',
    updated_at = CURRENT_TIMESTAMP
WHERE canonical_model = 'openai/gpt-5';

UPDATE model_registry
SET import_regex = '^(?:(?:cc|claude)-)?(?:openai[:/])?gpt-5-mini(?:-\d{4}-\d{2}-\d{2})?$',
    updated_at = CURRENT_TIMESTAMP
WHERE canonical_model = 'openai/gpt-5-mini';

UPDATE model_registry
SET import_regex = '^(?:(?:cc|claude)-)?(?:openai[:/])?gpt-5-nano(?:-\d{4}-\d{2}-\d{2})?$',
    updated_at = CURRENT_TIMESTAMP
WHERE canonical_model = 'openai/gpt-5-nano';

UPDATE model_registry
SET import_regex = '^(?:(?:cc|claude)-)?(?:openai[:/])?gpt-5-pro(?:-\d{4}-\d{2}-\d{2})?$',
    updated_at = CURRENT_TIMESTAMP
WHERE canonical_model = 'openai/gpt-5-pro';

UPDATE model_registry
SET import_regex = '^(?:(?:cc|claude)-)?(?:openai[:/])?gpt-5-codex(?:(?:-(?:high|low|medium|spark))?(?:-openai-compact)?)?$',
    updated_at = CURRENT_TIMESTAMP
WHERE canonical_model = 'openai/gpt-5-codex';

UPDATE model_registry
SET import_regex = '^(?:(?:cc|claude)-)?(?:openai[:/])?gpt-5-codex-mini(?:(?:-(?:high|low|medium))?(?:-openai-compact)?)?$',
    updated_at = CURRENT_TIMESTAMP
WHERE canonical_model = 'openai/gpt-5-codex-mini';

UPDATE model_registry
SET import_regex = '^(?:(?:cc|claude)-)?(?:openai[:/])?gpt-5\.1(?:\.\d+)*(?:(?:-chat(?:-latest)?|-(?:high|low|medium|instant)|-\d{4}-\d{2}-\d{2}))?$',
    updated_at = CURRENT_TIMESTAMP
WHERE canonical_model = 'openai/gpt-5.1';

UPDATE model_registry
SET import_regex = '^(?:(?:cc|claude)-)?(?:openai[:/])?gpt-5\.1(?:\.\d+)*-codex(?:-openai-compact)?$',
    updated_at = CURRENT_TIMESTAMP
WHERE canonical_model = 'openai/gpt-5.1-codex';

UPDATE model_registry
SET import_regex = '^(?:(?:cc|claude)-)?(?:openai[:/])?gpt-5\.1(?:\.\d+)*-codex-mini(?:-openai-compact)?$',
    updated_at = CURRENT_TIMESTAMP
WHERE canonical_model = 'openai/gpt-5.1-codex-mini';

UPDATE model_registry
SET import_regex = '^(?:(?:cc|claude)-)?(?:openai[:/])?gpt-5\.1(?:\.\d+)*-codex-max(?:-openai-compact)?$',
    updated_at = CURRENT_TIMESTAMP
WHERE canonical_model = 'openai/gpt-5.1-codex-max';

UPDATE model_registry
SET import_regex = '^(?:(?:cc|claude)-)?(?:openai[:/])?gpt-5\.2(?:\.\d+)*(?:(?:-chat(?:-latest)?|-(?:high|low|medium|xhigh|instant|openai-compact)|\((?:auto|high|low|medium|xhigh)\)|-\d{4}-\d{2}-\d{2}))*$',
    updated_at = CURRENT_TIMESTAMP
WHERE canonical_model = 'openai/gpt-5.2';

UPDATE model_registry
SET import_regex = '^(?:(?:cc|claude)-)?(?:openai[:/])?gpt-5\.2(?:\.\d+)*-pro(?:-\d{4}-\d{2}-\d{2})?$',
    updated_at = CURRENT_TIMESTAMP
WHERE canonical_model = 'openai/gpt-5.2-pro';

UPDATE model_registry
SET import_regex = '^(?:(?:cc|claude)-)?(?:openai[:/])?gpt-5\.2(?:\.\d+)*-codex(?:-openai-compact)?$',
    updated_at = CURRENT_TIMESTAMP
WHERE canonical_model = 'openai/gpt-5.2-codex';

INSERT INTO model_registry (canonical_model, display_name, provider_hint, import_regex, created_at, updated_at)
VALUES (
  'openai/gpt-5.3',
  'openai/gpt-5.3',
  NULL,
  '^(?:(?:cc|claude)-)?(?:openai[:/])?gpt-5\.3(?:(?:-chat(?:-latest)?|-instant|-(?:high|low|medium|xhigh|openai-compact)|\((?:auto|high|low|medium|xhigh)\)|-\d{4}-\d{2}-\d{2}))*$',
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
)
ON CONFLICT(canonical_model) DO UPDATE SET
  display_name = excluded.display_name,
  import_regex = excluded.import_regex,
  updated_at = excluded.updated_at;

UPDATE model_registry
SET import_regex = '^(?:(?:cc|claude)-)?(?:openai[:/])?gpt-5\.3(?:\.\d+)*-codex(?:(?:-(?:spark|high|low|medium|xhigh))?(?:-openai-compact)?|\((?:high|low|medium|xhigh)\))$',
    updated_at = CURRENT_TIMESTAMP
WHERE canonical_model = 'openai/gpt-5.3-codex';

UPDATE model_registry
SET import_regex = '^(?:(?:cc|claude)-)?(?:openai[:/])?gpt-5\.4(?:\.\d+)*(?:(?:-(?:high|low|medium|xhigh|openai-compact)|\((?:high|low|medium|xhigh)\)|-\d{4}-\d{2}-\d{2}))*$',
    updated_at = CURRENT_TIMESTAMP
WHERE canonical_model = 'openai/gpt-5.4';

UPDATE model_registry
SET import_regex = '^(?:(?:cc|claude)-)?(?:openai[:/])?gpt-5\.4(?:\.\d+)*-mini(?:-\d{4}-\d{2}-\d{2})?$',
    updated_at = CURRENT_TIMESTAMP
WHERE canonical_model = 'openai/gpt-5.4-mini';

UPDATE model_registry
SET import_regex = '^(?:(?:cc|claude)-)?(?:openai[:/])?gpt-5\.4(?:\.\d+)*-nano(?:-\d{4}-\d{2}-\d{2})?$',
    updated_at = CURRENT_TIMESTAMP
WHERE canonical_model = 'openai/gpt-5.4-nano';

UPDATE model_registry
SET import_regex = '^(?:(?:cc|claude)-)?(?:openai[:/])?gpt-5\.4(?:\.\d+)*-pro(?:-\d{4}-\d{2}-\d{2})?$',
    updated_at = CURRENT_TIMESTAMP
WHERE canonical_model = 'openai/gpt-5.4-pro';

UPDATE model_registry
SET import_regex = '^(?:(?:cc|claude)-)?(?:openai[:/])?gpt-5\.5(?:\.\d+)*(?:(?:-(?:openai-compact)|-\d{4}-\d{2}-\d{2}))*$',
    updated_at = CURRENT_TIMESTAMP
WHERE canonical_model = 'openai/gpt-5.5';

UPDATE model_registry
SET import_regex = '^(?:(?:cc|claude)-)?(?:openai[:/])?gpt-5\.5(?:\.\d+)*-pro(?:-\d{4}-\d{2}-\d{2})?$',
    updated_at = CURRENT_TIMESTAMP
WHERE canonical_model = 'openai/gpt-5.5-pro';

UPDATE model_registry
SET import_regex = '^(?:google/)?gemini-3-pro-preview(?:[-:][\w.-]+)?$',
    updated_at = CURRENT_TIMESTAMP
WHERE canonical_model = 'google/gemini-3-pro-preview';

UPDATE model_registry
SET import_regex = '^(?:google/)?gemini-3-flash-preview(?:[-:][\w.-]+)?$',
    updated_at = CURRENT_TIMESTAMP
WHERE canonical_model = 'google/gemini-3-flash-preview';

UPDATE model_registry
SET import_regex = '^(?:google/)?gemini-3\.1-pro-preview(?:[-:][\w.-]+)?$',
    updated_at = CURRENT_TIMESTAMP
WHERE canonical_model = 'google/gemini-3.1-pro-preview';

INSERT INTO model_aliases (alias, provider_hint, canonical_model, created_at, updated_at)
VALUES ('openai/gpt-5.3', '', 'openai/gpt-5.3', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT(alias, provider_hint) DO UPDATE SET
  canonical_model = excluded.canonical_model,
  updated_at = excluded.updated_at;
