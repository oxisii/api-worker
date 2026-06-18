import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const dashboardViewSource = readFileSync(
	"apps/ui/src/features/dashboard/DashboardView.tsx",
	"utf8",
);

describe("dashboard toolbar source contracts", () => {
	it("首页筛选条统一为单一工具栏布局", () => {
		expect(dashboardViewSource).toContain("const renderToolbar = () => (");
		expect(dashboardViewSource.match(/\{renderToolbar\(\)\}/g)?.length ?? 0).toBe(
			2,
		);
	});

	it("时间范围不再拆出单独的自定义入口", () => {
		expect(dashboardViewSource).toContain('placeholder="开始日期"');
		expect(dashboardViewSource).toContain('placeholder="结束日期"');
		expect(dashboardViewSource).toContain("handleDateChange");
		expect(dashboardViewSource).toContain('preset: "custom"');
		expect(dashboardViewSource).not.toContain('{ value: "custom", label: "自定义" }');
		expect(dashboardViewSource).not.toContain("更多筛选");
	});

	it("高级筛选入口与状态提示保持清晰", () => {
		expect(dashboardViewSource).toContain("筛选条件");
		expect(dashboardViewSource).toContain("已筛选 {activeFilterCount}");
		expect(dashboardViewSource).toContain("重置");
		expect(dashboardViewSource).toContain("应用筛选");
	});
});
