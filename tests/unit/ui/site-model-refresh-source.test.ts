import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const channelsViewSource = readFileSync(
	"apps/ui/src/features/ChannelsView.tsx",
	"utf8",
);

describe("site model refresh source contracts", () => {
	it("模型管理里的单站拉取模型按钮不会因为站点被禁用而锁死", () => {
		expect(channelsViewSource).not.toContain(
			'disabled={refreshPending || activeModelSite.status !== "active"}',
		);
		expect(channelsViewSource).not.toContain("仅启用渠道可更新");
	});
});
