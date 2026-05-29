import type { RequestEntryFormat, SiteType } from "../core/types";

export type RequestEntryFormatOption = {
	value: RequestEntryFormat | "";
	label: string;
};

const automaticOption: RequestEntryFormatOption = {
	value: "",
	label: "自动",
};

const openAiChatOption: RequestEntryFormatOption = {
	value: "openai_chat",
	label: "OpenAI Chat",
};

const openAiResponsesOption: RequestEntryFormatOption = {
	value: "openai_responses",
	label: "OpenAI Responses",
};

const anthropicOption: RequestEntryFormatOption = {
	value: "anthropic_messages",
	label: "Anthropic Messages",
};

const geminiOption: RequestEntryFormatOption = {
	value: "gemini_generate_content",
	label: "Gemini Generate Content",
};

export function getRequestEntryFormatOptions(
	siteType: SiteType,
): RequestEntryFormatOption[] {
	if (siteType === "anthropic") {
		return [automaticOption, anthropicOption];
	}
	if (siteType === "subapi") {
		return [
			automaticOption,
			openAiChatOption,
			openAiResponsesOption,
			anthropicOption,
			geminiOption,
		];
	}
	if (siteType === "gemini") {
		return [automaticOption, geminiOption];
	}
	return [automaticOption, openAiChatOption, openAiResponsesOption];
}

export function isRequestEntryFormatAllowedForSiteType(
	siteType: SiteType,
	format: string,
): boolean {
	if (!format) {
		return true;
	}
	return getRequestEntryFormatOptions(siteType).some(
		(option) => option.value === format,
	);
}
