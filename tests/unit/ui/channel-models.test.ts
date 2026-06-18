import { describe, expect, it } from "vitest";
import {
	getChannelModelRows,
	getPagedChannelModelRows,
} from "../../../apps/ui/src/features/channel-models";

describe("channel model rows", () => {
	it("只返回当前渠道的模型状态", () => {
		const rows = getChannelModelRows(
			[
				{
					id: "gpt-4.1",
					channels: [
						{ id: "channel-a", name: "渠道 A", status: "auto" },
						{ id: "channel-b", name: "渠道 B", status: "excluded" },
					],
				},
				{
					id: "claude-sonnet",
					channels: [
						{ id: "channel-a", name: "渠道 A", status: "manual" },
					],
				},
				{
					id: "gemini-pro",
					channels: [
						{ id: "channel-b", name: "渠道 B", status: "auto" },
					],
				},
			],
			"channel-a",
		);

		expect(rows).toEqual([
			{ model: "gpt-4.1", status: "auto" },
			{ model: "claude-sonnet", status: "manual" },
		]);
	});

	it("按自动、手动、排除排序", () => {
		const rows = getChannelModelRows(
			[
				{
					id: "z-excluded",
					channels: [
						{ id: "channel-a", name: "渠道 A", status: "excluded" },
					],
				},
				{
					id: "b-auto",
					channels: [
						{ id: "channel-a", name: "渠道 A", status: "auto" },
					],
				},
				{
					id: "a-auto",
					channels: [
						{ id: "channel-a", name: "渠道 A", status: "auto" },
					],
				},
				{
					id: "m-manual",
					channels: [
						{ id: "channel-a", name: "渠道 A", status: "manual" },
					],
				},
			],
			"channel-a",
		);

		expect(rows).toEqual([
			{ model: "a-auto", status: "auto" },
			{ model: "b-auto", status: "auto" },
			{ model: "m-manual", status: "manual" },
			{ model: "z-excluded", status: "excluded" },
		]);
	});

	it("会合并当前弹窗临时拉取到的新模型预览", () => {
		const rows = getChannelModelRows(
			[
				{
					id: "existing-enabled",
					channels: [
						{ id: "channel-a", name: "渠道 A", status: "auto" },
					],
				},
				{
					id: "existing-manual",
					channels: [
						{ id: "channel-a", name: "渠道 A", status: "manual" },
					],
				},
			],
			"channel-a",
			["preview-model", "existing-enabled", "preview-model"],
		);

		expect(rows).toEqual([
			{ model: "existing-enabled", status: "auto" },
			{ model: "preview-model", status: "auto" },
			{ model: "existing-manual", status: "manual" },
		]);
	});

	it("临时拉取模型按统一模型展示并保留实际别名", () => {
		const rows = getChannelModelRows(
			[
				{
					id: "gemma-7b",
					raw_ids: ["google/gemma-7b-it"],
					channels: [
						{ id: "channel-a", name: "渠道 A", status: "auto" },
					],
				},
			],
			"channel-a",
			["google/gemma-7b-it", "@hf/google/gemma-7b-it", "gemma-7b"],
		);

		expect(rows).toEqual([
			{
				model: "gemma-7b",
				status: "auto",
				rawIds: ["@hf/google/gemma-7b-it", "google/gemma-7b-it"],
			},
		]);
	});

	it("实际别名只展示当前渠道保存或本次预览拉取到的名字", () => {
		const rows = getChannelModelRows(
			[
				{
					id: "gemma-7b",
					raw_ids: ["google/gemma-7b-it", "other/gemma-7b-instruct"],
					channels: [
						{
							id: "channel-a",
							name: "渠道 A",
							raw_ids: ["google/gemma-7b-it"],
							status: "auto",
						},
						{
							id: "channel-b",
							name: "渠道 B",
							raw_ids: ["other/gemma-7b-instruct"],
							status: "auto",
						},
					],
				},
			],
			"channel-a",
			["@hf/google/gemma-7b-it"],
		);

		expect(rows).toEqual([
			{
				model: "gemma-7b",
				status: "auto",
				rawIds: ["@hf/google/gemma-7b-it", "google/gemma-7b-it"],
			},
		]);
	});

	it("按关键词和状态筛选后分页展示", () => {
		const rows = Array.from({ length: 16 }, (_, index) => ({
			model: `model-${String(index + 1).padStart(2, "0")}`,
			status: index % 2 === 0 ? ("auto" as const) : ("manual" as const),
		}));

		const result = getPagedChannelModelRows(rows, {
			page: 2,
			pageSize: 3,
			search: "model-",
			status: "auto",
		});

		expect(result.total).toBe(8);
		expect(result.totalPages).toBe(3);
		expect(result.page).toBe(2);
		expect(result.rows.map((row) => row.model)).toEqual([
			"model-07",
			"model-09",
			"model-11",
		]);
	});
});
