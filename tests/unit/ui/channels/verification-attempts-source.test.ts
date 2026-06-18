import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const appSource = readFileSync("apps/ui/src/app/App.tsx", "utf8");
const siteVerificationDialogSource = readFileSync(
	"apps/ui/src/app/SiteVerificationDialog.tsx",
	"utf8",
);
const channelsViewSource = readFileSync(
	"apps/ui/src/features/channels/ChannelsView.tsx",
	"utf8",
);
const verificationAttemptDetailsSource = readFileSync(
	"apps/ui/src/features/channels/VerificationAttemptDetails.tsx",
	"utf8",
);

describe("site verification attempts source", () => {
	it("单站验证结果弹窗会展示尝试记录摘要和逐次尝试", () => {
		expect(appSource).toContain("<SiteVerificationDialog");
		expect(siteVerificationDialogSource).toContain("尝试记录");
		expect(siteVerificationDialogSource).toContain(
			"getVerificationAttemptSummary",
		);
		expect(siteVerificationDialogSource).toContain("getVerificationAttempts");
		expect(siteVerificationDialogSource).toContain("第 {index + 1} 次");
	});

	it("站点任务报告会展示验证尝试记录", () => {
		expect(channelsViewSource).toContain("<VerificationAttemptDetails");
		expect(verificationAttemptDetailsSource).toContain("尝试记录");
		expect(verificationAttemptDetailsSource).toContain(
			"getVerificationAttemptSummary",
		);
		expect(verificationAttemptDetailsSource).toContain(
			"getVerificationAttempts",
		);
	});

	it("站点任务报告的尝试记录会展示详细错误信息", () => {
		expect(verificationAttemptDetailsSource).toContain("attempt.detail_code");
		expect(verificationAttemptDetailsSource).toContain("attempt.detail_message");
	});

	it("检测尝试记录使用固定高度并在内容过长时内部滚动", () => {
		expect(siteVerificationDialogSource).toContain(
			"max-h-72 space-y-2 overflow-y-auto pr-1",
		);
		expect(verificationAttemptDetailsSource).toContain(
			"max-h-36 space-y-1 overflow-y-auto pr-1",
		);
	});
});
