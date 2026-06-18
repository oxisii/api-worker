import type { EndpointOverrides } from "../../domains/site/metadata";
import type {
	NormalizedEmbeddingRequest,
	NormalizedImageRequest,
	ProviderType,
	UpstreamRequest,
} from "../provider-transform";
import { getProviderAdapter } from ".";

export function buildProviderEmbeddingRequest(
	provider: ProviderType,
	normalized: NormalizedEmbeddingRequest,
	model: string | null,
	endpointOverrides: EndpointOverrides,
): UpstreamRequest | null {
	return getProviderAdapter(provider).buildEmbeddingRequest(
		normalized,
		model,
		endpointOverrides,
	);
}

export function buildProviderImageRequest(
	provider: ProviderType,
	normalized: NormalizedImageRequest,
	model: string | null,
	endpointOverrides: EndpointOverrides,
): UpstreamRequest | null {
	return getProviderAdapter(provider).buildImageRequest(
		normalized,
		model,
		endpointOverrides,
	);
}
