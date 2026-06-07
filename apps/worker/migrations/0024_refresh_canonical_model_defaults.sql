UPDATE model_registry
SET import_regex = NULL, updated_at = CURRENT_TIMESTAMP
WHERE
  canonical_model = 'anthropic/claude-opus-4-20250514'
  AND import_regex = '^(?:anthropic/)?claude-opus-4-20250514$';

UPDATE usage_logs
SET canonical_model = 'anthropic/claude-sonnet-4'
WHERE canonical_model = 'anthropic/claude-sonnet-4-20250514';

UPDATE attempt_events
SET canonical_model = 'anthropic/claude-sonnet-4'
WHERE canonical_model = 'anthropic/claude-sonnet-4-20250514';

UPDATE model_prices
SET canonical_model = 'anthropic/claude-sonnet-4'
WHERE canonical_model = 'anthropic/claude-sonnet-4-20250514';

UPDATE channel_model_capabilities
SET canonical_model = 'anthropic/claude-sonnet-4'
WHERE canonical_model = 'anthropic/claude-sonnet-4-20250514';

UPDATE model_aliases
SET canonical_model = 'anthropic/claude-sonnet-4', updated_at = CURRENT_TIMESTAMP
WHERE canonical_model = 'anthropic/claude-sonnet-4-20250514';

UPDATE model_registry
SET import_regex = NULL, updated_at = CURRENT_TIMESTAMP
WHERE
  canonical_model = 'anthropic/claude-sonnet-4-20250514'
  AND import_regex = '^(?:anthropic/)?claude-sonnet-4-20250514$';

DELETE FROM model_registry
WHERE
  canonical_model = 'anthropic/claude-sonnet-4-20250514'
  AND (
    import_regex IS NULL
    OR TRIM(import_regex) = ''
    OR import_regex = '^(?:anthropic/)?claude-sonnet-4-20250514$'
  );

INSERT INTO model_registry (canonical_model, display_name, provider_hint, import_regex, created_at, updated_at)
VALUES
  ('openai/gpt-5', 'openai/gpt-5', NULL, '^(?:(?:cc|claude)-)?(?:openai[:/])?gpt-5(?:(?:-chat(?:-latest)?|-instant|-(?:high|low|medium)|-\d{4}-\d{2}-\d{2}))?$', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('openai/gpt-5-mini', 'openai/gpt-5-mini', NULL, '^(?:(?:cc|claude)-)?(?:openai[:/])?gpt-5-mini(?:-\d{4}-\d{2}-\d{2})?$', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('openai/gpt-5-nano', 'openai/gpt-5-nano', NULL, '^(?:(?:cc|claude)-)?(?:openai[:/])?gpt-5-nano(?:-\d{4}-\d{2}-\d{2})?$', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('openai/gpt-5-pro', 'openai/gpt-5-pro', NULL, '^(?:(?:cc|claude)-)?(?:openai[:/])?gpt-5-pro(?:-\d{4}-\d{2}-\d{2})?$', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('openai/gpt-5-codex', 'openai/gpt-5-codex', NULL, '^(?:(?:cc|claude)-)?(?:openai[:/])?gpt-5-codex(?:(?:-(?:high|low|medium|spark))?(?:-openai-compact)?)?$', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('openai/gpt-5-codex-mini', 'openai/gpt-5-codex-mini', NULL, '^(?:(?:cc|claude)-)?(?:openai[:/])?gpt-5-codex-mini(?:(?:-(?:high|low|medium))?(?:-openai-compact)?)?$', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('openai/gpt-5.1', 'openai/gpt-5.1', NULL, '^(?:(?:cc|claude)-)?(?:openai[:/])?gpt-5\.1(?:\.\d+)*(?:(?:-chat(?:-latest)?|-(?:high|low|medium|instant)|-\d{4}-\d{2}-\d{2}))?$', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('openai/gpt-5.1-codex', 'openai/gpt-5.1-codex', NULL, '^(?:(?:cc|claude)-)?(?:openai[:/])?gpt-5\.1(?:\.\d+)*-codex(?:-openai-compact)?$', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('openai/gpt-5.1-codex-mini', 'openai/gpt-5.1-codex-mini', NULL, '^(?:(?:cc|claude)-)?(?:openai[:/])?gpt-5\.1(?:\.\d+)*-codex-mini(?:-openai-compact)?$', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('openai/gpt-5.1-codex-max', 'openai/gpt-5.1-codex-max', NULL, '^(?:(?:cc|claude)-)?(?:openai[:/])?gpt-5\.1(?:\.\d+)*-codex-max(?:-openai-compact)?$', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('openai/gpt-5.2', 'openai/gpt-5.2', NULL, '^(?:(?:cc|claude)-)?(?:openai[:/])?gpt-5\.2(?:\.\d+)*(?:(?:-chat(?:-latest)?|-(?:high|low|medium|xhigh|instant|openai-compact)|\((?:auto|high|low|medium|xhigh)\)|-\d{4}-\d{2}-\d{2}))*$', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('openai/gpt-5.2-pro', 'openai/gpt-5.2-pro', NULL, '^(?:(?:cc|claude)-)?(?:openai[:/])?gpt-5\.2(?:\.\d+)*-pro(?:-\d{4}-\d{2}-\d{2})?$', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('openai/gpt-5.2-codex', 'openai/gpt-5.2-codex', NULL, '^(?:(?:cc|claude)-)?(?:openai[:/])?gpt-5\.2(?:\.\d+)*-codex(?:-openai-compact)?$', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('openai/gpt-5.3', 'openai/gpt-5.3', NULL, '^(?:(?:cc|claude)-)?(?:openai[:/])?gpt-5\.3(?:(?:-chat(?:-latest)?|-instant|-(?:high|low|medium|xhigh|openai-compact)|\((?:auto|high|low|medium|xhigh)\)|-\d{4}-\d{2}-\d{2}))*$', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('openai/gpt-5.3-codex', 'openai/gpt-5.3-codex', NULL, '^(?:(?:cc|claude)-)?(?:openai[:/])?gpt-5\.3(?:\.\d+)*-codex(?:(?:-(?:spark|high|low|medium|xhigh))?(?:-openai-compact)?|\((?:high|low|medium|xhigh)\))$', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('openai/gpt-5.4', 'openai/gpt-5.4', NULL, '^(?:(?:cc|claude)-)?(?:openai[:/])?gpt-5\.4(?:\.\d+)*(?:(?:-(?:high|low|medium|xhigh|openai-compact)|\((?:high|low|medium|xhigh)\)|-\d{4}-\d{2}-\d{2}))*$', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('openai/gpt-5.4-mini', 'openai/gpt-5.4-mini', NULL, '^(?:(?:cc|claude)-)?(?:openai[:/])?gpt-5\.4(?:\.\d+)*-mini(?:-\d{4}-\d{2}-\d{2})?$', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('openai/gpt-5.4-nano', 'openai/gpt-5.4-nano', NULL, '^(?:(?:cc|claude)-)?(?:openai[:/])?gpt-5\.4(?:\.\d+)*-nano(?:-\d{4}-\d{2}-\d{2})?$', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('openai/gpt-5.4-pro', 'openai/gpt-5.4-pro', NULL, '^(?:(?:cc|claude)-)?(?:openai[:/])?gpt-5\.4(?:\.\d+)*-pro(?:-\d{4}-\d{2}-\d{2})?$', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('openai/gpt-5.5', 'openai/gpt-5.5', NULL, '^(?:(?:cc|claude)-)?(?:openai[:/])?gpt-5\.5(?:\.\d+)*(?:(?:-(?:openai-compact)|-\d{4}-\d{2}-\d{2}))*$', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('openai/gpt-5.5-pro', 'openai/gpt-5.5-pro', NULL, '^(?:(?:cc|claude)-)?(?:openai[:/])?gpt-5\.5(?:\.\d+)*-pro(?:-\d{4}-\d{2}-\d{2})?$', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('openai/gpt-oss-120b', 'openai/gpt-oss-120b', NULL, '^(?:openai/)?gpt-oss-120b$', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('openai/gpt-oss-20b', 'openai/gpt-oss-20b', NULL, '^(?:openai/)?gpt-oss-20b$', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('openai/gpt-4.1', 'openai/gpt-4.1', NULL, '^(?:openai/)?gpt-4\.1(?:-\d{4}-\d{2}-\d{2})?$', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('openai/gpt-4.1-mini', 'openai/gpt-4.1-mini', NULL, '^(?:openai/)?gpt-4\.1-mini(?:-\d{4}-\d{2}-\d{2})?$', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('openai/gpt-4.1-nano', 'openai/gpt-4.1-nano', NULL, '^(?:openai/)?gpt-4\.1-nano(?:-\d{4}-\d{2}-\d{2})?$', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('openai/gpt-4o', 'openai/gpt-4o', NULL, '^(?:openai/)?gpt-4o(?:-\d{4}-\d{2}-\d{2})?$', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('openai/gpt-4o-mini', 'openai/gpt-4o-mini', NULL, '^(?:openai/)?gpt-4o-mini(?:-\d{4}-\d{2}-\d{2})?$', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('openai/chatgpt-4o-latest', 'openai/chatgpt-4o-latest', NULL, '^(?:openai/)?chatgpt-4o-latest$', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('openai/o1', 'openai/o1', NULL, '^(?:openai/)?o1(?:-(?:mini|preview|pro))?$', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('openai/o3', 'openai/o3', NULL, '^(?:openai/)?o3(?:-(?:mini|pro))?$', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('openai/o4-mini', 'openai/o4-mini', NULL, '^(?:openai/)?o4-mini$', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('anthropic/claude-sonnet-4', 'anthropic/claude-sonnet-4', NULL, '^(?:anthropic/)?claude-sonnet-4(?:-\d{8})?(?:-thinking)?$', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('anthropic/claude-sonnet-4.5', 'anthropic/claude-sonnet-4.5', NULL, '^(?:anthropic/)?claude-sonnet-4(?:[.-]5)(?:-\d{8})?(?:-thinking)?$', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('anthropic/claude-sonnet-4.6', 'anthropic/claude-sonnet-4.6', NULL, '^(?:anthropic/)?claude-sonnet-4(?:[.-]6)(?:-\d{8})?(?:-thinking)?$', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('anthropic/claude-opus-4.1', 'anthropic/claude-opus-4.1', NULL, '^(?:anthropic/)?claude-opus-4(?:[.-]1)(?:-\d{8})?(?:-thinking)?$', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('anthropic/claude-opus-4.5', 'anthropic/claude-opus-4.5', NULL, '^(?:anthropic/)?claude-opus-4(?:[.-]5)(?:-\d{8})?(?:-(?:thinking|fast))?$', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('anthropic/claude-opus-4.6', 'anthropic/claude-opus-4.6', NULL, '^(?:anthropic/)?claude-opus-4(?:[.-]6)(?:-\d{8})?(?:-(?:thinking|fast))?$', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('anthropic/claude-opus-4.8', 'anthropic/claude-opus-4.8', NULL, '^(?:anthropic/)?claude-opus-4(?:[.-]8)(?:-\d{8})?(?:-(?:thinking|fast))?$', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('anthropic/claude-haiku-4.5', 'anthropic/claude-haiku-4.5', NULL, '^(?:anthropic/)?claude-haiku-4(?:[.-]5)(?:-\d{8})?(?:-thinking)?$', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('google/gemini-2.5-pro', 'google/gemini-2.5-pro', NULL, '^(?:google/)?gemini-2\.5-pro(?:-preview(?:-[\d-]+)?)?$', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('google/gemini-2.5-flash', 'google/gemini-2.5-flash', NULL, '^(?:google/)?gemini-2\.5-flash(?:-preview(?:-[\d-]+)?)?$', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('google/gemini-2.5-flash-lite', 'google/gemini-2.5-flash-lite', NULL, '^(?:google/)?gemini-2\.5-flash-lite(?:-preview(?:-[\d-]+)?)?$', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('google/gemini-3-pro-preview', 'google/gemini-3-pro-preview', NULL, '^(?:google/)?gemini-3-pro-preview(?:[-:][\w.-]+)?$', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('google/gemini-3-flash-preview', 'google/gemini-3-flash-preview', NULL, '^(?:google/)?gemini-3-flash-preview(?:[-:][\w.-]+)?$', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('google/gemini-3.1-pro', 'google/gemini-3.1-pro', NULL, '^(?:google/)?gemini-3\.1-pro$', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('google/gemini-3.1-pro-preview', 'google/gemini-3.1-pro-preview', NULL, '^(?:google/)?gemini-3\.1-pro-preview(?:[-:][\w.-]+)?$', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('google/gemini-3.1-flash-lite', 'google/gemini-3.1-flash-lite', NULL, '^(?:google/)?gemini-3\.1-flash-lite(?:-[\w.-]+)?$', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('google/gemini-3.5-flash', 'google/gemini-3.5-flash', NULL, '^(?:google/)?gemini-3\.5-flash$', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('google/gemma-7b', 'google/gemma-7b', NULL, '^(?:@hf/google/|@cf/google/|google/)?gemma-7b(?:-it(?:-lora)?)?$', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('google/gemma-2-27b', 'google/gemma-2-27b', NULL, '^(?:@hf/google/|@cf/google/|google/)?gemma-2-27b(?:-it(?:-lora)?)?$', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('google/gemma-4-31b', 'google/gemma-4-31b', NULL, '^(?:@hf/google/|@cf/google/|google/)?gemma-4-31b(?:-[\w.-]+)?$', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('deepseek/deepseek-chat', 'deepseek/deepseek-chat', NULL, '^(?:(?:deepseek|deepseek-ai)/)?deepseek-chat(?:[-:][\w.]+)*$', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('deepseek/deepseek-reasoner', 'deepseek/deepseek-reasoner', NULL, '^(?:(?:deepseek|deepseek-ai)/)?deepseek-reasoner(?:[-:][\w.]+)*$', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('deepseek/deepseek-r1', 'deepseek/deepseek-r1', NULL, '^(?:(?:deepseek|deepseek-ai)/)?deepseek-r1(?:[-:][\w.]+)*$', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('deepseek/deepseek-v3', 'deepseek/deepseek-v3', NULL, '^(?:(?:deepseek|deepseek-ai)/)?deepseek-v3(?:[-:][\w.]+)*$', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('deepseek/deepseek-v3.1', 'deepseek/deepseek-v3.1', NULL, '^(?:(?:deepseek|deepseek-ai)/)?deepseek-v3(?:[.-]1)(?:[-:][\w.]+)*$', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('deepseek/deepseek-v3.2', 'deepseek/deepseek-v3.2', NULL, '^(?:(?:deepseek|deepseek-ai)/)?deepseek-v3(?:[.-]2)(?:[-:][\w.]+)*$', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('deepseek/deepseek-v4-flash', 'deepseek/deepseek-v4-flash', NULL, '^(?:deepseek/)?deepseek-v4-flash$', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('deepseek/deepseek-v4-pro', 'deepseek/deepseek-v4-pro', NULL, '^(?:deepseek/)?deepseek-v4-pro$', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('alibaba/qwen-max', 'alibaba/qwen-max', NULL, '^(?:(?:alibaba|qwen)/)?qwen-max(?:-(?:latest|\d{4}-\d{2}-\d{2}))?(?:-(?:thinking|search))*$', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('alibaba/qwen-plus', 'alibaba/qwen-plus', NULL, '^(?:(?:alibaba|qwen)/)?qwen-plus(?:-(?:latest|\d{4}-\d{2}-\d{2}))?(?:-us)?$', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('alibaba/qwen-flash', 'alibaba/qwen-flash', NULL, '^(?:alibaba/)?qwen-flash(?:-\d{4}-\d{2}-\d{2})?$', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('alibaba/qwen-turbo', 'alibaba/qwen-turbo', NULL, '^(?:alibaba/)?qwen-turbo(?:-\d{4}-\d{2}-\d{2})?$', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('alibaba/qwen-long', 'alibaba/qwen-long', NULL, '^(?:alibaba/)?qwen-long(?:-(?:latest|\d{4}-\d{2}-\d{2}))?$', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('alibaba/qwen3-max', 'alibaba/qwen3-max', NULL, '^(?:(?:alibaba|qwen)/)?qwen3-max(?:-(?:preview|\d{4}-\d{2}-\d{2}))?(?:-thinking)?$', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('alibaba/qwen3-coder-plus', 'alibaba/qwen3-coder-plus', NULL, '^(?:(?:alibaba|qwen)/)?qwen3-coder-plus(?:-(?:thinking|search))*$', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('alibaba/qwen3-coder', 'alibaba/qwen3-coder', NULL, '^(?:(?:alibaba|qwen)/)?qwen3-coder(?:-(?!(?:plus|flash|next|480b-a35b)\b)[\w.-]+)?$', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('alibaba/qwen3-coder-flash', 'alibaba/qwen3-coder-flash', NULL, '^(?:(?:alibaba|qwen)/)?qwen3-coder-flash(?:-\d{4}-\d{2}-\d{2})?$', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('alibaba/qwen3-coder-next', 'alibaba/qwen3-coder-next', NULL, '^(?:(?:alibaba|qwen)/)?qwen3-coder-next(?:-thinking)?$', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('alibaba/qwen3-coder-480b-a35b', 'alibaba/qwen3-coder-480b-a35b', NULL, '^(?:(?:alibaba|qwen)/)?qwen3-coder-480b-a35b(?:-instruct)?$', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('alibaba/qwen3-235b-a22b', 'alibaba/qwen3-235b-a22b', NULL, '^(?:(?:alibaba|qwen)/)?qwen3-235b-a22b(?:-(?:instruct|thinking(?:-\d{4})?))?$', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('alibaba/qwen3-vl-plus', 'alibaba/qwen3-vl-plus', NULL, '^(?:(?:alibaba|qwen)/)?qwen3-vl-plus$', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('alibaba/qwen3.5-122b-a10b', 'alibaba/qwen3.5-122b-a10b', NULL, '^(?:(?:alibaba|qwen)/)?qwen3\.5-122b-a10b$', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('alibaba/qwen3.5-397b-a17b', 'alibaba/qwen3.5-397b-a17b', NULL, '^(?:(?:alibaba|qwen)/)?qwen3\.5-397b-a17b(?:-(?:thinking|t))?$', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('alibaba/qwen3.5-plus', 'alibaba/qwen3.5-plus', NULL, '^(?:(?:alibaba|qwen)/)?qwen3\.5-plus(?:-(?:search|thinking|image|image-edit))?$', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('alibaba/qwen3-next-80b-a3b', 'alibaba/qwen3-next-80b-a3b', NULL, '^(?:(?:alibaba|qwen)/)?qwen3-next-80b-a3b(?:-(?:instruct|thinking))?$', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('alibaba/qwq-32b', 'alibaba/qwq-32b', NULL, '^(?:(?:alibaba|qwen)/)?qwq-32b$', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('moonshot/kimi-k2', 'moonshot/kimi-k2', NULL, '^(?:(?:moonshot|moonshotai)/)?kimi-k2(?:[-:][\w.]+)*$', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('moonshot/kimi-k2.5', 'moonshot/kimi-k2.5', NULL, '^(?:(?:moonshot|moonshotai)/)?kimi-k2\.5(?:[-:][\w.\[\]]+)*$', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('moonshot/kimi-k2.6', 'moonshot/kimi-k2.6', NULL, '^(?:(?:moonshot|moonshotai)/)?kimi-k2\.6(?:[-:][\w.]+)*$', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('moonshot/moonshot-v1-8k', 'moonshot/moonshot-v1-8k', NULL, '^(?:moonshot/)?moonshot-v1-8k(?:-[\w.-]+)?$', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('moonshot/moonshot-v1-32k', 'moonshot/moonshot-v1-32k', NULL, '^(?:moonshot/)?moonshot-v1-32k(?:-[\w.-]+)?$', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('moonshot/moonshot-v1-128k', 'moonshot/moonshot-v1-128k', NULL, '^(?:moonshot/)?moonshot-v1-128k(?:-[\w.-]+)?$', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('zhipu/glm-4.5', 'zhipu/glm-4.5', NULL, '^(?:(?:zhipu|z-ai)/)?glm-?4\.5(?:[-:][\w.]+)*$', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('zhipu/glm-4.5-air', 'zhipu/glm-4.5-air', NULL, '^(?:(?:zhipu|z-ai)/)?glm-4\.5-air$', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('zhipu/glm-4.6', 'zhipu/glm-4.6', NULL, '^(?:(?:zhipu|z-ai)/)?glm-?4\.6(?:[-:][\w.]+)*$', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('zhipu/glm-4.6v', 'zhipu/glm-4.6v', NULL, '^(?:(?:zhipu|z-ai)/)?glm-?4\.6-?v(?:[-:][\w.]+)*$', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('zhipu/glm-4.7', 'zhipu/glm-4.7', NULL, '^(?:(?:zhipu|z-ai)/)?glm-?4\.7(?:[-:][\w.]+)*$', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('zhipu/glm-5', 'zhipu/glm-5', NULL, '^(?:(?:zhipu|z-ai)/)?glm-?5(?:[-:][\w.]+)*$', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('zhipu/glm-5.1', 'zhipu/glm-5.1', NULL, '^(?:(?:zhipu|z-ai)/)?glm-?5\.1(?:[-:][\w.]+)*$', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('zhipu/glm-5v-turbo', 'zhipu/glm-5v-turbo', NULL, '^(?:(?:zhipu|z-ai)/)?glm-5v-turbo$', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('x-ai/grok-3', 'x-ai/grok-3', NULL, '^(?:x-ai/)?grok-3(?:-(?:thinking|mini|fast|expert))?$', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('x-ai/grok-4', 'x-ai/grok-4', NULL, '^(?:x-ai/)?grok-4(?:-(?:thinking|mini|fast|expert|heavy))?$', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('x-ai/grok-4.1', 'x-ai/grok-4.1', NULL, '^(?:x-ai/)?grok-4\.1(?:-(?:thinking|expert|fast|mini))?$', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('x-ai/grok-4.2', 'x-ai/grok-4.2', NULL, '^(?:x-ai/)?grok-4\.2(?:-[\w.-]+)?$', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('x-ai/grok-4.20', 'x-ai/grok-4.20', NULL, '^(?:x-ai/)?grok-4\.20(?:-[\w.-]+)?$', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('x-ai/grok-4.3', 'x-ai/grok-4.3', NULL, '^(?:x-ai/)?grok-4\.3$', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('minimax/minimax-m2', 'minimax/minimax-m2', NULL, '^(?:(?:minimax|minimaxai)/)?minimax-m2(?:[-:][\w-]+)*$', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('minimax/minimax-m2.1', 'minimax/minimax-m2.1', NULL, '^(?:(?:minimax|minimaxai)/)?minimax-m2\.1(?:[-:][\w.]+)*$', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('minimax/minimax-m2.5', 'minimax/minimax-m2.5', NULL, '^(?:(?:minimax|minimaxai)/)?minimax-m2\.5(?:[-:][\w.]+)*$', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('minimax/minimax-m2.7', 'minimax/minimax-m2.7', NULL, '^(?:(?:minimax|minimaxai)/)?minimax-m2\.7(?:[-:][\w.]+)*$', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT(canonical_model) DO UPDATE SET
  import_regex = CASE
    WHEN model_registry.import_regex IS NULL OR TRIM(model_registry.import_regex) = ''
      THEN excluded.import_regex
    WHEN model_registry.canonical_model = 'openai/gpt-5'
      AND model_registry.import_regex IN (
        '^(?:openai/)?gpt-5(?:\.\d+)?(?:-chat(?:-latest)?)?(?:-\d{4}-\d{2}-\d{2})?$',
        '^(?:openai/)?gpt-5(?:\.\d+)*(?:-chat(?:-latest)?)?(?:-\d{4}-\d{2}-\d{2})?$'
      )
      THEN excluded.import_regex
    WHEN model_registry.canonical_model = 'openai/gpt-5-mini'
      AND model_registry.import_regex IN (
        '^(?:openai/)?gpt-5(?:\.\d+)?-mini(?:-\d{4}-\d{2}-\d{2})?$',
        '^(?:openai/)?gpt-5(?:\.\d+)*-mini(?:-\d{4}-\d{2}-\d{2})?$'
      )
      THEN excluded.import_regex
    WHEN model_registry.canonical_model = 'openai/gpt-5-nano'
      AND model_registry.import_regex IN (
        '^(?:openai/)?gpt-5(?:\.\d+)?-nano(?:-\d{4}-\d{2}-\d{2})?$',
        '^(?:openai/)?gpt-5(?:\.\d+)*-nano(?:-\d{4}-\d{2}-\d{2})?$'
      )
      THEN excluded.import_regex
    WHEN model_registry.canonical_model = 'openai/gpt-5-codex'
      AND model_registry.import_regex IN (
        '^(?:openai/)?gpt-5(?:\.\d+)?-codex(?:-(?:mini|max|spark))?$',
        '^(?:openai/)?gpt-5(?:\.\d+)*-codex(?:-(?:mini|max|spark))?$'
      )
      THEN excluded.import_regex
    WHEN model_registry.canonical_model = 'google/gemini-2.5-pro'
      AND model_registry.import_regex = '^(?:google/)?gemini-2\.5-pro(?:-preview(?:-\d{2}-\d{2})?)?$'
      THEN excluded.import_regex
    WHEN model_registry.canonical_model = 'google/gemini-2.5-flash'
      AND model_registry.import_regex = '^(?:google/)?gemini-2\.5-flash(?:-preview(?:-\d{2}-\d{2})?)?$'
      THEN excluded.import_regex
    WHEN model_registry.canonical_model = 'google/gemma-7b'
      AND model_registry.import_regex = '^(?:@hf/google/|google/)?gemma-7b(?:-it)?$'
      THEN excluded.import_regex
    WHEN model_registry.canonical_model = 'moonshot/kimi-k2'
      AND model_registry.import_regex = '^(?:moonshot/)?kimi-k2$'
      THEN excluded.import_regex
    WHEN model_registry.canonical_model = 'alibaba/qwen-max'
      AND model_registry.import_regex = '^(?:alibaba/)?qwen-max(?:-\d{4}-\d{2}-\d{2})?$'
      THEN excluded.import_regex
    WHEN model_registry.canonical_model = 'alibaba/qwen-plus'
      AND model_registry.import_regex = '^(?:alibaba/)?qwen-plus(?:-\d{4}-\d{2}-\d{2})?$'
      THEN excluded.import_regex
    WHEN model_registry.canonical_model = 'alibaba/qwen3-coder'
      AND model_registry.import_regex = '^(?:alibaba/)?qwen3-coder(?:-[\w.-]+)?$'
      THEN excluded.import_regex
    WHEN model_registry.canonical_model = 'alibaba/qwen3-coder'
      AND model_registry.import_regex = '^(?:alibaba/)?qwen3-coder(?:-(?!plus\b)[\w.-]+)?$'
      THEN excluded.import_regex
    WHEN model_registry.canonical_model = 'alibaba/qwen3-coder'
      AND model_registry.import_regex = '^(?:(?:alibaba|qwen)/)?qwen3-coder(?:-(?!plus\b|flash\b|next\b)[\w.-]+)?$'
      THEN excluded.import_regex
    WHEN model_registry.canonical_model = 'moonshot/kimi-k2'
      AND model_registry.import_regex = '^(?:moonshot/)?kimi-k2(?:-(?:thinking|instruct(?:-[\w.-]+)?))?$'
      THEN excluded.import_regex
    WHEN model_registry.canonical_model = 'minimax/minimax-m2'
      AND model_registry.import_regex = '^(?:(?:minimax|minimaxai)/)?minimax-m2(?:[-:][\w.]+)*$'
      THEN excluded.import_regex
    ELSE model_registry.import_regex
  END,
  updated_at = CASE
    WHEN model_registry.import_regex IS NULL OR TRIM(model_registry.import_regex) = ''
      THEN excluded.updated_at
    WHEN model_registry.canonical_model = 'openai/gpt-5'
      AND model_registry.import_regex IN (
        '^(?:openai/)?gpt-5(?:\.\d+)?(?:-chat(?:-latest)?)?(?:-\d{4}-\d{2}-\d{2})?$',
        '^(?:openai/)?gpt-5(?:\.\d+)*(?:-chat(?:-latest)?)?(?:-\d{4}-\d{2}-\d{2})?$'
      )
      THEN excluded.updated_at
    WHEN model_registry.canonical_model = 'openai/gpt-5-mini'
      AND model_registry.import_regex IN (
        '^(?:openai/)?gpt-5(?:\.\d+)?-mini(?:-\d{4}-\d{2}-\d{2})?$',
        '^(?:openai/)?gpt-5(?:\.\d+)*-mini(?:-\d{4}-\d{2}-\d{2})?$'
      )
      THEN excluded.updated_at
    WHEN model_registry.canonical_model = 'openai/gpt-5-nano'
      AND model_registry.import_regex IN (
        '^(?:openai/)?gpt-5(?:\.\d+)?-nano(?:-\d{4}-\d{2}-\d{2})?$',
        '^(?:openai/)?gpt-5(?:\.\d+)*-nano(?:-\d{4}-\d{2}-\d{2})?$'
      )
      THEN excluded.updated_at
    WHEN model_registry.canonical_model = 'openai/gpt-5-codex'
      AND model_registry.import_regex IN (
        '^(?:openai/)?gpt-5(?:\.\d+)?-codex(?:-(?:mini|max|spark))?$',
        '^(?:openai/)?gpt-5(?:\.\d+)*-codex(?:-(?:mini|max|spark))?$'
      )
      THEN excluded.updated_at
    WHEN model_registry.canonical_model = 'google/gemini-2.5-pro'
      AND model_registry.import_regex = '^(?:google/)?gemini-2\.5-pro(?:-preview(?:-\d{2}-\d{2})?)?$'
      THEN excluded.updated_at
    WHEN model_registry.canonical_model = 'google/gemini-2.5-flash'
      AND model_registry.import_regex = '^(?:google/)?gemini-2\.5-flash(?:-preview(?:-\d{2}-\d{2})?)?$'
      THEN excluded.updated_at
    WHEN model_registry.canonical_model = 'google/gemma-7b'
      AND model_registry.import_regex = '^(?:@hf/google/|google/)?gemma-7b(?:-it)?$'
      THEN excluded.updated_at
    WHEN model_registry.canonical_model = 'moonshot/kimi-k2'
      AND model_registry.import_regex = '^(?:moonshot/)?kimi-k2$'
      THEN excluded.updated_at
    WHEN model_registry.canonical_model = 'alibaba/qwen-max'
      AND model_registry.import_regex = '^(?:alibaba/)?qwen-max(?:-\d{4}-\d{2}-\d{2})?$'
      THEN excluded.updated_at
    WHEN model_registry.canonical_model = 'alibaba/qwen-plus'
      AND model_registry.import_regex = '^(?:alibaba/)?qwen-plus(?:-\d{4}-\d{2}-\d{2})?$'
      THEN excluded.updated_at
    WHEN model_registry.canonical_model = 'alibaba/qwen3-coder'
      AND model_registry.import_regex = '^(?:alibaba/)?qwen3-coder(?:-[\w.-]+)?$'
      THEN excluded.updated_at
    WHEN model_registry.canonical_model = 'alibaba/qwen3-coder'
      AND model_registry.import_regex = '^(?:alibaba/)?qwen3-coder(?:-(?!plus\b)[\w.-]+)?$'
      THEN excluded.updated_at
    WHEN model_registry.canonical_model = 'alibaba/qwen3-coder'
      AND model_registry.import_regex = '^(?:(?:alibaba|qwen)/)?qwen3-coder(?:-(?!plus\b|flash\b|next\b)[\w.-]+)?$'
      THEN excluded.updated_at
    WHEN model_registry.canonical_model = 'moonshot/kimi-k2'
      AND model_registry.import_regex = '^(?:moonshot/)?kimi-k2(?:-(?:thinking|instruct(?:-[\w.-]+)?))?$'
      THEN excluded.updated_at
    WHEN model_registry.canonical_model = 'minimax/minimax-m2'
      AND model_registry.import_regex = '^(?:(?:minimax|minimaxai)/)?minimax-m2(?:[-:][\w.]+)*$'
      THEN excluded.updated_at
    ELSE model_registry.updated_at
  END;

INSERT INTO model_aliases (alias, provider_hint, canonical_model, created_at, updated_at)
VALUES
  ('openai/gpt-5', '', 'openai/gpt-5', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('openai/gpt-5-mini', '', 'openai/gpt-5-mini', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('openai/gpt-5-nano', '', 'openai/gpt-5-nano', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('openai/gpt-5-pro', '', 'openai/gpt-5-pro', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('openai/gpt-5-codex', '', 'openai/gpt-5-codex', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('openai/gpt-5-codex-mini', '', 'openai/gpt-5-codex-mini', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('openai/gpt-5.1', '', 'openai/gpt-5.1', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('openai/gpt-5.1-codex', '', 'openai/gpt-5.1-codex', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('openai/gpt-5.1-codex-mini', '', 'openai/gpt-5.1-codex-mini', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('openai/gpt-5.1-codex-max', '', 'openai/gpt-5.1-codex-max', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('openai/gpt-5.2', '', 'openai/gpt-5.2', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('openai/gpt-5.2-pro', '', 'openai/gpt-5.2-pro', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('openai/gpt-5.2-codex', '', 'openai/gpt-5.2-codex', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('openai/gpt-5.3', '', 'openai/gpt-5.3', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('openai/gpt-5.3-codex', '', 'openai/gpt-5.3-codex', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('openai/gpt-5.4', '', 'openai/gpt-5.4', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('openai/gpt-5.4-mini', '', 'openai/gpt-5.4-mini', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('openai/gpt-5.4-nano', '', 'openai/gpt-5.4-nano', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('openai/gpt-5.4-pro', '', 'openai/gpt-5.4-pro', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('openai/gpt-5.5', '', 'openai/gpt-5.5', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('openai/gpt-5.5-pro', '', 'openai/gpt-5.5-pro', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('openai/gpt-oss-120b', '', 'openai/gpt-oss-120b', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('openai/gpt-oss-20b', '', 'openai/gpt-oss-20b', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('openai/gpt-4.1', '', 'openai/gpt-4.1', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('openai/gpt-4.1-mini', '', 'openai/gpt-4.1-mini', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('openai/gpt-4.1-nano', '', 'openai/gpt-4.1-nano', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('openai/gpt-4o', '', 'openai/gpt-4o', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('openai/gpt-4o-mini', '', 'openai/gpt-4o-mini', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('openai/chatgpt-4o-latest', '', 'openai/chatgpt-4o-latest', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('openai/o1', '', 'openai/o1', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('openai/o3', '', 'openai/o3', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('openai/o4-mini', '', 'openai/o4-mini', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('anthropic/claude-sonnet-4', '', 'anthropic/claude-sonnet-4', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('anthropic/claude-sonnet-4.5', '', 'anthropic/claude-sonnet-4.5', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('anthropic/claude-sonnet-4.6', '', 'anthropic/claude-sonnet-4.6', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('anthropic/claude-opus-4.1', '', 'anthropic/claude-opus-4.1', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('anthropic/claude-opus-4.5', '', 'anthropic/claude-opus-4.5', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('anthropic/claude-opus-4.6', '', 'anthropic/claude-opus-4.6', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('anthropic/claude-opus-4.8', '', 'anthropic/claude-opus-4.8', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('anthropic/claude-haiku-4.5', '', 'anthropic/claude-haiku-4.5', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('google/gemini-2.5-pro', '', 'google/gemini-2.5-pro', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('google/gemini-2.5-flash', '', 'google/gemini-2.5-flash', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('google/gemini-2.5-flash-lite', '', 'google/gemini-2.5-flash-lite', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('google/gemini-3-pro-preview', '', 'google/gemini-3-pro-preview', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('google/gemini-3-flash-preview', '', 'google/gemini-3-flash-preview', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('google/gemini-3.1-pro', '', 'google/gemini-3.1-pro', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('google/gemini-3.1-pro-preview', '', 'google/gemini-3.1-pro-preview', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('google/gemini-3.1-flash-lite', '', 'google/gemini-3.1-flash-lite', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('google/gemini-3.5-flash', '', 'google/gemini-3.5-flash', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('google/gemma-7b', '', 'google/gemma-7b', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('google/gemma-2-27b', '', 'google/gemma-2-27b', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('google/gemma-4-31b', '', 'google/gemma-4-31b', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('deepseek/deepseek-chat', '', 'deepseek/deepseek-chat', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('deepseek/deepseek-reasoner', '', 'deepseek/deepseek-reasoner', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('deepseek/deepseek-r1', '', 'deepseek/deepseek-r1', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('deepseek/deepseek-v3', '', 'deepseek/deepseek-v3', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('deepseek/deepseek-v3.1', '', 'deepseek/deepseek-v3.1', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('deepseek/deepseek-v3.2', '', 'deepseek/deepseek-v3.2', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('deepseek/deepseek-v4-flash', '', 'deepseek/deepseek-v4-flash', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('deepseek/deepseek-v4-pro', '', 'deepseek/deepseek-v4-pro', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('alibaba/qwen-max', '', 'alibaba/qwen-max', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('alibaba/qwen-plus', '', 'alibaba/qwen-plus', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('alibaba/qwen-flash', '', 'alibaba/qwen-flash', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('alibaba/qwen-turbo', '', 'alibaba/qwen-turbo', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('alibaba/qwen-long', '', 'alibaba/qwen-long', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('alibaba/qwen3-max', '', 'alibaba/qwen3-max', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('alibaba/qwen3-coder-plus', '', 'alibaba/qwen3-coder-plus', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('alibaba/qwen3-coder', '', 'alibaba/qwen3-coder', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('alibaba/qwen3-coder-flash', '', 'alibaba/qwen3-coder-flash', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('alibaba/qwen3-coder-next', '', 'alibaba/qwen3-coder-next', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('alibaba/qwen3-coder-480b-a35b', '', 'alibaba/qwen3-coder-480b-a35b', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('alibaba/qwen3-235b-a22b', '', 'alibaba/qwen3-235b-a22b', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('alibaba/qwen3-vl-plus', '', 'alibaba/qwen3-vl-plus', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('alibaba/qwen3.5-122b-a10b', '', 'alibaba/qwen3.5-122b-a10b', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('alibaba/qwen3.5-397b-a17b', '', 'alibaba/qwen3.5-397b-a17b', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('alibaba/qwen3.5-plus', '', 'alibaba/qwen3.5-plus', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('alibaba/qwen3-next-80b-a3b', '', 'alibaba/qwen3-next-80b-a3b', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('alibaba/qwq-32b', '', 'alibaba/qwq-32b', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('moonshot/kimi-k2', '', 'moonshot/kimi-k2', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('moonshot/kimi-k2.5', '', 'moonshot/kimi-k2.5', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('moonshot/kimi-k2.6', '', 'moonshot/kimi-k2.6', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('moonshot/moonshot-v1-8k', '', 'moonshot/moonshot-v1-8k', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('moonshot/moonshot-v1-32k', '', 'moonshot/moonshot-v1-32k', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('moonshot/moonshot-v1-128k', '', 'moonshot/moonshot-v1-128k', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('zhipu/glm-4.5', '', 'zhipu/glm-4.5', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('zhipu/glm-4.5-air', '', 'zhipu/glm-4.5-air', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('zhipu/glm-4.6', '', 'zhipu/glm-4.6', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('zhipu/glm-4.6v', '', 'zhipu/glm-4.6v', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('zhipu/glm-4.7', '', 'zhipu/glm-4.7', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('zhipu/glm-5', '', 'zhipu/glm-5', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('zhipu/glm-5.1', '', 'zhipu/glm-5.1', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('zhipu/glm-5v-turbo', '', 'zhipu/glm-5v-turbo', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('x-ai/grok-3', '', 'x-ai/grok-3', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('x-ai/grok-4', '', 'x-ai/grok-4', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('x-ai/grok-4.1', '', 'x-ai/grok-4.1', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('x-ai/grok-4.2', '', 'x-ai/grok-4.2', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('x-ai/grok-4.20', '', 'x-ai/grok-4.20', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('x-ai/grok-4.3', '', 'x-ai/grok-4.3', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('minimax/minimax-m2', '', 'minimax/minimax-m2', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('minimax/minimax-m2.1', '', 'minimax/minimax-m2.1', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('minimax/minimax-m2.5', '', 'minimax/minimax-m2.5', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('minimax/minimax-m2.7', '', 'minimax/minimax-m2.7', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT(alias, provider_hint) DO NOTHING;
