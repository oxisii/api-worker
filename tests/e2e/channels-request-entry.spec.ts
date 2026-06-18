import { expect, test } from "@playwright/test";

test("channels 页面展示请求入口且无控制台报错", async ({ page }) => {
	const consoleErrors: string[] = [];
	const pageErrors: string[] = [];

	page.on("console", (message) => {
		if (message.type() === "error") {
			consoleErrors.push(message.text());
		}
	});
	page.on("pageerror", (error) => {
		pageErrors.push(error.message);
	});

	await page.addInitScript(() => {
		window.localStorage.setItem("admin_token", "e2e-token");
	});

	await page.route("**/api/sites", async (route) => {
		await route.fulfill({
			status: 200,
			contentType: "application/json",
			body: JSON.stringify({
				sites: [
					{
						id: "site-auto",
						name: "Auto Site",
						base_url: "https://example.com",
						weight: 1,
						status: "active",
						site_type: "openai",
						request_entry_path: "/codex",
						request_entry_format: null,
						call_tokens: [],
					},
					{
						id: "site-chat",
						name: "Chat Site",
						base_url: "https://chat.example.com",
						weight: 1,
						status: "active",
						site_type: "openai",
						request_entry_path: "/v1/chat/completions",
						request_entry_format: "openai_chat",
						call_tokens: [],
					},
				],
			}),
		});
	});

	await page.route("**/api/models", async (route) => {
		await route.fulfill({
			status: 200,
			contentType: "application/json",
			body: JSON.stringify({ models: [] }),
		});
	});

	await page.goto("/channels");

	await expect(page.getByText("请求入口：/codex · 自动").last()).toBeVisible();
	await expect(
		page.getByText("请求入口：/v1/chat/completions · OpenAI Chat").last(),
	).toBeVisible();
	await expect(pageErrors, `页面异常: ${pageErrors.join("\n")}`).toEqual([]);
	await expect(
		consoleErrors,
		`控制台错误: ${consoleErrors.join("\n")}`,
	).toEqual([]);
});

test("channels 页面仅修改请求格式时也会保存并展示默认端点", async ({
	page,
}) => {
	let siteListRequestCount = 0;
	let patchedBody: Record<string, unknown> | null = null;
	const consoleErrors: string[] = [];
	const pageErrors: string[] = [];

	page.on("console", (message) => {
		if (message.type() === "error") {
			consoleErrors.push(message.text());
		}
	});
	page.on("pageerror", (error) => {
		pageErrors.push(error.message);
	});

	await page.addInitScript(() => {
		window.localStorage.setItem("admin_token", "e2e-token");
	});

	await page.route("**/api/sites", async (route, request) => {
		if (request.method() !== "GET") {
			await route.fallback();
			return;
		}
		siteListRequestCount += 1;
		const isUpdated = siteListRequestCount > 1;
		await route.fulfill({
			status: 200,
			contentType: "application/json",
			body: JSON.stringify({
				sites: [
					{
						id: "site-edit",
						name: "Editable Site",
						base_url: "https://example.com",
						weight: 1,
						status: "active",
						site_type: "openai",
						request_entry_path: null,
						request_entry_format: isUpdated ? "openai_responses" : null,
						call_tokens: [
							{
								id: "token-1",
								name: "主调用令牌",
								api_key: "sk-test",
								priority: 0,
							},
						],
					},
				],
			}),
		});
	});

	await page.route("**/api/sites/site-edit", async (route, request) => {
		if (request.method() !== "PATCH") {
			await route.fallback();
			return;
		}
		patchedBody = request.postDataJSON() as Record<string, unknown>;
		await route.fulfill({
			status: 200,
			contentType: "application/json",
			body: JSON.stringify({ ok: true }),
		});
	});

	await page.route("**/api/models", async (route) => {
		await route.fulfill({
			status: 200,
			contentType: "application/json",
			body: JSON.stringify({ models: [] }),
		});
	});

	await page.goto("/channels");
	await page.getByRole("button", { name: "编辑" }).click();
	await page
		.locator('label:text-is("请求格式")')
		.locator("xpath=following-sibling::*[1]//button")
		.click();
	await page.getByRole("button", { name: "OpenAI Responses" }).click();
	await page.getByRole("button", { name: "保存修改" }).click();

	await expect
		.poll(() => patchedBody)
		.toMatchObject({
			request_entry_path: null,
			request_entry_format: "openai_responses",
		});
	await expect(
		page.getByText("请求入口：默认端点 · OpenAI Responses").last(),
	).toBeVisible();
	await expect(pageErrors, `页面异常: ${pageErrors.join("\n")}`).toEqual([]);
	await expect(
		consoleErrors,
		`控制台错误: ${consoleErrors.join("\n")}`,
	).toEqual([]);
});
