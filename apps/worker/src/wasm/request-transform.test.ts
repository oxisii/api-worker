import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { safeJsonParse } from "../utils/json";
import * as wasmBindings from "./generated/worker_wasm_core.js";

await wasmBindings.default({
	module_or_path: await readFile(
		new URL("./generated/worker_wasm_core_bg.wasm", import.meta.url),
	),
});

function toJson(value: unknown): string {
	return JSON.stringify(value);
}

describe("wasm request transform", () => {
	it("OpenAI Responses 请求缺少 input 但带 messages 时会反建 input", () => {
		const normalized = safeJsonParse<Record<string, unknown> | null>(
			wasmBindings.normalize_chat_request(
				toJson({
					model: "gpt-5.5",
					messages: [{ role: "user", content: "ping" }],
					stream: false,
				}),
				"openai",
				"responses",
				"gpt-5.5",
				false,
			),
			null,
		);

		expect(
			(normalized?.rawResponsesBody as Record<string, unknown> | undefined)
				?.input,
		).toEqual([{ role: "user", content: "ping" }]);
		expect(
			(normalized?.rawResponsesBody as Record<string, unknown> | undefined)
				?.messages,
		).toBeUndefined();

		const request = safeJsonParse<{
			body?: Record<string, unknown>;
		} | null>(
			wasmBindings.build_upstream_chat_request(
				toJson(normalized),
				"openai",
				"gpt-5.5",
				"responses",
				false,
				toJson({}),
			),
			null,
		);

		expect(request?.body?.input).toEqual([{ role: "user", content: "ping" }]);
	});
});
