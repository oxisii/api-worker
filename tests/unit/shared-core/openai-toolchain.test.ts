import {
	extractResponsesRequestHints,
	repairOpenAiToolCallChain,
	validateOpenAiToolCallChain,
} from "../../../apps/shared-core/src";
import { describe, expect, it } from "vitest";

describe("openai toolchain", () => {
	it("patches chat tool call id from tool message", () => {
		const body: Record<string, unknown> = {
			messages: [
				{
					role: "assistant",
					tool_calls: [{ function: { name: "foo", arguments: "{}" } }],
				},
				{ role: "tool", tool_call_id: "call_1", content: "ok" },
			],
		};

		repairOpenAiToolCallChain(body, "chat");
		const issue = validateOpenAiToolCallChain(body, "chat", null);
		expect(issue).toBeNull();
	});

	it("detects unresolved responses function_call_output", () => {
		const body: Record<string, unknown> = {
			input: [{ type: "function_call_output", call_id: "call_missing" }],
		};
		const hints = extractResponsesRequestHints(body);
		const issue = validateOpenAiToolCallChain(body, "responses", hints);
		expect(issue?.code).toBe("tool_call_chain_invalid_local");
	});

	it("passes responses chain after repair", () => {
		const body: Record<string, unknown> = {
			input: [
				{ type: "function_call", call_id: "call_1", name: "foo", arguments: "{}" },
				{ type: "function_call_output", call_id: "call_1", output: "ok" },
			],
		};
		repairOpenAiToolCallChain(body, "responses");
		const hints = extractResponsesRequestHints(body);
		const issue = validateOpenAiToolCallChain(body, "responses", hints);
		expect(issue).toBeNull();
	});
});
