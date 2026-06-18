import { describe, expect, it } from "vitest";
import {
	classifyLinuxAutostartStatus,
	cleanPowerShellErrorText,
	formatWindowsAutostartPermissionError,
} from "../../../scripts/autostart-shared.mjs";

describe("classifyLinuxAutostartStatus", () => {
	it("warns when systemd is inactive but a manual daemon instance is running", () => {
		const status = classifyLinuxAutostartStatus({
			installed: true,
			enabled: true,
			activeState: "inactive",
			subState: "dead",
			launchMode: "direct-daemon",
			backgroundRunning: true,
		});

		expect(status.level).toBe("warn");
		expect(status.summary).toContain("systemd 未运行");
		expect(status.running).toBe(true);
		expect(status.needsMigration).toBe(false);
	});
});

describe("windows autostart error helpers", () => {
	it("removes CLIXML progress noise and keeps the real powershell error", () => {
		const cleaned = cleanPowerShellErrorText(`
#< CLIXML
<Objs Version="1.1.0.1"><Obj S="progress"><MS><PR N="Record"><AV>Preparing modules for first use.</AV></PR></MS></Obj><S S="Error">Register-ScheduledTask : Access is denied._x000D__x000A_</S><S S="Error">At line:8 char:1_x000D__x000A_</S></Objs>
`);

		expect(cleaned).toContain("Register-ScheduledTask : Access is denied.");
		expect(cleaned).not.toContain("CLIXML");
		expect(cleaned).not.toContain("Preparing modules for first use.");
	});

	it("formats access denied as an elevation hint for non-elevated windows sessions", () => {
		const message = formatWindowsAutostartPermissionError({
			errorText: "Register-ScheduledTask : Access is denied.",
			isElevated: false,
		});

		expect(message).toContain("当前终端未以管理员身份运行");
		expect(message).toContain("请用管理员身份重新打开 PowerShell");
	});
});
