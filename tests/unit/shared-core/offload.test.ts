import { resolveLargeRequestOffload } from "../../../apps/shared-core/src";
import { describe, expect, it } from "vitest";

describe("resolveLargeRequestOffload", () => {
	it("offloads when content-length reaches threshold", () => {
		const result = resolveLargeRequestOffload({
			attemptWorkerAvailable: true,
			thresholdBytes: 1024,
			contentLengthHeader: "1024",
		});
		expect(result.shouldOffload).toBe(true);
		expect(result.requestSizeKnown).toBe(true);
	});

	it("does not offload when below threshold", () => {
		const result = resolveLargeRequestOffload({
			attemptWorkerAvailable: true,
			thresholdBytes: 1024,
			contentLengthHeader: "1000",
		});
		expect(result.shouldOffload).toBe(false);
	});

	it("does not offload when size is unknown even if attempt worker exists", () => {
		const result = resolveLargeRequestOffload({
			attemptWorkerAvailable: true,
			thresholdBytes: 1024,
			contentLengthHeader: null,
		});
		expect(result.shouldOffload).toBe(false);
		expect(result.requestSizeKnown).toBe(false);
	});
});
