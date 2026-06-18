import {
	adaptChatJsonViaWasm,
	adaptSseLineViaWasm,
} from "../../../wasm/core";
import {
	geminiCandidateText,
	geminiUsageTokens,
	parseJsonFromStreamLine,
	toOpenAiResponsesFromText,
	writeOpenAiResponsesChunk,
	writeOpenAiSseChunk,
	writeSseEvent,
	type AdaptOptions,
} from "./shared";
export async function adaptGeminiJsonToOpenAi(
	options: AdaptOptions,
): Promise<Response> {
	const payload = (await options.response
		.clone()
		.json()
		.catch(() => null)) as Record<string, unknown> | null;
	if (!payload) {
		throw new Error("Invalid Gemini JSON payload");
	}
	if (options.downstreamEndpoint === "responses") {
		const usage = geminiUsageTokens(payload);
		const normalized = toOpenAiResponsesFromText(
			geminiCandidateText(payload),
			options.model,
			{
				inputTokens: usage.promptTokens,
				outputTokens: usage.completionTokens,
				totalTokens: usage.totalTokens,
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
		"gemini_to_openai",
		payload,
		options.model,
	);
	if (!wasmTransformed) {
		throw new Error("WASM transform failed: gemini_to_openai");
	}
	const headers = new Headers(options.response.headers);
	headers.set("content-type", "application/json; charset=utf-8");
	headers.delete("content-length");
	return new Response(JSON.stringify(wasmTransformed), {
		status: options.response.status,
		headers,
	});
}

export async function adaptGeminiJsonToAnthropic(
	options: AdaptOptions,
): Promise<Response> {
	const payload = (await options.response
		.clone()
		.json()
		.catch(() => null)) as Record<string, unknown> | null;
	if (!payload) {
		throw new Error("Invalid Gemini JSON payload");
	}
	const wasmTransformed = adaptChatJsonViaWasm(
		"gemini_to_anthropic",
		payload,
		options.model,
	);
	if (!wasmTransformed) {
		throw new Error("WASM transform failed: gemini_to_anthropic");
	}
	const headers = new Headers(options.response.headers);
	headers.set("content-type", "application/json; charset=utf-8");
	headers.delete("content-length");
	return new Response(JSON.stringify(wasmTransformed), {
		status: options.response.status,
		headers,
	});
}

export function adaptGeminiSseToOpenAi(options: AdaptOptions): Response {
	if (!options.response.body) {
		return options.response;
	}
	if (options.downstreamEndpoint === "responses") {
		const encoder = new TextEncoder();
		const decoder = new TextDecoder();
		const reader = options.response.body.getReader();
		const responseId = `resp_${Date.now()}`;
		let buffer = "";
		let outputText = "";
		let completed = false;

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
							const line = buffer.slice(0, newlineIndex);
							buffer = buffer.slice(newlineIndex + 1);
							const parsed = parseJsonFromStreamLine(line);
							if (!parsed) {
								newlineIndex = buffer.indexOf("\n");
								continue;
							}
							const wasmLine = adaptSseLineViaWasm(
								parsed,
								"gemini",
								"openai",
								options.model,
							);
							if (!wasmLine) {
								throw new Error("WASM SSE transform failed: gemini_to_openai");
							}
							const text =
								typeof wasmLine.text === "string" ? wasmLine.text : "";
							if (text) {
								outputText += text;
								writeOpenAiResponsesChunk(controller, encoder, {
									type: "response.output_text.delta",
									delta: text,
								});
							}
							const finishReason =
								typeof wasmLine.finishReason === "string"
									? wasmLine.finishReason
									: null;
							if (finishReason && !completed) {
								completed = true;
								writeOpenAiResponsesChunk(controller, encoder, {
									type: "response.completed",
									response: toOpenAiResponsesFromText(
										outputText,
										options.model,
									),
								});
							}
							newlineIndex = buffer.indexOf("\n");
						}
					}
					if (!completed) {
						writeOpenAiResponsesChunk(controller, encoder, {
							type: "response.completed",
							response: toOpenAiResponsesFromText(outputText, options.model),
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
		return new Response(stream, { status: options.response.status, headers });
	}

	const encoder = new TextEncoder();
	const decoder = new TextDecoder();
	const reader = options.response.body.getReader();
	const completionId = `chatcmpl_${Date.now()}`;
	const created = Math.floor(Date.now() / 1000);
	let buffer = "";
	let started = false;
	let stopped = false;

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
							"gemini",
							"openai",
							options.model,
						);
						if (!wasmLine) {
							throw new Error("WASM SSE transform failed: gemini_to_openai");
						}
						if (!started) {
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
						}
						const text = typeof wasmLine.text === "string" ? wasmLine.text : "";
						if (text) {
							writeOpenAiSseChunk(controller, encoder, {
								id: completionId,
								object: "chat.completion.chunk",
								created,
								model: options.model ?? "",
								choices: [
									{ index: 0, delta: { content: text }, finish_reason: null },
								],
							});
						}
						const finishReason =
							typeof wasmLine.finishReason === "string"
								? wasmLine.finishReason
								: null;
						if (finishReason && !stopped) {
							stopped = true;
							writeOpenAiSseChunk(controller, encoder, {
								id: completionId,
								object: "chat.completion.chunk",
								created,
								model: options.model ?? "",
								choices: [{ index: 0, delta: {}, finish_reason: finishReason }],
							});
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
	return new Response(stream, { status: options.response.status, headers });
}

export function adaptGeminiSseToAnthropic(options: AdaptOptions): Response {
	if (!options.response.body) {
		return options.response;
	}
	const encoder = new TextEncoder();
	const decoder = new TextDecoder();
	const reader = options.response.body.getReader();
	const messageId = `msg_${Date.now()}`;
	let buffer = "";
	let started = false;
	let stopped = false;

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
							"gemini",
							"anthropic",
							options.model,
						);
						if (!wasmLine) {
							throw new Error("WASM SSE transform failed: gemini_to_anthropic");
						}
						if (!started) {
							started = true;
							writeSseEvent(controller, encoder, "message_start", {
								type: "message_start",
								message: {
									id: messageId,
									type: "message",
									role: "assistant",
									model: options.model ?? "",
									content: [],
									stop_reason: null,
									stop_sequence: null,
									usage: { input_tokens: 0, output_tokens: 0 },
								},
							});
							writeSseEvent(controller, encoder, "content_block_start", {
								type: "content_block_start",
								index: 0,
								content_block: { type: "text", text: "" },
							});
						}
						const text = typeof wasmLine.text === "string" ? wasmLine.text : "";
						if (text) {
							writeSseEvent(controller, encoder, "content_block_delta", {
								type: "content_block_delta",
								index: 0,
								delta: { type: "text_delta", text },
							});
						}
						const stopReason =
							typeof wasmLine.stopReason === "string"
								? wasmLine.stopReason
								: null;
						if (stopReason && !stopped) {
							stopped = true;
							writeSseEvent(controller, encoder, "content_block_stop", {
								type: "content_block_stop",
								index: 0,
							});
							writeSseEvent(controller, encoder, "message_delta", {
								type: "message_delta",
								delta: { stop_reason: stopReason, stop_sequence: null },
								usage: {
									output_tokens:
										typeof wasmLine.outputTokens === "number"
											? wasmLine.outputTokens
											: 0,
								},
							});
							writeSseEvent(controller, encoder, "message_stop", {
								type: "message_stop",
							});
						}
						newlineIndex = buffer.indexOf("\n");
					}
				}
				if (started && !stopped) {
					writeSseEvent(controller, encoder, "content_block_stop", {
						type: "content_block_stop",
						index: 0,
					});
					writeSseEvent(controller, encoder, "message_delta", {
						type: "message_delta",
						delta: { stop_reason: "end_turn", stop_sequence: null },
						usage: { output_tokens: 0 },
					});
					writeSseEvent(controller, encoder, "message_stop", {
						type: "message_stop",
					});
				}
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
	return new Response(stream, { status: options.response.status, headers });
}
