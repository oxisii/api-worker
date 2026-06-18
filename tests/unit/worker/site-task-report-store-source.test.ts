import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync(
	"apps/worker/src/services/site-task-report-store.ts",
	"utf8",
);

describe("site task report store source contracts", () => {
	it("任务报告包含运行态与进度字段", () => {
		expect(source).toContain('status: "running"');
		expect(source).toContain("started_at");
		expect(source).toContain("finished_at");
		expect(source).toContain("progress");
	});
});
