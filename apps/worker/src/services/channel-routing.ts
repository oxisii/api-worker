import {
	type ChannelMetadata,
	parseChannelMetadata,
	resolveMappedModel,
} from "./channel-metadata";
import { deriveCanonicalModel } from "./model-normalization";
import {
	parseManualModelConfig,
	resolveEffectiveModelIds,
} from "./channel-effective-models";
import type { ChannelRecord } from "./channel-types";

function normalizeKnownModel(value: string | null | undefined): string | null {
	return deriveCanonicalModel(value);
}

function hasExplicitModelMapping(
	metadata: ChannelMetadata,
	downstreamModel: string | null,
): boolean {
	if (downstreamModel) {
		const canonicalModel =
			deriveCanonicalModel(downstreamModel) ?? downstreamModel;
		return (
			metadata.model_mapping[canonicalModel] !== undefined ||
			metadata.model_mapping["*"] !== undefined
		);
	}
	return metadata.model_mapping["*"] !== undefined;
}

function collectKnownChannelModels(
	channel: ChannelRecord,
	verifiedModelsByChannel: Map<string, Set<string>>,
): string[] {
	return resolveEffectiveModelIds({
		channel,
		verifiedModels:
			verifiedModelsByChannel.get(channel.id) ?? new Set<string>(),
	})
		.map((model) => normalizeKnownModel(model))
		.filter((model): model is string => Boolean(model));
}

export function resolveUpstreamModelForChannel(
	channel: ChannelRecord,
	metadata: ChannelMetadata,
	downstreamModel: string | null,
	verifiedModelsByChannel: Map<string, Set<string>> = new Map(),
): { model: string | null; autoMapped: boolean } {
	const mapped = resolveMappedModel(metadata.model_mapping, downstreamModel);
	if (!downstreamModel || hasExplicitModelMapping(metadata, downstreamModel)) {
		return { model: mapped, autoMapped: false };
	}

	const knownModels = collectKnownChannelModels(
		channel,
		verifiedModelsByChannel,
	);
	if (knownModels.length === 0) {
		return { model: null, autoMapped: false };
	}
	const canonicalModel =
		deriveCanonicalModel(downstreamModel) ?? downstreamModel;
	if (knownModels.includes(canonicalModel)) {
		return { model: mapped ?? downstreamModel, autoMapped: false };
	}
	return { model: null, autoMapped: false };
}

function channelSupportsModel(
	channel: ChannelRecord,
	model: string | null,
	verifiedModelsByChannel: Map<string, Set<string>>,
): boolean {
	if (!model) {
		return true;
	}
	const metadata = parseChannelMetadata(channel.metadata_json);
	const resolved = resolveUpstreamModelForChannel(
		channel,
		metadata,
		model,
		verifiedModelsByChannel,
	);
	if (!resolved.model) {
		return false;
	}
	const manual = parseManualModelConfig(channel.metadata_json);
	const excludedModels = new Set(manual.exclude);
	const canonicalModel = deriveCanonicalModel(model) ?? model;
	const canonicalResolvedModel =
		deriveCanonicalModel(resolved.model) ?? resolved.model;
	if (
		(canonicalModel && excludedModels.has(canonicalModel)) ||
		(canonicalResolvedModel && excludedModels.has(canonicalResolvedModel))
	) {
		return false;
	}
	if (hasExplicitModelMapping(metadata, model)) {
		return true;
	}
	const knownModels = collectKnownChannelModels(
		channel,
		verifiedModelsByChannel,
	);
	if (knownModels.length === 0) {
		return false;
	}
	return canonicalResolvedModel
		? knownModels.includes(canonicalResolvedModel)
		: false;
}

export function selectCandidateChannels(
	allowedChannels: ChannelRecord[],
	downstreamModel: string | null,
	verifiedModelsByChannel: Map<string, Set<string>> = new Map(),
): ChannelRecord[] {
	return allowedChannels.filter((channel) =>
		channelSupportsModel(channel, downstreamModel, verifiedModelsByChannel),
	);
}
