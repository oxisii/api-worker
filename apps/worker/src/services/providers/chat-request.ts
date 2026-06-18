import type { EndpointOverrides } from "../../domains/site/metadata";
import {
	buildUpstreamChatRequest,
	type EndpointType,
	type NormalizedChatRequest,
	type ProviderType,
	type UpstreamRequest,
} from "../provider-transform";

export function buildProviderChatRequest(
	provider: ProviderType,
	normalized: NormalizedChatRequest,
	model: string | null,
	endpoint: EndpointType,
	isStream: boolean,
	endpointOverrides: EndpointOverrides,
): UpstreamRequest | null {
	return buildUpstreamChatRequest(
		provider,
		normalized,
		model,
		endpoint,
		isStream,
		endpointOverrides,
	);
}
