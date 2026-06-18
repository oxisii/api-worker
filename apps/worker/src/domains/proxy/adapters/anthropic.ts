import { safeJsonParse } from "../../../utils/json";
import {
	adaptChatJsonViaWasm,
	adaptSseLineViaWasm,
} from "../../../wasm/core";
import {
	anthropicContentToText,
	parseJsonFromStreamLine,
	toOpenAiChatCompletionFromText,
	toOpenAiResponsesFromText,
	writeGeminiChunk,
	writeOpenAiResponsesChunk,
	writeOpenAiSseChunk,
	type AdaptOptions,
} from "./shared";
export async function adaptAnthropicJsonToOpenAi(
	options: AdaptOptions,
): Promise<Response> {
	const payload = (await options.response
		.clone()
		.json()
		.catch(() => null)) as Record<string, unknown> | null;
	if (!payload) {
		throw new Error("Invalid Anthropic JSON payload");
	}
	if (options.downstreamEndpoint === "responses") {
		const usageRecord =
			payload.usage && typeof payload.usage === "object"
				? (payload.usage as Record<string, unknown>)
				: null;
		const inputTokens =
			usageRecord && typeof usageRecord.input_tokens === "number"
				? usageRecord.input_tokens
				: 0;
		const outputTokens =
			usageRecord && typeof usageRecord.output_tokens === "number"
				? usageRecord.output_tokens
				: 0;
		const normalized = toOpenAiResponsesFromText(
			anthropicContentToText(payload.content),
			options.model,
			{
				inputTokens,
				outputTokens,
				totalTokens: inputTokens + outputTokens,
			},
		);
		const headers = new Headers(options.response.headers);
		headers.set("content-type", "application/json; charset=utf-8");
		headers.delete("content-length");
		return new Response(JSON.stringify(normalized), {
			status: options.response.status,
			headers,
		});
	}
	const wasmTransformed = adaptChatJsonViaWasm(
		"anthropic_to_openai",
		payload,
		options.model,
	);
	if (!wasmTransformed) {
		throw new Error("WASM transform failed: anthropic_to_openai");
	}
	const headers = new Headers(options.response.headers);
	headers.set("content-type", "application/json; charset=utf-8");
	headers.delete("content-length");
	return new Response(JSON.stringify(wasmTransformed), {
		status: options.response.status,
		headers,
	});
}

export function adaptAnthropicSseToOpenAi(options: AdaptOptions): Response {
	if (!options.response.body) {
		return options.response;
	}
	if (options.downstreamEndpoint === "responses") {
		const encoder = new TextEncoder();
		const decoder = new TextDecoder();
		const reader = options.response.body.getReader();
		const responseId = `resp_${Date.now()}`;
		let buffer = "";
		let completed = false;
		let outputText = "";
		let outputTokens = 0;

		const stream = new ReadableStream<Uint8Array>({
			async start(controller) {
				try {
					writeOpenAiResponsesChunk(controller, encoder, {
						type: "response.created",
						response: {
							id: responseId,
							object: "response",
							model: options.model ?? "",
						},
					});
					while (true) {
						const { done, value } = await reader.read();
						if (done) {
							break;
						}
						buffer += decoder.decode(value, { stream: true });
						let newlineIndex = buffer.indexOf("\n");
						while (newlineIndex !== -1) {
							const rawLine = buffer.slice(0, newlineIndex);
							buffer = buffer.slice(newlineIndex + 1);
							const line = rawLine.trim();
							if (!line.startsWith("data:")) {
								newlineIndex = buffer.indexOf("\n");
								continue;
							}
							const payload = line.slice(5).trim();
							if (!payload || payload === "[DONE]") {
								newlineIndex = buffer.indexOf("\n");
								continue;
							}
							const parsed = safeJsonParse<Record<string, unknown> | null>(
								payload,
								null,
							);
							if (!parsed) {
								newlineIndex = buffer.indexOf("\n");
								continue;
							}
							const wasmLine = adaptSseLineViaWasm(
								parsed,
								"anthropic",
								"openai",
								options.model,
							);
							if (!wasmLine) {
								throw new Error(
									"WASM SSE transform failed: anthropic_to_openai",
								);
							}
							const eventType =
								typeof wasmLine.eventType === "string"
									? wasmLine.eventType
									: "";
							if (eventType === "content_block_delta") {
								const text =
									typeof wasmLine.text === "string" ? wasmLine.text : "";
								if (text) {
									outputText += text;
									writeOpenAiResponsesChunk(controller, encoder, {
										type: "response.output_text.delta",
										delta: text,
									});
								}
							}
							if (
								eventType === "message_delta" &&
								typeof wasmLine.outputTokens === "number"
							) {
								outputTokens = wasmLine.outputTokens;
							}
							if (eventType === "message_stop" && !completed) {
								completed = true;
								writeOpenAiResponsesChunk(controller, encoder, {
									type: "response.completed",
									response: toOpenAiResponsesFromText(
										outputText,
										options.model,
										{
											inputTokens: 0,
											outputTokens,
											totalTokens: outputTokens,
										},
									),
								});
							}
							newlineIndex = buffer.indexOf("\n");
						}
					}
					if (!completed) {
						writeOpenAiResponsesChunk(controller, encoder, {
							type: "response.completed",
							response: toOpenAiResponsesFromText(outputText, options.model, {
								inputTokens: 0,
								outputTokens,
								totalTokens: outputTokens,
							}),
						});
					}
					controller.enqueue(encoder.encode("data: [DONE]\n\n"));
					controller.close();
				} catch (error) {
					controller.error(error);
				} finally {
					reader.releaseLock();
				}
			},
		});
		const headers = new Headers(options.response.headers);
		headers.set("content-type", "text/event-stream; charset=utf-8");
		headers.delete("content-length");
		return new Response(stream, {
			status: options.response.status,
			headers,
		});
	}

	const encoder = new TextEncoder();
	const decoder = new TextDecoder();
	const reader = options.response.body.getReader();
	const completionId = `chatcmpl_${Date.now()}`;
	const created = Math.floor(Date.now() / 1000);
	let buffer = "";
	let started = false;
	let stopSent = false;

	const stream = new ReadableStream<Uint8Array>({
		async start(controller) {
			try {
				while (true) {
					const { done, value } = await reader.read();
					if (done) {
						break;
					}
					buffer += decoder.decode(value, { stream: true });
					let newlineIndex = buffer.indexOf("\n");
					while (newlineIndex !== -1) {
						const rawLine = buffer.slice(0, newlineIndex);
						buffer = buffer.slice(newlineIndex + 1);
						const line = rawLine.trim();
						if (!line.startsWith("data:")) {
							newlineIndex = buffer.indexOf("\n");
							continue;
						}
						const payload = line.slice(5).trim();
						if (!payload || payload === "[DONE]") {
							newlineIndex = buffer.indexOf("\n");
							continue;
						}
						const parsed = safeJsonParse<Record<string, unknown> | null>(
							payload,
							null,
						);
						if (!parsed) {
							newlineIndex = buffer.indexOf("\n");
							continue;
						}
						const wasmLine = adaptSseLineViaWasm(
							parsed,
							"anthropic",
							"openai",
							options.model,
						);
						if (!wasmLine) {
							throw new Error("WASM SSE transform failed: anthropic_to_openai");
						}
						const eventType =
							typeof wasmLine.eventType === "string" ? wasmLine.eventType : "";
						if (!started && eventType === "message_start") {
							started = true;
							writeOpenAiSseChunk(controller, encoder, {
								id: completionId,
								object: "chat.completion.chunk",
								created,
								model: options.model ?? "",
								choices: [
									{
										index: 0,
										delta: { role: "assistant" },
										finish_reason: null,
									},
								],
							});
							newlineIndex = buffer.indexOf("\n");
							continue;
						}
						if (eventType === "content_block_delta") {
							const text =
								typeof wasmLine.text === "string" ? wasmLine.text : "";
							if (text) {
								writeOpenAiSseChunk(controller, encoder, {
									id: completionId,
									object: "chat.completion.chunk",
									created,
									model: options.model ?? "",
									choices: [
										{
											index: 0,
											delta: { content: text },
											finish_reason: null,
										},
									],
								});
							}
							newlineIndex = buffer.indexOf("\n");
							continue;
						}
						if (eventType === "message_delta" && !stopSent) {
							const finishReason =
								typeof wasmLine.finishReason === "string"
									? wasmLine.finishReason
									: null;
							writeOpenAiSseChunk(controller, encoder, {
								id: completionId,
								object: "chat.completion.chunk",
								created,
								model: options.model ?? "",
								choices: [
									{
										index: 0,
										delta: {},
										finish_reason: finishReason,
									},
								],
							});
							stopSent = true;
							newlineIndex = buffer.indexOf("\n");
							continue;
						}
						newlineIndex = buffer.indexOf("\n");
					}
				}
				controller.enqueue(encoder.encode("data: [DONE]\n\n"));
				controller.close();
			} catch (error) {
				controller.error(error);
			} finally {
				reader.releaseLock();
			}
		},
	});

	const headers = new Headers(options.response.headers);
	headers.set("content-type", "text/event-stream; charset=utf-8");
	headers.delete("content-length");
	return new Response(stream, {
		status: options.response.status,
		headers,
	});
}

export async function adaptAnthropicJsonToGemini(
	options: AdaptOptions,
): Promise<Response> {
	const payload = (await options.response
		.clone()
		.json()
		.catch(() => null)) as Record<string, unknown> | null;
	if (!payload) {
		throw new Error("Invalid Anthropic JSON payload");
	}
	const wasmTransformed = adaptChatJsonViaWasm(
		"anthropic_to_gemini",
		payload,
		options.model,
	);
	if (!wasmTransformed) {
		throw new Error("WASM transform failed: anthropic_to_gemini");
	}
	const headers = new Headers(options.response.headers);
	headers.set("content-type", "application/json; charset=utf-8");
	headers.delete("content-length");
	return new Response(JSON.stringify(wasmTransformed), {
		status: options.response.status,
		headers,
	});
}

export function adaptAnthropicSseToGemini(options: AdaptOptions): Response {
	if (!options.response.body) {
		return options.response;
	}
	const encoder = new TextEncoder();
	const decoder = new TextDecoder();
	const reader = options.response.body.getReader();
	let buffer = "";
	let lastFinishReason: string | null = null;

	const stream = new ReadableStream<Uint8Array>({
		async start(controller) {
			try {
				while (true) {
					const { done, value } = await reader.read();
					if (done) {
						break;
					}
					buffer += decoder.decode(value, { stream: true });
					let newlineIndex = buffer.indexOf("\n");
					while (newlineIndex !== -1) {
						const line = buffer.slice(0, newlineIndex);
						buffer = buffer.slice(newlineIndex + 1);
						const parsed = parseJsonFromStreamLine(line);
						if (!parsed) {
							newlineIndex = buffer.indexOf("\n");
							continue;
						}
						const wasmLine = adaptSseLineViaWasm(
							parsed,
							"anthropic",
							"gemini",
							options.model,
						);
						if (!wasmLine) {
							throw new Error("WASM SSE transform failed: anthropic_to_gemini");
						}
						const eventType =
							typeof wasmLine.eventType === "string" ? wasmLine.eventType : "";
						if (eventType === "content_block_delta") {
							const text =
								typeof wasmLine.text === "string" ? wasmLine.text : "";
							if (text) {
								writeGeminiChunk(controller, encoder, {
									candidates: [
										{
											content: { role: "model", parts: [{ text }] },
										},
									],
								});
							}
						}
						if (eventType === "message_delta") {
							lastFinishReason =
								(typeof wasmLine.finishReason === "string"
									? wasmLine.finishReason
									: null) ?? lastFinishReason;
						}
						newlineIndex = buffer.indexOf("\n");
					}
				}
				writeGeminiChunk(controller, encoder, {
					candidates: [
						{
							content: { role: "model", parts: [] },
							finishReason: lastFinishReason ?? "STOP",
						},
					],
				});
				controller.close();
			} catch (error) {
				controller.error(error);
			} finally {
				reader.releaseLock();
			}
		},
	});
	const headers = new Headers(options.response.headers);
	headers.set("content-type", "application/json; charset=utf-8");
	headers.delete("content-length");
	return new Response(stream, { status: options.response.status, headers });
}
