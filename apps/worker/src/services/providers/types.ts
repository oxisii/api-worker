import type { ProviderType } from "../provider-transform";
import type {
	NormalizedEmbeddingRequest,
	NormalizedImageRequest,
	UpstreamRequest,
} from "../provider-transform";
import type { EndpointOverrides } from "../../domains/site/metadata";

export type ModelDiscoveryResult = {
	ok: boolean;
	elapsed: number;
	models: string[];
	payload?: unknown;
	httpStatus?: number | null;
	detail?: string | null;
};

export type ProviderAdapter = {
	readonly provider: ProviderType;
	supportsModelDiscovery(): boolean;
	discoverModels(
		baseUrl: string,
		apiKey: string,
		fetcher?: typeof fetch,
	): Promise<ModelDiscoveryResult>;
	buildAuthHeaders(
		baseHeaders: Headers,
		apiKey: string,
		overrides: Record<string, string>,
	): Headers;
	applyModelToPath(path: string, model: string | null): string;
	normalizeEmbeddingRequest(
		body: Record<string, unknown> | null,
		model: string | null,
	): NormalizedEmbeddingRequest | null;
	normalizeImageRequest(
		body: Record<string, unknown> | null,
		model: string | null,
	): NormalizedImageRequest | null;
	buildEmbeddingRequest(
		normalized: NormalizedEmbeddingRequest,
		model: string | null,
		endpointOverrides: EndpointOverrides,
	): UpstreamRequest | null;
	buildImageRequest(
		normalized: NormalizedImageRequest,
		model: string | null,
		endpointOverrides: EndpointOverrides,
	): UpstreamRequest | null;
};
