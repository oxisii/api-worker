import { Hono } from "hono";
import { describe, expect, it } from "vitest";
import canonicalModels from "./canonical-models";

type MockRow = Record<string, unknown>;

function createMockDb(data: { registry: MockRow[]; aliases: MockRow[] }) {
	const runs: Array<{ sql: string; bindings: unknown[] }> = [];
	return {
		runs,
		prepare(sql: string) {
			return {
				bind(...bindings: unknown[]) {
					return {
						run: async () => {
							runs.push({ sql, bindings });
							return {};
						},
						first: async <T>() => {
							if (sql.includes("FROM model_registry")) {
								return (data.registry.find(
									(row) => row.canonical_model === bindings[0],
								) ?? null) as T | null;
							}
							return null;
						},
						all: async <T>() => {
							if (sql.includes("FROM model_registry")) {
								return { results: data.registry as T[] };
							}
							if (sql.includes("FROM model_aliases")) {
								return { results: data.aliases as T[] };
							}
							if (sql.includes("FROM settings")) {
								return { results: [] as T[] };
							}
							throw new Error(`Unexpected SQL: ${sql}`);
						},
					};
				},
				all: async <T>() => {
					if (sql.includes("FROM model_registry")) {
						return { results: data.registry as T[] };
					}
					if (sql.includes("FROM model_aliases")) {
						return { results: data.aliases as T[] };
					}
					if (sql.includes("FROM settings")) {
						return { results: [] as T[] };
					}
					throw new Error(`Unexpected SQL: ${sql}`);
				},
			};
		},
	};
}

describe("canonical models route", () => {
	it("列表会隐藏没有精确别名且已被其他统一模型接管的残留项", async () => {
		const app = new Hono<{
			Bindings: {
				DB: ReturnType<typeof createMockDb>;
			};
		}>();
		app.route("/", canonicalModels);

		const response = await app.request(
			"http://localhost/",
			{},
			{
				DB: createMockDb({
					registry: [
						{
							canonical_model: "openai/gpt-5.4",
							display_name: "openai/gpt-5.4",
							provider_hint: null,
							import_regex: "^gpt-5\\.4$",
							created_at: "2026-06-05T00:00:00.000Z",
							updated_at: "2026-06-05T00:00:00.000Z",
						},
						{
							canonical_model: "gpt-5.4",
							display_name: "gpt-5.4",
							provider_hint: null,
							import_regex: null,
							created_at: "2026-06-05T00:00:00.000Z",
							updated_at: "2026-06-05T00:00:00.000Z",
						},
					],
					aliases: [
						{
							alias: "gpt-5.4",
							provider_hint: "",
							canonical_model: "openai/gpt-5.4",
						},
						{
							alias: "openai/gpt-5.4",
							provider_hint: "",
							canonical_model: "openai/gpt-5.4",
						},
					],
				}),
			},
		);
		const payload = (await response.json()) as {
			items: Array<{ canonical_model: string }>;
		};

		expect(payload.items).toEqual([
			expect.objectContaining({
				canonical_model: "openai/gpt-5.4",
			}),
		]);
	});

	it("支持单独清理一个残留统一模型", async () => {
		const db = createMockDb({
			registry: [
				{
					canonical_model: "openai/gpt-5.4",
					display_name: "openai/gpt-5.4",
					provider_hint: null,
					import_regex: "^gpt-5\\.4$",
					created_at: "2026-06-05T00:00:00.000Z",
					updated_at: "2026-06-05T00:00:00.000Z",
				},
				{
					canonical_model: "gpt-5.4",
					display_name: "gpt-5.4",
					provider_hint: null,
					import_regex: null,
					created_at: "2026-06-05T00:00:00.000Z",
					updated_at: "2026-06-05T00:00:00.000Z",
				},
			],
			aliases: [
				{
					alias: "gpt-5.4",
					provider_hint: "",
					canonical_model: "openai/gpt-5.4",
				},
				{
					alias: "openai/gpt-5.4",
					provider_hint: "",
					canonical_model: "openai/gpt-5.4",
				},
			],
		});
		const app = new Hono<{
			Bindings: {
				DB: typeof db;
			};
		}>();
		app.route("/", canonicalModels);

		const response = await app.request(
			"http://localhost/orphans/gpt-5.4",
			{
				method: "DELETE",
			},
			{
				DB: db,
			},
		);
		const payload = (await response.json()) as {
			ok: boolean;
			item: { canonical_model: string };
		};

		expect(response.status).toBe(200);
		expect(payload).toEqual({
			ok: true,
			item: expect.objectContaining({
				canonical_model: "gpt-5.4",
			}),
		});
		expect(db.runs).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					sql: expect.stringContaining("DELETE FROM model_aliases"),
					bindings: ["gpt-5.4"],
				}),
				expect.objectContaining({
					sql: expect.stringContaining("DELETE FROM model_registry"),
					bindings: ["gpt-5.4"],
				}),
			]),
		);
	});

	it("列表会返回统一模型的思考能力配置", async () => {
		const app = new Hono<{
			Bindings: {
				DB: ReturnType<typeof createMockDb>;
			};
		}>();
		app.route("/", canonicalModels);

		const response = await app.request(
			"http://localhost/",
			{},
			{
				DB: createMockDb({
					registry: [
						{
							canonical_model: "alibaba/qwen3-next-80b-a3b",
							display_name: "alibaba/qwen3-next-80b-a3b",
							provider_hint: null,
							import_regex: "^qwen3-next",
							reasoning_config_json: JSON.stringify({
								mode: "manual",
								dialect: "openai_effort",
								max_effort: "high",
							}),
							created_at: "2026-06-05T00:00:00.000Z",
							updated_at: "2026-06-05T00:00:00.000Z",
						},
					],
					aliases: [
						{
							alias: "alibaba/qwen3-next-80b-a3b",
							provider_hint: "",
							canonical_model: "alibaba/qwen3-next-80b-a3b",
						},
					],
				}),
			},
		);
		const payload = (await response.json()) as {
			items: Array<{
				canonical_model: string;
				reasoning_config: unknown;
			}>;
		};

		expect(payload.items[0]).toEqual(
			expect.objectContaining({
				canonical_model: "alibaba/qwen3-next-80b-a3b",
				reasoning_config: {
					mode: "manual",
					dialect: "openai_effort",
					max_effort: "high",
				},
			}),
		);
	});

	it("更新统一模型时会保存思考能力配置", async () => {
		const db = createMockDb({
			registry: [
				{
					canonical_model: "alibaba/qwen3-next-80b-a3b",
					display_name: "alibaba/qwen3-next-80b-a3b",
					provider_hint: null,
					import_regex: "^qwen3-next",
					reasoning_config_json: null,
					created_at: "2026-06-05T00:00:00.000Z",
					updated_at: "2026-06-05T00:00:00.000Z",
				},
			],
			aliases: [
				{
					alias: "alibaba/qwen3-next-80b-a3b",
					provider_hint: "",
					canonical_model: "alibaba/qwen3-next-80b-a3b",
				},
			],
		});
		const app = new Hono<{
			Bindings: {
				DB: typeof db;
			};
		}>();
		app.route("/", canonicalModels);

		const response = await app.request(
			"http://localhost/alibaba%2Fqwen3-next-80b-a3b",
			{
				method: "PATCH",
				body: JSON.stringify({
					canonical_model: "alibaba/qwen3-next-80b-a3b",
					import_regex: "^qwen3-next",
					aliases: "qwen/qwen3-next-80b-a3b-thinking",
					reasoning_config: {
						mode: "manual",
						dialect: "openai_effort",
						max_effort: "high",
					},
				}),
			},
			{
				DB: db,
			},
		);

		expect(response.status).toBe(200);
		expect(db.runs).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					sql: expect.stringContaining("reasoning_config_json"),
					bindings: expect.arrayContaining([
						JSON.stringify({
							mode: "manual",
							dialect: "openai_effort",
							max_effort: "high",
						}),
					]),
				}),
			]),
		);
	});
});
