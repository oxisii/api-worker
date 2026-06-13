export const autostartTaskName: string;
export const linuxAutostartServiceName: string;

export const interactiveEnableOptions: Array<{
	flag: string;
	label: string;
}>;

export const uiBuildModeOptions: Array<{
	mode: string;
	label: string;
	flags: string[];
}>;

export const backgroundLogModeOptions: Array<{
	mode: string;
	label: string;
	flags: string[];
}>;

export function escapeForSingleQuotedPowerShell(value: unknown): string;
export function normalizeDevArgs(args: string[]): string[];
export function buildTaskArguments(args: string[]): string[];
export function encodePowerShellCommand(script: string): string;
export function cleanPowerShellErrorText(text: unknown): string;
export function formatWindowsAutostartPermissionError(input: {
	errorText: unknown;
	isElevated: boolean;
}): string;
export function parseInteractiveSelection(
	raw: unknown,
	maxIndex: number,
): number[];
export function buildInteractiveEnableArgs(selection: unknown): string[];
export function parseUiBuildModeArgs(selection: unknown): string[];
export function parseBackgroundLogModeArgs(selection: unknown): string[];
export function quoteSystemdArgument(arg: unknown): string;
export function buildLinuxAutostartUnit(input: {
	bunCommand: string;
	repoRoot: string;
	args: string[];
}): string;
export function classifyLinuxAutostartStatus(input: {
	installed: boolean;
	enabled: boolean;
	activeState?: string;
	subState?: string;
	launchMode?: string;
	backgroundRunning?: boolean;
}): {
	level: string;
	summary: string;
	running: boolean;
	needsMigration: boolean;
};
export function detectLinuxAutostartLaunchMode(unitText: string): string;
export function buildBackgroundStateFromArgs(input: {
	pid: number;
	args?: string[];
	startedAt?: string | null;
	defaultLogPath: string;
}): {
	pid: number;
	args: string[];
	startedAt?: string | null;
	logMode: string;
	logPath: string | null;
};
export function parseSystemctlShowOutput(text: unknown): Record<string, string>;
export function getLinuxAutostartPaths(homeDirectory: string): {
	userUnitDir: string;
	servicePath: string;
};
