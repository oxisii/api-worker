import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const appSource = readFileSync("apps/ui/src/App.tsx", "utf8");
const channelsViewSource = readFileSync(
	"apps/ui/src/features/ChannelsView.tsx",
	"utf8",
);

describe("site verification attempts source", () => {
	it("单站验证结果弹窗会展示尝试记录摘要和逐次尝试", () => {
		expect(appSource).toContain("尝试记录");
		expect(appSource).toContain("getVerificationAttemptSummary");
		expect(appSource).toContain("getVerificationAttempts");
		expect(appSource).toContain("第 {index + 1} 次");
	});

	it("站点任务报告会展示验证尝试记录", () => {
		expect(channelsViewSource).toContain("尝试记录");
		expect(channelsViewSource).toContain("renderVerificationAttemptDetails");
		expect(channelsViewSource).toContain("getVerificationAttemptSummary");
		expect(channelsViewSource).toContain("getVerificationAttempts");
	});
});
