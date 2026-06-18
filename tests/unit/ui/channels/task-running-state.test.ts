import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const appSource = readFileSync("apps/ui/src/app/App.tsx", "utf8");
const channelsViewSource = readFileSync(
	"apps/ui/src/features/channels/ChannelsView.tsx",
	"utf8",
);
const sitesRouteSource = readFileSync("apps/worker/src/routes/sites.ts", "utf8");

describe("site task running state contracts", () => {
	it("站点管理会展示运行中的批量任务", () => {
		expect(appSource).toContain("buildRunningSiteTaskReport");
		expect(appSource).toContain("hasRunningSiteTask");
		expect(sitesRouteSource).toContain("task_already_running");
		expect(channelsViewSource).toContain("进行中");
		expect(channelsViewSource).toContain("current_site_name");
	});
});
