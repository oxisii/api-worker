import { afterEach, describe, expect, it, vi } from "vitest";
import {
	readWebdavJson,
	type WebdavConfig,
} from "../../../apps/worker/src/services/webdav";

const webdavConfig: WebdavConfig = {
	baseUrl: "https://dav.example.com",
	path: "/backup",
	credentials: {
		username: "tester",
		password: "secret",
	},
};

const originalFetch = globalThis.fetch;

afterEach(() => {
	globalThis.fetch = originalFetch;
	vi.restoreAllMocks();
});

describe("webdav json reading", () => {
	it("octet-stream 返回 JSON 文件时仍可正常解析", async () => {
		const jsonBytes = new TextEncoder().encode(
			JSON.stringify({
				items: ["20260605-010203.json"],
			}),
		);
		globalThis.fetch = vi.fn(async () => ({
			status: 200,
			ok: true,
			headers: new Headers({
				"content-type": "application/octet-stream",
			}),
			json: async () => {
				throw new Error("json() should not be used for octet-stream");
			},
			arrayBuffer: async () =>
				jsonBytes.buffer.slice(
					jsonBytes.byteOffset,
					jsonBytes.byteOffset + jsonBytes.byteLength,
				),
		})) as typeof fetch;

		const result = await readWebdavJson<{ items: string[] }>(
			webdavConfig,
			"history/index.json",
		);

		expect(result).toEqual({
			items: ["20260605-010203.json"],
		});
	});
});
