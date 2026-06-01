import { describe, expect, it } from "vitest";
import { tabs } from "../../apps/ui/src/core/constants";

describe("navigation tabs", () => {
	it("shows pricing center as an independent main navigation entry", () => {
		expect(tabs.map((tab) => tab.id)).toEqual([
			"dashboard",
			"channels",
			"models",
			"canonicalModels",
			"pricing",
			"tokens",
			"usage",
			"settings",
		]);
		expect(tabs.find((tab) => tab.id === "pricing")?.label).toBe("价格中心");
	});
});
