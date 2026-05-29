import { describe, expect, it } from "vitest";
import { performModelDiscovery } from "../../apps/worker/src/services/providers/common";

describe("model discovery", () => {
	it("200 但未解析出模型时不算模型发现成功", async () => {
		const result = await performModelDiscovery({
			target: "https://example.test/v1/models",
			headers: new Headers(),
			parseModels: () => [],
			fetcher: async () =>
				new Response("temporarily offline", {
					status: 200,
					headers: { "content-type": "text/plain; charset=utf-8" },
				}),
		});

		expect(result.ok).toBe(false);
		expect(result.httpStatus).toBe(200);
		expect(result.detail).toBe("temporarily offline");
	});
});
