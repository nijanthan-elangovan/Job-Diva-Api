#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
    CallToolRequestSchema,
    ListResourcesRequestSchema,
    ListToolsRequestSchema,
    ReadResourceRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

// Get the directory of this file
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load the endpoints.json file
// Path: mcp-server/dist/index.js -> mcp-server/dist -> mcp-server -> Job Diva Api
const endpointsPath = join(__dirname, "../..", "endpoints.json");
let apiData: SwaggerSpec;

interface SwaggerSpec {
    swagger: string;
    info: object;
    host: string;
    basePath: string;
    tags: Array<{ name: string; description: string }>;
    paths: Record<string, Record<string, EndpointDetails>>;
    definitions?: Record<string, object>;
}

interface EndpointDetails {
    tags?: string[];
    summary?: string;
    description?: string;
    operationId?: string;
    parameters?: Array<{
        name: string;
        in: string;
        description?: string;
        required?: boolean;
        type?: string;
        format?: string;
        schema?: object;
    }>;
    responses?: Record<string, { description: string; schema?: object }>;
    security?: Array<Record<string, string[]>>;
    deprecated?: boolean;
}

interface ProcessedEndpoint {
    path: string;
    method: string;
    tag: string;
    summary: string;
    description: string;
    details: EndpointDetails;
}

try {
    const rawData = readFileSync(endpointsPath, "utf-8");
    apiData = JSON.parse(rawData);
    console.error(`[MCP] Loaded ${Object.keys(apiData.paths).length} API paths from endpoints.json`);
} catch (error) {
    console.error(`[MCP] Error loading endpoints.json: ${error}`);
    process.exit(1);
}

// Process endpoints into a flat array for easier querying
function getAllEndpoints(): ProcessedEndpoint[] {
    const endpoints: ProcessedEndpoint[] = [];
    const paths = apiData.paths || {};

    for (const [path, methods] of Object.entries(paths)) {
        for (const [method, details] of Object.entries(methods)) {
            endpoints.push({
                path,
                method: method.toUpperCase(),
                tag: details.tags?.[0] || "Other",
                summary: details.summary || "",
                description: details.description || "",
                details,
            });
        }
    }
    return endpoints;
}

// Create the MCP server
const server = new Server(
    {
        name: "jobdiva-api-docs",
        version: "1.0.0",
    },
    {
        capabilities: {
            resources: {},
            tools: {},
        },
    }
);

// List available resources
server.setRequestHandler(ListResourcesRequestSchema, async () => {
    const tags = apiData.tags || [];

    const resources = [
        {
            uri: "jobdiva://api/tags",
            name: "API Tags/Categories",
            description: "List all available API categories (tags)",
            mimeType: "application/json",
        },
        {
            uri: "jobdiva://api/endpoints",
            name: "All Endpoints Summary",
            description: "Summary of all API endpoints",
            mimeType: "application/json",
        },
    ];

    // Add a resource for each tag
    for (const tag of tags) {
        resources.push({
            uri: `jobdiva://api/endpoints/${encodeURIComponent(tag.name)}`,
            name: `${tag.name} Endpoints`,
            description: tag.description || `Endpoints for ${tag.name}`,
            mimeType: "application/json",
        });
    }

    return { resources };
});

// Read resource content
server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
    const uri = request.params.uri;

    if (uri === "jobdiva://api/tags") {
        const tags = apiData.tags || [];
        const tagSummary = tags.map((t) => ({
            name: t.name,
            description: t.description,
            endpointCount: getAllEndpoints().filter((e) => e.tag === t.name).length,
        }));

        return {
            contents: [
                {
                    uri,
                    mimeType: "application/json",
                    text: JSON.stringify(tagSummary, null, 2),
                },
            ],
        };
    }

    if (uri === "jobdiva://api/endpoints") {
        const endpoints = getAllEndpoints();
        const summary = endpoints.map((e) => ({
            method: e.method,
            path: e.path,
            tag: e.tag,
            summary: e.summary,
        }));

        return {
            contents: [
                {
                    uri,
                    mimeType: "application/json",
                    text: JSON.stringify(summary, null, 2),
                },
            ],
        };
    }

    // Handle tag-specific endpoints
    const tagMatch = uri.match(/^jobdiva:\/\/api\/endpoints\/(.+)$/);
    if (tagMatch) {
        const tagName = decodeURIComponent(tagMatch[1]);
        const endpoints = getAllEndpoints().filter((e) => e.tag === tagName);

        const tagEndpoints = endpoints.map((e) => ({
            method: e.method,
            path: e.path,
            summary: e.summary,
            description: e.description,
            parameters: e.details.parameters?.map((p) => ({
                name: p.name,
                in: p.in,
                type: p.type,
                required: p.required,
                description: p.description,
            })),
        }));

        return {
            contents: [
                {
                    uri,
                    mimeType: "application/json",
                    text: JSON.stringify(tagEndpoints, null, 2),
                },
            ],
        };
    }

    throw new Error(`Unknown resource: ${uri}`);
});

// List available tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
        tools: [
            {
                name: "search_endpoints",
                description:
                    "Search Job Diva API endpoints by keyword. Searches in path, summary, description, and parameter names.",
                inputSchema: {
                    type: "object",
                    properties: {
                        query: {
                            type: "string",
                            description: "Search term to find in endpoints",
                        },
                        tag: {
                            type: "string",
                            description: "Optional: filter by API tag/category",
                        },
                    },
                    required: ["query"],
                },
            },
            {
                name: "get_endpoint_details",
                description:
                    "Get full details of a specific API endpoint including all parameters, responses, and schemas.",
                inputSchema: {
                    type: "object",
                    properties: {
                        path: {
                            type: "string",
                            description: "The API endpoint path (e.g., /apiv2/authenticate)",
                        },
                        method: {
                            type: "string",
                            description: "HTTP method (GET, POST, PUT, DELETE)",
                            enum: ["GET", "POST", "PUT", "DELETE", "PATCH"],
                        },
                    },
                    required: ["path", "method"],
                },
            },
            {
                name: "list_endpoints_by_tag",
                description: "List all endpoints for a specific API category/tag.",
                inputSchema: {
                    type: "object",
                    properties: {
                        tag: {
                            type: "string",
                            description: "The API tag/category name (e.g., CandidateV2, JobV2, AuthenticationV2)",
                        },
                    },
                    required: ["tag"],
                },
            },
        ],
    };
});

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    if (name === "search_endpoints") {
        const query = (args?.query as string || "").toLowerCase();
        const tagFilter = args?.tag as string | undefined;

        let endpoints = getAllEndpoints();

        if (tagFilter) {
            endpoints = endpoints.filter((e) => e.tag.toLowerCase() === tagFilter.toLowerCase());
        }

        const results = endpoints.filter((e) => {
            const searchIn = [
                e.path,
                e.summary,
                e.description,
                ...(e.details.parameters?.map((p) => p.name) || []),
                ...(e.details.parameters?.map((p) => p.description || "") || []),
            ]
                .join(" ")
                .toLowerCase();
            return searchIn.includes(query);
        });

        const output = results.slice(0, 20).map((e) => ({
            method: e.method,
            path: e.path,
            tag: e.tag,
            summary: e.summary,
            description: e.description,
        }));

        return {
            content: [
                {
                    type: "text",
                    text: `Found ${results.length} endpoints matching "${query}"${tagFilter ? ` in ${tagFilter}` : ""}:\n\n${JSON.stringify(output, null, 2)}`,
                },
            ],
        };
    }

    if (name === "get_endpoint_details") {
        const path = args?.path as string;
        const method = (args?.method as string || "").toUpperCase();

        const endpoint = getAllEndpoints().find(
            (e) => e.path === path && e.method === method
        );

        if (!endpoint) {
            return {
                content: [
                    {
                        type: "text",
                        text: `Endpoint not found: ${method} ${path}`,
                    },
                ],
            };
        }

        const details = {
            method: endpoint.method,
            path: endpoint.path,
            tag: endpoint.tag,
            summary: endpoint.summary,
            description: endpoint.description,
            parameters: endpoint.details.parameters,
            responses: endpoint.details.responses,
            deprecated: endpoint.details.deprecated,
        };

        return {
            content: [
                {
                    type: "text",
                    text: JSON.stringify(details, null, 2),
                },
            ],
        };
    }

    if (name === "list_endpoints_by_tag") {
        const tag = args?.tag as string;
        const endpoints = getAllEndpoints().filter(
            (e) => e.tag.toLowerCase() === tag.toLowerCase()
        );

        if (endpoints.length === 0) {
            const availableTags = apiData.tags?.map((t) => t.name).join(", ");
            return {
                content: [
                    {
                        type: "text",
                        text: `No endpoints found for tag "${tag}". Available tags: ${availableTags}`,
                    },
                ],
            };
        }

        const output = endpoints.map((e) => ({
            method: e.method,
            path: e.path,
            summary: e.summary,
        }));

        return {
            content: [
                {
                    type: "text",
                    text: `${endpoints.length} endpoints in ${tag}:\n\n${JSON.stringify(output, null, 2)}`,
                },
            ],
        };
    }

    throw new Error(`Unknown tool: ${name}`);
});

// Start the server
async function main() {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error("[MCP] Job Diva API Documentation server running on stdio");
}

main().catch((error) => {
    console.error("[MCP] Fatal error:", error);
    process.exit(1);
});
