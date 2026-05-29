import { describe, expect, it } from "vitest";
import { persistAutomaticRequestEntryFormat } from "../../apps/worker/src/services/proxy/request-entry-persistence";

describe("request entry persistence", () => {
	it("200 成功后把自动请求入口固化为明确格式", async () => {
		const calls: Array<{ sql: string; bindings: unknown[] }> = [];
		const db = {
			prepare(sql: string) {
				return {
					bind(...bindings: unknown[]) {
						calls.push({ sql, bindings });
						return {
							async run() {
								return {};
							},
						};
					},
				};
			},
		};

		await persistAutomaticRequestEntryFormat({
			db: db as never,
			channel: {
				id: "ch_test",
				metadata_json: JSON.stringify({
					site_type: "openai",
					request_entry: {
						path: "/codex",
						format: null,
					},
					manual_include_models: ["manual"],
				}),
			},
			path: "/codex",
			format: "openai_responses",
		});

		expect(calls).toHaveLength(1);
		expect(calls[0].sql).toContain("UPDATE channels SET metadata_json");
		const metadata = JSON.parse(String(calls[0].bindings[0]));
		expect(metadata.request_entry).toEqual({
			path: "/codex",
			format: "openai_responses",
		});
		expect(metadata.manual_include_models).toEqual(["manual"]);
	});
});
