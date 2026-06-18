import type { SiteForm } from "../../core/types";

export const normalizeCallTokenOrder = (tokens: SiteForm["call_tokens"]) =>
	tokens.map((token, index) => ({
		...token,
		priority: index,
	}));

const createDraftCallTokenId = () => {
	callTokenDraftKeySeed += 1;
	return `draft-call-token-${callTokenDraftKeySeed}`;
};

export const ensureCallTokenClientIds = (
	tokens: SiteForm["call_tokens"] | null | undefined,
	previousTokens: SiteForm["call_tokens"] = [],
) =>
	(tokens ?? []).map((token, index) => {
		const persistedId = String(token.id ?? "").trim();
		if (persistedId) {
			return {
				...token,
				id: persistedId,
			};
		}
		const previousId = String(previousTokens[index]?.id ?? "").trim();
		if (previousId) {
			return {
				...token,
				id: previousId,
			};
		}
		return {
			...token,
			id: createDraftCallTokenId(),
		};
	});

export const getCallTokenDragKey = (
	token: SiteForm["call_tokens"][number],
	fallbackIndex: number,
) => {
	if (token.id) {
		return token.id;
	}
	const existingKey = callTokenDraftKeyMap.get(token);
	if (existingKey) {
		return existingKey;
	}
	const nextKey = `draft-${fallbackIndex}-${callTokenDraftKeySeed + 1}`;
	callTokenDraftKeySeed += 1;
	callTokenDraftKeyMap.set(token, nextKey);
	return nextKey;
};

export const reorderCallTokens = (
	tokens: SiteForm["call_tokens"],
	fromIndex: number,
	toIndex: number,
) => {
	if (
		fromIndex === toIndex ||
		fromIndex < 0 ||
		toIndex < 0 ||
		fromIndex >= tokens.length ||
		toIndex >= tokens.length
	) {
		return tokens;
	}
	const next = [...tokens];
	const [movedToken] = next.splice(fromIndex, 1);
	next.splice(toIndex, 0, movedToken);
	return next;
};

export const haveSameCallTokenSequence = (
	left: SiteForm["call_tokens"],
	right: SiteForm["call_tokens"],
) => {
	if (left.length !== right.length) {
		return false;
	}
	for (let index = 0; index < left.length; index += 1) {
		const leftKey = getCallTokenDragKey(left[index], index);
		const rightKey = getCallTokenDragKey(right[index], index);
		if (leftKey !== rightKey) {
			return false;
		}
	}
	return true;
};

export const logCallTokenDrag = (
	stage: string,
	detail: Record<string, unknown> = {},
) => {
	if (typeof window === "undefined") {
		return;
	}
	const enabled =
		import.meta.env.DEV ||
		window.localStorage.getItem("debug:site-call-token-drag") === "1";
	if (!enabled) {
		return;
	}
	console.debug("[sites:call-token-drag]", stage, detail);
};

export const callTokenFlipDurationMs = 220;
export const callTokenDropSettleMs = 180;

const callTokenDraftKeyMap = new WeakMap<
	SiteForm["call_tokens"][number],
	string
>();
let callTokenDraftKeySeed = 0;

export type ActiveCallTokenDrag = {
	currentIndex: number;
	grabOffsetX: number;
	grabOffsetY: number;
	height: number;
	isSettling: boolean;
	left: number;
	pointerId: number;
	tokenKey: string;
	top: number;
	width: number;
};

export type CallTokenOverlayVisual = {
	frameId: number | null;
	scale: number;
	transition: string;
	x: number;
	y: number;
};
