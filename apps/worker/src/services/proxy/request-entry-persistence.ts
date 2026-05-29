import type { D1Database, KVNamespace } from "@cloudflare/workers-types";
import { invalidateSelectionHotCache } from "../hot-kv";
import { buildSiteMetadata, type RequestEntryFormat } from "../site-metadata";
import { nowIso } from "../../utils/time";

type ChannelForRequestEntryPersistence = {
	id: string;
	metadata_json?: string | null;
};

export async function persistAutomaticRequestEntryFormat(options: {
	db: D1Database;
	kvHot?: KVNamespace;
	channel: ChannelForRequestEntryPersistence;
	path?: string | null;
	format?: RequestEntryFormat | null;
}): Promise<void> {
	if (!options.path || !options.format) {
		return;
	}
	const metadataJson = buildSiteMetadata(options.channel.metadata_json, {
		request_entry: {
			path: options.path,
			format: options.format,
		},
	});
	await options.db
		.prepare(
			"UPDATE channels SET metadata_json = ?, updated_at = ? WHERE id = ?",
		)
		.bind(metadataJson, nowIso(), options.channel.id)
		.run();
	await invalidateSelectionHotCache(options.kvHot);
}
