#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import {
	existsSync,
	mkdirSync,
	readFileSync,
	rmSync,
	writeFileSync,
} from "node:fs";
import { homedir } from "node:os";
import path from "node:path";
import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import { fileURLToPath } from "node:url";

import {
	autostartTaskName,
	backgroundLogModeOptions,
	buildBackgroundStateFromArgs,
	buildInteractiveEnableArgs,
	buildLinuxServiceArguments,
	buildLinuxAutostartUnit,
	buildTaskArguments,
	classifyLinuxAutostartStatus,
	cleanPowerShellErrorText,
	detectLinuxAutostartLaunchMode,
	encodePowerShellCommand,
	escapeForSingleQuotedPowerShell,
	formatWindowsAutostartPermissionError,
	getLinuxAutostartPaths,
	interactiveEnableOptions,
	linuxAutostartServiceName,
	parseBackgroundLogModeArgs,
	parseSystemctlShowOutput,
	parseUiBuildModeArgs,
	uiBuildModeOptions,
} from "./autostart-shared.mjs";

const rawArgs = process.argv.slice(2);
const action = rawArgs[0]?.trim().toLowerCase() ?? "interactive";
const devArgs = rawArgs.slice(1);
const scriptPath = fileURLToPath(import.meta.url);
const repoRoot = path.resolve(path.dirname(scriptPath), "..");
const devScriptPath = path.join(repoRoot, "scripts", "dev.mjs");
const devStatePath = path.join(repoRoot, ".dev", "dev-runner.json");
const devLogPath = path.join(repoRoot, ".dev", "dev-runner.log");

const resolveBunCommand = () => {
	if (process.env.BUN_BIN && existsSync(process.env.BUN_BIN)) {
		return process.env.BUN_BIN;
	}
	const npmExec = process.env.npm_execpath;
	if (npmExec && existsSync(npmExec)) {
		const npmExecBaseName = path.basename(npmExec).toLowerCase();
		if (npmExecBaseName === "bun" || npmExecBaseName === "bun.exe") {
			return npmExec;
		}
	}
	if (process.env.BUN_INSTALL) {
		const candidate = path.join(
			process.env.BUN_INSTALL,
			"bin",
			process.platform === "win32" ? "bun.exe" : "bun",
		);
		if (existsSync(candidate)) {
			return candidate;
		}
	}
	if (process.platform === "win32") {
		const whereResult = spawnSync("where.exe", ["bun"], { encoding: "utf8" });
		if (whereResult.status === 0) {
			const firstMatch = whereResult.stdout
				.split(/\r?\n/u)
				.map((item) => item.trim())
				.find(Boolean);
			if (firstMatch) {
				return firstMatch;
			}
		}
	}
	return "bun";
};

const printUsage = () => {
	console.log("用法:");
	console.log("  bun run autostart");
	console.log(
		"  bun run autostart -- enable [dev 参数，空格分隔，例如 --no-ui --remote-d1]",
	);
	console.log("  bun run autostart -- disable");
	console.log("  bun run autostart -- status");
};

const ensureWindows = () => {
	if (process.platform !== "win32") {
		throw new Error("当前不是 Windows 环境。");
	}
};

const ensureLinux = () => {
	if (process.platform !== "linux") {
		throw new Error("当前不是 Linux 环境。");
	}
};

const runCommand = (command, args, fallbackMessage, options = {}) => {
	const result = spawnSync(command, args, { encoding: "utf8" });
	if (result.error) {
		if (options.allowFailure) {
			return result;
		}
		throw result.error;
	}
	if (!options.allowFailure && result.status !== 0) {
		const errorText = result.stderr?.trim() || result.stdout?.trim();
		throw new Error(errorText || fallbackMessage);
	}
	return result;
};

const runPowerShell = (script) => {
	const encodedCommand = encodePowerShellCommand(script);
	const result = spawnSync(
		"powershell.exe",
		["-NoProfile", "-NonInteractive", "-EncodedCommand", encodedCommand],
		{ encoding: "utf8" },
	);
	if (result.error) {
		throw result.error;
	}
	if (result.status !== 0) {
		const errorText = cleanPowerShellErrorText(
			result.stderr?.trim() || result.stdout?.trim() || "PowerShell 执行失败。",
		);
		throw new Error(errorText || "PowerShell 执行失败。");
	}
	return result.stdout.trim();
};

const runPowerShellJson = (script) => {
	const stdout = runPowerShell(script);
	if (!stdout) {
		return null;
	}
	return JSON.parse(stdout);
};

const runSystemctlUser = (args, options = {}) =>
	runCommand(
		"systemctl",
		["--user", ...args],
		"systemctl --user 执行失败。",
		options,
	);

const isPidRunning = (pid) => {
	if (typeof pid !== "number" || Number.isNaN(pid)) {
		return false;
	}
	try {
		process.kill(pid, 0);
		return true;
	} catch {
		return false;
	}
};

const readBackgroundState = () => {
	if (existsSync(devStatePath)) {
		try {
			const state = JSON.parse(readFileSync(devStatePath, "utf8"));
			if (isPidRunning(state.pid)) {
				return state;
			}
		} catch {
			// ignore and fall back to process probing
		}
	}
	if (process.platform === "win32") {
		return null;
	}
	const psResult = spawnSync("ps", ["-eo", "pid=,args="], { encoding: "utf8" });
	if (psResult.status !== 0) {
		return null;
	}
	for (const line of psResult.stdout.split(/\r?\n/u)) {
		const match = line.trim().match(/^(\d+)\s+(.+)$/u);
		if (!match) {
			continue;
		}
		const pid = Number(match[1]);
		const commandLine = match[2];
		if (
			!commandLine.includes(devScriptPath) ||
			!commandLine.includes("--_daemon")
		) {
			continue;
		}
		const parts = commandLine.split(/\s+/u);
		const scriptIndex = parts.findIndex((item) => item === devScriptPath);
		if (scriptIndex < 0) {
			continue;
		}
		const startedAtResult = spawnSync(
			"ps",
			["-p", String(pid), "-o", "lstart="],
			{
				encoding: "utf8",
			},
		);
		return buildBackgroundStateFromArgs({
			pid,
			args: parts.slice(scriptIndex + 1),
			startedAt: startedAtResult.stdout.trim() || null,
			defaultLogPath: devLogPath,
		});
	}
	return null;
};

const ensureLinuxSystemdUser = () => {
	ensureLinux();
	const result = runSystemctlUser(["show-environment"], { allowFailure: true });
	if (result.error?.code === "ENOENT") {
		throw new Error(
			"未找到 systemctl，当前 Linux 环境无法使用 systemd --user 自启动。",
		);
	}
	if (result.error) {
		throw result.error;
	}
	if (result.status !== 0) {
		const errorText = result.stderr?.trim() || result.stdout?.trim();
		throw new Error(
			errorText || "当前 Linux 会话未启用 systemd --user，无法配置自启动。",
		);
	}
};

const getLinuxLingerEnabled = () => {
	ensureLinux();
	const username = process.env.USER?.trim();
	if (!username) {
		return null;
	}
	const result = runCommand(
		"loginctl",
		["show-user", username, "--property=Linger", "--value"],
		"loginctl 执行失败。",
		{ allowFailure: true },
	);
	if (result.error?.code === "ENOENT") {
		return null;
	}
	if (result.error || result.status !== 0) {
		return null;
	}
	const value = result.stdout.trim().toLowerCase();
	if (value === "yes") {
		return true;
	}
	if (value === "no") {
		return false;
	}
	return null;
};

const buildScheduledTaskLauncher = (args) => {
	const bunCommand = resolveBunCommand();
	const escapedBunCommand = escapeForSingleQuotedPowerShell(bunCommand);
	const escapedRepoRoot = escapeForSingleQuotedPowerShell(repoRoot);
	const argumentList = buildTaskArguments(args)
		.map((item) => `'${escapeForSingleQuotedPowerShell(item)}'`)
		.join(", ");
	const hiddenLauncherScript = [
		"$ErrorActionPreference = 'Stop'",
		`Start-Process -FilePath '${escapedBunCommand}' -ArgumentList @(${argumentList}) -WorkingDirectory '${escapedRepoRoot}' -WindowStyle Hidden`,
	].join("\n");

	return {
		execute: "powershell.exe",
		arguments: `-NoProfile -NonInteractive -WindowStyle Hidden -EncodedCommand ${encodePowerShellCommand(hiddenLauncherScript)}`,
	};
};

const getWindowsAutostartInfo = () => {
	ensureWindows();
	const taskName = escapeForSingleQuotedPowerShell(autostartTaskName);
	const task = runPowerShellJson(`
$ErrorActionPreference = 'Stop'
$task = Get-ScheduledTask -TaskName '${taskName}' -ErrorAction SilentlyContinue
if ($null -eq $task) {
  [pscustomobject]@{
    enabled = $false
  } | ConvertTo-Json -Compress
  return
}
$action = $task.Actions | Select-Object -First 1
[pscustomobject]@{
  enabled = $true
  taskName = $task.TaskName
  state = [string]$task.State
  execute = $action.Execute
  arguments = $action.Arguments
  workingDirectory = $action.WorkingDirectory
} | ConvertTo-Json -Compress
`);
	return task
		? {
				...task,
				backgroundState: readBackgroundState(),
			}
		: null;
};

const getWindowsElevationState = () => {
	ensureWindows();
	const result = runPowerShellJson(`
$id = [System.Security.Principal.WindowsIdentity]::GetCurrent()
$principal = New-Object System.Security.Principal.WindowsPrincipal($id)
[pscustomobject]@{
  user = $id.Name
  isElevated = $principal.IsInRole([System.Security.Principal.WindowsBuiltInRole]::Administrator)
} | ConvertTo-Json -Compress
`);
	return {
		user: result?.user ?? null,
		isElevated: Boolean(result?.isElevated),
	};
};

const enableWindowsAutostart = (args) => {
	ensureWindows();
	const escapedTaskName = escapeForSingleQuotedPowerShell(autostartTaskName);
	const launcher = buildScheduledTaskLauncher(args);
	const escapedExecute = escapeForSingleQuotedPowerShell(launcher.execute);
	const escapedArguments = escapeForSingleQuotedPowerShell(launcher.arguments);
	const escapedRepoRoot = escapeForSingleQuotedPowerShell(repoRoot);
	const encodedCommand = encodePowerShellCommand(`
$ErrorActionPreference = 'Stop'
$userId = [System.Security.Principal.WindowsIdentity]::GetCurrent().Name
$action = New-ScheduledTaskAction -Execute '${escapedExecute}' -Argument '${escapedArguments}' -WorkingDirectory '${escapedRepoRoot}'
$trigger = New-ScheduledTaskTrigger -AtLogOn
$principal = New-ScheduledTaskPrincipal -UserId $userId -LogonType Interactive -RunLevel Limited
$settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -ExecutionTimeLimit ([TimeSpan]::Zero)
Register-ScheduledTask -TaskName '${escapedTaskName}' -Action $action -Trigger $trigger -Principal $principal -Settings $settings -Description 'api-worker 开发服务自启动' -Force | Out-Null
[pscustomobject]@{
  taskName = '${escapedTaskName}'
  execute = $action.Execute
  arguments = $action.Arguments
  workingDirectory = $action.WorkingDirectory
} | ConvertTo-Json -Compress
`);
	const result = spawnSync(
		"powershell.exe",
		["-NoProfile", "-NonInteractive", "-EncodedCommand", encodedCommand],
		{ encoding: "utf8" },
	);
	if (result.error) {
		throw result.error;
	}
	if (result.status !== 0) {
		const elevationState = getWindowsElevationState();
		throw new Error(
			formatWindowsAutostartPermissionError({
				errorText:
					result.stderr?.trim() ||
					result.stdout?.trim() ||
					"PowerShell 执行失败。",
				isElevated: elevationState.isElevated,
			}),
		);
	}
	const stdout = result.stdout.trim();
	const parsed = stdout ? JSON.parse(stdout) : null;

	console.log("✅ 已开启自启动。");
	console.log(`计划任务: ${parsed.taskName}`);
	console.log(`程序: ${parsed.execute}（隐藏启动器）`);
	console.log(`参数: ${parsed.arguments}`);
	console.log(`工作目录: ${parsed.workingDirectory}`);
};

const disableWindowsAutostart = () => {
	ensureWindows();
	const taskName = escapeForSingleQuotedPowerShell(autostartTaskName);
	const result = runPowerShellJson(`
$ErrorActionPreference = 'Stop'
$task = Get-ScheduledTask -TaskName '${taskName}' -ErrorAction SilentlyContinue
if ($null -eq $task) {
  [pscustomobject]@{ removed = $false } | ConvertTo-Json -Compress
  return
}
Unregister-ScheduledTask -TaskName '${taskName}' -Confirm:$false
[pscustomobject]@{ removed = $true } | ConvertTo-Json -Compress
`);
	if (result?.removed) {
		console.log("✅ 已关闭自启动。");
		console.log(`已删除计划任务: ${autostartTaskName}`);
		return;
	}
	console.log("ℹ️ 当前未开启自启动。");
};

const printWindowsAutostartStatus = () => {
	const task = getWindowsAutostartInfo();
	if (!task?.enabled) {
		console.log("ℹ️ 自启动状态：未开启。");
		const backgroundState = task?.backgroundState ?? readBackgroundState();
		if (backgroundState) {
			console.log(`后台实例: 运行中（PID ${backgroundState.pid}）`);
		}
		return;
	}
	console.log("✅ 自启动状态：已开启。");
	console.log(`计划任务: ${task.taskName}`);
	console.log(`任务状态: ${task.state}`);
	console.log(`程序: ${task.execute}`);
	console.log(`参数: ${task.arguments}`);
	console.log(`工作目录: ${task.workingDirectory}`);
	if (task.backgroundState) {
		console.log(`后台实例: 运行中（PID ${task.backgroundState.pid}）`);
	} else {
		console.log("后台实例: 未运行");
	}
};

const getLinuxAutostartInfo = () => {
	ensureLinuxSystemdUser();
	const { servicePath } = getLinuxAutostartPaths(homedir());
	const lingerEnabled = getLinuxLingerEnabled();
	if (!existsSync(servicePath)) {
		return {
			enabled: false,
			installed: false,
			serviceName: linuxAutostartServiceName,
			servicePath,
			lingerEnabled,
		};
	}

	const unitContents = readFileSync(servicePath, "utf8");

	const result = runSystemctlUser(
		[
			"show",
			linuxAutostartServiceName,
			"--no-pager",
			"--property=LoadState,UnitFileState,ActiveState,SubState,FragmentPath",
		],
		{ allowFailure: true },
	);
	if (result.error) {
		throw result.error;
	}

	const details = parseSystemctlShowOutput(result.stdout);
	const unitFileState = details.UnitFileState ?? "unknown";
	const backgroundState = readBackgroundState();
	const launchMode = detectLinuxAutostartLaunchMode(unitContents);
	return {
		enabled: unitFileState.startsWith("enabled"),
		installed: true,
		serviceName: linuxAutostartServiceName,
		servicePath,
		unitFileState,
		activeState: details.ActiveState ?? "unknown",
		subState: details.SubState ?? "unknown",
		fragmentPath: details.FragmentPath || servicePath,
		backgroundState,
		launchMode,
		lingerEnabled,
	};
};

const enableLinuxAutostart = (args) => {
	ensureLinuxSystemdUser();
	const { userUnitDir, servicePath } = getLinuxAutostartPaths(homedir());
	mkdirSync(userUnitDir, { recursive: true });

	const bunCommand = resolveBunCommand();
	writeFileSync(
		servicePath,
		buildLinuxAutostartUnit({ bunCommand, repoRoot, args }),
		"utf8",
	);

	runSystemctlUser(["daemon-reload"]);
	runSystemctlUser(["enable", "--now", linuxAutostartServiceName]);

	console.log("✅ 已开启自启动。");
	console.log(`systemd 用户服务: ${linuxAutostartServiceName}`);
	console.log(`服务文件: ${servicePath}`);
	console.log(`工作目录: ${repoRoot}`);
	console.log(
		`命令: ${[bunCommand, ...buildLinuxServiceArguments(args)].join(" ")}`,
	);
	const lingerEnabled = getLinuxLingerEnabled();
	if (lingerEnabled === false) {
		console.log(
			"⚠️ 当前用户未开启 linger；Linux 仅在用户登录后才会拉起该 user service。若希望开机后未登录也自动启动，请执行：sudo loginctl enable-linger $USER",
		);
	}
};

const disableLinuxAutostart = () => {
	ensureLinuxSystemdUser();
	const { servicePath } = getLinuxAutostartPaths(homedir());
	const existed = existsSync(servicePath);
	const disableResult = runSystemctlUser(
		["disable", "--now", linuxAutostartServiceName],
		{ allowFailure: true },
	);

	if (existsSync(servicePath)) {
		rmSync(servicePath, { force: true });
	}

	runSystemctlUser(["daemon-reload"]);
	runSystemctlUser(["reset-failed", linuxAutostartServiceName], {
		allowFailure: true,
	});

	if (existed || disableResult.status === 0) {
		console.log("✅ 已关闭自启动。");
		console.log(`已移除 systemd 用户服务: ${linuxAutostartServiceName}`);
		return;
	}
	console.log("ℹ️ 当前未开启自启动。");
};

const printLinuxAutostartStatus = () => {
	const service = getLinuxAutostartInfo();
	if (!service.installed) {
		console.log("ℹ️ 自启动状态：未开启。");
		console.log(`服务文件: ${service.servicePath}`);
		const backgroundState = readBackgroundState();
		if (backgroundState) {
			console.log(`后台实例: 运行中（PID ${backgroundState.pid}）`);
		}
		return;
	}

	const status = classifyLinuxAutostartStatus({
		installed: service.installed,
		enabled: service.enabled,
		activeState: service.activeState,
		subState: service.subState,
		launchMode: service.launchMode,
		backgroundRunning: Boolean(service.backgroundState),
	});
	const statusPrefix =
		status.level === "success" ? "✅" : status.level === "warn" ? "⚠️" : "ℹ️";
	console.log(`${statusPrefix} 自启动状态：${status.summary}。`);
	console.log(`systemd 用户服务: ${service.serviceName}`);
	console.log(
		`启动链路: ${
			service.launchMode === "direct-daemon"
				? "systemd 直接托管 dev 守护进程"
				: service.launchMode === "legacy-bg"
					? "旧版 --bg 二次派生"
					: "未知"
		}`,
	);
	console.log(`启用状态: ${service.unitFileState}`);
	console.log(`当前状态: ${service.activeState}/${service.subState}`);
	if (service.lingerEnabled === false) {
		console.log(
			"⚠️ linger: 未开启（重启后需用户登录才会启动；若要未登录也自动启动，请执行 sudo loginctl enable-linger $USER）",
		);
	} else if (service.lingerEnabled === true) {
		console.log("linger: 已开启");
	}
	if (service.backgroundState) {
		console.log(`后台实例: 运行中（PID ${service.backgroundState.pid}）`);
	} else if (status.running) {
		console.log("后台实例: 已运行（由 systemd 直接托管）");
	} else {
		console.log("后台实例: 未运行");
	}
	console.log(`服务文件: ${service.fragmentPath}`);
	if (status.needsMigration) {
		console.log(
			"⚠️ 检测到旧版 Linux 自启动配置：该 service 仍通过 --bg 二次派生后台进程，systemd 无法可靠跟踪实际实例。",
		);
		console.log(
			"⚠️ 请重新执行 bun run autostart -- enable [原有参数] 覆盖更新 service 文件。",
		);
	}
};

const enableAutostart = (args) => {
	if (process.platform === "win32") {
		enableWindowsAutostart(args);
		return;
	}
	if (process.platform === "linux") {
		enableLinuxAutostart(args);
		return;
	}
	throw new Error(
		"当前仅支持 Windows 计划任务或 Linux systemd --user 自启动。",
	);
};

const disableAutostart = () => {
	if (process.platform === "win32") {
		disableWindowsAutostart();
		return;
	}
	if (process.platform === "linux") {
		disableLinuxAutostart();
		return;
	}
	throw new Error(
		"当前仅支持 Windows 计划任务或 Linux systemd --user 自启动。",
	);
};

const showStatus = () => {
	if (process.platform === "win32") {
		printWindowsAutostartStatus();
		return;
	}
	if (process.platform === "linux") {
		printLinuxAutostartStatus();
		return;
	}
	throw new Error(
		"当前仅支持 Windows 计划任务或 Linux systemd --user 自启动。",
	);
};

const runInteractive = async () => {
	console.log("交互模式：自启动配置");
	showStatus();
	console.log("");
	const rl = createInterface({ input, output });
	try {
		while (true) {
			console.log("1. 开始（开启自启动）");
			console.log("2. 关闭（移除自启动）");
			console.log("3. 状态（查看当前配置）");
			console.log("0. 退出");
			const answer = (await rl.question("请选择操作编号: "))
				.trim()
				.toLowerCase();
			if (answer === "0") {
				console.log("已退出交互模式。");
				return;
			}
			if (answer === "1") {
				console.log("");
				console.log("开始自启动：请选择要附加的参数（可多选）");
				for (let i = 0; i < interactiveEnableOptions.length; i += 1) {
					const item = interactiveEnableOptions[i];
					console.log(`${i + 1}. ${item.label}: ${item.flag}`);
				}
				const selection = await rl.question(
					"输入编号（示例: 1 3；直接回车=不附加参数）: ",
				);
				const args = buildInteractiveEnableArgs(selection);
				console.log("");
				console.log("UI 预构建策略（单选）:");
				for (const option of uiBuildModeOptions) {
					console.log(`${option.mode}. ${option.label}`);
				}
				const uiBuildMode = await rl.question(
					"请选择 UI 预构建策略（默认 2）: ",
				);
				const uiBuildArgs = parseUiBuildModeArgs(uiBuildMode);
				console.log("");
				console.log("后台日志策略（单选）:");
				for (const option of backgroundLogModeOptions) {
					console.log(`${option.mode}. ${option.label}`);
				}
				const logMode = await rl.question("请选择后台日志策略（默认 1）: ");
				enableAutostart([
					...args,
					...uiBuildArgs,
					...parseBackgroundLogModeArgs(logMode),
				]);
				return;
			}
			if (answer === "2") {
				disableAutostart();
				return;
			}
			if (answer === "3") {
				showStatus();
				console.log("");
				continue;
			}
			console.log("输入无效，请输入 0 / 1 / 2 / 3。");
		}
	} finally {
		rl.close();
	}
};

const main = async () => {
	if (action === "interactive") {
		await runInteractive();
		return;
	}
	if (action === "help" || action === "--help" || action === "-h") {
		printUsage();
		return;
	}
	if (action === "enable") {
		enableAutostart(devArgs);
		return;
	}
	if (action === "disable") {
		disableAutostart();
		return;
	}
	if (action === "status") {
		showStatus();
		return;
	}
	printUsage();
};

try {
	await main();
} catch (error) {
	console.error(`❌ ${error.message}`);
	process.exit(1);
}
