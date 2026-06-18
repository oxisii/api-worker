import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const pricingViewSource = readFileSync(
	"apps/ui/src/features/PricingView.tsx",
	"utf8",
);
const usageViewSource = readFileSync("apps/ui/src/features/UsageView.tsx", "utf8");

describe("pricing and usage view source contracts", () => {
	it("使用日志不再展示计费状态", () => {
		expect(usageViewSource).not.toContain('label: "计费状态"');
		expect(usageViewSource).not.toContain('visibleColumnSet.has("charge_status")');
		expect(usageViewSource).not.toContain("getChargeStatusLabel");
		expect(usageViewSource).not.toContain('label: "输入 Tokens"');
		expect(usageViewSource).not.toContain('visibleColumnSet.has("prompt_tokens")');
	});

	it("价格行编辑保持稳定的单元格结构", () => {
		expect(pricingViewSource).toContain("app-pricing-edit-cell");
		expect(pricingViewSource).toContain("app-pricing-action-slot");
		expect(pricingViewSource).not.toContain("{isEditing ? (\r\n\t\t\t\t\t\t\t\t\t\t\t\t\t<Input");
		expect(pricingViewSource).not.toContain("{isEditing ? (\r\n\t\t\t\t\t\t\t\t\t\t\t\t\t<div class=\"grid gap-1.5\"");
	});

	it("价格表明确展示每 1M tokens 的单位", () => {
		expect(
			pricingViewSource.match(/\/ 1M tokens|每 1M tokens/g)?.length ?? 0,
		).toBeGreaterThanOrEqual(4);
		expect(pricingViewSource).toContain("普通输入 / 1M tokens");
		expect(pricingViewSource).toContain("缓存读/写 / 1M tokens");
		expect(pricingViewSource).toContain("输出 / 1M tokens");
		expect(pricingViewSource).toContain(
			"单位：{pricingCurrencySymbol} / 每 1M tokens",
		);
	});

	it("价格中心提供明确添加入口和表格筛选", () => {
		expect(pricingViewSource).toContain("添加价格");
		expect(pricingViewSource).toContain("计费匹配规则");
		expect(pricingViewSource).toContain("可直接切换");
		expect(pricingViewSource).toContain("人民币");
		expect(pricingViewSource).toContain("美元 ($)");
		expect(pricingViewSource).toContain("pricingCurrencyOptions");
		expect(pricingViewSource).toContain("onPricingCurrencyChange");
		expect(pricingViewSource).toContain("目标币种");
		expect(pricingViewSource).not.toContain("展示名称");
		expect(pricingViewSource).toContain("<Dialog");
		expect(pricingViewSource).toContain("DialogTitle");
		expect(pricingViewSource).toContain("SingleSelect");
		expect(pricingViewSource).toContain('id="pricing-search"');
		expect(pricingViewSource).toContain('id="pricing-source-filter"');
		expect(pricingViewSource).toContain('id="pricing-status-filter"');
		expect(pricingViewSource).toContain("filteredPrices");
		expect(pricingViewSource).not.toContain("<Select");
	});
});
