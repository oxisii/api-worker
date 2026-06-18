import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const channelsViewSource = readFileSync(
	"apps/ui/src/features/ChannelsView.tsx",
	"utf8",
);

describe("channels view request entry order", () => {
	it("在移动卡片和桌面列表里都先显示请求入口再显示最近验证", () => {
		const requestEntryIndexes = Array.from(
			channelsViewSource.matchAll(/请求入口：\{requestEntrySummary\}/g),
			(match) => match.index ?? -1,
		).filter((index) => index >= 0);
		const verificationIndexes = Array.from(
			channelsViewSource.matchAll(/最近验证：/g),
			(match) => match.index ?? -1,
		).filter((index) => index >= 0);

		expect(requestEntryIndexes).toHaveLength(2);
		expect(verificationIndexes).toHaveLength(2);
		expect(requestEntryIndexes[0]).toBeLessThan(verificationIndexes[0]);
		expect(requestEntryIndexes[1]).toBeLessThan(verificationIndexes[1]);
	});
});
