import {
	detectStreamFlagFromRawJsonRequest,
	shouldTreatMissingUsageAsError,
} from "../../../apps/shared-core/src";
import { describe, expect, it } from "vitest";

describe("usage policy", () => {
	it("detects stream flag from raw json", () => {
		expect(detectStreamFlagFromRawJsonRequest('{"stream":true}')).toBe(true);
		expect(detectStreamFlagFromRawJsonRequest('{"stream":false}')).toBe(false);
		expect(detectStreamFlagFromRawJsonRequest('{"model":"x"}')).toBeNull();
	});

	it("keeps missing usage as soft signal when parsing skipped", () => {
		const shouldFail = shouldTreatMissingUsageAsError({
			isStream: false,
			bodyParsingSkipped: true,
			hasUsageSignal: true,
		});
		expect(shouldFail).toBe(false);
	});

	it("fails only when non-stream has signal but cannot parse", () => {
		const shouldFail = shouldTreatMissingUsageAsError({
			isStream: false,
			bodyParsingSkipped: false,
			hasUsageSignal: true,
		});
		expect(shouldFail).toBe(true);
	});
});
