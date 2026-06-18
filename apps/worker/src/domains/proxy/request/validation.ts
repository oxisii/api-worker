import { normalizeStringField } from "../shared";

export type ToolSchemaValidationIssue = {
	code: "invalid_function_parameters";
	message: string;
	param: string;
	errorMetaJson: string;
};

function validateRequiredArrayInSchema(
	schema: unknown,
	basePath: string,
): string | null {
	if (!schema || typeof schema !== "object" || Array.isArray(schema)) {
		return null;
	}
	const record = schema as Record<string, unknown>;
	if (
		Object.hasOwn(record, "required") &&
		record.required !== undefined &&
		!Array.isArray(record.required)
	) {
		return `${basePath}.required`;
	}
	if (Object.hasOwn(record, "properties") && record.properties !== undefined) {
		const properties = record.properties;
		if (
			!properties ||
			typeof properties !== "object" ||
			Array.isArray(properties)
		) {
			return null;
		}
		for (const [key, value] of Object.entries(properties)) {
			const nestedPath = validateRequiredArrayInSchema(
				value,
				`${basePath}.properties.${key}`,
			);
			if (nestedPath) {
				return nestedPath;
			}
		}
	}
	return null;
}

export function validateToolSchemasInBody(
	body: Record<string, unknown> | null,
): ToolSchemaValidationIssue | null {
	if (!body || !Array.isArray(body.tools)) {
		return null;
	}
	for (let i = 0; i < body.tools.length; i += 1) {
		const rawTool = body.tools[i];
		if (!rawTool || typeof rawTool !== "object" || Array.isArray(rawTool)) {
			continue;
		}
		const toolRecord = rawTool as Record<string, unknown>;
		const toolType = normalizeStringField(toolRecord.type)?.toLowerCase();
		let functionName = normalizeStringField(toolRecord.name);
		let parameters: unknown;
		let paramPath: string | null = null;
		const nestedFunction = toolRecord.function;
		if (
			toolType === "function" &&
			nestedFunction &&
			typeof nestedFunction === "object" &&
			!Array.isArray(nestedFunction)
		) {
			const fnRecord = nestedFunction as Record<string, unknown>;
			functionName = normalizeStringField(fnRecord.name) ?? functionName;
			parameters = fnRecord.parameters;
			paramPath = `tools[${i}].function.parameters`;
		} else if (toolType === "function" || "parameters" in toolRecord) {
			parameters = toolRecord.parameters;
			paramPath = `tools[${i}].parameters`;
		}
		if (!paramPath || parameters === undefined) {
			continue;
		}
		const issuePath =
			parameters === null ||
			typeof parameters !== "object" ||
			Array.isArray(parameters)
				? paramPath
				: validateRequiredArrayInSchema(parameters, paramPath);
		if (!issuePath) {
			continue;
		}
		const message = issuePath.endsWith(".required")
			? `Invalid schema for function '${functionName ?? "unknown"}': required is not of type 'array'.`
			: `Invalid schema for function '${functionName ?? "unknown"}': ${issuePath} is invalid.`;
		return {
			code: "invalid_function_parameters",
			message,
			param: issuePath,
			errorMetaJson: JSON.stringify({
				type: "local_validation",
				param: issuePath,
				status: 400,
			}),
		};
	}
	return null;
}
