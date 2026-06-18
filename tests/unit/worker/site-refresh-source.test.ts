import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const siteTaskDispatcherSource = readFileSync(
	"apps/worker/src/services/site-task-dispatcher.ts",
	"utf8",
);
const sitesRouteSource = readFileSync("apps/worker/src/routes/sites.ts", "utf8");

describe("site refresh source contracts", () => {
	it("单站手动拉取模型不会因为站点是 disabled 被直接拒绝", () => {
		expect(siteTaskDispatcherSource).not.toContain(
			'if (channel.status !== "active")',
		);
		expect(siteTaskDispatcherSource).not.toContain("仅启用渠道可更新");
	});

	it("单站手动拉取只要写入了模型就会让调用方刷新模型缓存", () => {
		expect(siteTaskDispatcherSource).toContain("models_changed");
		expect(siteTaskDispatcherSource).toContain("modelsToJson(result.models)");
		expect(siteTaskDispatcherSource).toContain("models_changed: true");
		expect(sitesRouteSource).toContain("if (result.models_changed)");
		expect(sitesRouteSource).toContain(
			"result.items.some((item) => item.models_changed)",
		);
	});
});
