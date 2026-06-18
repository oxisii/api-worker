import { describe, expect, it, vi } from "vitest";

vi.mock("../../../apps/worker/src/wasm/core", async () => {
	const { readFile } = await import("node:fs/promises");
	const { safeJsonParse } = await import("../../../apps/worker/src/utils/json");
	const wasmBindings = await import(
		"../../../apps/worker/src/wasm/generated/worker_wasm_core.js"
	);
	const wasmBytes = await readFile(
		new URL(
			"../../../apps/worker/src/wasm/generated/worker_wasm_core_bg.wasm",
			import.meta.url,
		),
	);
	await wasmBindings.default({ module_or_path: wasmBytes });

	const toJson = (value: unknown): string => {
		try {
			return JSON.stringify(value);
		} catch {
			return "null";
		}
	};

	return {
		adaptChatJsonViaWasm: (
			direction:
				| "openai_to_anthropic"
				| "anthropic_to_openai"
				| "gemini_to_openai"
				| "gemini_to_anthropic"
				| "openai_to_gemini"
				| "anthropic_to_gemini",
			payload: Record<string, unknown>,
			model: string | null,
		): Record<string, unknown> | null =>
			safeJsonParse<Record<string, unknown> | null>(
				wasmBindings.adapt_chat_json(
					direction,
					toJson(payload),
					model ?? "",
					BigInt(Date.now()),
				),
				null,
			),
		adaptSseLineViaWasm: () => null,
		geminiUsageTokensViaWasm: (
			payload: Record<string, unknown>,
		): {
			promptTokens: number;
			completionTokens: number;
			totalTokens: number;
		} | null =>
			safeJsonParse(
				wasmBindings.gemini_usage_tokens_json(toJson(payload)),
				null,
			),
	};
});

const { adaptChatResponse } = await import(
	"../../../apps/worker/src/services/chat-response-adapter"
);

async function readResponseText(response: Response): Promise<string> {
	return await response.text();
}

describe("chat response adapter", () => {
	it("OpenAI chat 转 OpenAI responses 时不会把 reasoning 混进 output_text", async () => {
		const response = Response.json({
			choices: [
				{
					message: {
						role: "assistant",
						content: [
							{ type: "reasoning", text: "内部思考" },
							{ type: "text", text: "最终答案" },
						],
					},
					finish_reason: "stop",
				},
			],
		});

		const adapted = await adaptChatResponse({
			response,
			upstreamProvider: "openai",
			downstreamProvider: "openai",
			upstreamEndpoint: "chat",
			downstreamEndpoint: "responses",
			model: "gpt-5",
			isStream: false,
		});
		const payload = (await adapted.json()) as Record<string, unknown>;

		expect(payload.output_text).toBe("最终答案");
	});

	it("OpenAI responses 转 OpenAI chat 时不会把 reasoning 项混进正文", async () => {
		const response = Response.json({
			output: [
				{
					type: "reasoning",
					id: "rs_1",
					content: [{ type: "reasoning_text", text: "内部思考" }],
				},
				{
					type: "message",
					role: "assistant",
					content: [{ type: "output_text", text: "最终答案" }],
				},
			],
		});

		const adapted = await adaptChatResponse({
			response,
			upstreamProvider: "openai",
			downstreamProvider: "openai",
			upstreamEndpoint: "responses",
			downstreamEndpoint: "chat",
			model: "gpt-5",
			isStream: false,
		});
		const payload = (await adapted.json()) as Record<string, unknown>;
		const choices = payload.choices as Array<Record<string, unknown>>;
		const message = choices[0]?.message as Record<string, unknown>;

		expect(message.content).toBe("最终答案");
	});

	it("OpenAI chat 转 Anthropic 时不会把 reasoning block 当成 text", async () => {
		const response = Response.json({
			choices: [
				{
					message: {
						role: "assistant",
						content: [
							{ type: "reasoning", text: "内部思考" },
							{ type: "text", text: "最终答案" },
						],
					},
					finish_reason: "stop",
				},
			],
		});

		const adapted = await adaptChatResponse({
			response,
			upstreamProvider: "openai",
			downstreamProvider: "anthropic",
			upstreamEndpoint: "chat",
			downstreamEndpoint: "chat",
			model: "claude-sonnet-4.5",
			isStream: false,
		});
		const payload = (await adapted.json()) as Record<string, unknown>;
		const content = payload.content as Array<Record<string, unknown>>;

		expect(content).toEqual([{ type: "text", text: "最终答案" }]);
	});

	it("Gemini 转 OpenAI 时不会把 thought 文本混进最终回答", async () => {
		const response = Response.json({
			candidates: [
				{
					content: {
						parts: [
							{ text: "内部思考", thought: true },
							{ text: "最终答案" },
						],
					},
					finishReason: "STOP",
				},
			],
			usageMetadata: {
				promptTokenCount: 10,
				candidatesTokenCount: 3,
				totalTokenCount: 13,
			},
		});

		const adapted = await adaptChatResponse({
			response,
			upstreamProvider: "gemini",
			downstreamProvider: "openai",
			upstreamEndpoint: "chat",
			downstreamEndpoint: "chat",
			model: "gpt-5",
			isStream: false,
		});
		const payload = (await adapted.json()) as Record<string, unknown>;
		const choices = payload.choices as Array<Record<string, unknown>>;
		const message = choices[0]?.message as Record<string, unknown>;

		expect(message.content).toBe("最终答案");
	});

	it("OpenAI chat 流转 OpenAI responses 时保留工具调用事件", async () => {
		const upstream = [
			{
				choices: [
					{
						delta: { role: "assistant" },
						finish_reason: null,
					},
				],
			},
			{
				choices: [
					{
						delta: {
							tool_calls: [
								{
									index: 0,
									id: "call_1",
									type: "function",
									function: {
										name: "read_file",
										arguments: "{\"path\"",
									},
								},
							],
						},
						finish_reason: null,
					},
				],
			},
			{
				choices: [
					{
						delta: {
							tool_calls: [
								{
									index: 0,
									function: {
										arguments: ":\"AGENTS.md\"}",
									},
								},
							],
						},
						finish_reason: null,
					},
				],
			},
			{
				choices: [
					{
						delta: {},
						finish_reason: "tool_calls",
					},
				],
			},
		]
			.map((chunk) => `data: ${JSON.stringify(chunk)}\n\n`)
			.join("");
		const response = new Response(upstream, {
			headers: { "content-type": "text/event-stream" },
		});

		const adapted = await adaptChatResponse({
			response,
			upstreamProvider: "openai",
			downstreamProvider: "openai",
			upstreamEndpoint: "chat",
			downstreamEndpoint: "responses",
			model: "gpt-5",
			isStream: true,
		});
		const text = await readResponseText(adapted);

		expect(text).toContain('"type":"response.output_item.added"');
		expect(text).toContain('"type":"function_call"');
		expect(text).toContain('"name":"read_file"');
		expect(text).toContain('"call_id":"call_1"');
		expect(text).toContain('"type":"response.function_call_arguments.delta"');
		expect(text).toContain('"{\\"path\\""');
		expect(text).toContain('":\\"AGENTS.md\\"}"');
		expect(text).toContain('"type":"response.completed"');
	});
});
