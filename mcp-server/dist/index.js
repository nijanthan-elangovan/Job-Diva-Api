#!/usr/bin/env node
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListResourcesRequestSchema, ListToolsRequestSchema, ReadResourceRequestSchema, } from "@modelcontextprotocol/sdk/types.js";
import { readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
// Get current file directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
// Load the endpoints.json file
const endpointsPath = join(__dirname, "endpoints.json");
let apiData;
try {
    const rawData = readFileSync(endpointsPath, "utf-8");
    apiData = JSON.parse(rawData);
    console.error(`[JobDiva MCP] Loaded ${Object.keys(apiData.paths).length} API paths`);
    console.error(`[JobDiva MCP] API Categories: ${apiData.tags?.map(t => t.name).join(", ")}`);
}
catch (error) {
    console.error(`[JobDiva MCP] ERROR: Could not load endpoints.json from ${endpointsPath}`);
    console.error(`[JobDiva MCP] ${error}`);
    process.exit(1);
}
// Process endpoints into a flat array for easier querying
function getAllEndpoints() {
    const endpoints = [];
    const paths = apiData.paths || {};
    for (const [path, methods] of Object.entries(paths)) {
        for (const [method, details] of Object.entries(methods)) {
            endpoints.push({
                path,
                method: method.toUpperCase(),
                tag: details.tags?.[0] || "Other",
                summary: details.summary || "",
                description: details.description || "",
                operationId: details.operationId || "",
                details,
            });
        }
    }
    return endpoints;
}
// Helper function to format endpoint for display
function formatEndpointSummary(e) {
    return {
        method: e.method,
        path: e.path,
        tag: e.tag,
        summary: e.summary,
        operationId: e.operationId,
    };
}
// Helper function to format full endpoint details
function formatEndpointDetails(e) {
    return {
        method: e.method,
        path: e.path,
        tag: e.tag,
        summary: e.summary,
        description: e.description,
        operationId: e.operationId,
        parameters: e.details.parameters?.map(p => ({
            name: p.name,
            in: p.in,
            type: p.type || (p.schema ? "object" : "string"),
            required: p.required || false,
            description: p.description || "",
            format: p.format,
        })),
        responses: e.details.responses,
        security: e.details.security,
        deprecated: e.details.deprecated || false,
        baseUrl: `https://${apiData.host}${apiData.basePath}`,
    };
}
// Create the MCP server
const server = new Server({
    name: "jobdiva-api-docs",
    version: "1.0.0",
}, {
    capabilities: {
        resources: {},
        tools: {},
    },
});
// List available resources
server.setRequestHandler(ListResourcesRequestSchema, async () => {
    const tags = apiData.tags || [];
    const resources = [
        {
            uri: "jobdiva://api/overview",
            name: "Job Diva API Overview",
            description: "Complete overview of the Job Diva API with all categories and endpoint counts",
            mimeType: "text/plain",
        },
        {
            uri: "jobdiva://api/tags",
            name: "API Categories",
            description: "List all available API categories with descriptions",
            mimeType: "application/json",
        },
        {
            uri: "jobdiva://api/endpoints",
            name: "All Endpoints Summary",
            description: "Quick summary of all API endpoints",
            mimeType: "application/json",
        },
    ];
    // Add a resource for each tag/category
    for (const tag of tags) {
        resources.push({
            uri: `jobdiva://api/category/${encodeURIComponent(tag.name)}`,
            name: `${tag.name} Endpoints`,
            description: tag.description || `All endpoints in the ${tag.name} category`,
            mimeType: "application/json",
        });
    }
    return { resources };
});
// Read resource content
server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
    const uri = request.params.uri;
    // API Overview
    if (uri === "jobdiva://api/overview") {
        const tags = apiData.tags || [];
        const allEndpoints = getAllEndpoints();
        let overview = `# Job Diva API Documentation\n\n`;
        overview += `Base URL: https://${apiData.host}${apiData.basePath}\n\n`;
        overview += `## API Categories\n\n`;
        for (const tag of tags) {
            const count = allEndpoints.filter(e => e.tag === tag.name).length;
            overview += `### ${tag.name} (${count} endpoints)\n`;
            overview += `${tag.description}\n\n`;
        }
        overview += `\n## Total Endpoints: ${allEndpoints.length}\n`;
        overview += `\nUse the MCP tools to search and explore specific endpoints.\n`;
        return {
            contents: [
                {
                    uri,
                    mimeType: "text/plain",
                    text: overview,
                },
            ],
        };
    }
    // Tags list
    if (uri === "jobdiva://api/tags") {
        const tags = apiData.tags || [];
        const endpoints = getAllEndpoints();
        const tagSummary = tags.map((t) => ({
            name: t.name,
            description: t.description,
            endpointCount: endpoints.filter((e) => e.tag === t.name).length,
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
    // All endpoints summary
    if (uri === "jobdiva://api/endpoints") {
        const endpoints = getAllEndpoints();
        const summary = endpoints.map(formatEndpointSummary);
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
    // Category-specific endpoints
    const categoryMatch = uri.match(/^jobdiva:\/\/api\/category\/(.+)$/);
    if (categoryMatch) {
        const tagName = decodeURIComponent(categoryMatch[1]);
        const endpoints = getAllEndpoints().filter((e) => e.tag === tagName);
        if (endpoints.length === 0) {
            return {
                contents: [
                    {
                        uri,
                        mimeType: "text/plain",
                        text: `No endpoints found for category: ${tagName}`,
                    },
                ],
            };
        }
        const categoryEndpoints = endpoints.map(formatEndpointDetails);
        return {
            contents: [
                {
                    uri,
                    mimeType: "application/json",
                    text: JSON.stringify(categoryEndpoints, null, 2),
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
                name: "search_jobdiva_endpoints",
                description: "Search Job Diva API endpoints by keyword. Searches across endpoint paths, summaries, descriptions, parameter names, and response codes. Perfect for finding relevant APIs quickly.",
                inputSchema: {
                    type: "object",
                    properties: {
                        query: {
                            type: "string",
                            description: "Search keyword (e.g., 'candidate', 'authenticate', 'billing', 'job')",
                        },
                        category: {
                            type: "string",
                            description: "Optional: filter by API category (e.g., 'CandidateV2', 'AuthenticationV2', 'JobV2')",
                        },
                    },
                    required: ["query"],
                },
            },
            {
                name: "get_jobdiva_endpoint",
                description: "Get complete details for a specific Job Diva API endpoint including all parameters, request/response schemas, authentication requirements, and example usage.",
                inputSchema: {
                    type: "object",
                    properties: {
                        path: {
                            type: "string",
                            description: "The API endpoint path (e.g., '/apiv2/authenticate', '/apiv2/candidate/detail')",
                        },
                        method: {
                            type: "string",
                            description: "HTTP method",
                            enum: ["GET", "POST", "PUT", "DELETE", "PATCH"],
                        },
                    },
                    required: ["path", "method"],
                },
            },
            {
                name: "list_jobdiva_categories",
                description: "List all available Job Diva API categories with descriptions and endpoint counts. Use this to understand the API structure and available functionality areas.",
                inputSchema: {
                    type: "object",
                    properties: {},
                },
            },
            {
                name: "get_jobdiva_category",
                description: "Get all endpoints in a specific Job Diva API category with full details. Useful when you need to work with a specific area of the API.",
                inputSchema: {
                    type: "object",
                    properties: {
                        category: {
                            type: "string",
                            description: "Category name (e.g., 'CandidateV2', 'JobV2', 'AuthenticationV2', 'CompanyV2', 'ContactV2')",
                        },
                    },
                    required: ["category"],
                },
            },
        ],
    };
});
// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;
    if (name === "search_jobdiva_endpoints") {
        const query = (args?.query || "").toLowerCase();
        const categoryFilter = args?.category;
        let endpoints = getAllEndpoints();
        if (categoryFilter) {
            endpoints = endpoints.filter((e) => e.tag.toLowerCase() === categoryFilter.toLowerCase());
        }
        const results = endpoints.filter((e) => {
            const searchIn = [
                e.path,
                e.summary,
                e.description,
                e.operationId,
                ...(e.details.parameters?.map((p) => p.name) || []),
                ...(e.details.parameters?.map((p) => p.description || "") || []),
            ]
                .join(" ")
                .toLowerCase();
            return searchIn.includes(query);
        });
        if (results.length === 0) {
            return {
                content: [
                    {
                        type: "text",
                        text: `No endpoints found matching "${query}"${categoryFilter ? ` in category ${categoryFilter}` : ""}`,
                    },
                ],
            };
        }
        const output = results.slice(0, 20).map(formatEndpointSummary);
        return {
            content: [
                {
                    type: "text",
                    text: `Found ${results.length} endpoint(s) matching "${query}"${categoryFilter ? ` in ${categoryFilter}` : ""}:\n\n${JSON.stringify(output, null, 2)}`,
                },
            ],
        };
    }
    if (name === "get_jobdiva_endpoint") {
        const path = args?.path;
        const method = (args?.method || "").toUpperCase();
        const endpoint = getAllEndpoints().find((e) => e.path === path && e.method === method);
        if (!endpoint) {
            return {
                content: [
                    {
                        type: "text",
                        text: `Endpoint not found: ${method} ${path}\n\nTip: Use search_jobdiva_endpoints to find available endpoints.`,
                    },
                ],
            };
        }
        const details = formatEndpointDetails(endpoint);
        return {
            content: [
                {
                    type: "text",
                    text: JSON.stringify(details, null, 2),
                },
            ],
        };
    }
    if (name === "list_jobdiva_categories") {
        const tags = apiData.tags || [];
        const endpoints = getAllEndpoints();
        const categories = tags.map((t) => ({
            name: t.name,
            description: t.description,
            endpointCount: endpoints.filter((e) => e.tag === t.name).length,
        }));
        return {
            content: [
                {
                    type: "text",
                    text: `Job Diva API Categories:\n\n${JSON.stringify(categories, null, 2)}`,
                },
            ],
        };
    }
    if (name === "get_jobdiva_category") {
        const category = args?.category;
        const endpoints = getAllEndpoints().filter((e) => e.tag.toLowerCase() === category.toLowerCase());
        if (endpoints.length === 0) {
            const availableTags = apiData.tags?.map((t) => t.name).join(", ");
            return {
                content: [
                    {
                        type: "text",
                        text: `Category "${category}" not found.\n\nAvailable categories: ${availableTags}`,
                    },
                ],
            };
        }
        const output = endpoints.map(formatEndpointDetails);
        return {
            content: [
                {
                    type: "text",
                    text: `${endpoints.length} endpoint(s) in ${category}:\n\n${JSON.stringify(output, null, 2)}`,
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
    console.error("[JobDiva MCP] Server started and ready for connections");
}
main().catch((error) => {
    console.error("[JobDiva MCP] Fatal error:", error);
    process.exit(1);
});
//# sourceMappingURL=index.js.map