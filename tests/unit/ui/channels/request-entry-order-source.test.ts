import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const channelsViewSource = readFileSync(
	"apps/ui/src/features/channels/ChannelsView.tsx",
	"utf8",
);
const sitesTableSource = readFileSync(
	"apps/ui/src/features/channels/SitesTable.tsx",
	"utf8",
);

describe("channels view request entry order", () => {
	it("在移动卡片和桌面列表里都先显示请求入口再显示最近验证", () => {
		const getIndexes = (source: string, pattern: RegExp) =>
			Array.from(source.matchAll(pattern), (match) => match.index ?? -1).filter(
				(index) => index >= 0,
			);
		const mobileRequestEntryIndexes = getIndexes(
			channelsViewSource,
			/请求入口：\{requestEntrySummary\}/g,
		);
		const mobileVerificationIndexes = getIndexes(
			channelsViewSource,
			/最近验证：/g,
		);
		const tableRequestEntryIndexes = getIndexes(
			sitesTableSource,
			/请求入口：\{requestEntrySummary\}/g,
		);
		const tableVerificationIndexes = getIndexes(
			sitesTableSource,
			/最近验证：/g,
		);

		expect(mobileRequestEntryIndexes).toHaveLength(1);
		expect(mobileVerificationIndexes).toHaveLength(1);
		expect(tableRequestEntryIndexes).toHaveLength(1);
		expect(tableVerificationIndexes).toHaveLength(1);
		expect(mobileRequestEntryIndexes[0]).toBeLessThan(
			mobileVerificationIndexes[0],
		);
		expect(tableRequestEntryIndexes[0]).toBeLessThan(
			tableVerificationIndexes[0],
		);
	});
});
